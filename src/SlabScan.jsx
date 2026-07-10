import { useCallback, useRef, useState } from 'react';
import { getMockValuation } from './mockData';

const USE_LIVE = import.meta.env.VITE_USE_LIVE === 'true';

const STATUS = {
  IDLE: 'idle',
  SCANNING: 'scanning',
  TASTING: 'tasting',
  DONE: 'done',
  ERROR: 'error',
};

const TASTE_LABEL = {
  HOLD: { label: 'HOLD', tone: 'hold' },
  SELL: { label: 'SELL', tone: 'sell' },
  CHASE: { label: 'CHASE', tone: 'chase' },
  PASS: { label: 'PASS', tone: 'pass' },
};

function currencyFormat(amount, currency) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(amount);
  } catch {
    return `${amount} ${currency || ''}`.trim();
  }
}

function formatPrice(priceUsdCents) {
  if (typeof priceUsdCents !== 'number') return null;
  return currencyFormat(priceUsdCents / 100, 'USD');
}

function confidenceTier(value) {
  if (typeof value !== 'string') return null;
  return value.toLowerCase();
}

function daysAgo(isoString) {
  if (!isoString) return null;
  const diffMs = Date.now() - new Date(isoString).getTime();
  return Math.max(0, Math.round(diffMs / 86400000));
}

// `collectible` is looked up from the grading company's official cert
// database (authoritative once the cert number is OCR'd correctly);
// `card` is a vision-matched catalog guess and can mismatch. Prefer
// collectible whenever it has an identified subject.
function resolveCardIdentity(valuation) {
  const collectible = valuation.collectible || {};
  const card = valuation.card || {};

  if (collectible.subject) {
    const context = [collectible.brand, collectible.year].filter(Boolean).join(' · ');
    return { name: collectible.subject, context };
  }
  if (card.name) {
    return { name: card.name, context: card.setName || '' };
  }
  return null;
}

async function fetchValuation(file, onProgress) {
  if (!USE_LIVE) {
    onProgress?.('Reading the card from your photo…');
    await new Promise((resolve) => setTimeout(resolve, 1100));
    return getMockValuation();
  }

  const formData = new FormData();
  formData.append('image', file, file.name || 'card.jpg');

  let response;
  try {
    response = await fetch('/api/value-card', { method: 'POST', body: formData });
  } catch {
    throw { kind: 'network' };
  }

  if (!response.ok) {
    if (response.status === 422) throw { kind: '422' };
    if (response.status === 401) throw { kind: '401' };
    if (response.status === 404) throw { kind: 'not_found' };
    throw { kind: 'generic' };
  }

  return readValuationStream(response.body, onProgress);
}

// The proxy streams SSE "progress"/"error"/"result" events rather than a
// single JSON body, so progress can be shown live while Renaiss processes.
async function readValuationStream(stream, onProgress) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    for (;;) {
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

        let data;
        try {
          data = JSON.parse(dataLines.join('\n'));
        } catch {
          continue;
        }

        if (eventName === 'progress') {
          if (data.message) onProgress?.(data.message);
          continue;
        }
        if (eventName === 'error') throw { kind: data.kind || 'generic' };
        if (eventName === 'result') return data;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  throw { kind: 'generic' };
}

