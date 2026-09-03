/**
 * SPARTAN QUANT AI BOT - RESELLER TIER & REBATE ENGINE
 * Defines the 10-level affiliate matrix and dynamic tier evaluation rules.
 * Approved "Generous Revenue Sharing" Model:
 * - Deposit Fee Rebate: 15% to 50%
 * - High-Water Mark (HWM) Performance Fee Rebate: 10% to 35%
 * - P2P OTC & Margin Loan Rebate: 35%
 */

export interface ResellerTierInfo {
  tier: number;
  rankName: string;
  depositRebatePct: number;    // 15% - 50%
  hwmRebatePct: number;        // 10% - 35%
  p2pRebatePct: number;        // 35%
  rebateRate: number;          // Backward-compatible (depositRebatePct / 100)
  shareDescription: string;
  depositPer1k: string;        // e.g. "+$45.00 USDT / $1k nạp"
  hwmDescription: string;      // e.g. "35% Lãi Bot HWM"
  requirementText: string;
  estimatedMonthlyIncome: string; // e.g. "$5,500 - $12,000+ USDT/tháng"
  badgeStyle: string;
}

export const RESELLER_TIERS_MATRIX: ResellerTierInfo[] = [
  { 
    tier: 10, 
    rankName: 'RESELLER LEVEL 10 (TOP MASTER)', 
    depositRebatePct: 50.0, 
    hwmRebatePct: 35.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.50,
    shareDescription: '50% NẠP (50/50 SÀN) + 35% LÃI HWM', 
    depositPer1k: '+$45.00 USDT / $1,000U nạp',
    hwmDescription: '35% Lãi Bot HWM',
    requirementText: 'Master Leader (50+ F1s / $100kU Volume)', 
    estimatedMonthlyIncome: '$5,500 - $12,000+ USDT/tháng',
    badgeStyle: 'bg-[#ff5500]/20 text-[#ff5500] border-[#ff5500]/40 shadow-[0_0_15px_rgba(255,85,0,0.4)]' 
  },
  { 
    tier: 9,  
    rankName: 'RESELLER LEVEL 9', 
    depositRebatePct: 48.0, 
    hwmRebatePct: 30.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.48,
    shareDescription: '48% NẠP + 30% LÃI HWM', 
    depositPer1k: '+$43.20 USDT / $1,000U nạp',
    hwmDescription: '30% Lãi Bot HWM',
    requirementText: '45 F1s / $75,000U Volume', 
    estimatedMonthlyIncome: '$4,200 - $5,500 USDT/tháng',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
  },
  { 
    tier: 8,  
    rankName: 'RESELLER LEVEL 8', 
    depositRebatePct: 45.0, 
    hwmRebatePct: 28.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.45,
    shareDescription: '45% NẠP + 28% LÃI HWM', 
    depositPer1k: '+$40.50 USDT / $1,000U nạp',
    hwmDescription: '28% Lãi Bot HWM',
    requirementText: '40 F1s / $50,000U Volume', 
    estimatedMonthlyIncome: '$3,000 - $4,200 USDT/tháng',
    badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
  },
  { 
    tier: 7,  
    rankName: 'RESELLER LEVEL 7', 
    depositRebatePct: 42.0, 
    hwmRebatePct: 25.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.42,
    shareDescription: '42% NẠP + 25% LÃI HWM', 
    depositPer1k: '+$37.80 USDT / $1,000U nạp',
    hwmDescription: '25% Lãi Bot HWM',
    requirementText: '35 F1s / $35,000U Volume', 
    estimatedMonthlyIncome: '$2,200 - $3,000 USDT/tháng',
    badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
  },
  { 
    tier: 6,  
    rankName: 'RESELLER LEVEL 6', 
    depositRebatePct: 40.0, 
    hwmRebatePct: 22.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.40,
    shareDescription: '40% NẠP + 22% LÃI HWM', 
    depositPer1k: '+$36.00 USDT / $1,000U nạp',
    hwmDescription: '22% Lãi Bot HWM',
    requirementText: '30 F1s / $20,000U Volume', 
    estimatedMonthlyIncome: '$1,500 - $2,200 USDT/tháng',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
  },
  { 
    tier: 5,  
    rankName: 'RESELLER LEVEL 5', 
    depositRebatePct: 35.0, 
    hwmRebatePct: 20.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.35,
    shareDescription: '35% NẠP + 20% LÃI HWM', 
    depositPer1k: '+$31.50 USDT / $1,000U nạp',
    hwmDescription: '20% Lãi Bot HWM',
    requirementText: '25 F1s / $10,000U Volume', 
    estimatedMonthlyIncome: '$1,000 - $1,500 USDT/tháng',
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
  },
  { 
    tier: 4,  
    rankName: 'RESELLER LEVEL 4', 
    depositRebatePct: 30.0, 
    hwmRebatePct: 18.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.30,
    shareDescription: '30% NẠP + 18% LÃI HWM', 
    depositPer1k: '+$27.00 USDT / $1,000U nạp',
    hwmDescription: '18% Lãi Bot HWM',
    requirementText: '20 F1s / $5,000U Volume', 
    estimatedMonthlyIncome: '$600 - $1,000 USDT/tháng',
    badgeStyle: 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
  },
  { 
    tier: 3,  
    rankName: 'RESELLER LEVEL 3', 
    depositRebatePct: 25.0, 
    hwmRebatePct: 15.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.25,
    shareDescription: '25% NẠP + 15% LÃI HWM', 
    depositPer1k: '+$22.50 USDT / $1,000U nạp',
    hwmDescription: '15% Lãi Bot HWM',
    requirementText: '10 Active F1s (Chuẩn Spartan)', 
    estimatedMonthlyIncome: '$300 - $600 USDT/tháng',
    badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
  },
  { 
    tier: 2,  
    rankName: 'RESELLER LEVEL 2', 
    depositRebatePct: 20.0, 
    hwmRebatePct: 12.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.20,
    shareDescription: '20% NẠP + 12% LÃI HWM', 
    depositPer1k: '+$18.00 USDT / $1,000U nạp',
    hwmDescription: '12% Lãi Bot HWM',
    requirementText: '5 Active F1s', 
    estimatedMonthlyIncome: '$150 - $300 USDT/tháng',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
  },
  { 
    tier: 1,  
    rankName: 'RESELLER LEVEL 1 (STARTING)', 
    depositRebatePct: 15.0, 
    hwmRebatePct: 10.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.15,
    shareDescription: '15% NẠP + 10% LÃI HWM', 
    depositPer1k: '+$13.50 USDT / $1,000U nạp',
    hwmDescription: '10% Lãi Bot HWM',
    requirementText: 'Khởi đầu (1 - 4 F1s)', 
    estimatedMonthlyIncome: '$50 - $150 USDT/tháng',
    badgeStyle: 'bg-gray-800 text-gray-300 border-gray-700' 
  },
];

/**
 * Dynamically computes a user's Reseller Tier.
 * 10 Active F1s is strictly LEVEL 3 (25% Deposit Rebate + 15% HWM).
 */
export function calculateResellerTier(f1Count: number = 0, networkVolume: number = 0): ResellerTierInfo {
  // 10 Active F1s => Strictly LEVEL 3
  if (f1Count >= 10 && f1Count < 20) {
    return RESELLER_TIERS_MATRIX[7]; // Level 3
  }
  // 5 Active F1s => LEVEL 2
  if (f1Count >= 5 && f1Count < 10) {
    return RESELLER_TIERS_MATRIX[8]; // Level 2
  }
  // 20+ F1s
  if (f1Count >= 20) {
    if (f1Count >= 50 || networkVolume >= 100000) return RESELLER_TIERS_MATRIX[0]; // Level 10
    if (f1Count >= 45 || networkVolume >= 75000)  return RESELLER_TIERS_MATRIX[1]; // Level 9
    if (f1Count >= 40 || networkVolume >= 50000)  return RESELLER_TIERS_MATRIX[2]; // Level 8
    if (f1Count >= 35 || networkVolume >= 35000)  return RESELLER_TIERS_MATRIX[3]; // Level 7
    if (f1Count >= 30 || networkVolume >= 20000)  return RESELLER_TIERS_MATRIX[4]; // Level 6
    if (f1Count >= 25 || networkVolume >= 10000)  return RESELLER_TIERS_MATRIX[5]; // Level 5
    return RESELLER_TIERS_MATRIX[6]; // Level 4
  }
  // Default Starting Tier (Level 1)
  return RESELLER_TIERS_MATRIX[9];
}
