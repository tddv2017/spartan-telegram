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

export interface UserData {
  telegramId: string;
  username: string;
  firstName: string;
  role: 'CLIENT' | 'RESELLER' | 'ADMIN';
  tradingBalance: number;
  referralBalance: number;
  referralCode: string;
  referrerId?: string;
  resellerTier: number;
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
  approvedBy?: string;
  createdAt?: any;
}

// 1. FORCE UNCONDITIONAL IMMEDIATE SYNC OF USER PROFILE TO FIREBASE
export async function forceSyncUserProfile(
  telegramId: string, 
  username: string = '', 
  firstName: string = '',
  referrerId?: string
): Promise<{ success: boolean; rtdbPath: string; firestorePath: string }> {
  const cleanId = String(telegramId || '1788035393');
  const cleanHandle = (username || 'user_' + cleanId.slice(-4)).replace('@', '').toLowerCase();
  const isAdmin = cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029' || cleanId === '1788035393';

  const nowIso = new Date().toISOString();

  // Read existing balance if present to prevent resetting custom balance
  let existingTradingBal = 0.00;
  let existingRefBal = 0.00;

  try {
    const rtdbUserRef = ref(rtdb, `users/${cleanId}`);
    const snap = await get(rtdbUserRef);
    if (snap.exists()) {
      const data = snap.val();
      if (typeof data.tradingBalance === 'number') existingTradingBal = data.tradingBalance;
      if (typeof data.referralBalance === 'number') existingRefBal = data.referralBalance;
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
    resellerTier: 1,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  let rtdbSuccess = false;
  let firestoreSuccess = false;

  // A. Force Write to RTDB (Path: users/<cleanId>)
  try {
    const rtdbUserRef = ref(rtdb, `users/${cleanId}`);
    await set(rtdbUserRef, userPayload);
    rtdbSuccess = true;
    console.log("🔥 FORCE SYNC RTDB SUCCESS -> users/" + cleanId, userPayload);

    if (referrerId && referrerId !== cleanId) {
      const refLinkRef = ref(rtdb, `users/${referrerId}/referrals/${cleanId}`);
      await set(refLinkRef, {
        telegramId: cleanId,
        username: userPayload.username,
        firstName: userPayload.firstName,
        joinedAt: nowIso,
      });
    }
  } catch (err) {
    console.error("❌ FORCE SYNC RTDB ERROR:", err);
  }

  // B. Force Write to Firestore (Collection: users, Document: <cleanId>)
  try {
    const userRef = doc(db, "users", cleanId);
    await setDoc(userRef, { 
      ...userPayload, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp() 
    }, { merge: true });
    firestoreSuccess = true;
    console.log("🔥 FORCE SYNC FIRESTORE SUCCESS -> users/" + cleanId, userPayload);

    if (referrerId && referrerId !== cleanId) {
      const refDocRef = doc(db, "users", String(referrerId), "referrals", cleanId);
      await setDoc(refDocRef, {
        telegramId: cleanId,
        username: userPayload.username,
        firstName: userPayload.firstName,
        joinedAt: serverTimestamp(),
      }, { merge: true });
    }
  } catch (err) {
    console.error("❌ FORCE SYNC FIRESTORE ERROR:", err);
  }

  return {
    success: rtdbSuccess || firestoreSuccess,
    rtdbPath: `users/${cleanId}`,
    firestorePath: `users/${cleanId}`
  };
}

// 2. Get or Create User Profile (Wrapper calling forceSyncUserProfile)
export async function getOrCreateUser(
  telegramId: string, 
  username: string = '', 
  firstName: string = '',
  referrerId?: string
): Promise<UserData> {
  await forceSyncUserProfile(telegramId, username, firstName, referrerId);

  const cleanId = String(telegramId || '1788035393');
  try {
    const rtdbUserRef = ref(rtdb, `users/${cleanId}`);
    const snap = await get(rtdbUserRef);
    if (snap.exists()) return snap.val() as UserData;
  } catch (e) {}

  const cleanHandle = (username || 'user_' + cleanId.slice(-4)).replace('@', '').toLowerCase();
  const isAdmin = cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029' || cleanId === '1788035393';

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

  const cleanId = String(telegramId || '1788035393');

  // A. Primary RTDB Listener
  try {
    const rtdbUserRef = ref(rtdb, `users/${cleanId}`);
    rtdbUnsub = onValue(rtdbUserRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val() as UserData;
        callback(userData);

        try {
          const userRef = doc(db, "users", cleanId);
          setDoc(userRef, userData, { merge: true });
        } catch (e) {}
      }
    }, (err) => {
      console.warn("RTDB subscribeToUser notice:", err);
    });
  } catch (e) {}

  // B. Secondary Firestore Listener
  try {
    const userRef = doc(db, "users", cleanId);
    firestoreUnsub = onSnapshot(
      userRef, 
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as UserData);
        }
      },
      (err) => {
        console.warn("Firestore subscribeToUser notice:", err);
      }
    );
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 4. Listener for Referred Users List
export function subscribeToReferredUsers(telegramId: string, callback: (users: any[]) => void) {
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '1788035393');

  try {
    const refsRef = ref(rtdb, `users/${cleanId}/referrals`);
    rtdbUnsub = onValue(refsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.values(data);
        callback(list);
      } else {
        callback([]);
      }
    });
  } catch (e) {}

  return () => rtdbUnsub();
}

