// Import the functions you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// 🔴 ДОДАТИ ЦЕ:
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSOsXWum5rQb0svp18dEvXukNaVpFKc9Y",
  authDomain: "experts-for-desserts.firebaseapp.com",
  projectId: "experts-for-desserts",
  storageBucket: "experts-for-desserts.firebasestorage.app",
  messagingSenderId: "189919797657",
  appId: "1:189919797657:web:a64e5c0c7b2b3c584bb308",
  measurementId: "G-XE2X0FWDL0"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export { collection, addDoc, serverTimestamp };

