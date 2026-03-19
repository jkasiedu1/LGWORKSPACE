import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 👇 REPLACE THIS ENTIRE BLOCK WITH YOUR COPIED KEYS 👇
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
// 👆 REPLACE THIS ENTIRE BLOCK WITH YOUR COPIED KEYS 👆

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
