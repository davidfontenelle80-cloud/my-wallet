(function () {
  "use strict";

  const APP_ID = "my-wallet";
  const STORAGE_KEY = "myWallet_v1";
  const MARKER_KEY = "my-wallet-cloud-backup-last";

  window.MyWallet = window.MyWallet || {};

  function firebaseReady() {
    return !!(window.MyWallet && MyWallet.Firebase && MyWallet.Firebase.db && MyWallet.Firebase.auth);
  }

  function auth() {
    return firebaseReady() ? MyWallet.Firebase.auth : null;
  }

  function db() {
    return firebaseReady() ? MyWallet.Firebase.db : null;
  }

  function currentUser() {
    const a = auth();
    return a ? a.currentUser : null;
  }

  function authRequiredError() {
    const err = new Error("auth-required");
    err.code = "auth-required";
    return err;
  }

  function ensureReady(requireUser) {
    if (!firebaseReady()) return Promise.reject(new Error("Firebase not ready"));
    if (requireUser !== false && !currentUser()) return Promise.reject(authRequiredError());
    return null;
  }

  function latestRef() {
    return db().collection("backups").doc(APP_ID).collection("users").doc(currentUser().uid).collection("meta").doc("latest");
  }

  function stripReceiptImages(value) {
    if (Array.isArray(value)) return value.map(stripReceiptImages);
    if (!value || typeof value !== "object") return value;
    const next = {};
    Object.keys(value).forEach(function (key) {
      if (key === "receiptImage" || key === "imageData" || key === "photoData") return;
      next[key] = stripReceiptImages(value[key]);
    });
    return next;
  }

  function sanitizedWalletRaw() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    try {
      return JSON.stringify(stripReceiptImages(JSON.parse(raw)));
    } catch (err) {
      console.warn("[MyWallet.CloudBackup] Could not sanitize wallet JSON; backup skipped.", err);
      return null;
    }
  }

  function formatWhen(iso) {
    if (!iso) return "Never";
    const date = new Date(iso);
    if (!Number.isFinite(date.getTime())) return "Never";
    return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function authMessage(err) {
    const code = (err && (err.code || err.message)) || "";
    if (code.indexOf("auth/user-not-found") !== -1) return "No account found for that email.";
    if (code.indexOf("auth/wrong-password") !== -1 || code.indexOf("auth/invalid-credential") !== -1) return "Email or password was not correct.";
    if (code.indexOf("auth/email-already-in-use") !== -1) return "That email already has an account. Use Sign in.";
    if (code.indexOf("auth/weak-password") !== -1) return "Use a password with at least 6 characters.";
    if (code.indexOf("auth/invalid-email") !== -1) return "Enter a valid email address.";
    if (code.indexOf("auth/configuration-not-found") !== -1) return "Cloud sign-in is not enabled in Firebase Authentication.";
    if (code.indexOf("auth/network-request-failed") !== -1) return "Cloud sign-in could not reach Firebase.";
    if (code.indexOf("permission-denied") !== -1 || code.indexOf("Missing or insufficient permissions") !== -1) {
      return "Cloud backup is blocked by Firestore rules.";
    }
    if (code === "auth-required") return "Sign in first.";
    if (code === "no-backup") return "No cloud backup found for this account.";
    return err && err.message ? err.message : "Cloud backup failed.";
  }

  function setBusy(on) {
    document.querySelectorAll("[data-cloud-action]").forEach(function (button) {
      button.disabled = !!on;
    });
  }

  function setStatus(message, tone) {
    const status = document.querySelector("[data-cloud-status]");
    if (status) {
      status.textContent = message;
      status.classList.remove("good", "bad");
      if (tone) status.classList.add(tone);
    }
  }

  function updateUI() {
    const user = currentUser();
    const signedIn = !!user;
    const email = document.querySelector("[data-cloud-email]");
    const last = document.querySelector("[data-cloud-last]");
    const signIn = document.querySelector('[data-cloud-action="signin"]');
    const create = document.querySelector('[data-cloud-action="create"]');
    const backup = document.querySelector('[data-cloud-action="backup"]');
    const restore = document.querySelector('[data-cloud-action="restore"]');
    const signOut = document.querySelector('[data-cloud-action="signout"]');

    if (email) email.textContent = signedIn ? (user.email || "Signed in") : "Not signed in";
    if (last) last.textContent = formatWhen(localStorage.getItem(MARKER_KEY));
    if (signIn) signIn.hidden = signedIn;
    if (create) create.hidden = signedIn;
    if (backup) backup.hidden = !signedIn;
    if (restore) restore.hidden = !signedIn;
    if (signOut) signOut.hidden = !signedIn;
    setStatus(firebaseReady() ? (signedIn ? "Connected" : "Ready") : "Firebase not ready", firebaseReady() ? "good" : "bad");
  }

  function upgradeCloudCard(root) {
    const headings = Array.from((root || document).querySelectorAll("h2"));
    const heading = headings.find(function (h2) {
      return /cloud backup|respaldo en la nube/i.test(h2.textContent || "");
    });
    const card = heading && heading.closest(".card");
    if (!card || card.dataset.cloudCardReady === "1") return false;
    card.dataset.cloudCardReady = "1";
    card.classList.add("cloud-card");
    card.innerHTML =
      '<div class="section-title"><div><h2>Cloud Backup</h2><p class="muted">Firestore backup for this device.</p></div><strong class="good" data-cloud-status>Ready</strong></div>' +
      '<div class="row"><span>Account</span><strong data-cloud-email>Not signed in</strong></div>' +
      '<div class="row"><span>Last backup</span><strong data-cloud-last>Never</strong></div>' +
      '<div class="button-row cloud-actions">' +
        '<button class="btn gold" data-cloud-action="signin">Sign in</button>' +
        '<button class="btn secondary" data-cloud-action="create">Create account</button>' +
        '<button class="btn gold" data-cloud-action="backup" hidden>Backup Now</button>' +
        '<button class="btn secondary" data-cloud-action="restore" hidden>Restore Backup</button>' +
        '<button class="btn secondary" data-cloud-action="signout" hidden>Sign out</button>' +
      '</div>' +
      '<p class="help-text">Backs up only My Wallet data in Firestore. Receipt photos are discarded and never uploaded.</p>';
    return true;
  }

  function openAuthDialog(mode) {
    mode = mode || "signin";
    return new Promise(function (resolve) {
      const old = document.getElementById("myWalletCloudAuthDialog");
      if (old) old.remove();

      const overlay = document.createElement("div");
      overlay.id = "myWalletCloudAuthDialog";
      overlay.className = "modal";
      overlay.innerHTML =
        '<div class="modal-card cloud-auth-card">' +
          '<div class="section-title"><h2>Cloud account</h2><button class="icon-btn" data-cloud-cancel type="button">×</button></div>' +
          '<p class="help-text">Use the same email and password on each device.</p>' +
          '<div class="form-grid" style="margin-top:12px">' +
            '<div class="field"><label>Email</label><input id="cloud-email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false"></div>' +
            '<div class="field"><label>Password</label><input id="cloud-password" type="password" autocomplete="current-password"></div>' +
            '<p class="help-text bad" data-cloud-auth-error></p>' +
            '<div class="button-row">' +
              '<button class="btn gold" data-cloud-auth-run type="button">' + (mode === "create" ? "Create account" : "Sign in") + '</button>' +
              '<button class="btn secondary" data-cloud-cancel type="button">Cancel</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      const email = overlay.querySelector("#cloud-email");
      const password = overlay.querySelector("#cloud-password");
      const error = overlay.querySelector("[data-cloud-auth-error]");
      const close = function (result) {
        overlay.remove();
        resolve(result || null);
      };
      overlay.querySelectorAll("[data-cloud-cancel]").forEach(function (button) {
        button.onclick = function () { close(null); };
      });
      overlay.querySelector("[data-cloud-auth-run]").onclick = function () {
        error.textContent = "";
        const promise = mode === "create"
          ? CloudAuth.create(email.value, password.value)
          : CloudAuth.signIn(email.value, password.value);
        promise.then(function () {
          close(mode === "create" ? "created" : "signed-in");
        }).catch(function (err) {
          error.textContent = authMessage(err);
        });
      };
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) close(null);
      });
      email.focus();
    });
  }

  const CloudAuth = {
    onChange: function (cb) {
      const a = auth();
      if (!a) return function () {};
      return a.onAuthStateChanged(cb);
    },
    signIn: function (email, password) {
      const notReady = ensureReady(false);
      if (notReady) return notReady;
      return auth().signInWithEmailAndPassword(String(email || "").trim(), password);
    },
    create: function (email, password) {
      const notReady = ensureReady(false);
      if (notReady) return notReady;
      return auth().createUserWithEmailAndPassword(String(email || "").trim(), password);
    },
    signOut: function () {
      const a = auth();
      return a ? a.signOut() : Promise.resolve();
    },
    openDialog: openAuthDialog,
  };

  const CloudBackup = {
    backupNow: function () {
      const notReady = ensureReady(true);
      if (notReady) return notReady;
      const raw = sanitizedWalletRaw();
      if (raw === null) return Promise.reject(new Error("No valid wallet data found."));
      const user = currentUser();
      const iso = new Date().toISOString();
      const payload = {
        appId: APP_ID,
        uid: user.uid,
        email: user.email || "",
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
        savedAtISO: iso,
        keys: { [STORAGE_KEY]: raw },
      };
      return latestRef().set(payload).then(function () {
        localStorage.setItem(MARKER_KEY, iso);
        updateUI();
        return iso;
      });
    },
    restore: function () {
      const notReady = ensureReady(true);
      if (notReady) return notReady;
      return latestRef().get().then(function (snap) {
        if (!snap.exists) return Promise.reject(new Error("no-backup"));
        const data = snap.data() || {};
        const raw = data.keys && data.keys[STORAGE_KEY];
        if (!raw) return Promise.reject(new Error("Backup did not include My Wallet data."));
        localStorage.setItem(STORAGE_KEY, raw);
        localStorage.setItem(MARKER_KEY, data.savedAtISO || new Date().toISOString());
        location.reload();
        return data;
      });
    },
    lastSaved: function () {
      return localStorage.getItem(MARKER_KEY);
    },
  };

  function runCloudAction(action) {
    setBusy(true);
    let promise;
    if (action === "signin") promise = CloudAuth.openDialog("signin");
    if (action === "create") promise = CloudAuth.openDialog("create");
    if (action === "backup") promise = CloudBackup.backupNow().then(function (iso) { setStatus("Backed up " + formatWhen(iso), "good"); });
    if (action === "restore") {
      if (!confirm("Restore cloud backup on this device? This replaces the local My Wallet data.")) {
        setBusy(false);
        return;
      }
      promise = CloudBackup.restore();
    }
    if (action === "signout") promise = CloudAuth.signOut().then(function () { setStatus("Signed out", "good"); });
    if (!promise) {
      setBusy(false);
      return;
    }
    promise.catch(function (err) {
      setStatus(authMessage(err), "bad");
    }).then(function () {
      setBusy(false);
      updateUI();
    }, function () {
      setBusy(false);
      updateUI();
    });
  }

  function bindCloudControls(root) {
    var upgraded = upgradeCloudCard(root);
    (root || document).querySelectorAll("[data-cloud-action]").forEach(function (button) {
      if (button.dataset.cloudBound === "1") return;
      button.dataset.cloudBound = "1";
      button.addEventListener("click", function () {
        runCloudAction(button.dataset.cloudAction);
      });
    });
    if (upgraded) updateUI();
  }

  window.MyWallet.CloudAuth = CloudAuth;
  window.MyWallet.CloudBackup = CloudBackup;

  if (firebaseReady()) CloudAuth.onChange(updateUI);
  new MutationObserver(function () { bindCloudControls(document); }).observe(document.body, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { bindCloudControls(document); });
  else bindCloudControls(document);
})();