async function fetchTasteRead(valuation) {
  try {
    const response = await fetch('/api/taste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valuation),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

const ERROR_COPY = {
  '422': {
    title: "That doesn't look like a graded card",
    body: 'SlabScan needs a clear photo of a graded slab — label and card both visible. Try again with better lighting.',
  },
  '401': {
    title: 'Renaiss API key rejected',
    body: 'The partner-tier credentials on this deployment are invalid or expired. Check RENAISS_KEY_ID / RENAISS_SECRET in Vercel.',
  },
  not_found: {
    title: "Couldn't match this card",
    body: "SlabScan read the slab but couldn't find it in the Renaiss index yet. Try a clearer photo or a different card.",
  },
  network: {
    title: 'Network error',
    body: "Couldn't reach the valuation service. Check your connection and try again.",
  },
  generic: {
    title: 'Something went wrong',
    body: 'The valuation service returned an unexpected error. Give it another try.',
  },
};

const DEFAULT_STAGE_MESSAGE = 'Identifying card and grade…';

export default function SlabScan() {
  const [status, setStatus] = useState(STATUS.IDLE);
  const [errorKind, setErrorKind] = useState(null);
  const [preview, setPreview] = useState(null);
  const [valuation, setValuation] = useState(null);
  const [taste, setTaste] = useState(null);
  const [stageMessage, setStageMessage] = useState(DEFAULT_STAGE_MESSAGE);
  const inputRef = useRef(null);

  const reset = useCallback(() => {
    setStatus(STATUS.IDLE);
    setErrorKind(null);
    setPreview(null);
    setValuation(null);
    setTaste(null);
    setStageMessage(DEFAULT_STAGE_MESSAGE);
    if (inputRef.current) inputRef.current.value = '';
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setStatus(STATUS.SCANNING);
    setErrorKind(null);
    setStageMessage(DEFAULT_STAGE_MESSAGE);

    let result;
    try {
      result = await fetchValuation(file, setStageMessage);
    } catch (err) {
      setErrorKind(err?.kind || 'generic');
      setStatus(STATUS.ERROR);
      return;
    }

    setValuation(result);
    setStatus(STATUS.TASTING);

    const tasteResult = await fetchTasteRead(result);
    setTaste(tasteResult);
    setStatus(STATUS.DONE);
  }, []);

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="wordmark">SlabScan</span>
        {status !== STATUS.IDLE && (
          <button className="link-button" onClick={reset} type="button">
            New scan
          </button>
        )}
      </header>

      <main className="app-main">
        {status === STATUS.IDLE && (
          <CaptureHero inputRef={inputRef} onInputChange={onInputChange} />
        )}

        {(status === STATUS.SCANNING || status === STATUS.TASTING) && (
          <ScanningView preview={preview} tasting={status === STATUS.TASTING} stageMessage={stageMessage} />
        )}

        {status === STATUS.ERROR && (
          <ErrorView kind={errorKind} preview={preview} onRetry={reset} />
        )}

        {status === STATUS.DONE && valuation && (
          <ResultView preview={preview} valuation={valuation} taste={taste} onRetry={reset} />
        )}
      </main>

      <footer className="app-footer">
        <p>{USE_LIVE ? 'Live mode' : 'Demo mode — mock valuations'}</p>
      </footer>
    </div>
  );
}

function CaptureHero({ inputRef, onInputChange }) {
  return (
    <div className="capture-hero">
      <h1>Snap your slab</h1>
      <p className="subhead">Point the camera at a graded card. We'll price it and tell you what to do with it.</p>
      <label className="capture-button">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onInputChange}
          hidden
        />
        <CameraIcon />
        <span>Take a photo</span>
      </label>
      <RenaissAttribution />
    </div>
  );
}

function ScanningView({ preview, tasting, stageMessage }) {
  return (
    <div className="scanning-view">
      {preview && <img className="preview-image" src={preview} alt="Captured card" />}
      <div className="scan-status">
        <div className="spinner" aria-hidden="true" />
        <p>{tasting ? 'Reading the room — getting a taste call…' : stageMessage}</p>
      </div>
    </div>
  );
}

function ErrorView({ kind, preview, onRetry }) {
  const copy = ERROR_COPY[kind] || ERROR_COPY.generic;
  return (
    <div className="error-view">
      {preview && <img className="preview-image dim" src={preview} alt="Captured card" />}
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      <button className="primary-button" onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  );
}

function ResultView({ preview, valuation, taste, onRetry }) {
  const tasteInfo = taste?.taste ? TASTE_LABEL[taste.taste] : null;
  const card = valuation.card || {};
  const price = formatPrice(card.priceUsdCents);
  const tier = confidenceTier(card.confidence);
  const freshness = daysAgo(card.lastSaleAt);
  const identity = resolveCardIdentity(valuation);

  return (
    <div className="result-view">
      {preview && <img className="preview-image" src={preview} alt="Scanned card" />}

      <div className="valuation-card">
        <div className="valuation-header">
          <span className="grading-company">{valuation.company}</span>
          <span className="grade">Grade {valuation.grade}</span>
        </div>
        {identity && (
          <p className="card-name">{identity.name}{identity.context ? ` · ${identity.context}` : ''}</p>
        )}
        <div className="price">{price || 'No market price yet'}</div>
        <div className="meta-row">
          <ConfidenceBadge tier={tier} />
          {freshness !== null && <span className="freshness">Last sale {freshness}d ago</span>}
        </div>
        {valuation.cert && <p className="sources-note">Cert #{valuation.cert}</p>}
        <RenaissAttribution />
      </div>

      {tasteInfo && (
        <div className={`taste-card taste-${tasteInfo.tone}`}>
          <div className="taste-label">{tasteInfo.label}</div>
          {taste.reasoning && <p className="taste-reasoning">{taste.reasoning}</p>}
        </div>
      )}

      {!tasteInfo && (
        <div className="taste-card taste-unavailable">
          <p>Taste read unavailable right now — valuation still stands.</p>
        </div>
      )}

      <button className="primary-button" onClick={onRetry} type="button">
        Scan another card
      </button>
    </div>
  );
}

function ConfidenceBadge({ tier }) {
  return (
    <span className={`confidence-badge confidence-${tier || 'unknown'}`}>
      {tier || 'unknown'} confidence
    </span>
  );
}

function RenaissAttribution() {
  return (
    <p className="attribution">
      Powered by{' '}
      <a href="https://renaissos.com" target="_blank" rel="noreferrer">
        Renaiss OS Index
      </a>
    </p>
  );
}

function CameraIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
