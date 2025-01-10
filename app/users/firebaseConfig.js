import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBzBxADRzOMdmpejR3Y5X7fcz57wisJ3Hg",
  authDomain: "finance-97212.firebaseapp.com",
  databaseURL:"https://console.firebase.google.com/project/finance-97212/database/finance-97212-default-rtdb/data/~2F?fb_gclid=CjwKCAiA65m7BhAwEiwAAgu4JCZ5v6-Ed3a6Rp9AV-nRRRAA2kA0rE5bu6B6BRCRqah6MMx4NSN8JxoC4XIQAvD_BwE",
  projectId: "finance-97212",
  storageBucket: "finance-97212.firebasestorage.app",
  messagingSenderId: "73532294502",
  appId: "1:73532294502:web:c2536690d26d93fff4b4a7",
  measurementId: "G-H2BM6M2VG2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };