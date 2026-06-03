const authTabs = document.querySelectorAll("[data-auth-tab]");
const authForm = document.querySelector("#auth-page-form");
const identityInput = document.querySelector("#page-auth-email");
const passwordInput = document.querySelector("#page-auth-password");
const submitButton = document.querySelector("#page-auth-submit");
const authMessage = document.querySelector("#page-auth-message");
const providerButtons = document.querySelectorAll("[data-provider]");

let authMode = "login";
let firebaseAuth = null;

function isFirebaseConfigured() {
  const config = window.firebaseConfig;
  return Boolean(
    config &&
      config.apiKey &&
      config.authDomain &&
      !config.apiKey.includes("PASTE_") &&
      !config.authDomain.includes("PASTE_")
  );
}

function showMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function setMode(mode) {
  authMode = mode;
  submitButton.textContent = mode === "signup" ? "Create Account" : "Login";
  passwordInput.autocomplete = mode === "signup" ? "new-password" : "current-password";

  authTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authTab === mode);
  });

  showMessage("");
}

function setupFirebase() {
  if (!isFirebaseConfigured()) {
    showMessage("Add your Firebase config in firebase-config.js first.", true);
    return;
  }

  if (!window.firebase) {
    showMessage("Firebase SDK did not load. Check internet connection and refresh.", true);
    return;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(window.firebaseConfig);
  }

  firebaseAuth = window.firebase.auth();
  firebaseAuth.onAuthStateChanged((user) => {
    const localUser = window.PTNNAuth.getLocalUser();
    if (localUser?.role === "admin") {
      showMessage(`Signed in as ${localUser.displayName}. Redirecting to Updates...`);
      return;
    }

    if (user?.email) {
      showMessage(`Signed in as ${user.email}.`);
    }
  });
}

function getFirebaseMessage(error) {
  const messages = {
    "auth/account-exists-with-different-credential": "This email already uses another login method.",
    "auth/cancelled-popup-request": "Another login popup was already open.",
    "auth/email-already-in-use": "This email is already registered. Please login instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-allowed": "Enable Email/Password sign-in in Firebase Authentication.",
    "auth/operation-not-supported-in-this-environment": "Google and Facebook login need this site to run on http:// or https://, not file://.",
    "auth/popup-blocked": "The browser blocked the login popup. Please allow popups for this page.",
    "auth/popup-closed-by-user": "Login popup was closed before finishing.",
    "auth/unauthorized-domain": "Add your site domain in Firebase Authentication -> Settings -> Authorized domains.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
  };

  return messages[error.code] || error.message || "Authentication failed.";
}

async function signInWithProvider(providerName) {
  if (providerName === "instagram") {
    showMessage("Instagram is not a built-in Firebase login provider. Use Google/Facebook, or add a custom backend OAuth flow for Instagram.", true);
    return;
  }

  if (!firebaseAuth) {
    showMessage("Firebase is not ready. Check firebase-config.js and refresh.", true);
    return;
  }

  const provider =
    providerName === "google"
      ? new window.firebase.auth.GoogleAuthProvider()
      : new window.firebase.auth.FacebookAuthProvider();

  if (providerName === "google") {
    provider.setCustomParameters({ prompt: "select_account" });
  }

  showMessage(`Opening ${providerName === "google" ? "Google" : "Facebook"} login...`);

  try {
    await firebaseAuth.signInWithPopup(provider);
    showMessage("Logged in successfully.");
  } catch (error) {
    showMessage(getFirebaseMessage(error), true);
  }
}

async function signInDefaultAdmin(identity, password) {
  const result = window.PTNNAuth.signInDefaultAdmin(identity, password);

  if (!result.success) {
    if (result.reason === "password") {
      showMessage("Sai mật khẩu admin mặc định.", true);
      return false;
    }

    showMessage("Tài khoản admin mặc định không hợp lệ.", true);
    return false;
  }

  if (firebaseAuth?.currentUser) {
    await firebaseAuth.signOut();
  }

  showMessage(`Đăng nhập thành công với ${result.user.displayName}. Đang chuyển sang Updates...`);
  window.setTimeout(() => {
    window.location.href = "updates.html";
  }, 700);
  return true;
}

authTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.authTab));
});

providerButtons.forEach((button) => {
  button.addEventListener("click", () => signInWithProvider(button.dataset.provider));
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const identity = identityInput.value.trim();
  const password = passwordInput.value;

  submitButton.disabled = true;

  try {
    if (window.PTNNAuth.isDefaultAdminIdentity(identity)) {
      await signInDefaultAdmin(identity, password);
      return;
    }

    if (!identity.includes("@")) {
      showMessage("Hãy nhập email Firebase hoặc đúng tên tài khoản admin mặc định.", true);
      return;
    }

    if (!firebaseAuth) {
      showMessage("Firebase is not ready. Check firebase-config.js and refresh.", true);
      return;
    }

    showMessage(authMode === "signup" ? "Creating account..." : "Logging in...");

    if (authMode === "signup") {
      await firebaseAuth.createUserWithEmailAndPassword(identity, password);
      showMessage("Account created. You are signed in.");
    } else {
      await firebaseAuth.signInWithEmailAndPassword(identity, password);
      showMessage("Logged in successfully.");
    }
  } catch (error) {
    showMessage(getFirebaseMessage(error), true);
  } finally {
    submitButton.disabled = false;
  }
});

if (window.location.hash === "#signup") {
  setMode("signup");
}

if (window.PTNNAuth.hasAdminSession()) {
  showMessage(`Admin session active: ${window.PTNNAuth.defaultAdminName}.`);
}

setupFirebase();
