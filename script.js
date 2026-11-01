const updatesPreviewList = document.querySelector("#updates-preview-list");
const releaseList = document.querySelector("#release-list");

const loginButton = document.querySelector('[data-auth="login"]');
const signupButton = document.querySelector('[data-auth="signup"]');
const loginLink = document.querySelector('[data-auth-link="login"]');
const signupLink = document.querySelector('[data-auth-link="signup"]');
const signoutButton = document.querySelector('[data-auth="signout"]');
const authModal = document.querySelector("#auth-modal");
const authForm = document.querySelector("#auth-form");
const authTitle = document.querySelector("#auth-title");
const authSubmit = document.querySelector("#auth-submit");
const authEmail = document.querySelector("#auth-email");
const authPassword = document.querySelector("#auth-password");
const authMessage = document.querySelector("#auth-message");
const modalClose = document.querySelector(".modal-close");
const modalProviderButtons = document.querySelectorAll("[data-modal-provider]");

let authMode = "login";
let firebaseAuth = null;
let firebaseLoadError = "";

function getLocalAdminUser() {
  const user = window.PTNNAuth?.getLocalUser?.();
  return user?.role === "admin" ? user : null;
}

function formatPostDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderUpdatesPreview() {
  if (!updatesPreviewList || !window.PTNNUpdates) {
    return;
  }

  const posts = window.PTNNUpdates.sortedPosts().slice(0, 3);

  if (!posts.length) {
    updatesPreviewList.innerHTML = `
      <article class="update-card empty">
        <strong>Chưa có bài đăng nào.</strong>
        <p>Khi admin đăng bài ở trang Updates, mục này sẽ tự hiện trên trang chủ.</p>
      </article>
    `;
    return;
  }

  updatesPreviewList.innerHTML = posts
    .map(
      (post) => `
        <article class="update-card">
          <div class="update-card-meta">
            <span class="update-tag">${escapeHtml(post.tag || "Update")}</span>
            <time datetime="${post.publishedAt}">${formatPostDate(post.publishedAt)}</time>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p class="update-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="update-content">${escapeHtml(post.content).replace(/\n/g, "<br />")}</div>
          <div class="update-footer">
            <span>By ${escapeHtml(post.author)}</span>
            <a class="dream-button compact light" href="updates.html">Xem thêm</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderReleaseList() {
  if (!releaseList || !window.PTNNUpdates) {
    return;
  }

  const releases = window.PTNNUpdates.sortedReleases().slice(0, 6);

  if (!releases.length) {
    releaseList.innerHTML = `
      <article class="release-card empty">
        <strong>Chưa có release nào.</strong>
        <p>Admin có thể thêm Single/EP/Album trong trang Updates.</p>
      </article>
    `;
    return;
  }

  releaseList.innerHTML = releases
    .map(
      (release) => `
        <article class="release-card">
          <div class="release-art-frame">
            <img src="${escapeHtml(release.imageUrl || "assets/meow-single.png")}" alt="${escapeHtml(release.title)} artwork" />
          </div>
          <div class="release-card-body">
            <div class="update-card-meta">
              <span class="update-tag">${escapeHtml(release.type || "Single")}</span>
              <span class="release-status">${escapeHtml(release.status || "Coming Soon")}</span>
            </div>
            <strong>${escapeHtml(release.title)}</strong>
            <p>${escapeHtml(release.description || "Release - Coming Soon")}</p>
          </div>
        </article>
      `
    )
    .join("");
}

function setSignedIn(isSignedIn, user) {
  loginButton?.classList.toggle("hidden", isSignedIn);
  signupButton?.classList.toggle("hidden", isSignedIn);
  loginLink?.classList.toggle("hidden", isSignedIn);
  signupLink?.classList.toggle("hidden", isSignedIn);
  signoutButton?.classList.toggle("hidden", !isSignedIn);

  if (signoutButton) {
    const userLabel = user?.displayName || user?.email || "";
    signoutButton.textContent = isSignedIn && userLabel ? `Sign Out (${userLabel})` : "Sign Out";
  }
}

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

function showAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle("error", isError);
}

function openAuthModal(mode) {
  authMode = mode;
  authTitle.textContent = mode === "signup" ? "Sign Up" : "Login";
  authSubmit.textContent = mode === "signup" ? "Create Account" : "Login";
  authPassword.autocomplete = mode === "signup" ? "new-password" : "current-password";
  authForm.reset();

  if (!isFirebaseConfigured()) {
    showAuthMessage("Add your Firebase config in firebase-config.js first.", true);
  } else if (firebaseLoadError) {
    showAuthMessage(firebaseLoadError, true);
  } else {
    showAuthMessage("");
  }

  authModal.classList.remove("hidden");
  authEmail.focus();
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

function setupFirebase() {
  const localAdminUser = getLocalAdminUser();
  if (localAdminUser) {
    setSignedIn(true, localAdminUser);
  }

  if (!isFirebaseConfigured()) {
    return;
  }

  if (!window.firebase) {
    firebaseLoadError = "Firebase SDK did not load. Check your internet connection and refresh.";
    return;
  }

  if (!window.firebase.apps?.length) {
    window.firebase.initializeApp(window.firebaseConfig);
  }

  firebaseAuth = window.firebase.auth();
  firebaseAuth.onAuthStateChanged((user) => {
    const localUser = getLocalAdminUser();
    if (localUser) {
      setSignedIn(true, localUser);
      return;
    }

    setSignedIn(Boolean(user), user);
  });
}

function getFirebaseMessage(error) {
  const messages = {
    "auth/account-exists-with-different-credential": "This email already uses another login method.",
    "auth/cancelled-popup-request": "Another login popup was already open.",
    "auth/email-already-in-use": "This email is already registered. Please login instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/operation-not-supported-in-this-environment": "Google and Facebook login need this site to run on http:// or https://, not file://.",
    "auth/operation-not-allowed": "Enable Email/Password sign-in in Firebase Authentication.",
    "auth/popup-blocked": "The browser blocked the login popup. Please allow popups for this page.",
    "auth/popup-closed-by-user": "Login popup was closed before finishing.",
    "auth/unauthorized-domain": "Add your site domain in Firebase Authentication -> Settings -> Authorized domains.",
    "auth/user-not-found": "No account found with this email.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Invalid email or password.",
  };

  return messages[error.code] || error.message || "Authentication failed.";
}

async function signInWithProvider(providerName) {
  if (providerName === "instagram") {
    showAuthMessage("Instagram is not a built-in Firebase login provider. Use Google/Facebook, or add a custom backend OAuth flow for Instagram.", true);
    return;
  }

  if (!firebaseAuth) {
    showAuthMessage("Firebase is not ready. Check firebase-config.js and refresh.", true);
    return;
  }

  const provider =
    providerName === "google"
      ? new window.firebase.auth.GoogleAuthProvider()
      : new window.firebase.auth.FacebookAuthProvider();

  if (providerName === "google") {
    provider.setCustomParameters({ prompt: "select_account" });
  }

  showAuthMessage(`Opening ${providerName === "google" ? "Google" : "Facebook"} login...`);

  try {
    await firebaseAuth.signInWithPopup(provider);
    showAuthMessage("Logged in successfully.");
    window.setTimeout(closeAuthModal, 700);
  } catch (error) {
    showAuthMessage(getFirebaseMessage(error), true);
  }
}

async function signInDefaultAdmin(identity, password) {
  const result = window.PTNNAuth.signInDefaultAdmin(identity, password);

  if (!result.success) {
    if (result.reason === "password") {
      showAuthMessage("Sai mật khẩu admin mặc định.", true);
      return false;
    }

    showAuthMessage("Tài khoản admin mặc định không hợp lệ.", true);
    return false;
  }

  if (firebaseAuth?.currentUser) {
    await firebaseAuth.signOut();
  }

  setSignedIn(true, result.user);
  showAuthMessage(`Đăng nhập thành công với ${result.user.displayName}.`);
  window.setTimeout(closeAuthModal, 700);
  return true;
}

function wireAuth() {
  loginButton?.addEventListener("click", () => openAuthModal("login"));
  signupButton?.addEventListener("click", () => openAuthModal("signup"));
  modalClose?.addEventListener("click", closeAuthModal);

  modalProviderButtons.forEach((button) => {
    button.addEventListener("click", () => signInWithProvider(button.dataset.modalProvider));
  });

  authModal?.addEventListener("click", (event) => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const identity = authEmail.value.trim();
    const password = authPassword.value;

    if (window.PTNNAuth.isDefaultAdminIdentity(identity)) {
      authSubmit.disabled = true;

      try {
        await signInDefaultAdmin(identity, password);
      } finally {
        authSubmit.disabled = false;
      }
      return;
    }

    if (!identity.includes("@")) {
      showAuthMessage("Hãy nhập email Firebase hoặc đúng tên tài khoản admin mặc định.", true);
      return;
    }

    if (!firebaseAuth) {
      showAuthMessage("Firebase is not ready. Check firebase-config.js and refresh.", true);
      return;
    }

    authSubmit.disabled = true;
    showAuthMessage(authMode === "signup" ? "Creating account..." : "Logging in...");

    try {
      if (authMode === "signup") {
        await firebaseAuth.createUserWithEmailAndPassword(identity, password);
        showAuthMessage("Account created. You are signed in.");
      } else {
        await firebaseAuth.signInWithEmailAndPassword(identity, password);
        showAuthMessage("Logged in successfully.");
      }

      window.setTimeout(closeAuthModal, 700);
    } catch (error) {
      showAuthMessage(getFirebaseMessage(error), true);
    } finally {
      authSubmit.disabled = false;
    }
  });

  signoutButton?.addEventListener("click", async () => {
    if (getLocalAdminUser()) {
      window.PTNNAuth.signOutLocalUser();
      if (firebaseAuth?.currentUser) {
        await firebaseAuth.signOut();
      } else {
        setSignedIn(false);
      }
      return;
    }

    if (!firebaseAuth) {
      setSignedIn(false);
      return;
    }

    await firebaseAuth.signOut();
  });

  setupFirebase();
}

window.PTNNUpdates?.ensureSeedPost?.();
wireAuth();
renderUpdatesPreview();
renderReleaseList();

window.addEventListener("ptnn-auth-change", (event) => {
  const user = event.detail;
  setSignedIn(Boolean(user), user || firebaseAuth?.currentUser || null);
});

window.addEventListener("ptnn-updates-change", () => {
  renderUpdatesPreview();
});

window.addEventListener("ptnn-posts-change", () => {
  renderUpdatesPreview();
});

window.addEventListener("ptnn-releases-change", () => {
  renderReleaseList();
});
