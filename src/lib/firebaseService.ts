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
import { checkIsAdmin } from "./adminAuth";

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
  const cleanId = String(telegramId || '494232782');
  const cleanHandle = (username || 'user_' + cleanId.slice(-4)).replace('@', '').toLowerCase();
  const isStaticAdmin = checkIsAdmin(cleanHandle) || checkIsAdmin(cleanId);

  const nowIso = new Date().toISOString();

  let existingTradingBal = 0.00;
  let existingRefBal = 0.00;
  let existingTier = 1;
  let existingRole: 'CLIENT' | 'RESELLER' | 'ADMIN' | 'ACCOUNTANT' | 'TECH_OPS' = 'CLIENT';
  let hasExistingRole = false;

  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (typeof data.tradingBalance === 'number') existingTradingBal = data.tradingBalance;
        if (typeof data.referralBalance === 'number') existingRefBal = data.referralBalance;
        if (typeof data.resellerTier === 'number') existingTier = data.resellerTier;
        if (data.role) {
          existingRole = data.role;
          hasExistingRole = true;
        }
      }
    }
  } catch (e) {}

  // CRITICAL PRESERVATION: If user already has ADMIN, RESELLER, ACCOUNTANT or TECH_OPS role assigned in Database,
  // NEVER overwrite/downgrade them to CLIENT upon login!
  let resolvedRole: 'CLIENT' | 'RESELLER' | 'ADMIN' | 'ACCOUNTANT' | 'TECH_OPS' = 'CLIENT';
  if (isStaticAdmin || (hasExistingRole && (existingRole === 'ADMIN' as any || (existingRole as any) === 'SUPER_ADMIN'))) {
    resolvedRole = 'ADMIN';
  } else if (hasExistingRole) {
    resolvedRole = existingRole;
  }

  const userPayload: UserData = {
    telegramId: cleanId,
    username: username || 'user_' + cleanId.slice(-4),
    firstName: firstName || 'Warrior',
    role: resolvedRole,
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
  grossAmount: number,
  riskAgreement?: RiskAgreementRecord
): Promise<TransactionData> {
  if (!telegramId) {
    throw new Error('MISSING_USER_IDENTITY: Bắt buộc phải có định danh người dùng Telegram ID hợp lệ!');
  }
  const cleanId = String(telegramId).trim();

  await forceSyncUserProfile(cleanId, username);

  if (type === 'WITHDRAW') {
    if (isNaN(grossAmount) || grossAmount <= 0 || !isFinite(grossAmount)) {
      throw new Error('INVALID_AMOUNT: Số tiền rút không hợp lệ!');
    }

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
          // 1. CHỐNG RACE-CONDITION / DOUBLE-SPENDING: Kiểm tra nếu đã có lệnh rút PENDING
          const pendingWithdrawList = list.filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING');
          if (pendingWithdrawList.length > 0) {
            throw new Error(`CONCURRENT_WITHDRAWAL_LOCK: Bạn đang có lệnh rút tiền (${pendingWithdrawList[0].id || pendingWithdrawList[0].memoCode}) đang chờ Admin duyệt. Để bảo đảm an toàn, vui lòng đợi hoàn tất trước khi tạo lệnh mới!`);
          }

          pendingWithdrawTotal = list
            .filter(t => t.type === 'WITHDRAW' && t.status === 'PENDING')
            .reduce((acc, t) => acc + t.grossAmount, 0);
        }
      }
    } catch (e: any) {
      if (e?.message?.includes('CONCURRENT_WITHDRAWAL_LOCK')) {
        throw e;
      }
    }

    const availableBal = Math.max(0, currentBal - pendingWithdrawTotal);
    if (grossAmount > availableBal) {
      throw new Error(`INSUFFICIENT_AVAILABLE_FUNDS: Số dư khả dụng không đủ. Số dư: $${currentBal.toFixed(2)}, Đang chờ rút: $${pendingWithdrawTotal.toFixed(2)}.`);
    }

    // Deduct trading balance immediately upon creating withdrawal
    const newBal = Math.max(0, currentBal - grossAmount);
    try {
      await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradingBalance: newBal })
      });
      await saveToFirestoreREST(`users/${cleanId}`, { tradingBalance: newBal });
    } catch (e) {}
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
    ...(riskAgreement ? { riskAgreement } : {}),
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
    if (riskAgreement) {
      await fetch(`${RTDB_BASE_URL}/users/${cleanId}/signed_agreements/${txId}.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: txId,
          userId: cleanId,
          username,
          grossAmount,
          agreement: riskAgreement,
          signedAt: riskAgreement.signedAt
        })
      });
    }
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
        approvedAt: new Date().toISOString(),
        rejectedAt: null,
        rejectionReason: null
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

      // Update user trading balance (Withdrawals are already deducted upon creation, only Deposits add funds)
      let finalBal = 0;
      if (userId) {
        try {
          const userRes = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`);
          if (userRes.ok) {
            const user = await userRes.json();
            if (user) {
              const currentBal = user.tradingBalance || 0;
              if (type === 'DEPOSIT') {
                finalBal = currentBal + netAmount;
                const balPayload: any = { 
                  tradingBalance: Math.max(0, finalBal),
                  capitalJoinedAt: user.capitalJoinedAt || updatePayload.approvedAt || new Date().toISOString()
                };
                await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(balPayload)
                });
                await saveToFirestoreREST(`users/${userId}`, balPayload);
              } else {
                finalBal = currentBal;
              }
            }
          }
        } catch (e) {}
      }

      // Send Telegram notification directly to user
      if (userId) {
        try {
          fetch('/api/notify-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId: userId,
              type,
              status: 'APPROVED',
              grossAmount,
              feeAmount,
              netAmount,
              newBalance: finalBal,
              txId: targetKey
            })
          }).catch(() => {});
        } catch (e) {}
      }

      return { success: true, message: `Phê duyệt giao dịch ${targetKey} thành công!` };
    }
  } catch (e) {
    console.error("approveLiveTransaction error:", e);
  }

  return { success: false, message: 'Không tìm thấy giao dịch để duyệt!' };
}

