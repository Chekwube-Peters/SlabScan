import { formidable } from 'formidable';
import { readFile, unlink } from 'node:fs/promises';

// Node.js serverless function (not Next.js) — Vercel does not auto-parse
// multipart/form-data, so we read the raw request stream with formidable.
// The Renaiss API key/secret are read from server-side env vars only and
// never appear in any response body, log line, or the frontend bundle.
//
// Renaiss's own endpoint streams SSE progress events over several seconds
// (image identification is the slow step) followed by a terminal "failed"
// or "result" event. We re-stream a simplified version of those same events
// to the browser live, instead of buffering everything and responding once
// the terminal event arrives, so the UI can show real progress.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  if (!process.env.RENAISS_KEY_ID || !process.env.RENAISS_SECRET) {
    res.status(500).json({ error: 'server_misconfigured', message: 'Renaiss API credentials are not set on the server.' });
    return;
  }

  let uploadedPath;
  let streamStarted = false;

  try {
    const form = formidable({ maxFileSize: 15 * 1024 * 1024 });
    const [, files] = await form.parse(req);
    const image = Array.isArray(files.image) ? files.image[0] : files.image;

    if (!image) {
      res.status(400).json({ error: 'missing_image', message: 'No "image" field in the upload.' });
      return;
    }

    uploadedPath = image.filepath;
    const buffer = await readFile(image.filepath);
    const blob = new Blob([buffer], { type: image.mimetype || 'application/octet-stream' });

    const upstreamForm = new FormData();
    upstreamForm.append('file', blob, image.originalFilename || 'card.jpg');

    const upstreamResponse = await fetch('https://api.renaissos.com/v1/graded/by-image', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.RENAISS_KEY_ID,
        'X-Api-Secret': process.env.RENAISS_SECRET,
      },
      body: upstreamForm,
    });

    const contentType = upstreamResponse.headers.get('content-type') || '';

    if (!contentType.includes('text/event-stream')) {
      const payload = contentType.includes('application/json')
        ? await upstreamResponse.json().catch(() => null)
        : null;
      res
        .status(upstreamResponse.ok ? 200 : upstreamResponse.status)
        .json(payload || { error: 'upstream_error', status: upstreamResponse.status });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
    res.flushHeaders?.();
    streamStarted = true;

    await streamSseEvents(upstreamResponse.body, (evt) => {
      if (evt.event === 'progress') {
        res.write(`event: progress\ndata: ${JSON.stringify({ stage: evt.data?.stage, message: evt.data?.message })}\n\n`);
        return;
      }
      if (evt.event === 'failed') {
        const kind = evt.data?.error === 'image_unreadable' ? '422' : 'generic';
        res.write(`event: error\ndata: ${JSON.stringify({ kind })}\n\n`);
        return;
      }
      if (evt.data?.found === false) {
        res.write(`event: error\ndata: ${JSON.stringify({ kind: 'not_found' })}\n\n`);
        return;
      }
      res.write(`event: result\ndata: ${JSON.stringify(evt.data || {})}\n\n`);
    });

    res.end();
  } catch (err) {
    console.error('value-card proxy error:', err.message);
    if (streamStarted) {
      res.write(`event: error\ndata: ${JSON.stringify({ kind: 'generic' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: 'internal_error' });
    }
  } finally {
    if (uploadedPath) {
      unlink(uploadedPath).catch(() => {});
    }
  }
}

// Reads an SSE body, invoking onEvent for every "progress" event and once
// more for the terminal "failed"/result event, then stops reading — Renaiss
// may keep the connection open after the terminal event (keep-alive).
async function streamSseEvents(stream, onEvent) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    readLoop: for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let eventName = 'message';
        let dataLines = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length === 0) continue;

        let data = null;
        try {
          data = JSON.parse(dataLines.join('\n'));
        } catch {
          data = null;
        }

        onEvent({ event: eventName, data });
        if (eventName !== 'progress') break readLoop;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
