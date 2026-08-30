/**
 * Netlify Serverless Function: Poems Database Endpoint
 * Powered by Netlify Blobs (Centrale Cloud Database)
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

function isAuthorized(event) {
  const pinHeader = event.headers['x-studio-pin'] || event.headers['X-Studio-Pin'] || '';
  const serverPin = process.env.STUDIO_PIN || process.env.ADMIN_PIN || '';
  return Boolean(serverPin && pinHeader && String(pinHeader).trim() === String(serverPin).trim());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS };
  }

  try {
    const store = getStore(STORE_NAME);

    // 1. GET — Haal alle gedichten op (Publiek)
    if (event.httpMethod === 'GET') {
      const storedData = await store.get(POEMS_BLOB_KEY, { type: 'json' });
      const poems = Array.isArray(storedData) ? storedData : [];

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
      const payload = JSON.parse(event.body || '{}');
      const poem = payload.poem;

      if (!poem || !poem.title || !poem.id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ success: false, error: 'Ongeldige gedichtgegevens meegegeven.' })
        };
      }

      const existingData = await store.get(POEMS_BLOB_KEY, { type: 'json' });
      const currentPoems = Array.isArray(existingData) ? existingData : [];

      const existingIndex = currentPoems.findIndex(p => p.id === poem.id);
      let updatedPoems = [];

      if (existingIndex >= 0) {
        updatedPoems = [...currentPoems];
        updatedPoems[existingIndex] = poem;
      } else {
        updatedPoems = [poem, ...currentPoems];
      }

      await store.setJSON(POEMS_BLOB_KEY, updatedPoems);

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ success: true, poems: updatedPoems, message: 'Gedicht opgeslagen in database' })
      };
    }

    // 3. DELETE — Verwijderen van een gedicht
    if (event.httpMethod === 'DELETE') {
      const payload = JSON.parse(event.body || '{}');
      const id = payload.id;

      if (!id) {
        return {
          statusCode: 400,
          headers: HEADERS,
          body: JSON.stringify({ success: false, error: 'Geen gedicht ID opgegeven.' })
        };
      }

      const existingData = await store.get(POEMS_BLOB_KEY, { type: 'json' });
      const currentPoems = Array.isArray(existingData) ? existingData : [];
      const updatedPoems = currentPoems.filter(p => p.id !== id);

      await store.setJSON(POEMS_BLOB_KEY, updatedPoems);

      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ success: true, poems: updatedPoems, message: 'Gedicht verwijderd uit database' })
      };
    }

    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Methode niet toegestaan' })
    };
  } catch (err) {
    console.error('Database fout in Netlify Blobs:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Fout bij communicatie met database.' })
    };
  }
};
