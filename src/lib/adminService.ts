/**
 * SPARTAN ADMIN SUITE SERVICE & FULL CRUD REPOSITORY
 * Provides complete Create, Read, Update, Delete capabilities for Users, Transactions, and System Settings.
 */

import { UserData, TransactionData } from './firebaseService';
import { calculateDepositFee, calculateWithdrawFee } from './feeCalculator';

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

// ==========================================
// 1. USER CRUD OPERATIONS (QUẢN TRỊ NGƯỜI DÙNG)
// ==========================================

// READ: Fetch All System Users
export async function fetchAllUsers(): Promise<UserAuditItem[]> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users.json`, { cache: 'no-store' });
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
          username: val.username || `user_${key.slice(-4)}`,
          f1Count: referralsCount,
          botActive: val.botActive !== false,
          isFrozen: val.isFrozen === true,
          tradingBalance: typeof val.tradingBalance === 'number' ? val.tradingBalance : 0,
          referralBalance: typeof val.referralBalance === 'number' ? val.referralBalance : 0,
          role: val.role || 'CLIENT',
          resellerTier: val.resellerTier || 1,
        });
      }
    });

    return users.sort((a, b) => (b.tradingBalance || 0) - (a.tradingBalance || 0));
  } catch (err) {
    console.error('Lỗi khi tải danh sách người dùng:', err);
    return [];
  }
}

// CREATE: Create New User Manually
export async function createAdminUser(user: {
  telegramId: string;
  username: string;
  firstName?: string;
  tradingBalance?: number;
  referralBalance?: number;
  role?: string;
  resellerTier?: number;
}): Promise<{ success: boolean; message: string }> {
  try {
    const cleanId = user.telegramId.trim();
    if (!cleanId) return { success: false, message: 'Telegram ID không được để trống' };

    const newUserPayload: UserData = {
      telegramId: cleanId,
      username: user.username.replace('@', '').trim() || `user_${cleanId.slice(-4)}`,
      firstName: user.firstName?.trim() || user.username || 'Spartan Member',
      tradingBalance: user.tradingBalance || 0,
      referralBalance: user.referralBalance || 0,
      referralCode: `ref_${cleanId}`,
      role: (user.role as any) || 'CLIENT',
      resellerTier: user.resellerTier || 1,
      botActive: true,
      isFrozen: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUserPayload)
    });

    if (res.ok) {
      return { success: true, message: `Đã tạo thành công người dùng @${newUserPayload.username} (ID: ${cleanId})!` };
    }
    return { success: false, message: 'Lỗi ghi dữ liệu vào Firebase' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi ngoại lệ' };
  }
}

// UPDATE: Update User Details (Balances, Role, Tier, Status)
export async function updateUserDetails(
  userId: string,
  updates: Partial<UserAuditItem>
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
    console.error('Lỗi khi cập nhật người dùng:', err);
    return false;
  }
}

// DELETE: Delete User from System
export async function deleteUserFromSystem(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.error('Lỗi khi xóa người dùng:', err);
    return false;
  }
}

// TOGGLE: Bot Status
export async function setUserBotStatus(userId: string, isActive: boolean): Promise<boolean> {
  return updateUserDetails(userId, { botActive: isActive });
}

// TOGGLE: User Role & Tier
export async function updateUserRoleAndTier(
  userId: string, 
  updates: { resellerTier?: number; role?: string; isFrozen?: boolean; tradingBalance?: number; referralBalance?: number }
): Promise<boolean> {
  return updateUserDetails(userId, updates as any);
}

// ==================================================
// 2. TRANSACTION CRUD OPERATIONS (QUẢN TRỊ HÓA ĐƠN)
// ==================================================

// READ: Fetch All Transactions
export async function fetchAllTransactions(): Promise<TransactionData[]> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/transactions.json`, { cache: 'no-store' });
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
    console.error('Lỗi khi tải giao dịch:', err);
    return [];
  }
}

// CREATE: Create Manual Transaction (Nạp / Rút Thủ Công)
export async function createManualTransaction(tx: {
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  grossAmount: number;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  memoCode?: string;
}): Promise<{ success: boolean; message: string; tx?: TransactionData }> {
  try {
    const txId = `TX_MANUAL_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const breakdown = tx.type === 'DEPOSIT' 
      ? calculateDepositFee(tx.grossAmount)
      : calculateWithdrawFee(tx.grossAmount);

    const memo = tx.memoCode || `SPARTAN_${tx.userId}_${txId.slice(-4)}`;

    const newTx: TransactionData = {
      id: txId,
      userId: tx.userId,
      username: tx.username.replace('@', ''),
      type: tx.type,
      grossAmount: tx.grossAmount,
      feeAmount: breakdown.totalFee,
      netAmount: breakdown.netAmount,
      status: tx.status,
      memoCode: memo,
      createdAt: new Date().toISOString(),
      approvedAt: tx.status === 'APPROVED' ? new Date().toISOString() : undefined,
      approvedBy: tx.status === 'APPROVED' ? 'tddv2017 (Admin)' : undefined
    };

    // Save to global transactions
    await fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    });

    // Save to user transactions
    await fetch(`${RTDB_BASE_URL}/users/${tx.userId}/transactions/${txId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTx)
    });

    // If APPROVED, update user balance accordingly
    if (tx.status === 'APPROVED') {
      const uRes = await fetch(`${RTDB_BASE_URL}/users/${tx.userId}.json`);
      if (uRes.ok) {
        const uData = await uRes.json();
        const currentBal = uData?.tradingBalance || 0;
        const newBal = tx.type === 'DEPOSIT' 
          ? currentBal + breakdown.netAmount 
          : Math.max(0, currentBal - tx.grossAmount);

        await fetch(`${RTDB_BASE_URL}/users/${tx.userId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradingBalance: newBal, updatedAt: new Date().toISOString() })
        });
      }
    }

    return { success: true, message: `Đã tạo hóa đơn ${txId} (${tx.type}) thành công!`, tx: newTx };
  } catch (err: any) {
    return { success: false, message: err.message || 'Lỗi tạo giao dịch' };
  }
}

// UPDATE: Update Transaction Details (Status, Amounts, Memo)
export async function updateTransactionRecord(
  txId: string,
  userId: string,
  updates: Partial<TransactionData>
): Promise<boolean> {
  try {
    const payload = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const p1 = fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const p2 = userId ? fetch(`${RTDB_BASE_URL}/users/${userId}/transactions/${txId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }) : Promise.resolve();

    await Promise.all([p1, p2]);
    return true;
  } catch (err) {
    console.error('Lỗi khi cập nhật giao dịch:', err);
    return false;
  }
}

// DELETE: Delete Transaction from System
export async function deleteTransactionRecord(txId: string, userId?: string): Promise<boolean> {
  try {
    const p1 = fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
      method: 'DELETE'
    });

    const p2 = userId ? fetch(`${RTDB_BASE_URL}/users/${userId}/transactions/${txId}.json`, {
      method: 'DELETE'
    }) : Promise.resolve();

    await Promise.all([p1, p2]);
    return true;
  } catch (err) {
    console.error('Lỗi khi xóa giao dịch:', err);
    return false;
  }
}

// ==================================================
// 3. SYSTEM CONFIGURATION (BẢO TRÌ & BOT TỔNG)
// ==================================================

export async function fetchSystemConfig(): Promise<SystemConfig> {
  try {
    const res = await fetch(`${RTDB_BASE_URL}/system_config.json`, { cache: 'no-store' });
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
