import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, push, set, onValue, update, get } from "firebase/database";
import { db, rtdb } from "./firebase";
import { checkIsAdmin } from "./adminAuth";
import { apiFetch } from "./telegramClient";

export interface UserData {
  telegramId: string;
  username: string;
  firstName: string;
  role: 'CLIENT' | 'RESELLER' | 'ADMIN' | 'ACCOUNTANT' | 'TECH_OPS';
  tradingBalance: number;
  referralBalance: number;
  referralCode: string;
  referrerId?: string;
  resellerTier: number;
  botActive?: boolean;
  isFrozen?: boolean;
  freezeReason?: string;
  capitalJoinedAt?: string;
  lockedCollateral?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface RiskAgreementRecord {
  signedAt: string;
  signatureImageBase64?: string;
  signatureHash: string;
  termsVersion: string;
  treasury10PctAcknowledged: boolean;
  volatilityAcknowledged: boolean;
}

export interface TransactionData {
  id?: string;
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  memoCode: string;
  masterWalletAddress?: string;
  sha256Signature?: string;
  riskAgreement?: RiskAgreementRecord;
  holdingDays?: number;
  feeTier?: string;
  percentageRate?: number;
  fixedFee?: number;
  treasuryReserveFee?: number; // 30% to Treasury Vault
  adminNetRevenue?: number; // 70% to Admin Operating Revenue
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  actualOnChainAmount?: number;
  adjustedOnChain?: boolean;
  recipientAddress?: string;
  createdAt?: any;
  updatedAt?: any;
}

const RTDB_BASE_URL = "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app";
const FIRESTORE_REST_BASE = "https://firestore.googleapis.com/v1/projects/decisive-mapper-216306/databases/(default)/documents";

function convertToFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'number') {
      fields[key] = Number.isInteger(val) ? { integerValue: val } : { doubleValue: val };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    }
  }
  return fields;
}

// DIRECT FIRESTORE REST API WRITE ENGINE (Supports Sub-collections)
export async function saveToFirestoreREST(documentPath: string, data: any) {
  try {
    const fieldKeys = Object.keys(data).filter(k => data[k] !== undefined && data[k] !== null);
    const queryParams = fieldKeys.map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const url = `${FIRESTORE_REST_BASE}/${documentPath}?${queryParams}`;
    const fields = convertToFirestoreFields(data);

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields })
    });

    if (res.ok) {
      console.log(`🚀 FIRESTORE REST WRITE SUCCESS -> ${documentPath}`);
    } else {
      const err = await res.json();
      console.warn(`Firestore REST notice (${documentPath}):`, err);
    }
  } catch (err) {
    console.error("Firestore REST error:", err);
  }
}

// 1. FORCE USER PROFILE SYNC ENGINE
export async function forceSyncUserProfile(
  telegramId: string, 
  username: string = '', 
  firstName: string = '',
  referrerId?: string
): Promise<{ success: boolean; rtdbPath: string; firestorePath: string }> {
  const payload = await apiFetch<{ user: UserData }>('/api/session', {
    referrerId,
    username,
    firstName,
  });
  const id = payload.user?.telegramId || String(telegramId || '').trim();
  return {
    success: true,
    rtdbPath: `users/${id}`,
    firestorePath: `users/${id}`,
  };
}

// 2. Get or Create User Profile
export async function getOrCreateUser(
  telegramId: string, 
  username: string = '', 
  firstName: string = '',
  referrerId?: string
): Promise<UserData> {
  await forceSyncUserProfile(telegramId, username, firstName, referrerId);

  const cleanId = String(telegramId || '').trim();
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data) return data as UserData;
    }
  } catch (e) {}

  const cleanHandle = (username || 'user_' + cleanId.slice(-4)).replace('@', '').toLowerCase();
  const isStaticAdmin = checkIsAdmin(cleanHandle) || checkIsAdmin(cleanId);

  return {
    telegramId: cleanId,
    username: username || 'user_' + cleanId.slice(-4),
    firstName: firstName || 'Warrior',
    role: isStaticAdmin ? 'ADMIN' : 'CLIENT',
    tradingBalance: 0.00,
    referralBalance: 0.00,
    referralCode: `SPARTAN_${cleanId}`,
    resellerTier: 1
  };
}

