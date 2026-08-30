import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// User's Live Firebase Configuration (Project: decisive-mapper-216306)
const firebaseConfig = {
  apiKey: "AIzaSyAWhGhoS5GixDZdqGVRf-ieCdMB28GCDLM",
  authDomain: "decisive-mapper-216306.firebaseapp.com",
  databaseURL: "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "decisive-mapper-216306",
  storageBucket: "decisive-mapper-216306.firebasestorage.app",
  messagingSenderId: "1050974079411",
  appId: "1:1050974079411:web:a41943132e2402f55563c6",
  measurementId: "G-BTW41XX3GH"
};

// Initialize Firebase App (Singleton Pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore Instance (Project: decisive-mapper-216306)
let firestoreInstance: Firestore;
try {
  firestoreInstance = getFirestore(app, "miniapp-spartan");
} catch (e) {
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Initialize Realtime Database (rtdb - asia-southeast1)
export const rtdb = getDatabase(app);

// Initialize Analytics (Browser-only)
export let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export default app;
