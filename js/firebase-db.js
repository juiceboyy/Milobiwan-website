/**
 * Milobiwan – Firebase Firestore Real-Time Database Client
 * Official Cloud CMS Data Layer
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCr7WwHUpEv_O3qwm654Vy5YX0HrDV36AM",
  authDomain: "gen-lang-client-0725001172.firebaseapp.com",
  projectId: "gen-lang-client-0725001172",
  storageBucket: "gen-lang-client-0725001172.firebasestorage.app",
  messagingSenderId: "164061248710",
  appId: "1:164061248710:web:bba703b2689ce15a202bc7"
};

// Initialize Firebase App & Firestore
let app = null;
let db = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (err) {
  console.warn('Firebase initialisatiefout:', err);
}

const POEMS_COLLECTION = 'poems';
const PERFORMANCES_COLLECTION = 'performances';

/**
 * Haalt alle gedichten op uit Firestore
 */
export async function getPoemsFromFirestore() {
  if (!db) return [];
  try {
    const q = query(collection(db, POEMS_COLLECTION));
    const snapshot = await getDocs(q);
    const poems = [];
    snapshot.forEach(docSnap => {
      poems.push(docSnap.data());
    });
    return poems;
  } catch (err) {
    console.error('Fout bij ophalen uit Firestore:', err);
    throw err;
  }
}

/**
 * Slaat een gedicht op in Firestore (toevoegen of bewerken)
 */
export async function savePoemToFirestore(poem) {
  if (!db) throw new Error('Firestore database is niet geïnitialiseerd.');
  try {
    const docRef = doc(db, POEMS_COLLECTION, poem.id);
    const dataToSave = {
      id: String(poem.id || ''),
      title: String(poem.title || ''),
      language: String(poem.language || 'sranan'),
      languageLabel: String(poem.languageLabel || ''),
      flag: String(poem.flag || ''),
      badgeClass: String(poem.badgeClass || ''),
      tags: Array.isArray(poem.tags) ? poem.tags : [],
      theme: String(poem.theme || ''),
      snippet: String(poem.snippet || ''),
      fullText: String(poem.fullText || ''),
      translationNote: String(poem.translationNote || ''),
      imageUrl: String(poem.imageUrl || ''),
      imagePages: Array.isArray(poem.imagePages) ? poem.imagePages : (poem.imageUrl ? [poem.imageUrl] : []),
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, dataToSave);
    return { success: true, poem: dataToSave };
  } catch (err) {
    console.error('Fout bij opslaan in Firestore:', err);
    throw err;
  }
}

/**
 * Verwijdert een gedicht uit Firestore
 */
export async function deletePoemFromFirestore(id) {
  if (!db) throw new Error('Firestore database is niet geïnitialiseerd.');
  try {
    const docRef = doc(db, POEMS_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.error('Fout bij verwijderen uit Firestore:', err);
    throw err;
  }
}

/**
 * Real-time listener: stelt de website direct op de hoogte van wijzigingen in gedichten
 */
export function onPoemsSnapshot(callback) {
  if (!db || typeof callback !== 'function') return () => {};
  try {
    const q = query(collection(db, POEMS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const poems = [];
      snapshot.forEach(docSnap => {
        poems.push(docSnap.data());
      });
      callback(poems);
    }, (error) => {
      console.warn('Real-time listener fout (mogelijk offline):', error);
    });
  } catch (err) {
    console.warn('Kon Firestore real-time listener niet starten:', err);
    return () => {};
  }
}

/**
 * Haalt alle optredens op uit Firestore of Netlify Blobs
 */
export async function getPerformancesFromFirestore() {
  let list = [];
  if (db) {
    try {
      const q = query(collection(db, PERFORMANCES_COLLECTION));
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        list.push(docSnap.data());
      });
    } catch (err) {
      console.warn('Firestore optredens fetch warning, fallback naar API:', err.message);
    }
  }

  if (list.length === 0) {
    try {
      const res = await fetch('/api/performances');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.performances)) {
          list = data.performances;
        }
      }
    } catch (apiErr) {
      console.warn('API optredens fetch warning:', apiErr.message);
    }
  }

  return list;
}

/**
 * Slaat een optreden op in Firestore en Netlify Blobs
 */
export async function savePerformanceToFirestore(perf) {
  const dataToSave = {
    ...perf,
    updatedAt: new Date().toISOString()
  };

  if (db) {
    try {
      const docRef = doc(db, PERFORMANCES_COLLECTION, perf.id);
      await setDoc(docRef, dataToSave);
    } catch (err) {
      console.warn('Firestore save warning:', err.message);
    }
  }

  try {
    const pin = sessionStorage.getItem('milobiwan_pin_val') || '';
    await fetch('/api/performances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-studio-pin': pin
      },
      body: JSON.stringify({ performance: dataToSave })
    });
  } catch (apiErr) {
    console.warn('Netlify Blobs sync warning:', apiErr.message);
  }

  return { success: true, performance: dataToSave };
}

/**
 * Verwijdert een optreden uit Firestore en Netlify Blobs
 */
export async function deletePerformanceFromFirestore(id) {
  if (db) {
    try {
      const docRef = doc(db, PERFORMANCES_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore delete warning:', err.message);
    }
  }

  try {
    const pin = sessionStorage.getItem('milobiwan_pin_val') || '';
    await fetch('/api/performances', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-studio-pin': pin
      },
      body: JSON.stringify({ id })
    });
  } catch (apiErr) {
    console.warn('Netlify Blobs delete warning:', apiErr.message);
  }

  return { success: true };
}

/**
 * Real-time listener: stelt de website direct op de hoogte van wijzigingen in optredens
 */
export function onPerformancesSnapshot(callback) {
  if (!db || typeof callback !== 'function') return () => {};
  try {
    const q = query(collection(db, PERFORMANCES_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const performances = [];
      snapshot.forEach(docSnap => {
        performances.push(docSnap.data());
      });
      if (performances.length > 0) {
        callback(performances);
      }
    }, (error) => {
      console.warn('Real-time listener optredens melding (offline of rule fallback):', error.message);
    });
  } catch (err) {
    console.warn('Kon Firestore optredens real-time listener niet starten:', err);
    return () => {};
  }
}

