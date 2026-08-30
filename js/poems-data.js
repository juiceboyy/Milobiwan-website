import {
  getPoemsFromFirestore,
  savePoemToFirestore,
  deletePoemFromFirestore,
  onPoemsSnapshot
} from './firebase-db.js';

const STORAGE_KEY = 'milobiwan_poems_cache';

export const LANGUAGE_CONFIG = {
  sranan: {
    languageLabel: 'Sranantongo',
    flag: '🇸🇷',
    badgeClass: 'badge-sranan'
  },
  dutch: {
    languageLabel: 'Nederlands',
    flag: '🇳🇱',
    badgeClass: 'badge-dutch'
  },
  english: {
    languageLabel: 'English',
    flag: '🇬🇧',
    badgeClass: 'badge-english'
  },
  fusion: {
    languageLabel: 'Drietalig / Fusion',
    flag: '🌐',
    badgeClass: 'badge-fusion'
  }
};

export const initialPoems = [];

let inMemoryCache = null;

/**
 * Haalt alle gedichten op uit Firebase Firestore
 */
export async function fetchPoems() {
  try {
    const livePoems = await getPoemsFromFirestore();
    if (Array.isArray(livePoems)) {
      inMemoryCache = livePoems;
      saveToLocalCache(livePoems);
      return livePoems;
    }
  } catch (err) {
    console.warn('Firestore offline/fallback naar lokale cache:', err);
  }
  return getStoredPoems();
}

/**
 * Slaat een gedicht op in de Firebase Firestore Cloud Database
 */
export async function savePoemToDb(poem) {
  // 1. Directe lokale veilige cache bijwerking
  const current = getStoredPoems();
  const existingIdx = current.findIndex(p => p.id === poem.id);
  let updated = [];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = poem;
  } else {
    updated = [poem, ...current];
  }
  inMemoryCache = updated;
  saveToLocalCache(updated);

  // 2. Schrijf naar Firebase Firestore
  try {
    await savePoemToFirestore(poem);
    return { success: true, poems: updated };
  } catch (err) {
    console.error('Fout bij opslaan in Firestore:', err);
    return { success: false, error: err.message || 'Kon niet opslaan in Firestore' };
  }
}

/**
 * Verwijdert een gedicht uit Firebase Firestore
 */
export async function deletePoemFromDb(id) {
  const current = getStoredPoems();
  const updated = current.filter(p => p.id !== id);
  inMemoryCache = updated;
  saveToLocalCache(updated);

  try {
    await deletePoemFromFirestore(id);
    return { success: true, poems: updated };
  } catch (err) {
    console.error('Fout bij verwijderen uit Firestore:', err);
    return { success: false, error: err.message || 'Kon niet verwijderen uit Firestore' };
  }
}

export function subscribeToLivePoems(callback) {
  return onPoemsSnapshot((livePoems) => {
    if (Array.isArray(livePoems)) {
      inMemoryCache = livePoems;
      saveToLocalCache(livePoems);
      if (typeof callback === 'function') {
        callback(livePoems);
      }
    }
  });
}

export function getStoredPoems() {
  if (inMemoryCache) return inMemoryCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Fout bij laden van lokale cache:', err);
  }
  return initialPoems;
}

function saveToLocalCache(poems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
  } catch (err) {
    console.warn('Kon lokale cache niet bijwerken:', err);
  }
}

export function slugify(text) {
  return String(text || '').toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}


