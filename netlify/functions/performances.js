/**
 * Netlify Serverless Function: Performances Database Endpoint
 * Powered by Netlify Blobs (Centrale Cloud Database) with fail-safe fallback
 */

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'milobiwan-content';
const PERFORMANCES_BLOB_KEY = 'published-performances';

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-studio-pin',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

function getBlobStore() {
  try {
    const siteID = process.env.NETLIFY_BLOBS_SITE_ID || process.env.SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN || process.env.NETLIFY_AUTH_TOKEN;
    if (siteID && token) {
      return getStore({ name: STORE_NAME, siteID, token });
    }
    return getStore(STORE_NAME);
  } catch (err) {
    console.warn('Netlify Blobs niet geïnitialiseerd:', err.message);
    return null;
  }
}

function isAuthorized(event) {
  const pinHeader = (
    event.headers['x-studio-pin'] ||
    event.headers['X-Studio-Pin'] ||
    event.headers['x-studio-pin'.toLowerCase()] ||
    ''
  );
  const serverPin = process.env.STUDIO_PIN || process.env.ADMIN_PIN || '';
  if (!serverPin) return true;
  return Boolean(pinHeader && String(pinHeader).trim() === String(serverPin).trim());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS };
  }

  const store = getBlobStore();

  // 1. GET — Haal alle optredens op (Publiek & Veilig)
  if (event.httpMethod === 'GET') {
    let performances = [];
    if (store) {
      try {
        const storedData = await store.get(PERFORMANCES_BLOB_KEY, { type: 'json' });
        if (Array.isArray(storedData)) {
          performances = storedData;
        }
      } catch (blobErr) {
        console.warn('Fout bij lezen uit Netlify Blobs:', blobErr.message);
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...HEADERS,
        'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=300'
      },
      body: JSON.stringify({ success: true, performances })
    };
  }

  // Voor mutaties is PIN-autorisatie vereist
  if (!isAuthorized(event)) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Ongeautoriseerd: ongeldige studio pincode.' })
    };
  }

  // 2. POST — Toevoegen of bewerken van een optreden
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const performance = payload.performance;

      if (!performance || !performance.title || !performance.id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ success: false, error: 'Ongeldige optredengegevens meegegeven.' })
        };
      }

      let currentList = [];
      if (store) {
        try {
          const existingData = await store.get(PERFORMANCES_BLOB_KEY, { type: 'json' });
          if (Array.isArray(existingData)) {
            currentList = existingData;
          }
        } catch (readErr) {
          console.warn('Geen eerdere optredens in blobs gevonden:', readErr.message);
        }
      }

      const existingIndex = currentList.findIndex(p => p.id === performance.id);
      let updatedList = [];

      if (existingIndex >= 0) {
        updatedList = [...currentList];
        updatedList[existingIndex] = performance;
      } else {
        updatedList = [performance, ...currentList];
      }

      if (store) {
        try {
          await store.setJSON(PERFORMANCES_BLOB_KEY, updatedList);
        } catch (writeErr) {
          console.warn('Kon niet schrijven naar Netlify Blobs:', writeErr.message);
        }
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          performances: updatedList,
          message: 'Optreden opgeslagen in database'
        })
      };
    } catch (postErr) {
      console.error('Fout bij verwerken van POST:', postErr);
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ success: false, error: 'Fout bij opslaan: ' + postErr.message })
      };
    }
  }

  // 3. DELETE — Verwijderen van een optreden
  if (event.httpMethod === 'DELETE') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const id = payload.id;

      if (!id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ success: false, error: 'Geen optreden ID opgegeven.' })
        };
      }

      let currentList = [];
      if (store) {
        try {
          const existingData = await store.get(PERFORMANCES_BLOB_KEY, { type: 'json' });
          if (Array.isArray(existingData)) {
            currentList = existingData;
          }
        } catch (e) {
          console.warn(e.message);
        }
      }

      const updatedList = currentList.filter(p => p.id !== id);

      if (store) {
        try {
          await store.setJSON(PERFORMANCES_BLOB_KEY, updatedList);
        } catch (writeErr) {
          console.warn('Kon niet schrijven naar Netlify Blobs:', writeErr.message);
        }
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          performances: updatedList,
          message: 'Optreden verwijderd uit database'
        })
      };
    } catch (delErr) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ success: false, error: 'Fout bij verwijderen: ' + delErr.message })
      };
    }
  }

  return {
    statusCode: 405,
    headers: HEADERS,
    body: JSON.stringify({ success: false, error: 'Methode niet toegestaan' })
  };
};
