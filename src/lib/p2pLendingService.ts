/**
 * Spartan Institutional P2P Lending & Credit Facility Service
 * Manages peer-to-peer credit orders, interest calculation, and VIP Waitlist enrollment.
 */

export interface P2pOfferItem {
  id: string;
  lenderUsername: string;
  lenderRank: string;
  amountUsdt: number;
  termDays: number;
  monthlyInterestPct: number;
  collateralType: string;
  guaranteeFundPct: number;
  status: 'ACTIVE_BID' | 'FUNDED' | 'COMING_SOON';
}

export interface P2pWaitlistRecord {
  userId: string;
  username: string;
  registeredAt: string;
  requestedRole: 'LENDER' | 'BORROWER' | 'BOTH';
  preferredCapitalUsdt?: number;
}

// Institutional Sample Offers for Visual Demonstration
export const SAMPLE_P2P_OFFERS: P2pOfferItem[] = [
  {
    id: 'P2P-XAU-001',
    lenderUsername: 'spartan_whale_sg',
    lenderRank: '👑 Tier 10 Supreme',
    amountUsdt: 25000,
    termDays: 90,
    monthlyInterestPct: 2.2,
    collateralType: 'Bot Trading Equity + 10% Cold Vault',
    guaranteeFundPct: 100,
    status: 'ACTIVE_BID'
  },
  {
    id: 'P2P-XAU-002',
    lenderUsername: 'geneva_quant_fund',
    lenderRank: '💎 Tier 9 Emperor',
    amountUsdt: 50000,
    termDays: 180,
    monthlyInterestPct: 1.8,
    collateralType: 'Exness ECN Master Vault',
    guaranteeFundPct: 100,
    status: 'ACTIVE_BID'
  },
  {
    id: 'P2P-XAU-003',
    lenderUsername: 'viet_gold_trader',
    lenderRank: '🥇 Tier 8 Commander',
    amountUsdt: 10000,
    termDays: 30,
    monthlyInterestPct: 2.5,
    collateralType: 'Bot Trading Equity',
    guaranteeFundPct: 100,
    status: 'ACTIVE_BID'
  }
];

/**
 * Enrolls a user into the Spartan P2P Lending Early Access VIP Waitlist.
 */
export async function enrollP2pWaitlist(
  userId: string,
  username: string,
  role: 'LENDER' | 'BORROWER' | 'BOTH' = 'BOTH'
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanId = String(userId || '494232782').trim();
    const cleanUser = String(username || 'tddv2017').trim();

    const record: P2pWaitlistRecord = {
      userId: cleanId,
      username: cleanUser,
      registeredAt: new Date().toISOString(),
      requestedRole: role
    };

    const res = await fetch(
      `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/p2p_waitlist/${cleanId}.json`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }
    );

    if (res.ok) {
      return {
        success: true,
        message: '🎉 Bạn đã được ghi danh thành công vào Danh Sách Chờ Ưu Tiên P2P Lending!'
      };
    }
    return { success: false, message: 'Không thể ghi danh vào hàng chờ lúc này. Vui lòng thử lại sau!' };
  } catch (err: any) {
    return { success: false, message: 'Lỗi kết nối máy chủ: ' + err.message };
  }
}

/**
 * Checks if user is already enrolled in the VIP Waitlist.
 */
export async function checkP2pWaitlistStatus(userId: string): Promise<boolean> {
  try {
    const cleanId = String(userId || '').trim();
    if (!cleanId) return false;
    const res = await fetch(
      `https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/p2p_waitlist/${cleanId}.json`
    );
    const data = await res.json();
    return Boolean(data && data.userId);
  } catch {
    return false;
  }
}
