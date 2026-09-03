/**
 * SPARTAN QUANT AI BOT - AFFILIATE PARTNER TIER & REBATE ENGINE
 * Institutional Partner Revenue Sharing Model (Direct F1 Referral Only):
 * - Portfolio Initiation Rebate: 15% to 50%
 * - High-Water Mark (HWM) Performance Royalty: 10% to 35%
 * - P2P Liquidity & Margin Escrow Rebate: 35%
 */

export interface ResellerTierInfo {
  tier: number;
  rankName: string;
  depositRebatePct: number;    // 15% - 50%
  hwmRebatePct: number;        // 10% - 35%
  p2pRebatePct: number;        // 35%
  rebateRate: number;          // Backward-compatible (depositRebatePct / 100)
  shareDescription: string;
  depositPer1k: string;        // e.g. "+$45.00 USDT / $1,000U"
  hwmDescription: string;      // e.g. "35% Hiệu Quả HWM"
  requirementText: string;
  estimatedMonthlyIncome: string; // e.g. "~$5,500 - $12,000+ USDT/tháng"
  badgeStyle: string;
}

export const RESELLER_TIERS_MATRIX: ResellerTierInfo[] = [
  { 
    tier: 10, 
    rankName: 'PARTNER TIER 10 (TOP MASTER)', 
    depositRebatePct: 50.0, 
    hwmRebatePct: 35.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.50,
    shareDescription: '50% PHÍ KHỞI TẠO (50/50) + 35% HIỆU QUẢ HWM', 
    depositPer1k: '+$45.00 USDT / $1,000U',
    hwmDescription: '35% Hiệu Quả HWM',
    requirementText: 'Đối tác Cấp Cao (50+ Thành viên / $100kU Khối lượng)', 
    estimatedMonthlyIncome: '~$5,500 - $12,000+ USDT/tháng',
    badgeStyle: 'bg-[#ff5500]/20 text-[#ff5500] border-[#ff5500]/40 shadow-[0_0_15px_rgba(255,85,0,0.4)]' 
  },
  { 
    tier: 9,  
    rankName: 'PARTNER TIER 9', 
    depositRebatePct: 48.0, 
    hwmRebatePct: 30.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.48,
    shareDescription: '48% PHÍ KHỞI TẠO + 30% HIỆU QUẢ HWM', 
    depositPer1k: '+$43.20 USDT / $1,000U',
    hwmDescription: '30% Hiệu Quả HWM',
    requirementText: '45 Thành viên / $75,000U Khối lượng', 
    estimatedMonthlyIncome: '~$4,200 - $5,500 USDT/tháng',
    badgeStyle: 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
  },
  { 
    tier: 8,  
    rankName: 'PARTNER TIER 8', 
    depositRebatePct: 45.0, 
    hwmRebatePct: 28.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.45,
    shareDescription: '45% PHÍ KHỞI TẠO + 28% HIỆU QUẢ HWM', 
    depositPer1k: '+$40.50 USDT / $1,000U',
    hwmDescription: '28% Hiệu Quả HWM',
    requirementText: '40 Thành viên / $50,000U Khối lượng', 
    estimatedMonthlyIncome: '~$3,000 - $4,200 USDT/tháng',
    badgeStyle: 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
  },
  { 
    tier: 7,  
    rankName: 'PARTNER TIER 7', 
    depositRebatePct: 42.0, 
    hwmRebatePct: 25.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.42,
    shareDescription: '42% PHÍ KHỞI TẠO + 25% HIỆU QUẢ HWM', 
    depositPer1k: '+$37.80 USDT / $1,000U',
    hwmDescription: '25% Hiệu Quả HWM',
    requirementText: '35 Thành viên / $35,000U Khối lượng', 
    estimatedMonthlyIncome: '~$2,200 - $3,000 USDT/tháng',
    badgeStyle: 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
  },
  { 
    tier: 6,  
    rankName: 'PARTNER TIER 6', 
    depositRebatePct: 40.0, 
    hwmRebatePct: 22.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.40,
    shareDescription: '40% PHÍ KHỞI TẠO + 22% HIỆU QUẢ HWM', 
    depositPer1k: '+$36.00 USDT / $1,000U',
    hwmDescription: '22% Hiệu Quả HWM',
    requirementText: '30 Thành viên / $20,000U Khối lượng', 
    estimatedMonthlyIncome: '~$1,500 - $2,200 USDT/tháng',
    badgeStyle: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
  },
  { 
    tier: 5,  
    rankName: 'PARTNER TIER 5', 
    depositRebatePct: 35.0, 
    hwmRebatePct: 20.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.35,
    shareDescription: '35% PHÍ KHỞI TẠO + 20% HIỆU QUẢ HWM', 
    depositPer1k: '+$31.50 USDT / $1,000U',
    hwmDescription: '20% Hiệu Quả HWM',
    requirementText: '25 Thành viên / $10,000U Khối lượng', 
    estimatedMonthlyIncome: '~$1,000 - $1,500 USDT/tháng',
    badgeStyle: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
  },
  { 
    tier: 4,  
    rankName: 'PARTNER TIER 4', 
    depositRebatePct: 30.0, 
    hwmRebatePct: 18.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.30,
    shareDescription: '30% PHÍ KHỞI TẠO + 18% HIỆU QUẢ HWM', 
    depositPer1k: '+$27.00 USDT / $1,000U',
    hwmDescription: '18% Hiệu Quả HWM',
    requirementText: '20 Thành viên / $5,000U Khối lượng', 
    estimatedMonthlyIncome: '~$600 - $1,000 USDT/tháng',
    badgeStyle: 'bg-teal-500/20 text-teal-300 border-teal-500/40' 
  },
  { 
    tier: 3,  
    rankName: 'PARTNER TIER 3', 
    depositRebatePct: 25.0, 
    hwmRebatePct: 15.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.25,
    shareDescription: '25% PHÍ KHỞI TẠO + 15% HIỆU QUẢ HWM', 
    depositPer1k: '+$22.50 USDT / $1,000U',
    hwmDescription: '15% Hiệu Quả HWM',
    requirementText: '10 Thành viên Hoạt Động (Chuẩn Spartan)', 
    estimatedMonthlyIncome: '~$300 - $600 USDT/tháng',
    badgeStyle: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
  },
  { 
    tier: 2,  
    rankName: 'PARTNER TIER 2', 
    depositRebatePct: 20.0, 
    hwmRebatePct: 12.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.20,
    shareDescription: '20% PHÍ KHỞI TẠO + 12% HIỆU QUẢ HWM', 
    depositPer1k: '+$18.00 USDT / $1,000U',
    hwmDescription: '12% Hiệu Quả HWM',
    requirementText: '5 Thành viên Hoạt Động', 
    estimatedMonthlyIncome: '~$150 - $300 USDT/tháng',
    badgeStyle: 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
  },
  { 
    tier: 1,  
    rankName: 'PARTNER TIER 1 (STARTING)', 
    depositRebatePct: 15.0, 
    hwmRebatePct: 10.0, 
    p2pRebatePct: 35.0,
    rebateRate: 0.15,
    shareDescription: '15% PHÍ KHỞI TẠO + 10% HIỆU QUẢ HWM', 
    depositPer1k: '+$13.50 USDT / $1,000U',
    hwmDescription: '10% Hiệu Quả HWM',
    requirementText: 'Khởi đầu (1 - 4 Thành viên)', 
    estimatedMonthlyIncome: '~$50 - $150 USDT/tháng',
    badgeStyle: 'bg-gray-800 text-gray-300 border-gray-700' 
  },
];

