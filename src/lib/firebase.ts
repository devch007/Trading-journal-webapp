import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBFp1Dy3NVaGiEgVXNRBonG-F5PDoNFnFI",
  authDomain: "edgr-eedff.firebaseapp.com",
  projectId: "edgr-eedff",
  storageBucket: "edgr-eedff.firebasestorage.app",
  messagingSenderId: "343696300467",
  appId: "1:343696300467:web:1b5e8c24b946e6602b93c6",
  measurementId: "G-13EQ0Y3L4C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("CRITICAL: Firestore connection failed. Please ensure you have created a Firestore Database in your Firebase Console.");
    }
  }
}
testConnection();
