const PTNN_AUTH_STORAGE_KEY = "ptnn-auth-session-v1";
const PTNN_DEFAULT_ADMIN = Object.freeze({
  displayName: "Phương Thích Nghe Nhạc - Admin",
  password: "ptnn.lovelytimewithmusic",
  role: "admin",
  provider: "local-admin",
});

function normalizeIdentity(value) {
  return String(value || "").trim();
}

function readStoredLocalUser() {
  const raw = window.localStorage.getItem(PTNN_AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(PTNN_AUTH_STORAGE_KEY);
    return null;
  }
}

function writeStoredLocalUser(user) {
  window.localStorage.setItem(PTNN_AUTH_STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("ptnn-auth-change", { detail: user }));
}

function clearStoredLocalUser() {
  window.localStorage.removeItem(PTNN_AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("ptnn-auth-change", { detail: null }));
}

function isDefaultAdminIdentity(identity) {
  return normalizeIdentity(identity) === PTNN_DEFAULT_ADMIN.displayName;
}

function signInDefaultAdmin(identity, password) {
  if (!isDefaultAdminIdentity(identity)) {
    return { success: false, reason: "identity" };
  }

  if (password !== PTNN_DEFAULT_ADMIN.password) {
    return { success: false, reason: "password" };
  }

  const user = {
    displayName: PTNN_DEFAULT_ADMIN.displayName,
    role: PTNN_DEFAULT_ADMIN.role,
    provider: PTNN_DEFAULT_ADMIN.provider,
    email: "",
  };

  writeStoredLocalUser(user);
  return { success: true, user };
}

window.PTNNAuth = {
  defaultAdminName: PTNN_DEFAULT_ADMIN.displayName,
  defaultAdminPassword: PTNN_DEFAULT_ADMIN.password,
  getLocalUser: readStoredLocalUser,
  hasAdminSession() {
    const user = readStoredLocalUser();
    return Boolean(user && user.role === "admin");
  },
  isDefaultAdminIdentity,
  signInDefaultAdmin,
  signOutLocalUser: clearStoredLocalUser,
};
