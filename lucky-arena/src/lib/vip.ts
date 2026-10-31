export interface VipTier {
  name: string;
  minXp: number;
  perk: string;
}

export const VIP_TIERS: VipTier[] = [
  { name: "Bronze", minXp: 0, perk: "Welcome tier" },
  { name: "Silver", minXp: 100, perk: "Silver badge" },
  { name: "Gold", minXp: 400, perk: "Gold badge" },
  { name: "Platinum", minXp: 1000, perk: "Platinum badge" },
  { name: "Diamond", minXp: 2500, perk: "Golden badge" },
];

export function tierForXp(xp: number): { tier: VipTier; index: number; next: VipTier | null; progress: number } {
  let index = 0;
  for (let i = 0; i < VIP_TIERS.length; i++) if (xp >= VIP_TIERS[i].minXp) index = i;
  const tier = VIP_TIERS[index];
  const next = VIP_TIERS[index + 1] ?? null;
  const progress = next ? Math.min(1, (xp - tier.minXp) / (next.minXp - tier.minXp)) : 1;
  return { tier, index, next, progress };
}
