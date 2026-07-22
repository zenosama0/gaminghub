/**
 * ============================================================
 * ⚠️  PASTE YOUR FIREBASE PROJECT CONFIG BELOW  ⚠️
 * ============================================================
 * Where to find it:
 *   Firebase Console → (your project) → ⚙️ Project settings →
 *   General tab → "Your apps" → the web app → SDK setup and
 *   configuration → "Config"
 *
 * This object is NOT a secret. It's meant to be public in
 * client-side code — Firebase's actual security comes from the
 * Authentication settings and Firestore security rules you set
 * up in the console (see README.md), not from hiding this file.
 * ============================================================
 */
const firebaseConfig = {
  apiKey: "AIzaSyA9oj-qJyvQr3IcngNTC-DENIKvIG4OSs0",
  authDomain: "gamehub-85fb6.firebaseapp.com",
  projectId: "gamehub-85fb6",
  storageBucket: "gamehub-85fb6.firebasestorage.app",
  messagingSenderId: "932735442622",
  appId: "1:932735442622:web:2a062723e7ce69c69248ef",
  measurementId: "G-D41FKW93P3"
};

firebase.initializeApp(firebaseConfig);