const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 51779; // Match exact port used by the system dev server!

// Load local .env files if they exist
const envPaths = ['.env', '.env.local', '.env.development.local'];
for (const envPath of envPaths) {
  const fullPath = path.join(__dirname, envPath);
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split('=');
          const key = parts[0].trim();
          const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
          if (key) {
            process.env[key] = value;
          }
        }
      });
      console.log(`Loaded environment variables from ${envPath}`);
    } catch (e) {
      console.warn(`Failed to read env file ${envPath}:`, e);
    }
  }
}

function parseSafeJSON(str) {
  let cleaned = str.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(cleaned);
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Gemini-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Route: /api/generate-route
  if (pathname === '/api/generate-route' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const apiKey = req.headers['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API-Key fehlt. Bitte trage deinen Gemini API-Key in der App ein.' }));
          return;
        }

        const { lengthMin, lengthMax, timeMin, timeMax, effort, startLocation, startLat, startLon, profile, freeText, poiCandidates } = payload;
        const sLat = parseFloat(startLat) || 51.1657;
        const sLon = parseFloat(startLon) || 10.4515;

        // Mock response if key is mock-key
        if (apiKey === 'mock-key') {
          const city = startLocation.split(',')[0].trim();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            "chat_reply": `[Mock] Eine schöne ${effort.toLowerCase()}e Route rund um "${city}".`,
            "brouter_profile": profile === 'hiking' ? 'hiking' : 'trekking',
            "semantic_waypoints": [
              { "name": startLocation, "lat": sLat, "lon": sLon, "description": "Startort" },
              { "name": `Aussichtspunkt, ${city}`, "lat": sLat + 0.015, "lon": sLon + 0.015, "description": "Schöner Aussichtspunkt" },
              { "name": startLocation, "lat": sLat, "lon": sLon, "description": "Zielort" }
            ]
          }));
          return;
        }

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

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(geminiUrl, {
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
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Gemini API returned ${response.status}: ${errText}` }));
          return;
        }

        const geminiData = await response.json();
        const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!resultText) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Empty response from Gemini API.' }));
          return;
        }

        const routeData = parseSafeJSON(resultText);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(routeData));
      } catch (err) {
        console.error('Error proxying to Gemini:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Safe path check to prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`NaviApp Server running at http://127.0.0.1:${PORT}`);
});
