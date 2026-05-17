import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDib3B5xC_pn0TTHFTxJhpSnwPcK44oWTk",
  authDomain: "check-m2-2026.firebaseapp.com",
  projectId: "check-m2-2026",
  storageBucket: "check-m2-2026.firebasestorage.app",
  messagingSenderId: "67271648518",
  appId: "1:67271648518:web:9c7dd1b4eea59586ab6a87",
  measurementId: "G-J25KRT290H"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);