# Deploying SlabScan to Vercel

## 1. Push to a git repo and import into Vercel

Vercel auto-detects this as a Vite project and picks up the `api/` folder as
Node.js serverless functions automatically — no extra config needed.

## 2. Set environment variables

In Vercel → Project → Settings → Environment Variables, add:

| Variable | Value | Notes |
| --- | --- | --- |
| `VITE_USE_LIVE` | `true` | Set to `true` to hit the live Renaiss proxy. Leave unset/`false` to run on mock data. |
| `RENAISS_KEY_ID` | your partner-tier key ID | **Server-side only** — read by `api/value-card.js`. Never prefix with `VITE_`. |
| `RENAISS_SECRET` | your partner-tier secret | **Server-side only**, same as above. |
| `ANTHROPIC_API_KEY` | your Anthropic API key | **Server-side only** — read by `api/taste.js`. If omitted, taste reads fall back to a deterministic mock so the app still works. |
| `ANTHROPIC_MODEL` | `claude-opus-4-8` (optional) | Override the model used for taste reads, e.g. for lower latency during a live demo. |

Set these for both the **Production** and **Preview** environments if you're
demoing from a preview deploy.

## 3. Deploy

```bash
git push
```

or, from the CLI:

```bash
vercel --prod
```

## 4. Verify

- Visit the deployed URL on a phone. Tapping "Take a photo" should open the
  rear camera directly (`capture="environment"`).
- With `VITE_USE_LIVE=true` and valid Renaiss credentials, scanning a real
  graded card should return a live valuation.
- With `ANTHROPIC_API_KEY` set, the taste read should come back within a few
  seconds of the valuation.
- Check the Vercel function logs for `api/value-card` and `api/taste` — they
  never print the secret values, only generic error messages.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

`vercel dev` also works if you want the `api/` functions running locally
exactly as they will in production (`npm i -g vercel && vercel dev`).
