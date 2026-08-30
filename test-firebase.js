const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc } = require("firebase/firestore");
const { getDatabase, ref, set, get } = require("firebase/database");

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app, "https://decisive-mapper-216306-default-rtdb.asia-southeast1.firebasedatabase.app/");

async function testFirebase() {
  console.log("🔥 TESTING FIREBASE WRITE TO DECISIVE-MAPPER-216306...");
  
  // 1. Test RTDB
  try {
    const testRef = ref(rtdb, "users/test_1788035393");
    await set(testRef, {
      telegramId: "1788035393",
      username: "tddv2017",
      firstName: "Admin",
      tradingBalance: 500,
      createdAt: new Date().toISOString()
    });
    console.log("✅ RTDB WRITE SUCCESSFUL!");
  } catch (err) {
    console.error("❌ RTDB WRITE ERROR:", err);
  }

  // 2. Test Firestore
  try {
    const testDoc = doc(db, "users", "test_1788035393");
    await setDoc(testDoc, {
      telegramId: "1788035393",
      username: "tddv2017",
      firstName: "Admin",
      tradingBalance: 500,
      createdAt: new Date().toISOString()
    });
    console.log("✅ FIRESTORE WRITE SUCCESSFUL!");
  } catch (err) {
    console.error("❌ FIRESTORE WRITE ERROR:", err);
  }
}

testFirebase().then(() => process.exit(0));
