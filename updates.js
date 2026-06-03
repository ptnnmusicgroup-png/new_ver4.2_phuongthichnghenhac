const loginLink = document.querySelector('[data-auth-link="login"]');
const signupLink = document.querySelector('[data-auth-link="signup"]');
const signoutButton = document.querySelector('[data-auth="signout"]');
const sessionName = document.querySelector("#updates-session-name");
const sessionNote = document.querySelector("#updates-session-note");
const updatesForm = document.querySelector("#updates-form");
const clearUpdateFormButton = document.querySelector("#clear-update-form");
const updatesMessage = document.querySelector("#updates-message");
const updatesList = document.querySelector("#updates-list");
const releaseForm = document.querySelector("#release-form");
const clearReleaseFormButton = document.querySelector("#clear-release-form");
const releaseMessage = document.querySelector("#release-message");
const adminReleaseList = document.querySelector("#admin-release-list");

let firebaseAuth = null;
const FIREBASE_ADMIN_EMAIL = "ptnn.musicgroup@gmail.com";

function currentUser() {
  return window.PTNNAuth.getLocalUser();
}

function hasAdminSession() {
  const localUser = currentUser();
  const firebaseUser = firebaseAuth?.currentUser;
  return Boolean(localUser?.role === "admin" || firebaseUser?.email === FIREBASE_ADMIN_EMAIL);
}

