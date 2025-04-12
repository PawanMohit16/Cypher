// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD255nxEMW7Bot_I8Z4Q1XEWJdT8kfKa00",
  authDomain: "auth-1abc7.firebaseapp.com",
  projectId: "auth-1abc7",
  storageBucket: "auth-1abc7.firebasestorage.app",
  messagingSenderId: "126272446342",
  appId: "1:126272446342:web:e97f1831be510baf509607",
  measurementId: "G-GDMLN8CZ5Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);  // Initialize Firestore

export default app;