// 3. Realtime Listener for Single User Data
export function subscribeToUser(telegramId: string, callback: (user: UserData | null) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '').trim();
  if (!cleanId) {
    callback(null);
    return () => {};
  }

  // Khắc phục kiến trúc CTO: Fetch tức thì 1 lần đầu để render không có độ trễ
  fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`)
    .then(res => res.ok ? res.json() : null)
    .then(data => { if (data) callback(data as UserData); })
    .catch(() => {});

  // Dùng WebSocket Realtime SDK (triệt tiêu polling 3000ms lãng phí)
  try {
    const rtdbUserRef = ref(rtdb, `users/${cleanId}`);
    rtdbUnsub = onValue(rtdbUserRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as UserData);
      }
    });
  } catch (e) {}

  try {
    const userRef = doc(db, "users", cleanId);
    firestoreUnsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) callback(snap.data() as UserData);
    });
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 4. Listener for Referred Users List (Immediate Fetch + WebSocket Listener)
export function subscribeToReferredUsers(telegramId: string, callback: (users: any[]) => void) {
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '').trim();
  if (!cleanId) {
    callback([]);
    return () => {};
  }

  const fetchRefs = async () => {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}/referrals.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          callback(Object.values(data));
        } else {
          callback([]);
        }
      }
    } catch (e) {}
  };

  fetchRefs();

  try {
    const refsRef = ref(rtdb, `users/${cleanId}/referrals`);
    rtdbUnsub = onValue(refsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(Object.values(snapshot.val()));
      }
    });
  } catch (e) {}

  return () => {
    rtdbUnsub();
  };
}

// 5. Create Deposit/Withdrawal Transaction via authenticated server route
export async function createLiveTransaction(
  telegramId: string, 
  username: string, 
  type: 'DEPOSIT' | 'WITHDRAW', 
  grossAmount: number,
  riskAgreement?: RiskAgreementRecord,
  recipientAddress?: string
): Promise<TransactionData> {
  const payload = await apiFetch<{ tx: TransactionData }>('/api/ledger/create-transaction', {
    type,
    grossAmount,
    riskAgreement,
    recipientAddress,
  });
  if (!payload?.tx) {
    throw new Error('LEDGER_CREATE_FAILED: Máy chủ không trả về giao dịch.');
  }
  return payload.tx;
}

// 6. Realtime Listener for User's Transactions History (Immediate Fetch + Polling + Realtime Listener)
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '').trim();
  if (!cleanId) {
    callback([]);
    return () => {};
  }

  const fetchTxs = async () => {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}/transactions.json`);
      let list1: TransactionData[] = [];
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') list1 = Object.values(data) as TransactionData[];
      }

      const gRes = await fetch(`${RTDB_BASE_URL}/transactions.json`);
      let list2: TransactionData[] = [];
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData && typeof gData === 'object') {
          list2 = (Object.values(gData) as TransactionData[]).filter(t => String(t.userId) === cleanId);
        }
      }

      const map = new Map<string, TransactionData>();
      [...list2, ...list1].forEach(t => {
        if (t && (t.id || t.memoCode)) {
          map.set(t.id || t.memoCode, t);
        }
      });

      const combined = Array.from(map.values());
      callback(combined);
    } catch (e) {}
  };

  fetchTxs();

  try {
    const userTxsRef = ref(rtdb, `users/${cleanId}/transactions`);
    rtdbUnsub = onValue(userTxsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        callback(Object.values(data));
      }
    });
  } catch (e) {}

  try {
    const userTxsCol = collection(db, "users", cleanId, "transactions");
    firestoreUnsub = onSnapshot(userTxsCol, (snapshot) => {
      const txs: TransactionData[] = [];
      snapshot.forEach((d) => txs.push({ id: d.id, ...d.data() } as TransactionData));
      if (txs.length > 0) callback(txs);
    });
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 7. Realtime Listener for Admin Pending Queue
export function subscribeToPendingTransactions(callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  // Initial immediate fetch
  fetch(`${RTDB_BASE_URL}/transactions.json`)
    .then(res => res.ok ? res.json() : null)
    .then(data => {
      if (data) {
        const pending = Object.values(data).filter((t: any) => t.status === 'PENDING') as TransactionData[];
        callback(pending);
      }
    })
    .catch(() => {});

  try {
    const rtdbTxRef = ref(rtdb, 'transactions');
    rtdbUnsub = onValue(rtdbTxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pendingTxs: TransactionData[] = Object.values(data).filter(
          (t: any) => t.status === 'PENDING'
        ) as TransactionData[];
        callback(pendingTxs);
      }
    });
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 8. Admin Approval with FLEXIBLE ON-CHAIN AMOUNT ENGINE
export async function approveLiveTransaction(
  txId: string, 
  adminUsername: string = 'tddv2017',
  actualOnChainAmount?: number
): Promise<{ success: boolean; message: string }> {
  try {
    return await apiFetch<{ success: boolean; message: string }>('/api/ledger/approve', {
      txId,
      adminUsername,
      actualOnChainAmount,
    });
  } catch (e: any) {
    return { success: false, message: e?.message || 'Không duyệt được giao dịch.' };
  }
}

// 9. Admin Rejection of Pending Transaction (Bulletproof Smart Resolution with 100% Auto-Refund)
export async function rejectLiveTransaction(
  txId: string, 
  adminUsername: string = 'tddv2017', 
  reason: string = 'Từ chối bởi Admin'
): Promise<{ success: boolean; message: string }> {
  try {
    return await apiFetch<{ success: boolean; message: string }>('/api/ledger/reject', {
      txId,
      adminUsername,
      reason,
    });
  } catch (e: any) {
    return { success: false, message: e?.message || 'Không từ chối được giao dịch.' };
  }
}

// 9.1. Reinvest Referral Earnings to Bot Trading Balance (0% fee)
export async function reinvestReferralBalance(
  telegramId: string, 
  amount: number
): Promise<{ success: boolean; message: string; newTradingBal?: number; newRefBal?: number }> {
  try {
    return await apiFetch('/api/ledger/referral', { action: 'reinvest', amount });
  } catch (e: any) {
    return { success: false, message: e?.message || 'Lỗi tái đầu tư chiết khấu.' };
  }
}

// 9.2. Withdraw Referral Earnings to External TRC20 Wallet
export async function withdrawReferralBalance(
  telegramId: string, 
  amount: number,
  recipientAddress: string
): Promise<{ success: boolean; message: string; newRefBal?: number; tx?: TransactionData }> {
  try {
    return await apiFetch('/api/ledger/referral', {
      action: 'withdraw',
      amount,
      recipientAddress,
    });
  } catch (e: any) {
    return { success: false, message: e?.message || 'Lỗi rút chiết khấu đối tác.' };
  }
}

// 10. REALTIME LISTENER FOR LIVE MT5 EA TRADING EXECUTIONS
export function subscribeToLiveTrades(callback: (trades: any[]) => void) {
  let isSubscribed = true;

  const fetchTrades = async () => {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/trades.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const tradesList = Object.values(data);
          if (isSubscribed) callback(tradesList);
        } else {
          if (isSubscribed) callback([]);
        }
      } else {
        if (isSubscribed) callback([]);
      }
    } catch (e) {
      if (isSubscribed) callback([]);
    }
  };

  fetchTrades();
  const intervalId = setInterval(fetchTrades, 5000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}

// 11. REALTIME LISTENER FOR SYSTEM CONFIGURATION (MAINTENANCE MODE & GLOBAL BOT)
export function subscribeToSystemConfig(callback: (config: { maintenanceMode: boolean; globalBotActive: boolean; broadcastNotice?: string }) => void) {
  let isSubscribed = true;

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/system_config.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && isSubscribed) {
          callback({
            maintenanceMode: data.maintenanceMode === true,
            globalBotActive: data.globalBotActive !== false,
            broadcastNotice: data.broadcastNotice || ''
          });
        }
      }
    } catch (e) {}
  };

  fetchConfig();
  const intervalId = setInterval(fetchConfig, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(intervalId);
  };
}

