function parseSafeJSON(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(cleaned);
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Gemini-API-Key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({ error: 'API-Key fehlt. Bitte trage deinen Gemini API-Key in der App ein.' });
  }

  const { lengthMin, lengthMax, timeMin, timeMax, effort, startLocation, startLat, startLon, profile, freeText, poiCandidates } = req.body;
  const sLat = parseFloat(startLat) || 51.1657;
  const sLon = parseFloat(startLon) || 10.4515;

  const systemPrompt = `
Du bist das Routing-Gehirn einer Navigations-App. Der Nutzer möchte eine Route planen.

Eingestellte Parameter des Nutzers:
- Gewünschte Länge: ${lengthMin || 5} bis ${lengthMax || 25} km
- Gewünschte Dauer/Zeit: ${timeMin || 60} bis ${timeMax || 240} Minuten (Bereich: 30 Min bis 10 Std)
- Gewünschte Anstrengung: ${effort || 'Mittel'} (Leicht / Mittel / Schwer)
- Aktueller Startpunkt: "${startLocation || 'Unbekannter Startort'}" (${sLat}, ${sLon})
- Aktuelles Profil: "${profile || 'Gravel'}"

Zusätzlicher Freitext-Wunsch des Nutzers:
"${freeText || ''}"

Kandidaten-Liste realer POIs in der Nähe des Startorts:
${JSON.stringify(poiCandidates || [])}

Deine Aufgabe:
1. Analysiere den Freitext und die Parameter. Bringe die gewünschte Länge (km) und die gewünschte Zeit in ein realistisches Verhältnis zur gewählten Aktivität.
2. Wähle aus den bereitgestellten realen POIs (Kandidaten-Liste) die passendsten 2 bis 5 POIs aus, die am besten zu dem Wunsch des Nutzers passen.
3. Sortiere sie in eine logische Reihenfolge für eine Rundtour, die am Startort beginnt und endet.
4. Verwende für die Wegpunkte EXAKT die Namen und Koordinaten aus der bereitgestellten POI-Kandidaten-Liste oder dem Startort.
5. Wähle das passende BRouter-Profil (z.B. "hiking" für schwere Wanderungen, "trekking" für leichte, "bicycle" für Radtouren).

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:
{
  "chat_reply": "Eine kurze Erklärung auf Deutsch, warum du diese Route passend zu den Filtern und dem Wunsch gewählt hast.",
  "brouter_profile": "hiking | bicycle | trekking",
  "semantic_waypoints": [
    { "name": "${startLocation}", "lat": ${sLat}, "lon": ${sLon}, "description": "Startpunkt" },
    { "name": "Name des gewählten POIs 1", "lat": 51.1850, "lon": 10.4620, "description": "Erklärung..." },
    { "name": "Name des gewählten POIs 2", "lat": 51.1920, "lon": 10.4710, "description": "Erklärung..." },
    { "name": "${startLocation}", "lat": ${sLat}, "lon": ${sLon}, "description": "Zielpunkt" }
  ]
}
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: `Gemini API returned ${response.status}: ${errText}` });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) {
      return res.status(500).json({ error: 'Empty response from Gemini API.' });
    }

    const routeData = parseSafeJSON(resultText);
    return res.status(200).json(routeData);
  } catch (error) {
    console.error('Error generating route in serverless function:', error);
    return res.status(500).json({ error: error.message });
  }
}
