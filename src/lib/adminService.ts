/**
 * SPARTAN ADMIN SUITE SERVICE
 * Provides data fetching and state mutation for Accounting, HR, and TechOps departments.
 */

import { UserData, TransactionData } from './firebaseService';

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";

export interface SystemConfig {
  maintenanceMode: boolean;
  globalBotActive: boolean;
  broadcastNotice?: string;
  updatedAt?: string;
}

export interface UserAuditItem extends UserData {
  f1Count?: number;
  totalDeposit?: number;
  totalWithdrawal?: number;
  botActive?: boolean;
  isFrozen?: boolean;
}

// 1. Fetch All System Users for HR & Accounting
export async function fetchAllUsers(): Promise<UserAuditItem[]> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users.json`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];

    const users: UserAuditItem[] = [];
    Object.entries(data).forEach(([key, val]: [string, any]) => {
      if (val && typeof val === 'object') {
        const referralsCount = val.referrals ? Object.keys(val.referrals).length : 0;
        users.push({
          ...val,
          telegramId: val.telegramId || key,
          f1Count: referralsCount,
          botActive: val.botActive !== false, // default true
          isFrozen: val.isFrozen === true,
        });
      }
    });

    return users.sort((a, b) => (b.tradingBalance || 0) - (a.tradingBalance || 0));
  } catch (err) {
    console.error('Error fetching all users:', err);
    return [];
  }
}

// 2. Fetch All Transactions for Accounting & Audit
export async function fetchAllTransactions(): Promise<TransactionData[]> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/transactions.json`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data || typeof data !== 'object') return [];

    const txs: TransactionData[] = Object.values(data);
    return txs.sort((a, b) => {
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });
  } catch (err) {
    console.error('Error fetching all transactions:', err);
    return [];
  }
}

// 3. TechOps: Toggle Granular Per-User Bot Status
export async function setUserBotStatus(userId: string, isActive: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botActive: isActive,
        updatedAt: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating bot status for user:', err);
    return false;
  }
}

// 4. HR: Update User Tier or Freeze Account
export async function updateUserRoleAndTier(
  userId: string, 
  updates: { resellerTier?: number; role?: string; isFrozen?: boolean }
): Promise<boolean> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating user role/tier:', err);
    return false;
  }
}

// 5. TechOps: System Configuration (Maintenance & Global Bot)
export async function fetchSystemConfig(): Promise<SystemConfig> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/system_config.json`);
    if (!res.ok) return { maintenanceMode: false, globalBotActive: true };
    const data = await res.json();
    if (!data) return { maintenanceMode: false, globalBotActive: true };
    return {
      maintenanceMode: data.maintenanceMode === true,
      globalBotActive: data.globalBotActive !== false,
      broadcastNotice: data.broadcastNotice || '',
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    return { maintenanceMode: false, globalBotActive: true };
  }
}

export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<boolean> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/system_config.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Error updating system config:', err);
    return false;
  }
}
