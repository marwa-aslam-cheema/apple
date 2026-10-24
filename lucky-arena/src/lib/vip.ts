export interface VipTier {
  name: string;
  minXp: number;
  dailyBonus: number; // extra credits added to the daily bonus
  perk: string;
}

export const VIP_TIERS: VipTier[] = [
  { name: "Bronze", minXp: 0, dailyBonus: 0, perk: "Welcome tier" },
  { name: "Silver", minXp: 200, dailyBonus: 25, perk: "+25 daily bonus" },
  { name: "Gold", minXp: 600, dailyBonus: 60, perk: "+60 daily bonus" },
  { name: "Platinum", minXp: 1500, dailyBonus: 120, perk: "+120 daily bonus" },
  { name: "Diamond", minXp: 3500, dailyBonus: 250, perk: "+250 daily bonus, golden badge" },
];

export function tierForXp(xp: number): { tier: VipTier; index: number; next: VipTier | null; progress: number } {
  let index = 0;
  for (let i = 0; i < VIP_TIERS.length; i++) if (xp >= VIP_TIERS[i].minXp) index = i;
  const tier = VIP_TIERS[index];
  const next = VIP_TIERS[index + 1] ?? null;
  const progress = next ? Math.min(1, (xp - tier.minXp) / (next.minXp - tier.minXp)) : 1;
  return { tier, index, next, progress };
}
