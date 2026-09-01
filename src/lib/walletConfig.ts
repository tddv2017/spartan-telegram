/**
 * SPARTAN TREASURY VAULT & 2-WALLET CONFIGURATION
 * Streamlined Architecture:
 * 1. Master Exness Wallet: Direct deposit & trading capital pool
 * 2. Treasury Reserve Wallet: 10% retention fund collected upon withdrawals
 */

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export interface TreasuryVaultConfig {
  exnessMasterWallet: string;   // 🏦 VÍ MASTER EXNESS (Khách nạp thẳng vào đây để EA cào lãi & rút tiền từ đây)
  treasuryReserveWallet: string;// 🛡️ VÍ QUỸ DỰ PHÒNG (Trích giữ 10% từ mỗi lệnh rút)
  updatedAt?: string;
}

export const DEFAULT_TREASURY_VAULT: TreasuryVaultConfig = {
  exnessMasterWallet: "TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu",
  treasuryReserveWallet: "TL4oP9Kj1Nm2Bv3Cx4Z5a6S7d8F9g0H1J2",
  updatedAt: new Date().toISOString()
};

/**
 * Fetch live 2-Wallet Treasury Configuration from Firebase RTDB
 */
export async function fetchTreasuryVault(): Promise<TreasuryVaultConfig> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/treasury_vault.json`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_TREASURY_VAULT;
    const data = await res.json();
    if (!data || typeof data !== 'object') return DEFAULT_TREASURY_VAULT;

    return {
      exnessMasterWallet: data.exnessMasterWallet || data.receivingWallet || DEFAULT_TREASURY_VAULT.exnessMasterWallet,
      treasuryReserveWallet: data.treasuryReserveWallet || data.coldWallet || DEFAULT_TREASURY_VAULT.treasuryReserveWallet,
      updatedAt: data.updatedAt || DEFAULT_TREASURY_VAULT.updatedAt
    };
  } catch (err) {
    console.error('Error fetching treasury vault config:', err);
    return DEFAULT_TREASURY_VAULT;
  }
}

/**
 * Update 2-Wallet Treasury Configuration in Firebase RTDB
 */
export async function updateTreasuryVault(updates: Partial<TreasuryVaultConfig>): Promise<boolean> {
  try {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    const res = await fetch(`${RTDB_BASE_URL}/treasury_vault.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating treasury vault config:', err);
    return false;
  }
}

/**
 * Query On-Chain TRON USDT & TRX Balance
 */
export async function fetchOnChainWalletBalance(address: string): Promise<{ usdt: number; trx: number }> {
  if (!address || address.length < 20) {
    return { usdt: 0, trx: 0 };
  }
  try {
    const url = `https://apilist.tronscanapi.com/api/account?address=${address}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 15 }
    });

    if (res.ok) {
      const data = await res.json();
      const trc20 = data.trc20token_balances || [];
      const usdtToken = trc20.find((t: any) => 
        t.tokenSymbol === 'USDT' || 
        t.tokenId === USDT_CONTRACT || 
        t.tokenName?.toLowerCase()?.includes('tether')
      );
      const usdtBal = usdtToken ? parseFloat(usdtToken.balance || '0') / Math.pow(10, usdtToken.tokenDecimal || 6) : 0;
      const trxBal = (data.balance || 0) / 1e6;
      return { usdt: usdtBal, trx: trxBal };
    }
  } catch (err) {
    console.warn(`Could not fetch on-chain balance for ${address}:`, err);
  }
  return { usdt: 0, trx: 0 };
}
