/**
 * Netlify Serverless Function: AI Multimodal OCR for Poems & Multi-Page Documents
 * Powered by Google Gemini Vision
 */

const { GoogleGenAI } = require('@google/genai');

const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
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
    const { imageBase64, imagesBase64, mimeType } = JSON.parse(event.body || '{}');

    const imageList = Array.isArray(imagesBase64) && imagesBase64.length > 0
      ? imagesBase64
      : (imageBase64 ? [imageBase64] : []);

    if (imageList.length === 0) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ success: false, error: 'Geen afbeeldingsdata ontvangen.' })
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'GEMINI_API_KEY ontbreekt in Environment Variables.'
        })
      };
    }

    const ai = new GoogleGenAI({ apiKey });
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const prompt = `Je bent een nauwkeurige OCR- en transcriptie-assistent voor poëzie en spoken word van Milobiwan.
Bekijk de pagina's van dit gedicht/document (${imageList.length} pagina${imageList.length > 1 ? '\'s' : ''}).
Taken:
1. Extraheer de volledige tekst van alle pagina's in chronologische volgorde en voeg ze samen tot één compleet gedicht. Behoud alle strofen, witregels, verzen en interpunctie nauwkeurig.
2. Bedenk 4 beknopte, nuchtere titels (1-3 woorden) in de taal van het gedicht.
3. Detecteer de hoofdtaal (keuze uit: 'sranan', 'dutch', 'english', 'fusion').

Geef UITSLUITEND een geldig JSON-object terug in dit formaat (zonder markdown codeblocks):
{
  "text": "Exacte samengevoegde strofen en verzen van alle pagina's...",
  "suggestedTitles": ["Titel 1", "Titel 2", "Titel 3", "Titel 4"],
  "language": "dutch",
  "authorTag": "Handtekening of auteur tag indien aanwezig"
}`;

    const parts = [{ text: prompt }];

    imageList.forEach((img, idx) => {
      const cleanData = img.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
      if (imageList.length > 1) {
        parts.push({ text: `Pagina ${idx + 1} van ${imageList.length}:` });
      }
      parts.push({
        inlineData: {
          data: cleanData,
          mimeType: mimeType || 'image/jpeg'
        }
      });
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    });

    const responseText = response.text || '{}';
    let result = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { text: responseText, suggestedTitles: [], language: 'dutch' };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        success: true,
        data: result
      })
    };
  } catch (err) {
    console.error('OCR fout via Gemini:', err);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        success: false,
        error: 'OCR verwerking mislukt: ' + (err.message || 'Onbekende fout')
      })
    };
  }
};
