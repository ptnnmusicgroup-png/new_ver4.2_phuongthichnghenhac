const PTNN_UPDATES_STORAGE_KEY = "ptnn-updates-posts-v1";
const PTNN_RELEASES_STORAGE_KEY = "ptnn-music-releases-v1";
const PTNN_FIRESTORE_COLLECTIONS = Object.freeze({
  posts: "ptnn_updates",
  releases: "ptnn_music_releases",
});

const fallbackPosts = [
  {
    id: "welcome-post",
    title: "PTNN Updates đã sẵn sàng",
    excerpt: "Đây là nơi PTNN đăng lịch phát hành, hậu trường và các note chính thức cho fan.",
    content:
      "Bài đăng mới sẽ được lưu công khai bằng Firebase Firestore để mọi visitors đều thấy trên website.",
    tag: "System",
    author: window.PTNNAuth?.defaultAdminName || "PTNN Admin",
    publishedAt: "2026-06-03T12:00:00.000Z",
  },
];

const fallbackReleases = [
  {
    id: "meow-single",
    title: "meow!~",
    type: "Single",
    status: "Coming Soon",
    imageUrl: "assets/meow-single.png",
    description: "Release - Coming Soon",
    author: window.PTNNAuth?.defaultAdminName || "PTNN Admin",
    publishedAt: "2026-06-03T12:00:00.000Z",
  },
];

const cache = {
  posts: [],
  releases: [],
};

let firestoreDb = null;
let firestoreReady = false;
let dataStarted = false;
let postsUnsubscribe = null;
let releasesUnsubscribe = null;

function readLocal(key, fallback = []) {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback.slice();
  }

  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : fallback.slice();
  } catch {
    window.localStorage.removeItem(key);
    return fallback.slice();
  }
}

function writeLocal(key, items) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function normalizeDate(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (value.seconds) {
    return new Date(value.seconds * 1000).toISOString();
  }

  return String(value);
}

function sortByPublishedAt(items) {
  return items
    .slice()
    .sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt));
}

function dispatchChange(type, detail) {
  window.dispatchEvent(new CustomEvent(`ptnn-${type}-change`, { detail }));
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

function setupFirestore() {
  if (firestoreReady) {
    return true;
  }

  if (!isFirebaseConfigured() || !window.firebase?.firestore) {
    return false;
  }

  if (!window.firebase.apps.length) {
    window.firebase.initializeApp(window.firebaseConfig);
  }

  firestoreDb = window.firebase.firestore();
  firestoreReady = true;
  return true;
}

function toFirestorePayload(item) {
  return {
    ...item,
    publishedAt:
      item.publishedAt instanceof Date
        ? window.firebase.firestore.Timestamp.fromDate(item.publishedAt)
        : window.firebase.firestore.Timestamp.fromDate(new Date(item.publishedAt || Date.now())),
  };
}

async function seedCollection(collectionName, items) {
  if (!setupFirestore()) {
    return;
  }

  const snapshot = await firestoreDb.collection(collectionName).limit(1).get();
  if (!snapshot.empty) {
    return;
  }

  await Promise.all(
    items.map((item) =>
      firestoreDb.collection(collectionName).doc(item.id).set(toFirestorePayload(item), { merge: true })
    )
  );
}

function mapSnapshot(snapshot) {
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
    publishedAt: normalizeDate(doc.data().publishedAt),
  }));
}

function subscribeCollection(type, collectionName, localKey, fallback) {
  if (!setupFirestore()) {
    cache[type] = sortByPublishedAt(readLocal(localKey, fallback));
    dispatchChange(type, cache[type]);
    return null;
  }

  return firestoreDb
    .collection(collectionName)
    .orderBy("publishedAt", "desc")
    .onSnapshot(
      (snapshot) => {
        cache[type] = snapshot.empty ? sortByPublishedAt(fallback) : mapSnapshot(snapshot);
        dispatchChange(type, cache[type]);
      },
      (error) => {
        console.warn(`PTNN Firestore ${type} listener failed`, error);
        cache[type] = sortByPublishedAt(readLocal(localKey, fallback));
        dispatchChange(type, cache[type]);
      }
    );
}

