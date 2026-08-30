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

// 1. Get or Create User
export async function getOrCreateUser(telegramId: string, username: string = '', firstName: string = ''): Promise<UserData> {
  const isAdmin = username.replace('@', '').toLowerCase() === 'tddv2017';

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

  try {
    const userRef = doc(db, "users", String(telegramId));
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    }

    await setDoc(userRef, { ...defaultUser, createdAt: serverTimestamp() });
    return defaultUser;
  } catch (err) {
    console.warn("Firestore getOrCreateUser fallback:", err);
    return defaultUser;
  }
}

// 2. Realtime Listener for Single User Data
export function subscribeToUser(telegramId: string, callback: (user: UserData | null) => void) {
  try {
    const userRef = doc(db, "users", String(telegramId));
    return onSnapshot(
      userRef, 
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as UserData);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn("Firestore subscribeToUser notice:", err);
      }
    );
  } catch (e) {
    return () => {};
  }
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

  // A. Save to Realtime Database (RTDB - https://bot-trading-5f8c9-default-rtdb.asia-southeast1.firebasedatabase.app)
  try {
    const rtdbRef = ref(rtdb, `transactions/${txData.id}`);
    await set(rtdbRef, txData);
  } catch (rtdbErr) {
    console.warn("RTDB set error:", rtdbErr);
  }

  // B. Save to Firestore (Database: miniapp-spartan)
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

// 4. Realtime Listener for User's Transactions History (No Index Required!)
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  // A. Firestore Listener (Single field query - NO Composite Index required!)
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
      (err) => {
        console.warn("Firestore user txs notice:", err);
      }
    );
  } catch (e) {}

  // B. RTDB Fallback Listener
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

// 5. Realtime Listener for Admin Pending Queue (No Index Required!)
export function subscribeToPendingTransactions(callback: (txs: TransactionData[]) => void) {
  let firestoreUnsub = () => {};
  let rtdbUnsub = () => {};

  // A. Firestore Listener (Single field query - NO Composite Index required!)
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
      (err) => {
        console.warn("Firestore pending queue notice:", err);
      }
    );
  } catch (e) {}

  // B. RTDB Listener for Pending Queue
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
  // A. Update RTDB
  try {
    const rtdbTxRef = ref(rtdb, `transactions/${txId}`);
    await update(rtdbTxRef, {
      status: 'APPROVED',
      approvedBy: adminUsername,
      approvedAt: new Date().toISOString()
    });
  } catch (e) {}

  // B. Update Firestore
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
      }
    }
  } catch (err) {
    console.warn("Firestore approveLiveTransaction notice:", err);
  }
}
