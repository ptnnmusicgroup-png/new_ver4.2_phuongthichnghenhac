const currencyFormatter = new Intl.NumberFormat("vi-VN");
const STORE_STATE_KEY = "ptnn-store-state-v2";

const cartCount = document.querySelector("#cart-count");
const cartPill = document.querySelector("#cart-pill");
const productCards = [...document.querySelectorAll(".product-card[data-product-id]")];
const addCartButtons = document.querySelectorAll(".add-cart");
const buyNowButtons = document.querySelectorAll(".buy-now");
const checkoutPanel = document.querySelector("#checkout-panel");
const checkoutItems = document.querySelector("#checkout-items");
const checkoutEmpty = document.querySelector("#checkout-empty");
const checkoutSubtotal = document.querySelector("#checkout-subtotal");
const checkoutCount = document.querySelector("#checkout-count");
const checkoutWeight = document.querySelector("#checkout-weight");
const checkoutForm = document.querySelector("#checkout-form");
const checkoutMessage = document.querySelector("#checkout-message");
const saveDraftButton = document.querySelector("#save-draft");
const createJntOrderButton = document.querySelector("#create-jnt-order");
const shipmentResult = document.querySelector("#shipment-result");
const resultOrderId = document.querySelector("#result-orderid");
const resultAwb = document.querySelector("#result-awb");
const resultEtd = document.querySelector("#result-etd");
const resultStatus = document.querySelector("#result-status");
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

const products = new Map(
  productCards.map((card) => [
    card.dataset.productId,
    {
      id: card.dataset.productId,
      name: card.dataset.productName,
      price: Number(card.dataset.price),
      weight: Number(card.dataset.weight),
    },
  ])
);

let cart = new Map();
let authMode = "login";
let firebaseAuth = null;
let firebaseLoadError = "";

function getLocalAdminUser() {
  const user = window.PTNNAuth?.getLocalUser?.();
  return user?.role === "admin" ? user : null;
}

function formatCurrency(value) {
  return `${currencyFormatter.format(value)}₫`;
}

function formatWeight(value) {
  return `${value.toFixed(2)} kg`;
}

function formatPostDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function flashButton(button, text) {
  const original = button.textContent;
  button.textContent = text;
  button.disabled = true;

  window.setTimeout(() => {
    button.textContent = original;
    button.disabled = false;
  }, 1200);
}

