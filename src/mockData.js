// Mock data mirrors the real Renaiss OS Index response shape from
// POST /v1/graded/by-image (terminal SSE "result" event), confirmed against
// a live scan. Price/confidence/lastSaleAt are legitimately null upstream
// for cards without enough market data — the third entry exercises that.
const MOCK_CARDS = [
  {
    cert: '43127665',
    company: 'PSA',
    grade: '10',
    gradeLabel: 'PSA 10',
    found: true,
    card: {
      name: 'Charizard',
      setName: 'Base Set',
      priceUsdCents: 425000,
      deltaPct: 4.2,
      confidence: 'high',
      lastSaleAt: '2026-07-06T00:00:00.000Z',
    },
  },
  {
    cert: 'BGS0012345678',
    company: 'BGS',
    grade: '9.5',
    gradeLabel: 'BGS 9.5',
    found: true,
    card: {
      name: 'Blastoise',
      setName: 'Base Set',
      priceUsdCents: 61200,
      deltaPct: -1.8,
      confidence: 'medium',
      lastSaleAt: '2026-06-27T00:00:00.000Z',
    },
  },
  {
    cert: 'CGC0098765',
    company: 'CGC',
    grade: '9',
    gradeLabel: 'CGC 9',
    found: true,
    card: {
      name: 'Monkey.D.Luffy P/(Gift Collection 2023)',
      setName: 'One Piece Card Game Promos Japanese',
      priceUsdCents: null,
      deltaPct: null,
      confidence: null,
      lastSaleAt: null,
    },
  },
];

let cursor = 0;

export function getMockValuation() {
  const card = MOCK_CARDS[cursor % MOCK_CARDS.length];
  cursor += 1;
  return card;
}