function ensureStarted() {
  if (!cache.posts.length) {
    cache.posts = sortByPublishedAt(readLocal(PTNN_UPDATES_STORAGE_KEY, fallbackPosts));
  }

  if (!cache.releases.length) {
    cache.releases = sortByPublishedAt(readLocal(PTNN_RELEASES_STORAGE_KEY, fallbackReleases));
  }

  if (dataStarted) {
    return;
  }

  dataStarted = true;

  if (setupFirestore()) {
    seedCollection(PTNN_FIRESTORE_COLLECTIONS.posts, fallbackPosts).catch(console.warn);
    seedCollection(PTNN_FIRESTORE_COLLECTIONS.releases, fallbackReleases).catch(console.warn);
  } else {
    writeLocal(PTNN_UPDATES_STORAGE_KEY, cache.posts);
    writeLocal(PTNN_RELEASES_STORAGE_KEY, cache.releases);
  }

  postsUnsubscribe = subscribeCollection(
    "posts",
    PTNN_FIRESTORE_COLLECTIONS.posts,
    PTNN_UPDATES_STORAGE_KEY,
    fallbackPosts
  );
  releasesUnsubscribe = subscribeCollection(
    "releases",
    PTNN_FIRESTORE_COLLECTIONS.releases,
    PTNN_RELEASES_STORAGE_KEY,
    fallbackReleases
  );
}

function createItemId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 90 + 10)}`;
}

async function publishItem(type, item) {
  ensureStarted();

  const localKey = type === "posts" ? PTNN_UPDATES_STORAGE_KEY : PTNN_RELEASES_STORAGE_KEY;
  const collectionName =
    type === "posts" ? PTNN_FIRESTORE_COLLECTIONS.posts : PTNN_FIRESTORE_COLLECTIONS.releases;
  const nextItem = {
    ...item,
    publishedAt: item.publishedAt || new Date().toISOString(),
  };

  if (setupFirestore()) {
    await firestoreDb.collection(collectionName).doc(nextItem.id).set(toFirestorePayload(nextItem), { merge: true });
    return nextItem;
  }

  cache[type] = sortByPublishedAt([nextItem, ...cache[type]]);
  writeLocal(localKey, cache[type]);
  dispatchChange(type, cache[type]);
  return nextItem;
}

async function deleteItem(type, id) {
  ensureStarted();

  const localKey = type === "posts" ? PTNN_UPDATES_STORAGE_KEY : PTNN_RELEASES_STORAGE_KEY;
  const collectionName =
    type === "posts" ? PTNN_FIRESTORE_COLLECTIONS.posts : PTNN_FIRESTORE_COLLECTIONS.releases;

  if (setupFirestore()) {
    await firestoreDb.collection(collectionName).doc(id).delete();
    return;
  }

  cache[type] = cache[type].filter((item) => item.id !== id);
  writeLocal(localKey, cache[type]);
  dispatchChange(type, cache[type]);
}

function readPosts() {
  ensureStarted();
  return cache.posts.slice();
}

function readReleases() {
  ensureStarted();
  return cache.releases.slice();
}

window.PTNNUpdates = {
  storageKey: PTNN_UPDATES_STORAGE_KEY,
  releasesStorageKey: PTNN_RELEASES_STORAGE_KEY,
  firestoreCollections: PTNN_FIRESTORE_COLLECTIONS,
  ensureSeedPost: ensureStarted,
  sortedPosts: readPosts,
  sortedReleases: readReleases,
  readPosts,
  readReleases,
  createPostId: () => createItemId("post"),
  createReleaseId: () => createItemId("release"),
  publishPost: (post) => publishItem("posts", post),
  publishRelease: (release) => publishItem("releases", release),
  deletePost: (id) => deleteItem("posts", id),
  deleteRelease: (id) => deleteItem("releases", id),
  isPublicDatabaseReady: setupFirestore,
};
