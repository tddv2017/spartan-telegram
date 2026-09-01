/**
 * SPARTAN TREASURY VAULT & MULTI-WALLET CONFIGURATION
 * Manages Master Receiving Wallet, Hot Liquidity Wallet, Cold Storage Vault, and Exness Master Deposit Address.
 */

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export interface TreasuryVaultConfig {
  receivingWallet: string;    // 📥 Ví Tiếp Nhận Nạp Tiền (Master Deposit Receiving Wallet)
  hotWallet: string;          // ⚡ Ví Nóng Thanh Khoản (Hot Wallet for Fast Withdrawals)
  coldWallet: string;         // 🧊 Ví Lạnh Quản Trị / Lợi Nhuận (Cold Storage & Admin Revenue Vault)
  exnessMasterWallet: string; // 🏦 Ví Nạp Tài Khoản Master Exness ECN
  autoSplitRatios: {
    exnessMasterPct: number;  // 80% to Exness MT5 Master
    hotLiquidityPct: number;  // 11% to Hot Liquidity Wallet
    adminProfitPct: number;   // 9% to Admin Cold Vault
  };
  updatedAt?: string;
}

export interface WalletBalanceInfo {
  usdt: number;
  trx: number;
  allocatedValue: number;
  status: 'ONLINE' | 'ACTIVE' | 'COLD_SECURE';
}

export const DEFAULT_TREASURY_VAULT: TreasuryVaultConfig = {
  receivingWallet: "TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu",
  hotWallet: "TWDpMvY3m3tFwN8XzY9m1Q2W3E4R5T6Y7U",
  coldWallet: "TL4oP9Kj1Nm2Bv3Cx4Z5a6S7d8F9g0H1J2",
  exnessMasterWallet: "TXn8Kj9Lm0Pv1Qr2St3Uv4Wx5Yz6Ab7Cd8",
  autoSplitRatios: {
    exnessMasterPct: 80,
    hotLiquidityPct: 11,
    adminProfitPct: 9,
  },
  updatedAt: new Date().toISOString()
};

/**
 * Fetch live Treasury Vault Configuration from Firebase RTDB
 */
export async function fetchTreasuryVault(): Promise<TreasuryVaultConfig> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/treasury_vault.json`, { cache: 'no-store' });
    if (!res.ok) return DEFAULT_TREASURY_VAULT;
    const data = await res.json();
    if (!data || typeof data !== 'object') return DEFAULT_TREASURY_VAULT;

    return {
      receivingWallet: data.receivingWallet || DEFAULT_TREASURY_VAULT.receivingWallet,
      hotWallet: data.hotWallet || DEFAULT_TREASURY_VAULT.hotWallet,
      coldWallet: data.coldWallet || DEFAULT_TREASURY_VAULT.coldWallet,
      exnessMasterWallet: data.exnessMasterWallet || DEFAULT_TREASURY_VAULT.exnessMasterWallet,
      autoSplitRatios: data.autoSplitRatios || DEFAULT_TREASURY_VAULT.autoSplitRatios,
      updatedAt: data.updatedAt || DEFAULT_TREASURY_VAULT.updatedAt
    };
  } catch (err) {
    console.error('Error fetching treasury vault config:', err);
    return DEFAULT_TREASURY_VAULT;
  }
}

/**
 * Update Treasury Vault Configuration in Firebase RTDB
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
 * Query On-Chain TRON USDT Balance for a given wallet address
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
