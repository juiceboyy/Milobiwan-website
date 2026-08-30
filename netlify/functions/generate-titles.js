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

    const langName = language === 'sranan' ? 'Sranantongo' : (language === 'english' ? 'English' : (language === 'fusion' ? 'Sranantongo/Nederlands/Engels' : 'Nederlands'));
    const prompt = `Je bent de redactionele assistent van dichteres en spoken word artiest Milobiwan (Mieke).
Lees deze tekst (${langName}):
"""
${text.slice(0, 1500)}
"""

Bedenk 4 natuurlijke, krachtige en nuchtere titels.
Belangrijke regels:
- Houd titels KORT (meestal 1 tot 3 woorden, maximaal 4).
- GEEN overdreven literaire clichés of pompeuze komma-titels (zoals "Goudgele korrels, verborgen tijd" of "Het paradijs van...").
- Kies echte, herkenbare kernwoorden of een treffende zinsflard direct uit de tekst (bijv. specifieke herinneringen, voorwerpen, odo's of begrippen zoals "Het Erf", "Twee Knotjes", "Kwikwiba", "Droog Zand").
- Zorg voor 4 verschillende invalshoeken:
  1. Een direct sleutelbegrip (1 of 2 woorden).
  2. Een opvallend beeld of voorwerp uit de tekst.
  3. Een treffende korte zinsflard of gevoel uit de tekst.
  4. Een culturele of sferische titel.

Geef UITSLUITEND een JSON-array van 4 strings terug, bijv:
["Titel Een", "Titel Twee", "Titel Drie", "Titel Vier"]`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.3,
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
