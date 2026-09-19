import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBBzQDxacl3ogVS7xO1KfY7ZYv8aXilcfo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "lucent-43a45.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "lucent-43a45",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "lucent-43a45.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "551917475386",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:551917475386:web:855af6f5f4a983680c4703",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-ZEEW7RNFG0"
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { app, auth, db, storage, analytics };
