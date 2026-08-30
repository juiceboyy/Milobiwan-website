/**
 * Netlify Serverless Function: AI Multimodal OCR for Poems
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
    const { imageBase64, mimeType } = JSON.parse(event.body || '{}');

    if (!imageBase64) {
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

    // Haal base64 clean data op
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');

    const prompt = `Je bent een nauwkeurige OCR- en transcriptie-assistent voor poëzie en spoken word van Milobiwan.
Bekijk deze afbeelding van een gedicht/kaart.
Taken:
1. Extraheer de volledige gedichttekst exact zoals afgebeeld. Behoud alle strofen, witregels, verzen en interpunctie nauwkeurig.
2. Bedenk 4 beknopte, nuchtere titels (1-3 woorden) op basis van de tekst.
3. Detecteer de hoofdtaal (keuze uit: 'sranan', 'dutch', 'english', 'fusion').

Geef UITSLUITEND een geldig JSON-object terug in dit formaat (zonder markdown codeblocks):
{
  "text": "Exacte strofen en verzen...",
  "suggestedTitles": ["Titel 1", "Titel 2", "Titel 3", "Titel 4"],
  "language": "dutch",
  "authorTag": "Handtekening of auteur tag indien aanwezig"
}`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg'
              }
            }
          ]
        }
      ],
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
