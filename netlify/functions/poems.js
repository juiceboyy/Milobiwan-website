/**
 * Netlify Serverless Function: Poems Database Endpoint
 * Powered by Netlify Blobs (Centrale Cloud Database) with fail-safe fallback
 */

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'milobiwan-content';
const POEMS_BLOB_KEY = 'published-poems';

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

  // 1. GET — Haal alle gedichten op (Publiek & Veilig)
  if (event.httpMethod === 'GET') {
    let poems = [];
    if (store) {
      try {
        const storedData = await store.get(POEMS_BLOB_KEY, { type: 'json' });
        if (Array.isArray(storedData)) {
          poems = storedData;
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
      body: JSON.stringify({ success: true, poems })
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

  // 2. POST — Toevoegen of bewerken van een gedicht
  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const poem = payload.poem;

      if (!poem || !poem.title || !poem.id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ success: false, error: 'Ongeldige gedichtgegevens meegegeven.' })
        };
      }

      let currentPoems = [];
      if (store) {
        try {
          const existingData = await store.get(POEMS_BLOB_KEY, { type: 'json' });
          if (Array.isArray(existingData)) {
            currentPoems = existingData;
          }
        } catch (readErr) {
          console.warn('Geen eerdere gedichten in blobs gevonden:', readErr.message);
        }
      }

      const existingIndex = currentPoems.findIndex(p => p.id === poem.id);
      let updatedPoems = [];

      if (existingIndex >= 0) {
        updatedPoems = [...currentPoems];
        updatedPoems[existingIndex] = poem;
      } else {
        updatedPoems = [poem, ...currentPoems];
      }

      if (store) {
        try {
          await store.setJSON(POEMS_BLOB_KEY, updatedPoems);
        } catch (writeErr) {
          console.warn('Kon niet schrijven naar Netlify Blobs:', writeErr.message);
        }
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          poems: updatedPoems,
          message: 'Gedicht opgeslagen in database'
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

  // 3. DELETE — Verwijderen van een gedicht
  if (event.httpMethod === 'DELETE') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const id = payload.id;

      if (!id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ success: false, error: 'Geen gedicht ID opgegeven.' })
        };
      }

      let currentPoems = [];
      if (store) {
        try {
          const existingData = await store.get(POEMS_BLOB_KEY, { type: 'json' });
          if (Array.isArray(existingData)) {
            currentPoems = existingData;
          }
        } catch (e) {
          console.warn(e.message);
        }
      }

      const updatedPoems = currentPoems.filter(p => p.id !== id);

      if (store) {
        try {
          await store.setJSON(POEMS_BLOB_KEY, updatedPoems);
        } catch (writeErr) {
          console.warn('Kon niet schrijven naar Netlify Blobs:', writeErr.message);
        }
      }

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          poems: updatedPoems,
          message: 'Gedicht verwijderd uit database'
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
