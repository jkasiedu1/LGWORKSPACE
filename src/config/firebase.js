import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCrPxPLMS_pwryIRHoxYVUFiuxpKHyTk1M",
  authDomain: "lifegate-workspace-5dd48.firebaseapp.com",
  projectId: "lifegate-workspace-5dd48",
  storageBucket: "lifegate-workspace-5dd48.firebasestorage.app",
  messagingSenderId: "747638028505",
  appId: "1:747638028505:web:e0abb11d1ea0505c5526c8"
};

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
