/**
 * Shared Firebase helper for Game Hub.
 * ------------------------------------
 * Include this AFTER the Firebase compat SDK scripts and firebase-config.js.
 * Exposes window.GameHubCloud — a small, stable API used by the hub page
 * and every game page, so nothing else in the codebase talks to Firebase
 * directly.
 *
 * Data model (Firestore):
 *   users/{uid}
 *     displayName, bio, avatarBase64, avatarExternalUrl,
 *     provider ('password' | 'google'), joined, updatedAt,
 *     scores: { [gameId]: number }
 *
 *   leaderboard/{gameId}_{uid}          (write-only for now, no UI reads it yet)
 *     uid, game, displayName, score, updatedAt
 *     Kept in sync automatically whenever pushScore() sees a new high score,
 *     so a future leaderboard UI can just query this collection — see
 *     getLeaderboard() below, already wired up and ready to use.
 */
(function () {
  "use strict";

  if (!window.firebase || !firebase.apps || !firebase.apps.length) {
    console.warn("GameHubCloud: firebase-config.js must be loaded first.");
  }

  const auth = firebase.auth();
  const db = firebase.firestore();

  function usersCol() { return db.collection("users"); }
  function leaderboardCol() { return db.collection("leaderboard"); }

  function onAuthChange(cb) {
    return auth.onAuthStateChanged(cb);
  }

  function currentUser() {
    return auth.currentUser;
  }

  async function signUp(email, password, displayName) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await usersCol().doc(cred.user.uid).set({
      displayName: (displayName || "").trim().slice(0, 40) || email.split("@")[0],
      bio: "",
      avatarBase64: null,
      avatarExternalUrl: null,
      provider: "password",
      joined: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      scores: {},
    });
    return cred.user;
  }

  async function signIn(email, password) {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    return cred.user;
  }

  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const ref = usersCol().doc(user.uid);
    const doc = await ref.get();
    if (!doc.exists) {
      await ref.set({
        displayName: user.displayName || "Player",
        bio: "",
        avatarBase64: null,
        avatarExternalUrl: user.photoURL || null,
        provider: "google",
        joined: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        scores: {},
      });
    }
    return user;
  }

  function signOutUser() {
    return auth.signOut();
  }

  async function getProfile(uid) {
    const doc = await usersCol().doc(uid).get();
    return doc.exists ? doc.data() : null;
  }

  // A profile can have a custom uploaded avatar (avatarBase64) or fall back
  // to the picture their sign-in provider shared (avatarExternalUrl, e.g.
  // a Google account photo). Custom upload always wins if present.
  function avatarUrlFor(profile) {
    if (!profile) return null;
    if (profile.avatarBase64) return profile.avatarBase64;
    if (profile.avatarExternalUrl) return profile.avatarExternalUrl;
    return null;
  }

  async function updateProfile(uid, { displayName, bio } = {}) {
    const patch = { updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    if (typeof displayName === "string" && displayName.trim()) {
      patch.displayName = displayName.trim().slice(0, 40);
    }
    if (typeof bio === "string") {
      patch.bio = bio.slice(0, 240);
    }
    await usersCol().doc(uid).set(patch, { merge: true });
  }

  // Resizes an image client-side (no server, no Storage bucket needed) and
  // returns a small base64 JPEG data URL, small enough to live directly on
  // the user's Firestore document (which caps out at 1MB per doc).
  function resizeImageFile(file, maxSize) {
    maxSize = maxSize || 128;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read that file."));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Could not read that image."));
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
          else { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadAvatar(uid, file) {
    const dataUrl = await resizeImageFile(file, 128);
    if (dataUrl.length > 700000) {
      throw new Error("That image is too large even after resizing — try a different one.");
    }
    await usersCol().doc(uid).set(
      { avatarBase64: dataUrl, updatedAt: firebase.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    return dataUrl;
  }

  async function pullScore(uid, game) {
    const profile = await getProfile(uid);
    return (profile && profile.scores && profile.scores[game]) || 0;
  }

  // Pushes a score only if it beats the stored high score, and mirrors new
  // high scores into the leaderboard collection — see the module doc above.
  async function pushScore(uid, game, score, displayName) {
    const ref = usersCol().doc(uid);
    let becameHighScore = false;
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.exists ? doc.data() : {};
      const scores = Object.assign({}, data.scores || {});
      const prev = scores[game] || 0;
      if (score > prev) {
        scores[game] = Math.floor(score);
        becameHighScore = true;
        tx.set(ref, { scores, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
      }
    });
    if (becameHighScore) {
      leaderboardCol().doc(game + "_" + uid).set(
        {
          uid, game,
          displayName: displayName || "Player",
          score: Math.floor(score),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      ).catch(() => {});
    }
  }

  // Not called by any UI yet — no leaderboard screen exists — but the
  // collection above is already being populated, so this just works
  // whenever a leaderboard view gets built.
  async function getLeaderboard(game, max) {
    max = max || 20;
    const snap = await leaderboardCol().where("game", "==", game).orderBy("score", "desc").limit(max).get();
    return snap.docs.map((d) => d.data());
  }

  window.GameHubCloud = {
    onAuthChange,
    currentUser,
    signUp,
    signIn,
    signInWithGoogle,
    signOut: signOutUser,
    getProfile,
    updateProfile,
    avatarUrlFor,
    uploadAvatar,
    pullScore,
    pushScore,
    getLeaderboard,
  };
})();