// 9. Admin Rejection of Pending Transaction (Bulletproof Smart Resolution with 100% Auto-Refund)
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

      // AUTO-REFUND 100% OF FUNDS BACK TO USER UPON WITHDRAWAL REJECTION
      let userRefundedBalance = 0;
      if (tx.type === 'WITHDRAW' && userId) {
        try {
          const userRes = await fetch(`${RTDB_BASE_URL}/users/${userId}.json`);
          if (userRes.ok) {
            const user = await userRes.json();
            if (user) {
              const isRefWithdraw = targetKey.includes('REF') || String(tx.id || '').includes('REF') || String(tx.memoCode || '').includes('REF');
              if (isRefWithdraw) {
                // Refund 100% back to referralBalance
                const currentRefBal = Number(user.referralBalance) || 0;
                userRefundedBalance = currentRefBal + Number(tx.grossAmount);
                await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ referralBalance: userRefundedBalance })
                });
                await saveToFirestoreREST(`users/${userId}`, { referralBalance: userRefundedBalance });
              } else {
                // Refund 100% back to tradingBalance
                const currentTradingBal = Number(user.tradingBalance) || 0;
                userRefundedBalance = currentTradingBal + Number(tx.grossAmount);
                await fetch(`${RTDB_BASE_URL}/users/${userId}.json`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tradingBalance: userRefundedBalance })
                });
                await saveToFirestoreREST(`users/${userId}`, { tradingBalance: userRefundedBalance });
              }
            }
          }
        } catch (e) {
          console.error("Lỗi hoàn trả tiền rút:", e);
        }
      }

      const rejectPayload = {
        ...tx,
        status: 'REJECTED',
        approvedBy: resolvedAdmin,
        rejectionReason: reason,
        refunded: tx.type === 'WITHDRAW',
        refundedAmount: tx.type === 'WITHDRAW' ? tx.grossAmount : 0,
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

      // Send Telegram notification directly to user with auto-refund status
      if (userId) {
        try {
          fetch('/api/notify-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              telegramId: userId,
              type: tx.type,
              status: 'REJECTED',
              grossAmount: tx.grossAmount,
              newBalance: userRefundedBalance,
              reason,
              txId: targetKey
            })
          }).catch(() => {});
        } catch (e) {}
      }

      return { 
        success: true, 
        message: tx.type === 'WITHDRAW' 
          ? `Đã TỪ CHỐI lệnh rút ${targetKey} và HOÀN TIỀN 100% (+$${tx.grossAmount} USDT) về lại cho người dùng!` 
          : `Đã TỪ CHỐI thành công lệnh nạp ${targetKey}!` 
      };
    }
  } catch (e) {
    console.error("rejectLiveTransaction error:", e);
  }

  return { success: false, message: 'Không tìm thấy giao dịch để từ chối!' };
}

