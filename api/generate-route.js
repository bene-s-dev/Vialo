export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set on Vercel.' });
  }

  const { lengthMin, lengthMax, timeMin, timeMax, effort, startLocation, profile, freeText } = req.body;

  const systemPrompt = `
Du bist das Routing-Gehirn einer Navigations-App. Der Nutzer möchte eine Route planen.

Eingestellte Parameter des Nutzers:
- Gewünschte Länge: ${lengthMin || 5} bis ${lengthMax || 25} km
- Gewünschte Dauer/Zeit: ${timeMin || 60} bis ${timeMax || 240} Minuten (Bereich: 30 Min bis 10 Std)
- Gewünschte Anstrengung: ${effort || 'Mittel'} (Leicht / Mittel / Schwer)
- Aktueller Startpunkt: "${startLocation || 'Unbekannter Startort'}"
- Aktuelles Profil: "${profile || 'Gravel'}"

Zusätzlicher Freitext-Wunsch des Nutzers:
"${freeText || ''}"

Deine Aufgabe:
1. Analysiere den Freitext und die Parameter. Bringe die gewünschte Länge (km) und die gewünschte Zeit in ein realistisches Verhältnis zur gewählten Aktivität (z. B. schafft man beim Wandern in 2 Stunden ca. 8–10 km, beim Fahrradfahren eher 25–35 km). Passe die Route so an, dass beide Regler-Werte logisch erfüllt werden.
2. Wähle 3 bis 5 logische Zwischenstationen (POIs, Parks, Sehenswürdigkeiten) aus, die zusammen mit dem Start- und Zielpunkt eine passende Runde ergeben.
3. Wenn die Anstrengung "Leicht" ist, meide steile Berge. Wenn sie "Schwer" ist, plane gerne Aussichtspunkte auf Bergen ein.
4. Verwende im Array "semantic_waypoints" nur reale Ortsnamen inklusive Stadt/Region (z.B. "Schlossberg, Freiburg"). Keine Geokoordinaten!
5. Wähle das passende BRouter-Profil (z.B. "hiking" für schwere Wanderungen, "trekking" für leichte, "bicycle" für Radtouren).

Antworte AUSSCHLIESSLICH im folgenden JSON-Format:
{
  "chat_reply": "Eine kurze Erklärung auf Deutsch, warum du diese Route passend zu den Filtern (Länge, Zeit, Anstrengung) und dem Wunsch gewählt hast.",
  "brouter_profile": "hiking | bicycle | trekking",
  "semantic_waypoints": ["Startort", "POI 1", "POI 2", "Startort"]
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

    const routeData = JSON.parse(resultText.trim());
    return res.status(200).json(routeData);
  } catch (error) {
    console.error('Error generating route in serverless function:', error);
    return res.status(500).json({ error: error.message });
  }
}
