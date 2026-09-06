/**
 * Mathematical Calculation Engine for MTG Arena EV Calculator
 */

// Memoized factorial / combination computation
const factorialCache = [1n];
function factorialBigInt(n) {
  while (factorialCache.length <= n) {
    const nextVal = BigInt(factorialCache.length) * factorialCache[factorialCache.length - 1];
    factorialCache.push(nextVal);
  }
  return factorialCache[n];
}

export function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const num = factorialBigInt(n);
  const den = factorialBigInt(k) * factorialBigInt(n - k);
  return Number(num / den);
}

/**
 * Converts Game Win Rate to Best-of-3 Match Win Rate
 * P(Match Win) = P(2-0) + P(2-1) = p^2 + 2 * p^2 * (1-p) = 3*p^2 - 2*p^3
 */
export function gameWinRateToMatchWinRate(gameWinRate) {
  const p = Math.max(0, Math.min(1, gameWinRate));
  return 3 * p * p - 2 * p * p * p;
}

/**
 * Converts Match Win Rate to Game Win Rate (inverse of 3p^2 - 2p^3)
 */
export function matchWinRateToGameWinRate(matchWinRate) {
  const target = Math.max(0, Math.min(1, matchWinRate));
  if (target <= 0) return 0;
  if (target >= 1) return 1;
  let low = 0, high = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    const m = 3 * mid * mid - 2 * mid * mid * mid;
    if (m < target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/**
 * Checks if an event's gem rewards do not scale monotonically/linearly with # of wins
 * (e.g. Arena Direct where gem payouts peak and then drop to 0 at higher tiers).
 */
export function hasNonLinearGemPayout(eventConfig) {
  if (!eventConfig || !eventConfig.rewards || eventConfig.rewards.length < 2) return false;
  
  if (eventConfig.id === 'arena_direct_play' || eventConfig.id === 'arena_direct_collector') {
    return true;
  }

  const rewards = eventConfig.rewards;
  let maxGemSoFar = -1;
  for (let i = 0; i < rewards.length; i++) {
    const g = rewards[i].gems || 0;
    if (g < maxGemSoFar) {
      return true;
    }
    if (g > maxGemSoFar) {
      maxGemSoFar = g;
    }
  }

  return false;
}

/**
 * Returns the default win tier to quit at for non-linear gem payout events
 * (5 for Play Box, 6 for Collector Box, or the peak gem tier).
 */
export function getDefaultQuitWins(eventConfig) {
  if (!eventConfig) return 5;
  if (eventConfig.id === 'arena_direct_play') return 5;
  if (eventConfig.id === 'arena_direct_collector') return 6;

  const rewards = eventConfig.rewards || [];
  let maxGems = -1;
  let peakWin = 5;
  for (let i = 0; i < rewards.length; i++) {
    const g = rewards[i].gems || 0;
    if (g > maxGems) {
      maxGems = g;
      peakWin = rewards[i].wins !== undefined ? rewards[i].wins : i;
    }
  }
  return peakWin;
}

/**
 * Calculate win probabilities for each win count (0 .. maxWins)
 * @param {number} maxWins - Maximum wins (e.g. 7, 3, 5)
 * @param {number} maxLosses - Maximum losses before elimination (e.g. 3, 2)
 * @param {string} formatType - 'elimination' or 'fixed_matches'
 * @param {number} effectiveWinRate - Win probability between 0 and 1
 * @param {number|null} padUpToMaxWins - Optional target win count to pad 0-probability rows up to
 * @returns {Array<{ wins: number, probability: number, expectedGames: number }>}
 */
export function calculateWinDistribution(maxWins, maxLosses, formatType, effectiveWinRate, padUpToMaxWins = null) {
  const p = Math.max(0, Math.min(1, effectiveWinRate));
  const q = 1 - p;
  const distribution = [];
  const targetPad = padUpToMaxWins !== null ? Math.max(maxWins, padUpToMaxWins) : maxWins;

  if (formatType === 'fixed_matches') {
    const M = maxWins;
    for (let w = 0; w <= M; w++) {
      let prob = 0;
      if (p === 0) {
        prob = (w === 0) ? 1 : 0;
      } else if (p === 1) {
        prob = (w === M) ? 1 : 0;
      } else {
        prob = combinations(M, w) * Math.pow(p, w) * Math.pow(q, M - w);
      }
      distribution.push({
        wins: w,
        probability: prob,
        expectedGames: M
      });
    }
    for (let w = M + 1; w <= targetPad; w++) {
      distribution.push({
        wins: w,
        probability: 0,
        expectedGames: 0
      });
    }
    return distribution;
  }

  // Elimination format (X losses or maxWins)
  const L = Math.max(1, maxLosses);
  const W = Math.max(1, maxWins);

  // 1. For wins w < W: player finishes with w wins and L losses (last game is loss L)
  for (let w = 0; w < W; w++) {
    let prob = 0;
    if (p === 0) {
      // 0 win rate: 100% chance to finish at 0 wins with L losses
      prob = (w === 0) ? 1 : 0;
    } else if (p === 1) {
      prob = 0;
    } else {
      // Games played = w + L. First w + L - 1 games had w wins and L - 1 losses.
      const ways = combinations(w + L - 1, w);
      prob = ways * Math.pow(p, w) * Math.pow(q, L);
    }
    distribution.push({
      wins: w,
      probability: prob,
      expectedGames: w + L
    });
  }

  // 2. For wins w === W: player reaches W wins with l losses (0 <= l < L)
  let maxWinsProb = 0;
  let maxWinsWeightedGames = 0;

  if (p === 1) {
    maxWinsProb = 1;
    maxWinsWeightedGames = W;
  } else if (p === 0) {
    maxWinsProb = 0;
    maxWinsWeightedGames = 0;
  } else {
    for (let l = 0; l < L; l++) {
      const ways = combinations(W + l - 1, l);
      const probL = ways * Math.pow(p, W) * Math.pow(q, l);
      maxWinsProb += probL;
      maxWinsWeightedGames += probL * (W + l);
    }
  }

  distribution.push({
    wins: W,
    probability: maxWinsProb,
    expectedGames: maxWinsProb > 0 ? (maxWinsWeightedGames / maxWinsProb) : W
  });

  // Pad remaining wins up to targetPad with 0 probability
  for (let w = W + 1; w <= targetPad; w++) {
    distribution.push({
      wins: w,
      probability: 0,
      expectedGames: 0
    });
  }

  return distribution;
}

/**
 * Retrieves the baseline reward object for an event (packs, gems, etc. given to all participants)
 */
export function getEventBaseline(eventConfig) {
  if (eventConfig && eventConfig.baseline) {
    return {
      gems: eventConfig.baseline.gems || 0,
      packs: eventConfig.baseline.packs || 0,
      playBoxes: eventConfig.baseline.playBoxes || 0,
      collectorBoxes: eventConfig.baseline.collectorBoxes || 0,
      other: eventConfig.baseline.other || 0
    };
  }
  // Default fallbacks based on category/name if not explicitly set
  if (eventConfig?.category === 'Arena Direct' || eventConfig?.id?.includes('arena_direct')) {
    return { gems: 0, packs: 6, playBoxes: 0, collectorBoxes: 0, other: 0 };
  }
  if (eventConfig?.category === 'Limited Sealed' || eventConfig?.id?.includes('sealed')) {
    return { gems: 0, packs: 6, playBoxes: 0, collectorBoxes: 0, other: 0 };
  }
  if (eventConfig?.category === 'Limited Draft' || eventConfig?.id?.includes('draft')) {
    return { gems: 0, packs: 3, playBoxes: 0, collectorBoxes: 0, other: 0 };
  }
  return { gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 };
}

/**
 * Combines tier-specific rewards with the baseline rewards
 */
export function getEffectiveReward(reward, baseline) {
  const b = baseline || { gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 };
  const r = reward || { gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 };
  return {
    wins: r.wins !== undefined ? r.wins : 0,
    gems: (r.gems || 0) + (b.gems || 0),
    packs: (r.packs || 0) + (b.packs || 0),
    playBoxes: (r.playBoxes || 0) + (b.playBoxes || 0),
    collectorBoxes: (r.collectorBoxes || 0) + (b.collectorBoxes || 0),
    other: (r.other || 0) + (b.other || 0)
  };
}

/**
 * Calculates valuation for a single reward tier in USD
 */
export function calculateRewardUSD(reward, valuations) {
  const gemUnitRate = valuations.gemsBundlePrice / (valuations.gemsBundleAmount || 20000);
  const gemVal = (reward.gems || 0) * gemUnitRate;
  const packVal = (reward.packs || 0) * (valuations.packValue || 0);
  const playBoxVal = (reward.playBoxes || 0) * (valuations.playBoxValue || 0);
  const collectorBoxVal = (reward.collectorBoxes || 0) * (valuations.collectorBoxValue || 0);
  const otherVal = (reward.other || 0) * (valuations.otherValue !== undefined ? valuations.otherValue : 1);
  return gemVal + packVal + playBoxVal + collectorBoxVal + otherVal;
}

/**
 * Calculates Entry Fee in USD
 */
export function calculateEntryFeeUSD(eventConfig, valuations) {
  const gemUnitRate = valuations.gemsBundlePrice / (valuations.gemsBundleAmount || 20000);
  const gemsCostUSD = (eventConfig.entryGems || 0) * gemUnitRate;
  const directUSD = eventConfig.entryUSD || 0;
  return gemsCostUSD + directUSD;
}

/**
 * Compute detailed EV metrics for a given win rate, optionally supporting early quitting strategy
 */
export function computeEventEV(eventConfig, valuations, winRatePct, isGameWinRateForBo3 = true, quitEarlyWins = null) {
  const winRate = winRatePct / 100;
  let effectiveWinRate = winRate;
  if (eventConfig.isBo3 && isGameWinRateForBo3) {
    effectiveWinRate = gameWinRateToMatchWinRate(winRate);
  }

  const effectiveMaxWins = (quitEarlyWins !== null && quitEarlyWins !== undefined && quitEarlyWins > 0 && quitEarlyWins < eventConfig.maxWins)
    ? quitEarlyWins
    : eventConfig.maxWins;

  const distribution = calculateWinDistribution(
    effectiveMaxWins,
    eventConfig.maxLosses,
    eventConfig.formatType,
    effectiveWinRate,
    eventConfig.maxWins
  );

  const gemUnitRate = valuations.gemsBundlePrice / (valuations.gemsBundleAmount || 20000);
  const entryFeeUSD = calculateEntryFeeUSD(eventConfig, valuations);
  const entryGems = eventConfig.entryGems || 0;
  const baseline = getEventBaseline(eventConfig);

  let expGems = 0;
  let expPacks = 0;
  let expPlayBoxes = 0;
  let expCollectorBoxes = 0;
  let expOther = 0;
  let expGrossUSD = 0;
  let expTotalGames = 0;
  let probProfitable = 0;
  let probAnyReward = 0;

  // Map rewards by win count
  const rewardsMap = new Map();
  (eventConfig.rewards || []).forEach(r => {
    rewardsMap.set(r.wins, r);
  });

  distribution.forEach(item => {
    const r = rewardsMap.get(item.wins) || { gems: 0, packs: 0, playBoxes: 0, collectorBoxes: 0, other: 0 };
    const effectiveReward = getEffectiveReward(r, baseline);
    const tierGrossUSD = calculateRewardUSD(effectiveReward, valuations);
    
    expGems += item.probability * (effectiveReward.gems || 0);
    expPacks += item.probability * (effectiveReward.packs || 0);
    expPlayBoxes += item.probability * (effectiveReward.playBoxes || 0);
    expCollectorBoxes += item.probability * (effectiveReward.collectorBoxes || 0);
    expOther += item.probability * (effectiveReward.other || 0);
    expGrossUSD += item.probability * tierGrossUSD;
    expTotalGames += item.probability * item.expectedGames;

    if (tierGrossUSD > entryFeeUSD) {
      probProfitable += item.probability;
    }
    if (tierGrossUSD > 0) {
      probAnyReward += item.probability;
    }
  });

  const expNetUSD = expGrossUSD - entryFeeUSD;
  const expNetGems = expGems - entryGems;
  const roiPct = entryFeeUSD > 0 ? (expNetUSD / entryFeeUSD) * 100 : 0;
  const gemReturnPct = entryGems > 0 ? (expGems / entryGems) * 100 : 0;

  const avgGameTime = (valuations && valuations.avgGameTimeMinutes !== undefined && !isNaN(valuations.avgGameTimeMinutes))
    ? Math.max(1, valuations.avgGameTimeMinutes)
    : 20;
  const expDurationHours = (expTotalGames * avgGameTime) / 60;
  const expUSDPerHour = expDurationHours > 0 ? (expNetUSD / expDurationHours) : 0;

  return {
    winRatePct,
    effectiveWinRatePct: effectiveWinRate * 100,
    entryFeeUSD,
    entryGems,
    expGrossUSD,
    expNetUSD,
    expUSDPerHour,
    expDurationHours,
    expGems,
    expNetGems,
    expPacks,
    expPlayBoxes,
    expCollectorBoxes,
    expOther,
    roiPct,
    gemReturnPct,
    probProfitablePct: probProfitable * 100,
    probAnyRewardPct: probAnyReward * 100,
    expTotalGames,
    distribution
  };
}

/**
 * Find Break-Even Win Rate (Net USD = 0) and Infinite Gems Win Rate (Net Gems = 0)
 */
export function findBreakEvenWinRates(eventConfig, valuations, isGameWinRateForBo3 = true, quitEarlyWins = null) {
  let low = 0, high = 100;
  let breakEvenUSD = null;

  // Binary search for Net USD == 0
  const ev0 = computeEventEV(eventConfig, valuations, 0, isGameWinRateForBo3, quitEarlyWins).expNetUSD;
  const ev100 = computeEventEV(eventConfig, valuations, 100, isGameWinRateForBo3, quitEarlyWins).expNetUSD;

  if (ev0 <= 0 && ev100 >= 0) {
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      const res = computeEventEV(eventConfig, valuations, mid, isGameWinRateForBo3, quitEarlyWins);
      if (res.expNetUSD < 0) {
        low = mid;
      } else {
        high = mid;
      }
    }
    breakEvenUSD = (low + high) / 2;
  } else if (ev0 > 0) {
    breakEvenUSD = 0;
  }

  // Binary search for Net Gems == 0
  let breakEvenGems = null;
  const gems0 = computeEventEV(eventConfig, valuations, 0, isGameWinRateForBo3, quitEarlyWins).expNetGems;
  const gems100 = computeEventEV(eventConfig, valuations, 100, isGameWinRateForBo3, quitEarlyWins).expNetGems;

  if (gems0 <= 0 && gems100 >= 0) {
    low = 0; high = 100;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      const res = computeEventEV(eventConfig, valuations, mid, isGameWinRateForBo3, quitEarlyWins);
      if (res.expNetGems < 0) {
        low = mid;
      } else {
        high = mid;
      }
    }
    breakEvenGems = (low + high) / 2;
  } else if (gems0 > 0) {
    breakEvenGems = 0;
  }

  return {
    breakEvenUSD,
    breakEvenGems
  };
}
