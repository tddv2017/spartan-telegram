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
export async function getOrCreateUser(telegramId: string, username: string = '', firstName: string = ''): Promise<UserData> {
  const cleanHandle = username.replace('@', '').toLowerCase();
  const isAdmin = cleanHandle === 'tddv2017' || cleanHandle === 'spartan_9824029';

  const defaultUser: UserData = {
    telegramId: String(telegramId),
    username: username || 'user_' + String(telegramId).slice(-4),
    firstName: firstName || 'Warrior',
    role: isAdmin ? 'ADMIN' : 'CLIENT',
    tradingBalance: isAdmin ? 7462415.57 : 0.00,
    referralBalance: isAdmin ? 800.00 : 0.00,
    referralCode: `SPARTAN_${telegramId}`,
    resellerTier: 1,
  };

  // A. Save to Realtime Database (RTDB)
  try {
    const rtdbUserRef = ref(rtdb, `users/${telegramId}`);
    const rtdbSnap = await get(rtdbUserRef);
    if (!rtdbSnap.exists()) {
      await set(rtdbUserRef, { ...defaultUser, createdAt: new Date().toISOString() });
    }
  } catch (rtdbErr) {
    console.warn("RTDB user sync notice:", rtdbErr);
  }

  // B. Save to Firestore
  try {
    const userRef = doc(db, "users", String(telegramId));
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }

    await setDoc(userRef, { ...defaultUser, createdAt: serverTimestamp() });
    return defaultUser;
  } catch (err) {
    console.warn("Firestore user sync notice (RTDB active):", err);
    return defaultUser;
  }
}

// 2. Realtime Listener for Single User Data (Listens to both RTDB and Firestore)
export function subscribeToUser(telegramId: string, callback: (user: UserData | null) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  // A. Firestore Listener
  try {
    const userRef = doc(db, "users", String(telegramId));
    firestoreUnsub = onSnapshot(
      userRef, 
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as UserData);
        }
      },
      (err) => {}
    );
  } catch (e) {}

  // B. RTDB Listener
  try {
    const rtdbUserRef = ref(rtdb, `users/${telegramId}`);
    rtdbUnsub = onValue(rtdbUserRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val() as UserData);
      }
    });
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 3. Create Deposit or Withdrawal Transaction in Firestore AND Realtime Database (RTDB)
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

  const txData: TransactionData = {
    id: `TX-${Math.floor(10000 + Math.random() * 90000)}`,
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

  // A. Save to Realtime Database (RTDB)
  try {
    const rtdbRef = ref(rtdb, `transactions/${txData.id}`);
    await set(rtdbRef, txData);
  } catch (rtdbErr) {
    console.warn("RTDB set error:", rtdbErr);
  }

  // B. Save to Firestore
  try {
    const txCol = collection(db, "transactions");
    const docRef = await addDoc(txCol, {
      ...txData,
      createdAt: serverTimestamp()
    });
    txData.id = docRef.id;

    // Update RTDB with Firestore doc ID if created
    const rtdbRef = ref(rtdb, `transactions/${docRef.id}`);
    await set(rtdbRef, { ...txData, id: docRef.id });
  } catch (firestoreErr) {
    console.warn("Firestore addDoc notice (RTDB active):", firestoreErr);
  }

  return txData;
}

// 4. Realtime Listener for User's Transactions History
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

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
        callback(txs);
      },
      (err) => {}
    );
  } catch (e) {}

  try {
    const rtdbTxRef = ref(rtdb, 'transactions');
    rtdbUnsub = onValue(rtdbTxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const txs: TransactionData[] = Object.values(data).filter(
          (t: any) => String(t.userId) === String(telegramId)
        ) as TransactionData[];
        if (txs.length > 0) callback(txs);
      }
    });
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 5. Realtime Listener for Admin Pending Queue
export function subscribeToPendingTransactions(callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

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
        callback(txs);
      },
      (err) => {}
    );
  } catch (e) {}

  try {
    const rtdbTxRef = ref(rtdb, 'transactions');
    rtdbUnsub = onValue(rtdbTxRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const pendingTxs: TransactionData[] = Object.values(data).filter(
          (t: any) => t.status === 'PENDING'
        ) as TransactionData[];
        if (pendingTxs.length > 0) callback(pendingTxs);
      }
    });
  } catch (e) {}

  return () => {
    firestoreUnsub();
    rtdbUnsub();
  };
}

// 6. Admin Approval of Pending Transaction (Updates Firestore AND RTDB)
export async function approveLiveTransaction(txId: string, adminUsername: string = 'tddv2017') {
  try {
    const rtdbTxRef = ref(rtdb, `transactions/${txId}`);
    await update(rtdbTxRef, {
      status: 'APPROVED',
      approvedBy: adminUsername,
      approvedAt: new Date().toISOString()
    });
  } catch (e) {}

  try {
    const txRef = doc(db, "transactions", txId);
    const txSnap = await getDoc(txRef);

    if (txSnap.exists()) {
      const tx = txSnap.data() as TransactionData;

      await updateDoc(txRef, {
        status: 'APPROVED',
        approvedBy: adminUsername,
        approvedAt: serverTimestamp()
      });

      const userRef = doc(db, "users", tx.userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const currentBal = (userSnap.data() as UserData).tradingBalance || 0;
        const newBal = tx.type === 'DEPOSIT' 
          ? currentBal + tx.netAmount 
          : currentBal - tx.grossAmount;

        await updateDoc(userRef, {
          tradingBalance: Math.max(0, newBal)
        });

        // Also update RTDB
        const rtdbUserRef = ref(rtdb, `users/${tx.userId}`);
        await update(rtdbUserRef, {
          tradingBalance: Math.max(0, newBal)
        });
      }
    }
  } catch (err) {
    console.warn("Firestore approveLiveTransaction notice:", err);
  }
}
