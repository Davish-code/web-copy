import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeaUoQLLDDh1-FgeAdGfT1CWBghudWZMA",
  authDomain: "yumei-bakery.firebaseapp.com",
  projectId: "yumei-bakery",
  storageBucket: "yumei-bakery.firebasestorage.app",
  messagingSenderId: "638425095770",
  appId: "1:638425095770:web:7dac8ab6486752e2c28263",
  measurementId: "G-H0JP9M3E1B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Expose to window so other non-module scripts can access them
window.FirebaseAuth = auth;
window.FirebaseDB = db;
window.FirebaseGoogleProvider = googleProvider;
window.FirebaseSignIn = signInWithPopup;
window.FirebaseSignOut = signOut;
window.FirebaseOnAuthStateChanged = onAuthStateChanged;

// Expose Firestore methods
window.FirestoreCollection = collection;
window.FirestoreAddDoc = addDoc;
window.FirestoreQuery = query;
window.FirestoreWhere = where;
window.FirestoreGetDocs = getDocs;
window.FirestoreOrderBy = orderBy;
window.FirestoreDoc = doc;
window.FirestoreSetDoc = setDoc;
window.FirestoreUpdateDoc = updateDoc;
window.FirestoreDeleteDoc = deleteDoc;