/**
 * Dynamically computes a user's Partner Tier.
 * 10 Active F1s is strictly TIER 3 (25% Initiation Rebate + 15% HWM).
 */
export function calculateResellerTier(f1Count: number = 0, networkVolume: number = 0): ResellerTierInfo {
  // 10 Active F1s => Strictly TIER 3
  if (f1Count >= 10 && f1Count < 20) {
    return RESELLER_TIERS_MATRIX[7]; // Tier 3
  }
  // 5 Active F1s => TIER 2
  if (f1Count >= 5 && f1Count < 10) {
    return RESELLER_TIERS_MATRIX[8]; // Tier 2
  }
  // 20+ F1s
  if (f1Count >= 20) {
    if (f1Count >= 50 || networkVolume >= 100000) return RESELLER_TIERS_MATRIX[0]; // Tier 10
    if (f1Count >= 45 || networkVolume >= 75000)  return RESELLER_TIERS_MATRIX[1]; // Tier 9
    if (f1Count >= 40 || networkVolume >= 50000)  return RESELLER_TIERS_MATRIX[2]; // Tier 8
    if (f1Count >= 35 || networkVolume >= 35000)  return RESELLER_TIERS_MATRIX[3]; // Tier 7
    if (f1Count >= 30 || networkVolume >= 20000)  return RESELLER_TIERS_MATRIX[4]; // Tier 6
    if (f1Count >= 25 || networkVolume >= 10000)  return RESELLER_TIERS_MATRIX[5]; // Tier 5
    return RESELLER_TIERS_MATRIX[6]; // Tier 4
  }
  // Default Starting Tier (Tier 1)
  return RESELLER_TIERS_MATRIX[9];
}
