import { initializeApp, getApps } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCrPxPLMS_pwryIRHoxYVUFiuxpKHyTk1M",
  authDomain: "lifegate-workspace-5dd48.firebaseapp.com",
  projectId: "lifegate-workspace-5dd48",
  storageBucket: "lifegate-workspace-5dd48.firebasestorage.app",
  messagingSenderId: "747638028505",
  appId: "1:747638028505:web:e0abb11d1ea0505c5526c8"
};

const useAllEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const useFirestoreEmulator = useAllEmulators || import.meta.env.VITE_USE_FIRESTORE_EMULATOR === 'true';
const useAuthEmulator = useAllEmulators || import.meta.env.VITE_USE_AUTH_EMULATOR === 'true';
const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || '127.0.0.1';
const firestorePort = Number(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || 8085);
const authHost = import.meta.env.VITE_AUTH_EMULATOR_HOST || '127.0.0.1';
const authPort = Number(import.meta.env.VITE_AUTH_EMULATOR_PORT || 9099);

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

if (useFirestoreEmulator && typeof window !== 'undefined') {
  connectFirestoreEmulator(db, firestoreHost, firestorePort);
}

if (useAuthEmulator && typeof window !== 'undefined') {
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`, { disableWarnings: true });
}
