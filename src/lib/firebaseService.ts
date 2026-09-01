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
import { calculateDepositFee, calculateWithdrawFee } from "./feeCalculator";
import { generateDepositSignature } from "./sha256Auth";

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
  createdAt?: any;
  updatedAt?: any;
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
  approvedBy?: string;
  rejectionReason?: string;
  actualOnChainAmount?: number;
  adjustedOnChain?: boolean;
  createdAt?: any;
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
  const cleanId = String(telegramId || '494232782');
  const cleanHandle = (username || 'user_' + cleanId.slice(-4)).replace('@', '').toLowerCase();
  const isAdmin = cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029' || cleanId === '494232782';

  const nowIso = new Date().toISOString();

  let existingTradingBal = 0.00;
  let existingRefBal = 0.00;
  let existingTier = 1;

  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (typeof data.tradingBalance === 'number') existingTradingBal = data.tradingBalance;
        if (typeof data.referralBalance === 'number') existingRefBal = data.referralBalance;
        if (typeof data.resellerTier === 'number') existingTier = data.resellerTier;
      }
    }
  } catch (e) {}

  const userPayload: UserData = {
    telegramId: cleanId,
    username: username || 'user_' + cleanId.slice(-4),
    firstName: firstName || 'Warrior',
    role: isAdmin ? 'ADMIN' : 'CLIENT',
    tradingBalance: existingTradingBal,
    referralBalance: existingRefBal,
    referralCode: `SPARTAN_${cleanId}`,
    referrerId: referrerId || undefined,
    resellerTier: existingTier,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  let restSuccess = false;

  // A. Realtime Database Write (users/<cleanId>)
  try {
    const restRes = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload)
    });
    if (restRes.ok) restSuccess = true;

    if (referrerId && referrerId !== cleanId) {
      await fetch(`${RTDB_BASE_URL}/users/${referrerId}/referrals/${cleanId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: cleanId,
          username: userPayload.username,
          firstName: userPayload.firstName,
          joinedAt: nowIso,
        })
      });
    }
  } catch (err) {}

  // B. Firestore Database Write (users/<cleanId>)
  await saveToFirestoreREST(`users/${cleanId}`, userPayload);

  // C. JS SDK Backup Write
  try {
    const userRef = doc(db, "users", cleanId);
    await setDoc(userRef, { 
      ...userPayload, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    }, { merge: true });
  } catch (err) {}

  return {
    success: restSuccess,
    rtdbPath: `users/${cleanId}`,
    firestorePath: `users/${cleanId}`
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

  const cleanId = String(telegramId || '494232782');
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data) return data as UserData;
    }
  } catch (e) {}

  const cleanHandle = (username || 'user_' + cleanId.slice(-4)).replace('@', '').toLowerCase();
  const isAdmin = cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029' || cleanId === '494232782';

  return {
    telegramId: cleanId,
    username: username || 'user_' + cleanId.slice(-4),
    firstName: firstName || 'Warrior',
    role: isAdmin ? 'ADMIN' : 'CLIENT',
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
  const cleanId = String(telegramId || '494232782');

  const intervalId = setInterval(async () => {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data) callback(data as UserData);
      }
    } catch (e) {}
  }, 3000);

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
    clearInterval(intervalId);
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 4. Listener for Referred Users List (Immediate Fetch + Polling + Realtime Listener)
export function subscribeToReferredUsers(telegramId: string, callback: (users: any[]) => void) {
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '494232782');

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
  const intervalId = setInterval(fetchRefs, 3000);

  try {
    const refsRef = ref(rtdb, `users/${cleanId}/referrals`);
    rtdbUnsub = onValue(refsRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(Object.values(snapshot.val()));
      }
    });
  } catch (e) {}

  return () => {
    clearInterval(intervalId);
    rtdbUnsub();
  };
}

// 5. Create Deposit/Withdrawal Transaction (With Available Balance Verification)
export async function createLiveTransaction(
  telegramId: string, 
  username: string, 
  type: 'DEPOSIT' | 'WITHDRAW', 
  grossAmount: number
): Promise<TransactionData> {
  const cleanId = String(telegramId || '494232782');

  await forceSyncUserProfile(cleanId, username);

  if (type === 'WITHDRAW') {
    let currentBal = 0;
    let pendingWithdrawTotal = 0;

    try {
      const uRes = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData && typeof uData.tradingBalance === 'number') currentBal = uData.tradingBalance;
      }

      const txRes = await fetch(`${RTDB_BASE_URL}/users/${cleanId}/transactions.json`);
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData) {
          const list = Object.values(txData) as TransactionData[];
          pendingWithdrawTotal = list
            .filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING')
            .reduce((acc, t) => acc + t.grossAmount, 0);
        }
      }
    } catch (e) {}

    const availableBal = Math.max(0, currentBal - pendingWithdrawTotal);
    if (grossAmount > availableBal) {
      throw new Error(`INSUFFICIENT_AVAILABLE_FUNDS: Số dư khả dụng không đủ. Số dư: $${currentBal.toFixed(2)}, Đang chờ rút: $${pendingWithdrawTotal.toFixed(2)}.`);
    }
  }

  const feeCalc = type === 'DEPOSIT' 
    ? calculateDepositFee(grossAmount) 
    : calculateWithdrawFee(grossAmount);

  const memoCode = `SPARTAN_${Math.floor(100000 + Math.random() * 900000)}`;
  const txId = `${type === 'DEPOSIT' ? 'DEP' : 'WDR'}_${cleanId}_${Math.floor(1000 + Math.random() * 9000)}`;
  const nowTs = Date.now();

  const masterWallet = 'TBGvPZsuqKH5CrSbYLEi8q2BCQ6CXyKmAu';

  const sha256Signature = generateDepositSignature({
    orderId: txId,
    masterWalletAddress: masterWallet,
    timestamp: nowTs
  });

  const txData: TransactionData = {
    id: txId,
    userId: cleanId,
    username: username || 'user_' + cleanId.slice(-4),
    type,
    grossAmount,
    feeAmount: feeCalc.totalFee,
    netAmount: feeCalc.netAmount,
    status: 'PENDING',
    memoCode,
    masterWalletAddress: masterWallet,
    sha256Signature,
    createdAt: new Date(nowTs).toISOString()
  };

  try {
    await fetch(`${RTDB_BASE_URL}/users/${cleanId}/transactions/${txId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txData)
    });
    await fetch(`${RTDB_BASE_URL}/transactions/${txId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txData)
    });
  } catch (e) {}

  await saveToFirestoreREST(`users/${cleanId}/transactions/${txId}`, txData);
  await saveToFirestoreREST(`transactions/${txId}`, txData);

  try {
    const userTxDocRef = doc(db, "users", cleanId, "transactions", txId);
    await setDoc(userTxDocRef, { ...txData, createdAt: serverTimestamp() });

    const globalTxDocRef = doc(db, "transactions", txId);
    await setDoc(globalTxDocRef, { ...txData, createdAt: serverTimestamp() });
  } catch (e) {}

  return txData;
}

// 6. Realtime Listener for User's Transactions History (Immediate Fetch + Polling + Realtime Listener)
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '494232782');

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
  const intervalId = setInterval(fetchTxs, 3000);

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
    clearInterval(intervalId);
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 7. Realtime Listener for Admin Pending Queue
export function subscribeToPendingTransactions(callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  const intervalId = setInterval(async () => {
    try {
      const res = await fetch(`${RTDB_BASE_URL}/transactions.json`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          const pending = Object.values(data).filter((t: any) => t.status === 'PENDING') as TransactionData[];
          callback(pending);
        }
      }
    } catch (e) {}
  }, 3000);

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
    clearInterval(intervalId);
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
  // Normalize inverted arguments if userId was passed first
  let resolvedTxId = txId;
  let resolvedAdmin = adminUsername;
  if (/^\d+$/.test(txId) && (adminUsername.includes('_') || adminUsername.startsWith('SPARTAN'))) {
    resolvedTxId = adminUsername;
    resolvedAdmin = 'tddv2017';
  }

  let userId = '';
  let netAmount = 0;
  let grossAmount = 0;
  let feeAmount = 0;
  let type = 'DEPOSIT';
  let targetKey = resolvedTxId;
  let tx: any = null;

  try {
    // 1. Direct fetch
    const res = await fetch(`${RTDB_BASE_URL}/transactions/${resolvedTxId}.json`);
    if (res.ok) {
      tx = await res.json();
    }

    // 2. Deep scan if not found by direct key
    if (!tx) {
      const allRes = await fetch(`${RTDB_BASE_URL}/transactions.json`);
      if (allRes.ok) {
        const allData = await allRes.json();
        if (allData && typeof allData === 'object') {
          for (const [k, v] of Object.entries(allData as Record<string, any>)) {
            if (v && (k === resolvedTxId || v.id === resolvedTxId || v.memoCode === resolvedTxId)) {
              targetKey = k;
              tx = v;
              break;
            }
          }
        }
      }
    }

    if (tx) {
      if (tx.status === 'APPROVED') {
        return { success: false, message: 'Lệnh này đã được phê duyệt trước đó!' };
      }
      if (tx.status === 'REJECTED') {
        return { success: false, message: 'Lệnh này đã bị từ chối trước đó!' };
      }

      userId = String(tx.userId);
      type = tx.type;

      if (type === 'DEPOSIT' && typeof actualOnChainAmount === 'number' && actualOnChainAmount > 0) {
        const feeCalc = calculateDepositFee(actualOnChainAmount);
        grossAmount = actualOnChainAmount;
        feeAmount = feeCalc.totalFee;
        netAmount = feeCalc.netAmount;
      } else {
        grossAmount = tx.grossAmount;
        feeAmount = tx.feeAmount;
        netAmount = tx.netAmount;
      }

      if (type === 'WITHDRAW' && userId) {
        const userRes = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`);
        if (userRes.ok) {
          const user = await userRes.json();
          const currentBal = user?.tradingBalance || 0;

          if (currentBal < grossAmount) {
            const rejectPayload = {
              ...tx,
              status: 'REJECTED',
              approvedBy: 'SYSTEM_AUTO_REJECT_INSUFFICIENT_FUNDS',
              rejectedAt: new Date().toISOString()
            };

            await fetch(`${RTDB_BASE_URL}/transactions/${targetKey}.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(rejectPayload)
            });
            await fetch(`${RTDB_BASE_URL}/users/${userId}/transactions/${targetKey}.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(rejectPayload)
            });

            await saveToFirestoreREST(`transactions/${targetKey}`, rejectPayload);
            await saveToFirestoreREST(`users/${userId}/transactions/${targetKey}`, rejectPayload);

            return {
              success: false,
              message: `⛔ TỪ CHỐI TỰ ĐỘNG: Số dư tài khoản ($${currentBal.toFixed(2)}) không đủ để duyệt lệnh rút $${grossAmount.toFixed(2)} thứ 2 này!`
            };
          }
        }
      }

      const updatePayload = {
        ...tx,
        grossAmount,
        feeAmount,
        netAmount,
        actualOnChainAmount: actualOnChainAmount || grossAmount,
        adjustedOnChain: typeof actualOnChainAmount === 'number' && actualOnChainAmount !== tx.grossAmount,
        status: 'APPROVED',
        approvedBy: resolvedAdmin,
        approvedAt: new Date().toISOString()
      };

      await fetch(`${RTDB_BASE_URL}/transactions/${targetKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });
      if (userId) {
        await fetch(`${RTDB_BASE_URL}/users/${userId}/transactions/${targetKey}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload)
        });
        await saveToFirestoreREST(`users/${userId}/transactions/${targetKey}`, updatePayload);
      }

      await saveToFirestoreREST(`transactions/${targetKey}`, updatePayload);

      // Update user trading balance
      if (userId) {
        try {
          const userRes = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`);
          if (userRes.ok) {
            const user = await userRes.json();
            if (user) {
              const currentBal = user.tradingBalance || 0;
              const newBal = type === 'DEPOSIT' ? currentBal + netAmount : currentBal - grossAmount;

              const balPayload = { tradingBalance: Math.max(0, newBal) };

              await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(balPayload)
              });

              await saveToFirestoreREST(`users/${userId}`, balPayload);
            }
          }
        } catch (e) {}
      }

      return { success: true, message: `Phê duyệt giao dịch ${targetKey} thành công!` };
    }
  } catch (e) {
    console.error("approveLiveTransaction error:", e);
  }

  return { success: false, message: 'Không tìm thấy giao dịch để duyệt!' };
}

// 9. Admin Rejection of Pending Transaction (Bulletproof Smart Resolution)
export async function rejectLiveTransaction(
  txId: string, 
  adminUsername: string = 'tddv2017', 
  reason: string = 'Từ chối bởi Admin'
): Promise<{ success: boolean; message: string }> {
  // Normalize inverted arguments if userId was passed first
  let resolvedTxId = txId;
  let resolvedAdmin = adminUsername;
  if (/^\d+$/.test(txId) && (adminUsername.includes('_') || adminUsername.startsWith('SPARTAN'))) {
    resolvedTxId = adminUsername;
    resolvedAdmin = 'tddv2017';
  }

  let targetKey = resolvedTxId;
  let tx: any = null;

  try {
    // 1. Direct fetch
    const res = await fetch(`${RTDB_BASE_URL}/transactions/${resolvedTxId}.json`);
    if (res.ok) {
      tx = await res.json();
    }

    // 2. Deep scan if not found by direct key
    if (!tx) {
      const allRes = await fetch(`${RTDB_BASE_URL}/transactions.json`);
      if (allRes.ok) {
        const allData = await allRes.json();
        if (allData && typeof allData === 'object') {
          for (const [k, v] of Object.entries(allData as Record<string, any>)) {
            if (v && (k === resolvedTxId || v.id === resolvedTxId || v.memoCode === resolvedTxId)) {
              targetKey = k;
              tx = v;
              break;
            }
          }
        }
      }
    }

    if (tx) {
      if (tx.status === 'APPROVED') {
        return { success: false, message: 'Lệnh này đã được duyệt trước đó, không thể từ chối!' };
      }
      if (tx.status === 'REJECTED') {
        return { success: false, message: 'Lệnh này đã bị từ chối trước đó!' };
      }

      const userId = String(tx.userId || '');
      const rejectPayload = {
        ...tx,
        status: 'REJECTED',
        approvedBy: resolvedAdmin,
        rejectionReason: reason,
        rejectedAt: new Date().toISOString()
      };

      await fetch(`${RTDB_BASE_URL}/transactions/${targetKey}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rejectPayload)
      });

      if (userId) {
        await fetch(`${RTDB_BASE_URL}/users/${userId}/transactions/${targetKey}.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rejectPayload)
        });
        await saveToFirestoreREST(`users/${userId}/transactions/${targetKey}`, rejectPayload);
      }

      await saveToFirestoreREST(`transactions/${targetKey}`, rejectPayload);
      return { success: true, message: `Đã TỪ CHỐI thành công lệnh ${tx.type || ''} ${tx.id || targetKey}!` };
    }
  } catch (e) {
    console.error("rejectLiveTransaction error:", e);
  }

  return { success: false, message: 'Không tìm thấy giao dịch để từ chối!' };
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

