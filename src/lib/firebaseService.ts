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

// 1. Get or Create User Profile in Firestore AND Realtime Database (RTDB)
export async function getOrCreateUser(
  telegramId: string, 
  username: string = '', 
  firstName: string = '',
  referrerId?: string
): Promise<UserData> {
  const cleanHandle = username.replace('@', '').toLowerCase();
  const isAdmin = cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029' || telegramId === '1788035393';

  // Check Realtime Database (RTDB) first
  try {
    const rtdbUserRef = ref(rtdb, `users/${telegramId}`);
    const rtdbSnap = await get(rtdbUserRef);
    if (rtdbSnap.exists()) {
      return rtdbSnap.val() as UserData;
    }
  } catch (e) {
    console.warn("RTDB get error:", e);
  }

  // Check Firestore next
  try {
    const userRef = doc(db, "users", String(telegramId));
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }
  } catch (e) {
    console.warn("Firestore get error:", e);
  }

  // Clean initialization for new client
  const defaultUser: UserData = {
    telegramId: String(telegramId),
    username: username || 'user_' + String(telegramId).slice(-4),
    firstName: firstName || 'Warrior',
    role: isAdmin ? 'ADMIN' : 'CLIENT',
    tradingBalance: 0.00,
    referralBalance: 0.00,
    referralCode: `SPARTAN_${telegramId}`,
    referrerId: referrerId || undefined,
    resellerTier: 1,
  };

  // Save to RTDB (Path: users/<telegramId>)
  try {
    const rtdbUserRef = ref(rtdb, `users/${telegramId}`);
    await set(rtdbUserRef, { ...defaultUser, createdAt: new Date().toISOString() });

    if (referrerId && referrerId !== telegramId) {
      const refLinkRef = ref(rtdb, `users/${referrerId}/referrals/${telegramId}`);
      await set(refLinkRef, {
        telegramId: String(telegramId),
        username: defaultUser.username,
        firstName: defaultUser.firstName,
        joinedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.error("RTDB set user error:", e);
  }

  // Save to Firestore (Collection: users, Document: <telegramId>)
  try {
    const userRef = doc(db, "users", String(telegramId));
    await setDoc(userRef, { ...defaultUser, createdAt: serverTimestamp() });

    if (referrerId && referrerId !== telegramId) {
      const refDocRef = doc(db, "users", String(referrerId), "referrals", String(telegramId));
      await setDoc(refDocRef, {
        telegramId: String(telegramId),
        username: defaultUser.username,
        firstName: defaultUser.firstName,
        joinedAt: serverTimestamp(),
      });
    }
  } catch (e) {
    console.error("Firestore set user error:", e);
  }

  return defaultUser;
}

// 2. Realtime Listener for Single User Data
export function subscribeToUser(telegramId: string, callback: (user: UserData | null) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  // A. Primary RTDB Listener
  try {
    const rtdbUserRef = ref(rtdb, `users/${telegramId}`);
    rtdbUnsub = onValue(rtdbUserRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val() as UserData;
        callback(userData);

        try {
          const userRef = doc(db, "users", String(telegramId));
          setDoc(userRef, userData, { merge: true });
        } catch (e) {}
      }
    }, (err) => {
      console.warn("RTDB subscribeToUser notice:", err);
    });
  } catch (e) {}

  // B. Secondary Firestore Listener
  try {
    const userRef = doc(db, "users", String(telegramId));
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

// 3. Listener for Referred Users List
export function subscribeToReferredUsers(telegramId: string, callback: (users: any[]) => void) {
  let rtdbUnsub = () => {};

  try {
    const refsRef = ref(rtdb, `users/${telegramId}/referrals`);
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

// 4. Create Deposit or Withdrawal Transaction (Predictable Document ID: TX-XXXXX)
export async function createLiveTransaction(
  telegramId: string, 
  username: string, 
  type: 'DEPOSIT' | 'WITHDRAW', 
  grossAmount: number
): Promise<TransactionData> {
  const feeCalc = type === 'DEPOSIT' 
    ? calculateDepositFee(grossAmount) 
    : calculateWithdrawFee(grossAmount);

  const memoCode = `SPARTAN_${Math.floor(100000 + Math.random() * 900000)}`;
  const txId = `TX-${Math.floor(10000 + Math.random() * 90000)}`;

  const txData: TransactionData = {
    id: txId,
    userId: String(telegramId),
    username: username || 'user_' + String(telegramId).slice(-4),
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

// 5. Realtime Listener for User's Transactions History
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  try {
    const rtdbTxRef = ref(rtdb, 'transactions');
    rtdbUnsub = onValue(rtdbTxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const txs: TransactionData[] = Object.values(data).filter(
          (t: any) => String(t.userId) === String(telegramId)
        ) as TransactionData[];
        callback(txs);
      } else {
        callback([]);
      }
    });
  } catch (e) {}

  try {
    const txCol = collection(db, "transactions");
    const q = query(txCol, where("userId", "==", String(telegramId)));

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

// 6. Realtime Listener for Admin Pending Queue
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

// 7. Admin Approval of Pending Transaction
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
