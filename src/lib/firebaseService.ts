import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { calculateDepositNet, calculateWithdrawNet } from "./feeCalculator";

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

// 1. Get or Create User in Firestore Collection "users"
export async function getOrCreateUser(telegramId: string, username: string = '', firstName: string = ''): Promise<UserData> {
  const userRef = doc(db, "users", String(telegramId));
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserData;
  }

  const isAdmin = username.replace('@', '').toLowerCase() === 'tddv2017';
  
  const newUser: UserData = {
    telegramId: String(telegramId),
    username: username || 'user_' + telegramId.slice(-4),
    firstName: firstName || 'Warrior',
    role: isAdmin ? 'ADMIN' : 'CLIENT',
    tradingBalance: isAdmin ? 7462415.57 : 0.00,
    referralBalance: isAdmin ? 800.00 : 0.00,
    referralCode: `SPARTAN_${telegramId}`,
    resellerTier: 1,
    createdAt: serverTimestamp()
  };

  await setDoc(userRef, newUser);
  return newUser;
}

// 2. Realtime Listener for Single User Data
export function subscribeToUser(telegramId: string, callback: (user: UserData | null) => void) {
  const userRef = doc(db, "users", String(telegramId));
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as UserData);
    } else {
      callback(null);
    }
  });
}

// 3. Create Deposit or Withdrawal Transaction in Firestore Collection "transactions"
export async function createLiveTransaction(
  telegramId: string, 
  username: string, 
  type: 'DEPOSIT' | 'WITHDRAW', 
  grossAmount: number
): Promise<TransactionData> {
  const feeCalc = type === 'DEPOSIT' 
    ? calculateDepositNet(grossAmount) 
    : calculateWithdrawNet(grossAmount);

  const memoCode = `SPARTAN_${Math.floor(100000 + Math.random() * 900000)}`;

  const txData: TransactionData = {
    userId: String(telegramId),
    username: username || 'user_' + String(telegramId).slice(-4),
    type,
    grossAmount,
    feeAmount: feeCalc.feeAmount,
    netAmount: feeCalc.netAmount,
    status: 'PENDING',
    memoCode,
    createdAt: serverTimestamp()
  };

  const txCol = collection(db, "transactions");
  const docRef = await addDoc(txCol, txData);
  txData.id = docRef.id;

  return txData;
}

// 4. Realtime Listener for User's Transactions History
export function subscribeToUserTransactions(telegramId: string, callback: (txs: TransactionData[]) => void) {
  const txCol = collection(db, "transactions");
  const q = query(txCol, where("userId", "==", String(telegramId)), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const txs: TransactionData[] = [];
    snapshot.forEach((doc) => {
      txs.push({ id: doc.id, ...doc.data() } as TransactionData);
    });
    callback(txs);
  });
}

// 5. Realtime Listener for Admin Pending Transactions Queue
export function subscribeToPendingTransactions(callback: (txs: TransactionData[]) => void) {
  const txCol = collection(db, "transactions");
  const q = query(txCol, where("status", "==", "PENDING"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const txs: TransactionData[] = [];
    snapshot.forEach((doc) => {
      txs.push({ id: doc.id, ...doc.data() } as TransactionData);
    });
    callback(txs);
  });
}

// 6. Admin Approval of Pending Transaction (Updates User Balance in Realtime)
export async function approveLiveTransaction(txId: string, adminUsername: string = 'tddv2017') {
  const txRef = doc(db, "transactions", txId);
  const txSnap = await getDoc(txRef);

  if (!txSnap.exists()) return;

  const tx = txSnap.data() as TransactionData;
  if (tx.status !== 'PENDING') return;

  // 1. Update transaction status
  await updateDoc(txRef, {
    status: 'APPROVED',
    approvedBy: adminUsername,
    approvedAt: serverTimestamp()
  });

  // 2. Update user trading balance in Firestore
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
