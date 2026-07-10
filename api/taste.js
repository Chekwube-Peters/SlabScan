import Anthropic from '@anthropic-ai/sdk';

// Server-side only — ANTHROPIC_API_KEY never reaches the browser. If it's
// unset (e.g. local dev with no keys configured), we fall back to a
// deterministic mock taste read so the demo still works end to end.

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-8';

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const TASTE_SCHEMA = {
  type: 'object',
  properties: {
    taste: { type: 'string', enum: ['HOLD', 'SELL', 'CHASE', 'PASS'] },
    reasoning: { type: 'string' },
  },
  required: ['taste', 'reasoning'],
  additionalProperties: false,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const card = req.body;
  if (!card || typeof card !== 'object' || !card.grade) {
    res.status(400).json({ error: 'missing_card_data' });
    return;
  }

  if (!client) {
    res.status(200).json(mockTasteRead(card));
    return;
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: TASTE_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content:
            'You are a sharp, opinionated trading-card market analyst for SlabScan. ' +
            'Given this graded card valuation from the Renaiss OS Index, give a taste call ' +
            '(HOLD, SELL, CHASE, or PASS) plus 1-2 punchy sentences of reasoning a collector ' +
            `would find useful.\n\nCard data:\n${JSON.stringify(card, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const parsed = textBlock ? JSON.parse(textBlock.text) : null;

    if (!parsed || !parsed.taste) {
      res.status(200).json(mockTasteRead(card));
      return;
    }

    res.status(200).json(parsed);
  } catch (err) {
    console.error('taste read error:', err.message);
    res.status(200).json(mockTasteRead(card));
  }
}

function mockTasteRead(valuation) {
  const card = valuation.card || {};
  const confidence = typeof card.confidence === 'string' ? card.confidence.toLowerCase() : null;
  const freshness = card.lastSaleAt
    ? Math.round((Date.now() - new Date(card.lastSaleAt).getTime()) / 86400000)
    : null;

  if (confidence === 'high' && freshness !== null && freshness <= 7) {
    return {
      taste: 'CHASE',
      reasoning: 'Strong, fresh pricing data backs this one — good entry if you don\'t already own it.',
    };
  }
  if (confidence === null || confidence === 'low') {
    return {
      taste: 'PASS',
      reasoning: 'Thin or missing comp data makes this price unreliable — wait for more market signal before acting.',
    };
  }
  if (freshness === null || freshness > 21) {
    return {
      taste: 'SELL',
      reasoning: 'Pricing data is getting stale — lock in the estimate now rather than ride an uncertain trend.',
    };
  }
  return {
    taste: 'HOLD',
    reasoning: 'Solid, moderately fresh valuation — no strong signal to move yet.',
  };
}