// 5. Create Deposit or Withdrawal Transaction
export async function createLiveTransaction(
  telegramId: string, 
  username: string, 
  type: 'DEPOSIT' | 'WITHDRAW', 
  grossAmount: number
): Promise<TransactionData> {
  const cleanId = String(telegramId || '1788035393');

  // Force user profile document sync first
  await forceSyncUserProfile(cleanId, username);

  const feeCalc = type === 'DEPOSIT' 
    ? calculateDepositFee(grossAmount) 
    : calculateWithdrawFee(grossAmount);

  const memoCode = `SPARTAN_${Math.floor(100000 + Math.random() * 900000)}`;
  const txId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;

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
    createdAt: new Date().toISOString()
  };

  // Save to RTDB (Path: transactions/TX-XXXXX)
  try {
    const rtdbRef = ref(rtdb, `transactions/${txId}`);
    await set(rtdbRef, txData);
    console.log("✅ SUCCESS: RTDB transaction created at transactions/" + txId);
  } catch (e) {
    console.error("❌ RTDB set transaction error:", e);
  }

  // Save to Firestore (Collection: transactions, Document: TX-XXXXX)
  try {
    const txDocRef = doc(db, "transactions", txId);
    await setDoc(txDocRef, {
      ...txData,
      createdAt: serverTimestamp()
    });
    console.log("✅ SUCCESS: Firestore transaction created at transactions/" + txId);
  } catch (e) {
    console.error("❌ Firestore setDoc transaction error:", e);
  }

  return txData;
}

// 6. Realtime Listener for User's Transactions History
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};
  const cleanId = String(telegramId || '1788035393');

  try {
    const rtdbTxRef = ref(rtdb, 'transactions');
    rtdbUnsub = onValue(rtdbTxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const txs: TransactionData[] = Object.values(data).filter(
          (t: any) => String(t.userId) === cleanId
        ) as TransactionData[];
        callback(txs);
      } else {
        callback([]);
      }
    });
  } catch (e) {}

  try {
    const txCol = collection(db, "transactions");
    const q = query(txCol, where("userId", "==", cleanId));

    firestoreUnsub = onSnapshot(
      q, 
      (snapshot) => {
        const txs: TransactionData[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() } as TransactionData);
        });
        if (txs.length > 0) callback(txs);
      },
      (err) => {}
    );
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

  try {
    const rtdbTxRef = ref(rtdb, 'transactions');
    rtdbUnsub = onValue(rtdbTxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pendingTxs: TransactionData[] = Object.values(data).filter(
          (t: any) => t.status === 'PENDING'
        ) as TransactionData[];
        callback(pendingTxs);
      } else {
        callback([]);
      }
    });
  } catch (e) {}

  try {
    const txCol = collection(db, "transactions");
    const q = query(txCol, where("status", "==", "PENDING"));

    firestoreUnsub = onSnapshot(
      q, 
      (snapshot) => {
        const txs: TransactionData[] = [];
        snapshot.forEach((doc) => {
          txs.push({ id: doc.id, ...doc.data() } as TransactionData);
        });
        if (txs.length > 0) callback(txs);
      },
      (err) => {}
    );
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 8. Admin Approval of Pending Transaction
export async function approveLiveTransaction(txId: string, adminUsername: string = 'tddv2017') {
  let userId = '';
  let netAmount = 0;
  let grossAmount = 0;
  let type = 'DEPOSIT';

  try {
    const rtdbTxRef = ref(rtdb, `transactions/${txId}`);
    const snap = await get(rtdbTxRef);
    if (snap.exists()) {
      const tx = snap.val() as TransactionData;
      userId = tx.userId;
      netAmount = tx.netAmount;
      grossAmount = tx.grossAmount;
      type = tx.type;

      await update(rtdbTxRef, {
        status: 'APPROVED',
        approvedBy: adminUsername,
        approvedAt: new Date().toISOString()
      });
    }
  } catch (e) {}

  if (userId) {
    try {
      const rtdbUserRef = ref(rtdb, `users/${userId}`);
      const userSnap = await get(rtdbUserRef);
      if (userSnap.exists()) {
        const currentBal = (userSnap.val() as UserData).tradingBalance || 0;
        const newBal = type === 'DEPOSIT' 
          ? currentBal + netAmount 
          : currentBal - grossAmount;

        await update(rtdbUserRef, {
          tradingBalance: Math.max(0, newBal)
        });

        try {
          const userRef = doc(db, "users", String(userId));
          await updateDoc(userRef, {
            tradingBalance: Math.max(0, newBal)
          });
        } catch (e) {}
      }
    } catch (e) {}
  }
}
