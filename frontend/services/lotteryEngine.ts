import { LotteryRankSettings, PrizeRankTierConfig } from '../types';

export interface LotteryDrawResult {
  wonTierRank: number | null; // 1 ~ 5, or null for miss
  rankName: string;
  points: number;
  note: string;
  updatedTiers: PrizeRankTierConfig[];
}

/**
 * Draws a lottery prize based on the active 1st ~ 5th ranks, probability weights,
 * and daily quota availability.
 */
export function drawLotteryPrize(settings: LotteryRankSettings): LotteryDrawResult {
  const maxRanks = settings.maxRanksEnabled;
  const activeTiers = settings.tiers.filter((t) => t.rank <= maxRanks);

  // Eligible tiers that have not exceeded today's quota
  const eligibleTiers = activeTiers.filter(
    (tier) => tier.awardedTodayCount < tier.dailyMaxQuota
  );

  // Roll 0 ~ 100
  const randomRoll = Math.random() * 100;
  let accumulatedProbability = 0;
  let pickedTier: PrizeRankTierConfig | null = null;

  for (const tier of eligibleTiers) {
    accumulatedProbability += tier.probabilityPercent;
    if (randomRoll <= accumulatedProbability) {
      pickedTier = tier;
      break;
    }
  }

  // If a tier is picked and quota remains
  if (pickedTier) {
    const updatedTiers = settings.tiers.map((t) => {
      if (t.rank === pickedTier!.rank) {
        return {
          ...t,
          awardedTodayCount: t.awardedTodayCount + 1,
        };
      }
      return t;
    });

    return {
      wonTierRank: pickedTier.rank,
      rankName: pickedTier.name,
      points: pickedTier.points,
      note: `${pickedTier.name} 当選 (${pickedTier.points}pt)`,
      updatedTiers,
    };
  }

  // Miss / Participation prize
  const missPoints = settings.missPrize.points;
  return {
    wonTierRank: null,
    rankName: '参加賞（ハズレ）',
    points: missPoints,
    note: `参加賞 (${missPoints}pt)`,
    updatedTiers: settings.tiers,
  };
}