// 9.1. Reinvest Referral Earnings to Bot Trading Balance (0% fee)
export async function reinvestReferralBalance(
  telegramId: string, 
  amount: number
): Promise<{ success: boolean; message: string; newTradingBal?: number; newRefBal?: number }> {
  if (!telegramId) return { success: false, message: 'Thiếu định danh Telegram ID người dùng!' };
  const cleanId = String(telegramId).trim();
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
    if (!res.ok) return { success: false, message: 'Không thể kết nối máy chủ dữ liệu.' };
    const user = await res.json();
    if (!user) return { success: false, message: 'Không tìm thấy thông tin tài khoản.' };

    const currentRefBal = Number(user.referralBalance) || 0;
    const currentTradingBal = Number(user.tradingBalance) || 0;

    if (amount <= 0 || amount > currentRefBal) {
      return { success: false, message: `Số tiền tái đầu tư không hợp lệ. Số dư hoa hồng hiện có: $${currentRefBal.toFixed(2)} USDT.` };
    }

    const newRefBal = Math.max(0, currentRefBal - amount);
    const newTradingBal = currentTradingBal + amount;

    const patchPayload = {
      referralBalance: newRefBal,
      tradingBalance: newTradingBal
    };

    await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload)
    });

    await saveToFirestoreREST(`users/${cleanId}`, patchPayload);

    // Record internal reinvestment transaction
    const txId = `REINV_${cleanId}_${Date.now().toString().slice(-6)}`;
    const txData: TransactionData = {
      id: txId,
      userId: cleanId,
      username: user.username || 'user',
      type: 'DEPOSIT',
      grossAmount: amount,
      feeAmount: 0,
      netAmount: amount,
      status: 'APPROVED',
      memoCode: 'REINVEST_REFERRAL_0_FEE',
      approvedBy: 'AUTO_REINVEST',
      createdAt: new Date().toISOString()
    };

    await fetch(`${RTDB_BASE_URL}/users/${cleanId}/transactions/${txId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txData)
    });

    return {
      success: true,
      message: `✓ Đã tái đầu tư $${amount.toFixed(2)} USDT từ hoa hồng vào Vốn Bot thành công (0% Phí)!`,
      newTradingBal,
      newRefBal
    };
  } catch (err: any) {
    return { success: false, message: 'Lỗi xử lý tái đầu tư: ' + err.message };
  }
}

// 9.2. Withdraw Referral Earnings to External TRC20 Wallet
export async function withdrawReferralBalance(
  telegramId: string, 
  amount: number,
  recipientAddress: string
): Promise<{ success: boolean; message: string; newRefBal?: number; tx?: TransactionData }> {
  const cleanId = String(telegramId || '494232782');
  try {
    const res = await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`);
    if (!res.ok) return { success: false, message: 'Không thể kết nối máy chủ dữ liệu.' };
    const user = await res.json();
    if (!user) return { success: false, message: 'Không tìm thấy thông tin tài khoản.' };

    const currentRefBal = Number(user.referralBalance) || 0;
    if (amount <= 0 || amount > currentRefBal) {
      return { success: false, message: `Số tiền rút không hợp lệ. Số dư hoa hồng hiện có: $${currentRefBal.toFixed(2)} USDT.` };
    }

    const cleanAddress = recipientAddress.trim();
    if (!cleanAddress || !cleanAddress.startsWith('T') || cleanAddress.length < 30) {
      return { success: false, message: 'Vui lòng nhập địa chỉ ví USDT TRC20 hợp lệ (bắt đầu bằng T, gồm 34 ký tự)!' };
    }

    // Network on-chain gas fee for withdrawal
    const feeAmount = 5.00;
    if (amount <= feeAmount) {
      return { success: false, message: `Số tiền rút tối thiểu là $${(feeAmount + 1).toFixed(2)} USDT để bù phí On-Chain Gas $5.00!` };
    }

    const netAmount = amount - feeAmount;
    const newRefBal = Math.max(0, currentRefBal - amount);

    const patchPayload = {
      referralBalance: newRefBal
    };

    await fetch(`${RTDB_BASE_URL}/users/${cleanId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patchPayload)
    });
    await saveToFirestoreREST(`users/${cleanId}`, patchPayload);

    // Create pending withdrawal transaction
    const txId = `WDR_REF_${cleanId}_${Date.now().toString().slice(-6)}`;
    const txData: TransactionData = {
      id: txId,
      userId: cleanId,
      username: user.username || 'user',
      type: 'WITHDRAW',
      grossAmount: amount,
      feeAmount,
      netAmount,
      status: 'PENDING',
      memoCode: `REF_WITHDRAW_${cleanId.slice(-4)}`,
      recipientAddress: cleanAddress,
      createdAt: new Date().toISOString()
    };

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
    await saveToFirestoreREST(`users/${cleanId}/transactions/${txId}`, txData);
    await saveToFirestoreREST(`transactions/${txId}`, txData);

    return {
      success: true,
      message: `✓ Đã tạo lệnh rút hoa hồng $${amount.toFixed(2)} USDT thành công! Thực nhận về ví: +$${netAmount.toFixed(2)} USDT. Lệnh đang chờ giải ngân.`,
      newRefBal,
      tx: txData
    };
  } catch (err: any) {
    return { success: false, message: 'Lỗi rút hoa hồng: ' + err.message };
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

