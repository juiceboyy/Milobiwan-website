/**
 * Netlify Serverless Function: Verify Studio PIN
 * Validates against environment variable STUDIO_PIN / ADMIN_PIN
 */

exports.handler = async (event) => {
  // CORS & Content headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Methode niet toegestaan' })
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const submittedPin = String(payload.pin || '').trim();
    const envPin = String(process.env.STUDIO_PIN || process.env.ADMIN_PIN || '').trim();

    if (!envPin) {
      console.warn('STUDIO_PIN environment variabele is niet geconfigureerd.');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'STUDIO_PIN environment variabele ontbreekt op de server.'
        })
      };
    }

    if (submittedPin === envPin) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Pincode geverifieerd'
        })
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Onjuiste pincode'
      })
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Ongeldig verzoekformaat'
      })
    };
  }
};
