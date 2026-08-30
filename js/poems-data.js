/**
 * Milobiwan's Poetry & Spoken Word Repertoire
 * Languages: Sranantongo, Nederlands, English, Fusion
 */

const STORAGE_KEY = 'milobiwan_poems';

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

export function getStoredPoems() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Kon opgeslagen gedichten niet laden uit localStorage:', err);
  }
  return initialPoems;
}

export function saveStoredPoems(poems) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
  } catch (err) {
    console.error('Fout bij opslaan in localStorage:', err);
  }
}

export const poemsData = getStoredPoems();

