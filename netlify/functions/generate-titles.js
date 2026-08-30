/**
 * Netlify Serverless Function: AI Poetic Title Suggestions & Auto Language Detection
 * Powered by Google Gemini 2.5 Flash
 */

const { GoogleGenAI } = require('@google/genai');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, x-studio-pin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    const { text, theme } = JSON.parse(event.body || '{}');

    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ success: false, error: 'Onvoldoende tekst om titelsuggesties te genereren.' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is niet ingesteld. Lokale heuristische detectie wordt gebruikt.');
      const detectedLang = detectLanguageHeuristic(text);
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: true,
          language: detectedLang,
          titles: generateFallbackTitles(text, detectedLang, theme),
          source: 'heuristic'
        })
      };
    }

    // Google Gemini 2.5 Flash API Initialisatie
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Je bent de redactionele assistent van dichteres en spoken word artiest Milobiwan (Mieke).
Analyseer de volgende voordrachttekst:
"""
${text.slice(0, 1500)}
"""

Taak:
1. Bepaal in welke taal deze tekst hoofdzakelijk is geschreven. Kies strikt uit:
   - "sranan" (voor Sranantongo)
   - "dutch" (voor Nederlands)
   - "english" (voor Engels)
   - "fusion" (voor een bewuste mix van talen, meertalig of fusion)
2. Bedenk 4 natuurlijke, krachtige en nuchtere titels in de taal van het gedicht.
   Regels voor de titels:
   - Houd titels KORT (1 tot 3 woorden, maximaal 4).
   - GEEN overdreven clichés of pompeuze komma-constructies.
   - Kies echte kernwoorden, voorwerpen, odo's of treffende zinsflarden direct uit de tekst.

Geef UITSLUITEND een JSON-object terug in dit formaat:
{
  "language": "english",
  "titles": ["Titel Een", "Titel Twee", "Titel Drie", "Titel Vier"]
}`;

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '';
    let parsed = null;

    try {
      parsed = JSON.parse(responseText);
    } catch {
      // Fallback
    }

    let detectedLang = 'sranan';
    let titles = [];

    if (parsed && typeof parsed === 'object') {
      if (['sranan', 'dutch', 'english', 'fusion'].includes(parsed.language)) {
        detectedLang = parsed.language;
      }
      if (Array.isArray(parsed.titles) && parsed.titles.length > 0) {
        titles = parsed.titles.map(t => String(t).trim()).filter(Boolean).slice(0, 4);
      }
    }

    if (titles.length === 0) {
      detectedLang = detectLanguageHeuristic(text);
      titles = generateFallbackTitles(text, detectedLang, theme);
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        success: true,
        language: detectedLang,
        titles: titles.slice(0, 4),
        source: 'gemini'
      })
    };
  } catch (err) {
    console.error('Fout bij genereren van titels en taaldetectie via Gemini:', err);
    const body = JSON.parse(event.body || '{}');
    const detectedLang = detectLanguageHeuristic(body.text || '');
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        success: true,
        language: detectedLang,
        titles: generateFallbackTitles(body.text || '', detectedLang, body.theme),
        source: 'heuristic-fallback'
      })
    };
  }
};

function detectLanguageHeuristic(text) {
  const lower = text.toLowerCase();
  const englishWords = ['the', 'and', 'with', 'for', 'you', 'world', 'wait', 'breeze', 'wings', 'life', 'get', 'from', 'this', 'that'];
  const srananWords = ['mi', 'yu', 'fu', 'den', 'na', 'te', 'kon', 'wan', 'krakti', 'faya', 'sranan', 'sten', 'wortu'];
  const dutchWords = ['de', 'het', 'een', 'en', 'van', 'in', 'is', 'op', 'te', 'met', 'voor', 'niet', 'maar', 'als'];

  let enCount = 0, srCount = 0, nlCount = 0;
  const words = lower.split(/\W+/);
  words.forEach(w => {
    if (englishWords.includes(w)) enCount++;
    if (srananWords.includes(w)) srCount++;
    if (dutchWords.includes(w)) nlCount++;
  });

  if (srCount > 0 && nlCount > 0 && Math.abs(srCount - nlCount) < 3) return 'fusion';
  if (enCount > nlCount && enCount > srCount) return 'english';
  if (srCount > nlCount && srCount > enCount) return 'sranan';
  if (nlCount > enCount && nlCount > srCount) return 'dutch';
  return 'sranan';
}

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
