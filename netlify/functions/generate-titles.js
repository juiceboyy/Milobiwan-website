/**
 * Netlify Serverless Function: AI Poetic Title Suggestions
 * Powered by Google Gemini 2.5 Flash
 */

const { GoogleGenAI } = require('@google/genai');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-studio-pin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Methode niet toegestaan' })
    };
  }

  if (!isAuthorized(event)) {
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ success: false, error: 'Ongeautoriseerd: ongeldige studio pincode.' })
    };
  }

  try {
    const { text, language, theme } = JSON.parse(event.body || '{}');

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ success: false, error: 'Onvoldoende tekst om titelsuggesties te genereren.' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is niet ingesteld. Lokale heuristische titels worden gebruikt.');
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          titles: generateFallbackTitles(text, language, theme),
          source: 'heuristic'
        })
      };
    }

    // Google Gemini 2.5 Flash API Initialisatie
    const ai = new GoogleGenAI({ apiKey });

    const langName = language === 'sranan' ? 'Sranantongo' : (language === 'english' ? 'English' : (language === 'fusion' ? 'Sranantongo/Dutch/English Fusion' : 'Nederlands'));
    const prompt = `Je bent een poëtische assistent voor Milobiwan (Mieke), een Surinaams-Nederlandse dichteres en spoken word artiest.
Analyseer onderstaande gedichttekst geschreven in ${langName} met als thema "${theme || 'Algemeen'}".

Gedicht:
"""
${text.slice(0, 1500)}
"""

Verzin 4 krachtige, poëtische en stijlvolle titels voor dit werk in de taal ${langName}.
Geef uitsluitend een geldige JSON-array terug van 4 strings, zonder markdown codeblocks of extra tekst.
Voorbeeld formaat:
["Titel 1", "Titel 2", "Titel 3", "Titel 4"]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    let titles = [];

    try {
      titles = JSON.parse(responseText);
    } catch {
      // Fallback regex extractie
      const matches = responseText.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
      if (matches) {
        titles = matches.map(m => m.replace(/^"|"$/g, '').trim()).filter(Boolean).slice(0, 4);
      }
    }

    if (!Array.isArray(titles) || titles.length === 0) {
      titles = generateFallbackTitles(text, language, theme);
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ success: true, titles: titles.slice(0, 4), source: 'gemini' })
    };
  } catch (err) {
    console.error('Fout bij genereren van titels via Gemini:', err);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        success: true,
        titles: generateFallbackTitles(text, language, theme),
        source: 'heuristic-fallback'
      })
    };
  }
};

function generateFallbackTitles(text, lang, theme) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2 && !l.startsWith('#'));
  const firstLine = lines[0] || 'Woorden met Wortels';
  const cleanFirst = firstLine.replace(/^[^\w\s]+|[^\w\s]+$/g, '').slice(0, 32);

  if (lang === 'sranan') {
    return [
      cleanFirst,
      `Krakti fu ${theme || 'a Sten'}`,
      'Dipi Rutu',
      'Firi a Faya'
    ];
  } else if (lang === 'english') {
    return [
      cleanFirst,
      `Echoes of ${theme || 'Memory'}`,
      'Whispers in the Dark',
      'The River Remembers'
    ];
  }
  return [
    cleanFirst,
    `Ritme van ${theme || 'de Diaspora'}`,
    'Tussen Drie Werelden',
    'Woorden met Wortels'
  ];
}
