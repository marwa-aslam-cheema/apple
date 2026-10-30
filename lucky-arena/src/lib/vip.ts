export interface VipTier {
  name: string;
  minXp: number;
  dailyBonus: number; // extra credits added to the daily bonus
  perk: string;
}

export const VIP_TIERS: VipTier[] = [
  { name: "Bronze", minXp: 0, dailyBonus: 0, perk: "Welcome tier" },
  { name: "Silver", minXp: 100, dailyBonus: 0, perk: "Silver badge" },
  { name: "Gold", minXp: 400, dailyBonus: 1, perk: "+1 daily bonus (from your 2nd daily claim)" },
  { name: "Platinum", minXp: 1000, dailyBonus: 1, perk: "+1 daily bonus (from your 2nd daily claim)" },
  { name: "Diamond", minXp: 2500, dailyBonus: 1, perk: "+1 daily bonus, golden badge" },
];


export function tierForXp(xp: number): { tier: VipTier; index: number; next: VipTier | null; progress: number } {
  let index = 0;
  for (let i = 0; i < VIP_TIERS.length; i++) if (xp >= VIP_TIERS[i].minXp) index = i;
  const tier = VIP_TIERS[index];
  const next = VIP_TIERS[index + 1] ?? null;
  const progress = next ? Math.min(1, (xp - tier.minXp) / (next.minXp - tier.minXp)) : 1;
  return { tier, index, next, progress };
}
