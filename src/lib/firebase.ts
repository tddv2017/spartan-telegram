import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";

// User's Live Firebase Configuration (Project: bot-trading-5f8c9)
const firebaseConfig = {
  apiKey: "AIzaSyAUzL5c9CD_cCv9hP-FNrbTSRKOiIMxMOs",
  authDomain: "bot-trading-5f8c9.firebaseapp.com",
  databaseURL: "https://bot-trading-5f8c9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bot-trading-5f8c9",
  storageBucket: "bot-trading-5f8c9.firebasestorage.app",
  messagingSenderId: "725310671686",
  appId: "1:725310671686:web:0a901bb870d9ce9f0ab347",
  measurementId: "G-6SQJB8MD9H"
};

// Initialize Firebase App (Singleton Pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Resilient Firestore Getter: Tries "miniapp-spartan" Database ID first, falls back to default
let firestoreInstance: Firestore;
try {
  firestoreInstance = getFirestore(app, "miniapp-spartan");
} catch (e) {
  console.warn("Falling back to default Firestore database instance:", e);
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;

// Initialize Realtime Database (rtdb)
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
