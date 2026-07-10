# SlabScan

Snap a photo of a graded trading card, get an instant valuation from the
[Renaiss OS Index](https://renaissos.com), then layer an AI "taste read"
(HOLD / SELL / CHASE / PASS) on top.

Built for the Renaiss Tech Hackathon.

## Stack

- **Frontend:** Vite + React, mobile-first (camera capture is the hero
  interaction)
- **Backend:** two Vercel serverless functions
  - `api/value-card.js` — proxies image uploads to the Renaiss OS Index
    partner API; holds `RENAISS_KEY_ID` / `RENAISS_SECRET` server-side only
  - `api/taste.js` — proxies the AI taste-read call to Anthropic; holds
    `ANTHROPIC_API_KEY` server-side only

Neither secret is ever sent to or readable from the browser.

## Demo vs. live mode

Set `VITE_USE_LIVE=true` to hit the real Renaiss proxy. Leave it unset (or
`false`) to run entirely on mock data shaped like the real partner-tier
response — useful for local dev or a backup demo path if the network drops.

The taste-read layer is independent: if `ANTHROPIC_API_KEY` isn't configured,
`api/taste.js` returns a deterministic mock read instead of failing, so the
full flow always works.

## Quick start

```bash
cp .env.example .env
npm install
npm run dev
```

See [DEPLOY.md](./DEPLOY.md) for Vercel deployment steps.
