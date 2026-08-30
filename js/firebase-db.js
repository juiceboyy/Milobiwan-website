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
      ...poem,
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
 * Haalt alle optredens op uit Firestore
 */
export async function getPerformancesFromFirestore() {
  if (!db) return [];
  try {
    const q = query(collection(db, PERFORMANCES_COLLECTION));
    const snapshot = await getDocs(q);
    const performances = [];
    snapshot.forEach(docSnap => {
      performances.push(docSnap.data());
    });
    return performances;
  } catch (err) {
    console.error('Fout bij ophalen optredens uit Firestore:', err);
    throw err;
  }
}

/**
 * Slaat een optreden op in Firestore (toevoegen of bewerken)
 */
export async function savePerformanceToFirestore(perf) {
  if (!db) throw new Error('Firestore database is niet geïnitialiseerd.');
  try {
    const docRef = doc(db, PERFORMANCES_COLLECTION, perf.id);
    const dataToSave = {
      ...perf,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, dataToSave);
    return { success: true, performance: dataToSave };
  } catch (err) {
    console.error('Fout bij opslaan optreden in Firestore:', err);
    throw err;
  }
}

/**
 * Verwijdert een optreden uit Firestore
 */
export async function deletePerformanceFromFirestore(id) {
  if (!db) throw new Error('Firestore database is niet geïnitialiseerd.');
  try {
    const docRef = doc(db, PERFORMANCES_COLLECTION, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.error('Fout bij verwijderen optreden uit Firestore:', err);
    throw err;
  }
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
      callback(performances);
    }, (error) => {
      console.warn('Real-time listener optredens fout (mogelijk offline):', error);
    });
  } catch (err) {
    console.warn('Kon Firestore optredens real-time listener niet starten:', err);
    return () => {};
  }
}