function scrollCheckoutIntoView() {
  checkoutPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
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

function getCartEntries() {
  return [...cart.entries()]
    .map(([id, qty]) => {
      const product = products.get(id);
      return product ? { ...product, qty } : null;
    })
    .filter(Boolean);
}

function getCartSummary() {
  return getCartEntries().reduce(
    (summary, item) => {
      summary.totalQty += item.qty;
      summary.subtotal += item.qty * item.price;
      summary.totalWeight += item.qty * item.weight;
      return summary;
    },
    { totalQty: 0, subtotal: 0, totalWeight: 0 }
  );
}

function setCheckoutMessage(message, isError = false) {
  checkoutMessage.textContent = message;
  checkoutMessage.classList.toggle("error", isError);
}

function renderCart() {
  const items = getCartEntries();
  const summary = getCartSummary();

  cartCount.textContent = summary.totalQty;
  checkoutCount.textContent = summary.totalQty;
  checkoutSubtotal.textContent = formatCurrency(summary.subtotal);
  checkoutWeight.textContent = formatWeight(summary.totalWeight);

  checkoutEmpty.classList.toggle("hidden", items.length > 0);
  createJntOrderButton.disabled = items.length === 0;
  saveDraftButton.disabled = items.length === 0;

  if (!items.length) {
    checkoutItems.innerHTML = "";
    return;
  }

  checkoutItems.innerHTML = items
    .map(
      (item) => `
        <article class="checkout-item" data-cart-id="${item.id}">
          <div>
            <h4>${item.name}</h4>
            <p>${formatCurrency(item.price)} / món</p>
            <div class="qty-controls" aria-label="Quantity controls">
              <button type="button" data-qty-action="decrease">-</button>
              <span>${item.qty}</span>
              <button type="button" data-qty-action="increase">+</button>
              <button type="button" data-qty-action="remove">×</button>
            </div>
          </div>
          <strong>${formatCurrency(item.qty * item.price)}</strong>
        </article>
      `
    )
    .join("");
}

function persistStoreState() {
  if (!checkoutForm) {
    return;
  }

  const formData = Object.fromEntries(new FormData(checkoutForm).entries());
  const state = {
    cart: [...cart.entries()],
    form: formData,
  };

  window.localStorage.setItem(STORE_STATE_KEY, JSON.stringify(state));
}

function restoreStoreState() {
  const raw = window.localStorage.getItem(STORE_STATE_KEY);

  if (!raw) {
    renderCart();
    return;
  }

  try {
    const state = JSON.parse(raw);
    cart = new Map(state.cart || []);

    if (state.form && checkoutForm) {
      Object.entries(state.form).forEach(([name, value]) => {
        const field = checkoutForm.elements.namedItem(name);
        if (!field) {
          return;
        }

        if (field instanceof RadioNodeList) {
          const radio = [...field].find((item) => item.value === value);
          if (radio) {
            radio.checked = true;
          }
          return;
        }

        field.value = value;
      });
    }
  } catch {
    window.localStorage.removeItem(STORE_STATE_KEY);
  }

  renderCart();
}

function updateCartItem(productId, qty) {
  if (qty <= 0) {
    cart.delete(productId);
  } else {
    cart.set(productId, qty);
  }

  renderCart();
  persistStoreState();
}

function addToCart(productId, qty = 1, openCheckout = false) {
  const currentQty = cart.get(productId) || 0;
  cart.set(productId, currentQty + qty);
  renderCart();
  persistStoreState();

  if (openCheckout) {
    scrollCheckoutIntoView();
  }
}

function buildReceiverAddress(formData) {
  return [
    formData.get("receiverAddress"),
    formData.get("receiverWard"),
    formData.get("receiverDistrict"),
    formData.get("receiverProvince"),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

function buildOrderId() {
  const now = new Date();
  const parts = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
  ];

  return `PTNN-${parts.join("")}-${Math.floor(Math.random() * 90 + 10)}`;
}

function getCreateOrderEndpoint() {
  if (window.location.protocol === "file:") {
    return null;
  }

  return "/api/create-jnt-order";
}

function showShipmentResult(result) {
  resultOrderId.textContent = result.orderid || "-";
  resultAwb.textContent = result.awbNo || "-";
  resultEtd.textContent = result.etd || "-";
  resultStatus.textContent = result.status || "-";
  shipmentResult.classList.remove("hidden");
}

async function submitJntOrder(event) {
  event.preventDefault();

  if (!cart.size) {
    setCheckoutMessage("Giỏ hàng đang trống. Hãy thêm sản phẩm trước khi tạo đơn.", true);
    return;
  }

  const formData = new FormData(checkoutForm);
  const destinationCode = String(formData.get("destinationCode") || "").trim();
  const receiverArea = String(formData.get("receiverArea") || "").trim();

  if (!destinationCode || !receiverArea) {
    setCheckoutMessage(
      "J&T yêu cầu destination code và receiver area sau khi mapping khu vực. Điền 2 mã này rồi tạo đơn lại.",
      true
    );
    return;
  }

  const endpoint = getCreateOrderEndpoint();
  if (!endpoint) {
    setCheckoutMessage(
      "Bạn đang mở web bằng file:// nên chưa gọi được backend tạo đơn J&T. Hãy chạy qua Netlify hoặc server có endpoint /api/create-jnt-order.",
      true
    );
    return;
  }

  const summary = getCartSummary();
  const orderId = buildOrderId();
  const payload = {
    orderId,
    paymentMethod: formData.get("paymentMethod"),
    serviceType: formData.get("serviceType"),
    note: String(formData.get("orderNote") || "").trim(),
    receiver: {
      name: String(formData.get("receiverName") || "").trim(),
      phone: String(formData.get("receiverPhone") || "").trim(),
      email: String(formData.get("receiverEmail") || "").trim(),
      address: buildReceiverAddress(formData),
      zip: String(formData.get("receiverZip") || "").trim(),
      destinationCode,
      receiverArea,
    },
    items: getCartEntries(),
    totals: {
      subtotal: summary.subtotal,
      totalQty: summary.totalQty,
      totalWeight: Number(summary.totalWeight.toFixed(2)),
    },
  };

  createJntOrderButton.disabled = true;
  setCheckoutMessage("Đang tạo đơn và gửi dữ liệu sang J&T...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || "Tạo đơn J&T thất bại.");
    }

    showShipmentResult(data.result);
    setCheckoutMessage("Tạo vận đơn J&T thành công.");
    persistStoreState();
  } catch (error) {
    setCheckoutMessage(error.message || "Không thể tạo đơn J&T.", true);
  } finally {
    createJntOrderButton.disabled = false;
  }
}

function saveDraft() {
  if (!cart.size) {
    setCheckoutMessage("Giỏ hàng đang trống nên chưa có gì để lưu.", true);
    return;
  }

  persistStoreState();
  setCheckoutMessage("Đã lưu nháp đơn hàng trên trình duyệt này.");
}

function wireStore() {
  addCartButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      if (!card?.dataset.productId) {
        return;
      }

      addToCart(card.dataset.productId);
      flashButton(button, "Added ✓");
    });
  });

  buyNowButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".product-card");
      if (!card?.dataset.productId) {
        return;
      }

      addToCart(card.dataset.productId, 1, true);
      flashButton(button, "To checkout ✓");
    });
  });

  cartPill?.addEventListener("click", scrollCheckoutIntoView);

  checkoutItems?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-qty-action]");
    const item = event.target.closest("[data-cart-id]");

    if (!button || !item) {
      return;
    }

    const productId = item.dataset.cartId;
    const currentQty = cart.get(productId) || 0;
    const action = button.dataset.qtyAction;

    if (action === "increase") {
      updateCartItem(productId, currentQty + 1);
    }

    if (action === "decrease") {
      updateCartItem(productId, currentQty - 1);
    }

    if (action === "remove") {
      updateCartItem(productId, 0);
    }
  });

  checkoutForm?.addEventListener("input", persistStoreState);
  checkoutForm?.addEventListener("submit", submitJntOrder);
  saveDraftButton?.addEventListener("click", saveDraft);

  restoreStoreState();
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
wireStore();
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
