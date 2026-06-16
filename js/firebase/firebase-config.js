(function () {
  "use strict";

  const firebaseConfig = {
    apiKey: "AIzaSyAUiVMxG1JbtpaW3KKmYSsTheMP473uTbQ",
    authDomain: "khub-apps.firebaseapp.com",
    projectId: "khub-apps",
    storageBucket: "khub-apps.firebasestorage.app",
    messagingSenderId: "969605091721",
    appId: "1:969605091721:web:4068564af7bc0dc56c1158",
    measurementId: "G-613M7EM3ZZ",
  };

  if (!window.firebase) {
    console.warn("[MyWallet.Firebase] Firebase SDK not loaded.");
    return;
  }

  try {
    const app = firebase.apps && firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();

    window.MyWallet = window.MyWallet || {};
    window.MyWallet.Firebase = { app, db, auth };

    console.info("[MyWallet.Firebase] initialized:", firebaseConfig.projectId);
  } catch (err) {
    console.error("[MyWallet.Firebase] init failed:", err);
  }
})();
