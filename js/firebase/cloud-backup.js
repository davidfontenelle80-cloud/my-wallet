(function () {
  "use strict";

  var APP_ID = "my-wallet";
  var STORAGE_KEY = "myWallet_v1";
  var MARKER_KEY = "my-wallet-cloud-backup-last";

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyAUiVMxG1JbtpaW3KKmYSsTheMP473uTbQ",
    authDomain: "khub-apps.firebaseapp.com",
    projectId: "khub-apps",
    storageBucket: "khub-apps.firebasestorage.app",
    messagingSenderId: "969605091721",
    appId: "1:969605091721:web:4068564af7bc0dc56c1158",
  };

  var firebaseLoadPromise = null;

  window.MyWallet = window.MyWallet || {};

  // ── Firebase state ──────────────────────────────────────────────────────────

  function firebaseReady() {
    return !!(window.MyWallet && window.MyWallet.Firebase &&
              window.MyWallet.Firebase.db && window.MyWallet.Firebase.auth);
  }

  function getAuth() {
    return firebaseReady() ? window.MyWallet.Firebase.auth : null;
  }

  function getDb() {
    return firebaseReady() ? window.MyWallet.Firebase.db : null;
  }

  function currentUser() {
    var a = getAuth();
    return a ? a.currentUser : null;
  }

  function authRequiredError() {
    var err = new Error("auth-required");
    err.code = "auth-required";
    return err;
  }

  function ensureReady(requireUser) {
    if (!firebaseReady()) return Promise.reject(new Error("Firebase not ready"));
    if (requireUser !== false && !currentUser()) return Promise.reject(authRequiredError());
    return null;
  }

  function latestRef() {
    return getDb()
      .collection("backups").doc(APP_ID)
      .collection("users").doc(currentUser().uid)
      .collection("meta").doc("latest");
  }

  // ── Data helpers ────────────────────────────────────────────────────────────

  function stripReceiptImages(value) {
    if (Array.isArray(value)) return value.map(stripReceiptImages);
    if (!value || typeof value !== "object") return value;
    var next = {};
    Object.keys(value).forEach(function (key) {
      if (key === "receiptImage" || key === "imageData" || key === "photoData") return;
      next[key] = stripReceiptImages(value[key]);
    });
    return next;
  }

  function sanitizedWalletRaw() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      return JSON.stringify(stripReceiptImages(JSON.parse(raw)));
    } catch (err) {
      console.warn("[MyWallet.CloudBackup] Could not sanitize wallet data.", err);
      return null;
    }
  }

  function formatWhen(iso) {
    if (!iso) return "Never";
    var date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "Never";
    return date.toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit"
    });
  }

  function authMessage(err) {
    var code = (err && (err.code || err.message)) || "";
    if (code.indexOf("auth/user-not-found") !== -1) return "No account found for that email.";
    if (code.indexOf("auth/wrong-password") !== -1 || code.indexOf("auth/invalid-credential") !== -1) return "Email or password was not correct.";
    if (code.indexOf("auth/email-already-in-use") !== -1) return "That email already has an account. Use Sign in.";
    if (code.indexOf("auth/weak-password") !== -1) return "Use a password with at least 6 characters.";
    if (code.indexOf("auth/invalid-email") !== -1) return "Enter a valid email address.";
    if (code.indexOf("auth/configuration-not-found") !== -1) return "Enable Email/Password auth in the Firebase console.";
    if (code.indexOf("auth/network-request-failed") !== -1) return "Network error — check your connection.";
    if (code.indexOf("permission-denied") !== -1 || code.indexOf("Missing or insufficient permissions") !== -1) return "Blocked by Firestore rules — check Firebase console.";
    if (code === "auth-required") return "Sign in first.";
    if (code === "no-backup") return "No cloud backup found for this account.";
    return err && err.message ? err.message : "Cloud backup failed.";
  }

  // ── UI helpers ──────────────────────────────────────────────────────────────

  function setBusy(on) {
    document.querySelectorAll("[data-cloud-action]").forEach(function (btn) {
      btn.disabled = !!on;
    });
  }

  function setStatus(message, tone) {
    var el = document.querySelector("[data-cloud-status]");
    if (!el) return;
    el.textContent = message;
    el.className = tone ? tone : "";
  }

  function updateUI() {
    var user = currentUser();
    var signedIn = !!user;
    var elEmail  = document.querySelector("[data-cloud-email]");
    var elLast   = document.querySelector("[data-cloud-last]");
    var elSignIn = document.querySelector('[data-cloud-action="signin"]');
    var elCreate = document.querySelector('[data-cloud-action="create"]');
    var elBackup = document.querySelector('[data-cloud-action="backup"]');
    var elRestore= document.querySelector('[data-cloud-action="restore"]');
    var elSignOut= document.querySelector('[data-cloud-action="signout"]');

    if (elEmail)   elEmail.textContent = signedIn ? (user.email || "Signed in") : "Not signed in";
    if (elLast)    elLast.textContent  = formatWhen(localStorage.getItem(MARKER_KEY));
    if (elSignIn)  elSignIn.hidden  = signedIn;
    if (elCreate)  elCreate.hidden  = signedIn;
    if (elBackup)  elBackup.hidden  = !signedIn;
    if (elRestore) elRestore.hidden = !signedIn;
    if (elSignOut) elSignOut.hidden = !signedIn;
    setStatus(
      firebaseReady() ? (signedIn ? "Connected" : "Ready") : "Loading…",
      firebaseReady() ? "good" : ""
    );
  }

  // ── Lazy Firebase loader ────────────────────────────────────────────────────
  // Firebase SDK is NOT loaded on page startup. It loads the first time the
  // user opens the Settings → Cloud Backup card, via dynamic <script> injection.
  // This keeps the main app completely independent of Firebase.

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }

  function loadFirebase() {
    if (firebaseReady()) return Promise.resolve();
    if (firebaseLoadPromise) return firebaseLoadPromise;

    firebaseLoadPromise = loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js")
      .then(function () { return loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"); })
      .then(function () { return loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-firestore.js"); })
      .then(function () {
        var fb  = window.firebase;
        var app = (fb.apps && fb.apps.length) ? fb.app() : fb.initializeApp(FIREBASE_CONFIG);
        window.MyWallet.Firebase = {
          app:  app,
          db:   fb.firestore(),
          auth: fb.auth(),
        };
        window.MyWallet.Firebase.auth.onAuthStateChanged(updateUI);
        console.info("[MyWallet.Firebase] ready:", FIREBASE_CONFIG.projectId);
      })
      .catch(function (err) {
        console.error("[MyWallet.Firebase] load failed:", err);
        firebaseLoadPromise = null; // allow retry
        throw err;
      });

    return firebaseLoadPromise;
  }

  // ── Settings card upgrade ───────────────────────────────────────────────────
  // Replaces the static "Not connected" card with the interactive backup UI,
  // then starts loading Firebase in the background.

  function upgradeCloudCard(root) {
    var headings = Array.from((root || document).querySelectorAll("h2"));
    var heading = headings.find(function (h2) {
      return /cloud backup|respaldo en la nube/i.test(h2.textContent || "");
    });
    var card = heading && heading.closest(".card");
    if (!card || card.dataset.cloudCardReady === "1") return;
    card.dataset.cloudCardReady = "1";
    card.classList.add("cloud-card");
    card.innerHTML =
      '<div class="section-title">' +
        '<div><h2>Cloud Backup</h2><p class="muted">Firestore · sign in to back up.</p></div>' +
        '<span data-cloud-status>Loading…</span>' +
      '</div>' +
      '<div class="row"><span>Account</span><strong data-cloud-email>Not signed in</strong></div>' +
      '<div class="row"><span>Last backup</span><strong data-cloud-last>Never</strong></div>' +
      '<div class="button-row cloud-actions">' +
        '<button class="btn gold"      data-cloud-action="signin">Sign in</button>' +
        '<button class="btn secondary" data-cloud-action="create">Create account</button>' +
        '<button class="btn gold"      data-cloud-action="backup"  hidden>Backup Now</button>' +
        '<button class="btn secondary" data-cloud-action="restore" hidden>Restore Backup</button>' +
        '<button class="btn secondary" data-cloud-action="signout" hidden>Sign out</button>' +
      '</div>' +
      '<p class="help-text">Backs up only My Wallet data in Firestore. Receipt photos are never uploaded.</p>';

    // Load Firebase in the background; update the card when ready.
    // updateUI() is called from the async chain — NOT from the MutationObserver.
    loadFirebase().then(updateUI).catch(function () {
      setStatus("Unavailable", "bad");
    });
  }

  // ── Auth dialog ─────────────────────────────────────────────────────────────

  function openAuthDialog(mode) {
    mode = mode || "signin";
    return new Promise(function (resolve) {
      var old = document.getElementById("myWalletCloudAuthDialog");
      if (old) old.remove();

      var overlay = document.createElement("div");
      overlay.id = "myWalletCloudAuthDialog";
      overlay.className = "modal";
      overlay.innerHTML =
        '<div class="modal-card cloud-auth-card">' +
          '<div class="section-title">' +
            '<h2>Cloud account</h2>' +
            '<button class="icon-btn" data-cloud-cancel type="button">×</button>' +
          '</div>' +
          '<p class="help-text">Use the same email and password on each device.</p>' +
          '<div class="form-grid" style="margin-top:12px">' +
            '<div class="field"><label>Email</label>' +
              '<input id="cloud-email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false"></div>' +
            '<div class="field"><label>Password</label>' +
              '<input id="cloud-password" type="password" autocomplete="current-password"></div>' +
            '<p class="help-text bad" data-cloud-auth-error></p>' +
            '<div class="button-row">' +
              '<button class="btn gold" data-cloud-auth-run type="button">' +
                (mode === "create" ? "Create account" : "Sign in") +
              '</button>' +
              '<button class="btn secondary" data-cloud-cancel type="button">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      var emailInput = overlay.querySelector("#cloud-email");
      var passInput  = overlay.querySelector("#cloud-password");
      var errorEl    = overlay.querySelector("[data-cloud-auth-error]");

      function close(result) { overlay.remove(); resolve(result || null); }

      overlay.querySelectorAll("[data-cloud-cancel]").forEach(function (btn) {
        btn.onclick = function () { close(null); };
      });
      overlay.querySelector("[data-cloud-auth-run]").onclick = function () {
        errorEl.textContent = "";
        var p = mode === "create"
          ? CloudAuth.create(emailInput.value, passInput.value)
          : CloudAuth.signIn(emailInput.value, passInput.value);
        p.then(function () { close(mode === "create" ? "created" : "signed-in"); })
         .catch(function (err) { errorEl.textContent = authMessage(err); });
      };
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(null);
      });
      emailInput.focus();
    });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  var CloudAuth = {
    onChange: function (cb) {
      var a = getAuth();
      if (!a) return function () {};
      return a.onAuthStateChanged(cb);
    },
    signIn: function (email, password) {
      var notReady = ensureReady(false);
      if (notReady) return notReady;
      return getAuth().signInWithEmailAndPassword(String(email || "").trim(), password);
    },
    create: function (email, password) {
      var notReady = ensureReady(false);
      if (notReady) return notReady;
      return getAuth().createUserWithEmailAndPassword(String(email || "").trim(), password);
    },
    signOut: function () {
      var a = getAuth();
      return a ? a.signOut() : Promise.resolve();
    },
    openDialog: openAuthDialog,
  };

  var CloudBackup = {
    backupNow: function () {
      var notReady = ensureReady(true);
      if (notReady) return notReady;
      var raw = sanitizedWalletRaw();
      if (raw === null) return Promise.reject(new Error("No valid wallet data found."));
      var user = currentUser();
      var iso  = new Date().toISOString();
      var keys = {};
      keys[STORAGE_KEY] = raw;
      var payload = {
        appId: APP_ID,
        uid: user.uid,
        email: user.email || "",
        savedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        savedAtISO: iso,
        keys: keys,
      };
      return latestRef().set(payload).then(function () {
        localStorage.setItem(MARKER_KEY, iso);
        updateUI();
        return iso;
      });
    },
    restore: function () {
      var notReady = ensureReady(true);
      if (notReady) return notReady;
      return latestRef().get().then(function (snap) {
        if (!snap.exists) return Promise.reject(new Error("no-backup"));
        var data = snap.data() || {};
        var raw  = data.keys && data.keys[STORAGE_KEY];
        if (!raw) return Promise.reject(new Error("Backup did not include My Wallet data."));
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.setItem(MARKER_KEY, data.savedAtISO || new Date().toISOString());
        location.reload();
        return data;
      });
    },
    lastSaved: function () { return localStorage.getItem(MARKER_KEY); },
  };

  function runCloudAction(action) {
    setBusy(true);
    // Ensure Firebase is loaded before running any action.
    loadFirebase().then(function () {
      var promise;
      if (action === "signin")  promise = CloudAuth.openDialog("signin");
      if (action === "create")  promise = CloudAuth.openDialog("create");
      if (action === "backup")  promise = CloudBackup.backupNow().then(function (iso) {
        setStatus("Backed up " + formatWhen(iso), "good");
      });
      if (action === "restore") {
        if (!confirm("Restore cloud backup? This replaces data on this device.")) {
          setBusy(false);
          return;
        }
        promise = CloudBackup.restore();
      }
      if (action === "signout") promise = CloudAuth.signOut().then(function () {
        setStatus("Signed out", "good");
      });
      if (!promise) { setBusy(false); return; }
      promise
        .catch(function (err) { setStatus(authMessage(err), "bad"); })
        .then(function () { setBusy(false); updateUI(); },
              function () { setBusy(false); updateUI(); });
    }).catch(function () {
      setStatus("Firebase unavailable", "bad");
      setBusy(false);
    });
  }

  // ── MutationObserver wiring ─────────────────────────────────────────────────
  // bindCloudControls ONLY upgrades the card and binds buttons.
  // It never calls updateUI() — that is called exclusively from the async
  // loadFirebase().then(updateUI) chain, which runs outside the observer.
  // This prevents any MutationObserver feedback loop.

  function bindCloudControls(root) {
    upgradeCloudCard(root);
    (root || document).querySelectorAll("[data-cloud-action]").forEach(function (btn) {
      if (btn.dataset.cloudBound === "1") return;
      btn.dataset.cloudBound = "1";
      btn.addEventListener("click", function () { runCloudAction(btn.dataset.cloudAction); });
    });
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  window.MyWallet.CloudAuth  = CloudAuth;
  window.MyWallet.CloudBackup = CloudBackup;

  new MutationObserver(function () {
    bindCloudControls(document);
  }).observe(document.body, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { bindCloudControls(document); });
  } else {
    bindCloudControls(document);
  }
})();