function getAdminDisplayName() {
  const localUser = currentUser();
  const firebaseUser = firebaseAuth?.currentUser;
  return localUser?.displayName || firebaseUser?.displayName || firebaseUser?.email || window.PTNNAuth.defaultAdminName;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setMessage(target, message, isError = false) {
  if (!target) {
    return;
  }

  target.textContent = message;
  target.classList.toggle("error", isError);
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderPosts() {
  const posts = window.PTNNUpdates.sortedPosts();

  if (!posts.length) {
    updatesList.innerHTML = `
      <article class="update-card empty">
        <strong>Chưa có bài đăng nào.</strong>
        <p>Đăng nhập admin để đăng bài đầu tiên cho PTNN Updates.</p>
      </article>
    `;
    return;
  }

  const canManage = hasAdminSession();
  updatesList.innerHTML = posts
    .map(
      (post) => `
        <article class="update-card" data-post-id="${escapeHtml(post.id)}">
          <div class="update-card-meta">
            <span class="update-tag">${escapeHtml(post.tag || "Update")}</span>
            <time datetime="${escapeHtml(post.publishedAt)}">${formatDate(post.publishedAt)}</time>
          </div>
          <h3>${escapeHtml(post.title)}</h3>
          <p class="update-excerpt">${escapeHtml(post.excerpt)}</p>
          <div class="update-content">${escapeHtml(post.content).replace(/\n/g, "<br />")}</div>
          <div class="update-footer">
            <span>By ${escapeHtml(post.author)}</span>
            ${canManage ? '<button class="provider-button updates-delete" type="button" data-delete-post>Xóa bài</button>' : ""}
          </div>
        </article>
      `
    )
    .join("");
}

function renderReleases() {
  if (!adminReleaseList) {
    return;
  }

  const releases = window.PTNNUpdates.sortedReleases();

  if (!releases.length) {
    adminReleaseList.innerHTML = `
      <article class="release-card empty">
        <strong>Chưa có Single/EP/Album nào.</strong>
        <p>Admin có thể thêm sản phẩm âm nhạc mới ở form bên trái.</p>
      </article>
    `;
    return;
  }

  const canManage = hasAdminSession();
  adminReleaseList.innerHTML = releases
    .map(
      (release) => `
        <article class="release-card" data-release-id="${escapeHtml(release.id)}">
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
            <div class="update-footer">
              <span>By ${escapeHtml(release.author)}</span>
              ${canManage ? '<button class="provider-button updates-delete" type="button" data-delete-release>Xóa release</button>' : ""}
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

function syncSessionUI() {
  const user = currentUser();
  const isAdmin = hasAdminSession();

  loginLink?.classList.toggle("hidden", isAdmin);
  signupLink?.classList.toggle("hidden", isAdmin);
  signoutButton?.classList.toggle("hidden", !isAdmin);

  sessionName.textContent = isAdmin ? getAdminDisplayName() : "Khách xem";
  sessionNote.textContent = isAdmin
    ? "Bạn đang có quyền admin. Bài đăng và Single/EP/Album sẽ được lưu public bằng Firebase Firestore."
    : "Đăng nhập bằng tài khoản admin mặc định để viết bài và quản lý sản phẩm âm nhạc.";

  [updatesForm, releaseForm].forEach((form) => {
    [...(form?.elements || [])].forEach((field) => {
      if (field instanceof HTMLElement) {
        field.disabled = !isAdmin;
      }
    });
  });

  if (clearUpdateFormButton) {
    clearUpdateFormButton.disabled = !isAdmin;
  }

  if (clearReleaseFormButton) {
    clearReleaseFormButton.disabled = !isAdmin;
  }
}

function clearUpdateForm() {
  updatesForm.reset();
  setMessage(updatesMessage, "");
}

function clearReleaseForm() {
  releaseForm.reset();
  const imageInput = releaseForm.querySelector('[name="imageUrl"]');
  if (imageInput) {
    imageInput.value = "assets/meow-single.png";
  }
  setMessage(releaseMessage, "");
}

function setupFirebase() {
  const config = window.firebaseConfig;
  const configured =
    config &&
    config.apiKey &&
    config.authDomain &&
    !config.apiKey.includes("PASTE_") &&
    !config.authDomain.includes("PASTE_");

  if (!configured || !window.firebase) {
    setMessage(
      updatesMessage,
      "Firebase chưa sẵn sàng. Bật Firestore trong Firebase Console để bài đăng public cho mọi visitors.",
      true
    );
    return;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(window.firebaseConfig);
  }

  firebaseAuth = window.firebase.auth();
  firebaseAuth.onAuthStateChanged(() => {
    syncSessionUI();
    renderPosts();
    renderReleases();
  });

  if (!window.firebase.firestore) {
    setMessage(
      updatesMessage,
      "Thiếu Firebase Firestore SDK. Kiểm tra lại kết nối mạng hoặc script firebase-firestore-compat.js.",
      true
    );
  }
}

updatesForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!hasAdminSession()) {
    setMessage(updatesMessage, "Chỉ tài khoản admin mặc định mới được đăng bài.", true);
    return;
  }

  const formData = new FormData(updatesForm);
  const post = {
    id: window.PTNNUpdates.createPostId(),
    title: String(formData.get("title") || "").trim(),
    excerpt: String(formData.get("excerpt") || "").trim(),
    content: String(formData.get("content") || "").trim(),
    tag: String(formData.get("tag") || "").trim() || "Update",
    author: getAdminDisplayName(),
    publishedAt: new Date().toISOString(),
  };

  if (!post.title || !post.excerpt || !post.content) {
    setMessage(updatesMessage, "Tiêu đề, tóm tắt và nội dung là bắt buộc.", true);
    return;
  }

  try {
    setMessage(updatesMessage, "Đang đăng bài công khai...");
    await window.PTNNUpdates.publishPost(post);
    clearUpdateForm();
    setMessage(updatesMessage, "Đăng bài thành công. Visitors sẽ thấy sau khi dữ liệu đồng bộ.");
  } catch (error) {
    setMessage(updatesMessage, error.message || "Không thể đăng bài lên Firestore.", true);
  }
});

releaseForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!hasAdminSession()) {
    setMessage(releaseMessage, "Chỉ tài khoản admin mặc định mới được thêm release.", true);
    return;
  }

  const formData = new FormData(releaseForm);
  const release = {
    id: window.PTNNUpdates.createReleaseId(),
    title: String(formData.get("title") || "").trim(),
    type: String(formData.get("type") || "Single"),
    status: String(formData.get("status") || "Coming Soon"),
    imageUrl: String(formData.get("imageUrl") || "assets/meow-single.png").trim(),
    description: String(formData.get("description") || "").trim() || "Release - Coming Soon",
    author: getAdminDisplayName(),
    publishedAt: new Date().toISOString(),
  };

  if (!release.title) {
    setMessage(releaseMessage, "Tên sản phẩm âm nhạc là bắt buộc.", true);
    return;
  }

  try {
    setMessage(releaseMessage, "Đang đăng release công khai...");
    await window.PTNNUpdates.publishRelease(release);
    clearReleaseForm();
    setMessage(releaseMessage, "Đăng release thành công. Visitors sẽ thấy trên trang chủ.");
  } catch (error) {
    setMessage(releaseMessage, error.message || "Không thể đăng release lên Firestore.", true);
  }
});

clearUpdateFormButton.addEventListener("click", clearUpdateForm);
clearReleaseFormButton?.addEventListener("click", clearReleaseForm);

updatesList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-post]");
  const card = event.target.closest("[data-post-id]");

  if (!button || !card || !hasAdminSession()) {
    return;
  }

  try {
    await window.PTNNUpdates.deletePost(card.dataset.postId);
    setMessage(updatesMessage, "Đã xóa bài viết.");
  } catch (error) {
    setMessage(updatesMessage, error.message || "Không thể xóa bài viết.", true);
  }
});

adminReleaseList?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-release]");
  const card = event.target.closest("[data-release-id]");

  if (!button || !card || !hasAdminSession()) {
    return;
  }

  try {
    await window.PTNNUpdates.deleteRelease(card.dataset.releaseId);
    setMessage(releaseMessage, "Đã xóa release.");
  } catch (error) {
    setMessage(releaseMessage, error.message || "Không thể xóa release.", true);
  }
});

signoutButton?.addEventListener("click", async () => {
  window.PTNNAuth.signOutLocalUser();

  if (firebaseAuth?.currentUser) {
    await firebaseAuth.signOut();
  }

  syncSessionUI();
  renderPosts();
  renderReleases();
  setMessage(updatesMessage, "Đã đăng xuất admin.");
});

window.addEventListener("ptnn-auth-change", () => {
  syncSessionUI();
  renderPosts();
  renderReleases();
});

window.addEventListener("ptnn-posts-change", () => {
  renderPosts();
});

window.addEventListener("ptnn-releases-change", () => {
  renderReleases();
});

setupFirebase();
window.PTNNUpdates.ensureSeedPost();
syncSessionUI();
renderPosts();
renderReleases();
