/**
 * SPARTAN QUANT AI BOT - RESELLER TIER & REBATE ENGINE
 * Defines the 10-level affiliate matrix and dynamic tier evaluation rules.
 */

export interface ResellerTierInfo {
  tier: number;
  rankName: string;
  shareDescription: string;
  rebateRate: number;
  badgeStyle: string;
  requirementText: string;
}

export const RESELLER_TIERS_MATRIX: ResellerTierInfo[] = [
  { tier: 10, rankName: 'RESELLER LEVEL 10 (TOP MASTER)', shareDescription: '20% FEE REBATE', rebateRate: 0.20, requirementText: 'Master Reseller ($100kU Volume)', badgeStyle: 'bg-[#ff5500]/20 text-[#ff5500] border-[#ff5500]/40 shadow-[0_0_10px_rgba(255,85,0,0.3)]' },
  { tier: 9,  rankName: 'RESELLER LEVEL 9',               shareDescription: '18% FEE REBATE', rebateRate: 0.18, requirementText: '$75,000U Volume Requirement', badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { tier: 8,  rankName: 'RESELLER LEVEL 8',               shareDescription: '16% FEE REBATE', rebateRate: 0.16, requirementText: '$50,000U Volume Requirement', badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { tier: 7,  rankName: 'RESELLER LEVEL 7',               shareDescription: '14% FEE REBATE', rebateRate: 0.14, requirementText: '$35,000U Volume Requirement', badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { tier: 6,  rankName: 'RESELLER LEVEL 6',               shareDescription: '12% FEE REBATE', rebateRate: 0.12, requirementText: '$20,000U Volume Requirement', badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { tier: 5,  rankName: 'RESELLER LEVEL 5',               shareDescription: '10% FEE REBATE', rebateRate: 0.10, requirementText: '$10,000U Volume Requirement', badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { tier: 4,  rankName: 'RESELLER LEVEL 4',               shareDescription: '8% FEE REBATE',  rebateRate: 0.08, requirementText: '$5,000U Volume Requirement',  badgeStyle: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  { tier: 3,  rankName: 'RESELLER LEVEL 3',               shareDescription: '6% FEE REBATE',  rebateRate: 0.06, requirementText: '10 Active F1s or $2,500U Volume', badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { tier: 2,  rankName: 'RESELLER LEVEL 2',               shareDescription: '4% FEE REBATE',  rebateRate: 0.04, requirementText: '5 Active F1s or $1,000U Volume', badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { tier: 1,  rankName: 'RESELLER LEVEL 1 (STARTING)',    shareDescription: '2% FEE REBATE',  rebateRate: 0.02, requirementText: 'Starting Reseller Tier', badgeStyle: 'bg-gray-800 text-gray-300 border-gray-700' },
];

/**
 * Dynamically computes a user's Reseller Tier based on active F1 count and total network volume.
 */
export function calculateResellerTier(f1Count: number = 0, networkVolume: number = 0): ResellerTierInfo {
  if (networkVolume >= 100000) return RESELLER_TIERS_MATRIX[0];
  if (networkVolume >= 75000)  return RESELLER_TIERS_MATRIX[1];
  if (networkVolume >= 50000)  return RESELLER_TIERS_MATRIX[2];
  if (networkVolume >= 35000)  return RESELLER_TIERS_MATRIX[3];
  if (networkVolume >= 20000)  return RESELLER_TIERS_MATRIX[4];
  if (networkVolume >= 10000)  return RESELLER_TIERS_MATRIX[5];
  if (networkVolume >= 5000)   return RESELLER_TIERS_MATRIX[6];
  if (f1Count >= 10 || networkVolume >= 2500) return RESELLER_TIERS_MATRIX[7]; // Level 3
  if (f1Count >= 5 || networkVolume >= 1000)  return RESELLER_TIERS_MATRIX[8]; // Level 2
  return RESELLER_TIERS_MATRIX[9]; // Level 1
}
