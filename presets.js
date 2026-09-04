/**
 * MTG Arena Prepopulated Event Definitions
 */
export const DEFAULT_VALUATIONS = {
  gemsBundlePrice: 100,      // $100 USD
  gemsBundleAmount: 20000,   // 20,000 gems ($0.005 / gem)
  packValue: 0.00,          // $0 USD
  playBoxValue: 100.00,      // $100 USD
  collectorBoxValue: 400.00, // $400 USD
  otherValue: 0.00,          // $0 USD
};

export const PRESET_EVENTS = [
  {
    id: 'arena_direct_play',
    name: 'Arena Direct: Play Booster Box',
    category: 'Arena Direct',
    description: 'High-stakes Bo1 event. Win up to 2 physical Play Booster Boxes (7 wins max, 2 losses).',
    entryGems: 8000,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 2,
    formatType: 'elimination', // 'elimination' (X losses or max wins) or 'fixed_matches' (fixed round count)
    isBo3: false,
    rewards: [
      { wins: 0, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 3600, packs: 8, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 7200, packs: 16, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 10800, packs: 24, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 0, packs: 0, playBoxes: 1, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 0, packs: 0, playBoxes: 2, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'arena_direct_collector',
    name: 'Arena Direct: Collector Booster Box',
    category: 'Arena Direct',
    description: 'High-stakes Bo1 event. Win 1 physical Collector Booster Box at 7 wins (7 wins max, 2 losses).',
    entryGems: 8000,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 2,
    formatType: 'elimination',
    isBo3: false,
    rewards: [
      { wins: 0, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 3600, packs: 8, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 7200, packs: 16, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 10800, packs: 24, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 14400, packs: 32, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 1, other: 0 }
    ]
  },
  {
    id: 'premier_draft',
    name: 'Premier Draft (Bo1)',
    category: 'Limited Draft',
    description: 'Ranked Player Draft (Bo1). Play until 7 wins or 3 losses.',
    entryGems: 1500,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 3,
    formatType: 'elimination',
    isBo3: false,
    rewards: [
      { wins: 0, gems: 50, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 100, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 250, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 1000, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 1400, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 1600, packs: 4, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 1800, packs: 5, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 2200, packs: 6, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'quick_draft',
    name: 'Quick Draft (Bo1)',
    category: 'Limited Draft',
    description: 'Ranked Bot Draft (Bo1). Play until 7 wins or 3 losses.',
    entryGems: 750,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 3,
    formatType: 'elimination',
    isBo3: false,
    rewards: [
      { wins: 0, gems: 50, packs: 1.2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 100, packs: 1.22, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 200, packs: 1.24, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 300, packs: 1.26, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 450, packs: 1.3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 650, packs: 1.35, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 850, packs: 1.4, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 950, packs: 2.0, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'traditional_draft',
    name: 'Traditional Draft (Bo3)',
    category: 'Limited Draft',
    description: 'Unranked Player Draft (Bo3 matches). Exactly 3 matches played.',
    entryGems: 1500,
    entryUSD: 0,
    maxWins: 3,
    maxLosses: 3,
    formatType: 'fixed_matches',
    isBo3: true,
    rewards: [
      { wins: 0, gems: 100, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 250, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 1000, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 2500, packs: 6, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'sealed_bo1',
    name: 'Sealed Deck (Bo1)',
    category: 'Limited Sealed',
    description: 'Bo1 Sealed Deck. Play until 7 wins or 3 losses.',
    entryGems: 2000,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 3,
    formatType: 'elimination',
    isBo3: false,
    rewards: [
      { wins: 0, gems: 200, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 400, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 600, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 1200, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 1400, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 1600, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 2000, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 2200, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'sealed_bo3',
    name: 'Traditional Sealed (Bo3)',
    category: 'Limited Sealed',
    description: 'Bo3 Sealed Deck. Play 4 matches.',
    entryGems: 2000,
    entryUSD: 0,
    maxWins: 4,
    maxLosses: 4,
    formatType: 'fixed_matches',
    isBo3: true,
    rewards: [
      { wins: 0, gems: 200, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 500, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 1200, packs: 4, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 1800, packs: 6, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 2200, packs: 9, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'constructed_bo1',
    name: 'Constructed Event (Bo1)',
    category: 'Constructed',
    description: 'Standard / Alchemy / Explorer / Historic Bo1 Event. 7 wins or 3 losses.',
    entryGems: 375,
    entryUSD: 0,
    maxWins: 7,
    maxLosses: 3,
    formatType: 'elimination',
    isBo3: false,
    rewards: [
      { wins: 0, gems: 25, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 50, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 75, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 200, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 300, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 400, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 6, gems: 450, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 7, gems: 500, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  },
  {
    id: 'constructed_bo3',
    name: 'Traditional Constructed (Bo3)',
    category: 'Constructed',
    description: 'Standard / Alchemy / Explorer / Historic Bo3 Event. 5 wins or 2 losses.',
    entryGems: 750,
    entryUSD: 0,
    maxWins: 5,
    maxLosses: 2,
    formatType: 'elimination',
    isBo3: true,
    rewards: [
      { wins: 0, gems: 50, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 1, gems: 100, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 2, gems: 150, packs: 1, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 3, gems: 600, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 4, gems: 800, packs: 2, playBoxes: 0, collectorBoxes: 0, other: 0 },
      { wins: 5, gems: 1000, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 }
    ]
  }
];
