/**
 * Milobiwan's Poetry & Spoken Word Repertoire
 * Languages: Sranantongo, Nederlands, English, Fusion
 */

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

export async function fetchPoems() {
  try {
    const res = await fetch('/api/poems');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.poems)) {
        inMemoryCache = data.poems;
        saveToLocalCache(data.poems);
        return data.poems;
      }
    }
  } catch (err) {
    console.warn('Centrale database niet bereikbaar, fallback naar cache:', err);
  }
  return getStoredPoems();
}

export async function savePoemToDb(poem, pin) {
  try {
    const res = await fetch('/api/poems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-studio-pin': pin
      },
      body: JSON.stringify({ poem })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && Array.isArray(data.poems)) {
      inMemoryCache = data.poems;
      saveToLocalCache(data.poems);
      return { success: true, poems: data.poems };
    }
  } catch (err) {
    console.warn('Cloud database sync mislukt, opslaan in veilige cache:', err);
  }

  // Fail-safe: altijd bewaren in cache
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
  return { success: true, poems: updated };
}

export async function deletePoemFromDb(id, pin) {
  try {
    const res = await fetch('/api/poems', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-studio-pin': pin
      },
      body: JSON.stringify({ id })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && Array.isArray(data.poems)) {
      inMemoryCache = data.poems;
      saveToLocalCache(data.poems);
      return { success: true, poems: data.poems };
    }
  } catch (err) {
    console.warn('Cloud database sync mislukt, verwijderen uit cache:', err);
  }

  const current = getStoredPoems();
  const updated = current.filter(p => p.id !== id);
  inMemoryCache = updated;
  saveToLocalCache(updated);
  return { success: true, poems: updated };
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


