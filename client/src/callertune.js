// "My caller tune": the song and the part of it the person picked, saved in this browser (per account).
// A website cannot change what callers hear. This remembers the choice, and the clip can be downloaded
// to use with a mobile operator's caller tune service.

const key = (userId) => `caller-tune:${userId}`;

export function getCallerTune(userId) {
  try {
    const v = JSON.parse(localStorage.getItem(key(userId)) || "null");
    return v && typeof v === "object" && v.trackId ? v : null;
  } catch {
    return null;
  }
}

export function setCallerTune(userId, tune) {
  try {
    localStorage.setItem(key(userId), JSON.stringify({ ...tune, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearCallerTune(userId) {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    /* ignore */
  }
}
