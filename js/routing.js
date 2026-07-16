/**
 * Routing Module for NaviApp
 * Interfaces with OpenRouteService for directions & surface details
 * and Nominatim (OpenStreetMap) for geocoding address search.
 */
import { generateBRouterProfile } from './brouter_profiles.js';

// Mapping of OpenRouteService surface codes to human-readable names and colors
const SURFACE_MAPPING = {
  0: { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' },
  1: { name: 'Asphalt', color: '#636366', category: 'paved' },
  2: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
  3: { name: 'Asphalt', color: '#636366', category: 'paved' },
  4: { name: 'Asphalt', color: '#636366', category: 'paved' },
  5: { name: 'Asphalt', color: '#636366', category: 'paved' },
  6: { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' },
  7: { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' },
  8: { name: 'Schotter', color: '#D97736', category: 'gravel' },
  9: { name: 'Schotter', color: '#D97736', category: 'gravel' },
  10: { name: 'Schotter', color: '#D97736', category: 'gravel' },
  11: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
  12: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
  13: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
  14: { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' },
  15: { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' },
  16: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
  17: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
  18: { name: 'Asphalt', color: '#636366', category: 'paved' },
  19: { name: 'Schotter', color: '#D97736', category: 'gravel' },
  20: { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' }
};

export const Routing = {
  /**
   * Normalizes path surface tags using heuristic plausibility rules to correct OSM mis-tags.
   * @param {Object} segment 
   * @returns {Object} segment
   */
  normalizePathSurface(segment) {
    const highway = segment.highway || '';
    const surface = segment.surface || 'unbekannt';
    const tracktype = segment.tracktype || '';
    
    let effective = surface;
    let corrected = false;

    // Rule 1: WENN highway in ['path', 'footway', 'cycleway'] UND surface == 'asphalt' -> Setze effective_surface auf 'gravel/unpaved'
    if ((highway === 'path' || highway === 'footway' || highway === 'cycleway') && surface === 'asphalt') {
      effective = 'gravel/unpaved';
      corrected = true;
    }
    // Rule 2: WENN tracktype in ['grade3', 'grade4', 'grade5'] UND surface == 'asphalt' -> Setze effective_surface auf 'gravel/unpaved'
    else if ((tracktype === 'grade3' || tracktype === 'grade4' || tracktype === 'grade5') && surface === 'asphalt') {
      effective = 'gravel/unpaved';
      corrected = true;
    }
    // Rule 3: WENN highway == 'track' UND surface == 'unpaved' -> Setze effective_surface auf 'gravel'
    else if (highway === 'track' && (surface === 'unpaved' || surface === 'unbekannt' || surface === '' || surface === 'ground' || surface === 'dirt')) {
      effective = 'gravel';
      corrected = true;
    }

    segment.effective_surface = effective;
    if (corrected) {
      segment.is_osm_corrected = true;
    }
    return segment;
  },

  /**
   * Searches for addresses using Nominatim API (Keyless)
   * @param {string} query 
   * @returns {Promise<Array>} List of locations { name, lat, lon }
   */
  async searchAddress(query, viewbox = null, bounded = false) {
    if (!query || query.trim().length < 3) return [];

    let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=de,fr,ch,at,be,nl,lu,dk`;
    if (viewbox) {
      url += `&viewbox=${viewbox}`;
      if (bounded) {
        url += `&bounded=1`;
      }
    }
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'de,en',
          'User-Agent': 'NaviApp-Client' // required by Nominatim usage policy
        }
      });
      if (!response.ok) throw new Error('Nominatim returned error ' + response.status);
      const data = await response.json();
      
      return data.map(item => ({
        name: this.formatAddress(item),
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      }));
    } catch (e) {
      console.error('Nominatim Geocode Error:', e);
      return [];
    }
  },

  /**
   * Formats Nominatim address object into a clean, human-readable short string
   * @param {Object} item Nominatim result item
   * @returns {string} Cleaned address name
   */
  formatAddress(item) {
    const addr = item.address;
    if (!addr) return item.display_name;

    const place = addr.city || addr.town || addr.village || addr.hamlet || addr.suburb || addr.municipality || addr.county;
    const road = addr.road || addr.pedestrian || addr.footway || addr.path;
    const houseNo = addr.house_number;
    
    let mainName = '';
    if (road) {
      mainName = houseNo ? `${road} ${houseNo}` : road;
      if (place) mainName += `, ${place}`;
    } else if (place) {
      mainName = place;
    } else {
      mainName = item.name || addr.neighbourhood || item.display_name.split(',')[0];
    }

    const contextParts = [];
    if (addr.postcode) {
      contextParts.push(addr.postcode);
    }
    if (addr.country_code) {
      contextParts.push(addr.country_code.toUpperCase());
    } else if (addr.country) {
      contextParts.push(addr.country);
    }

    if (contextParts.length > 0) {
      return `${mainName} (${contextParts.join(', ')})`;
    }
    return mainName;
  },

  /**
   * Performs reverse geocoding via Nominatim API
   * @param {number} lat Latitude
   * @param {number} lon Longitude
   * @returns {Promise<string>} Formatted address or coordinate string as fallback
   */
  async reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1&accept-language=de,en`;
    try {
      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'de,en',
          'User-Agent': 'NaviApp-Client'
        }
      });
      if (!response.ok) throw new Error('Nominatim reverse returned error ' + response.status);
      const data = await response.json();
      return this.formatAddress(data);
    } catch (e) {
      console.error('Nominatim Reverse Geocode Error:', e);
      return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    }
  },

  /**
   * Main routing coordinator. Chooses BRouter or OpenRouteService based on selected engine.
   * @param {Array<Object>} points Array of points [{lat, lon/lng}]
   * @param {string} profile Profile name
   * @param {string} engine 'brouter' or 'ors'
   * @param {string} apiKey ORS API Key
   * @param {Object} options BRouter options
   * @returns {Promise<Object>} Unified route object
   */
  async getRoute(points, profile, engine = 'brouter', apiKey = null, options = null) {
    if (engine === 'ors') {
      return this.getRouteORS(points, profile, apiKey);
    } else {
      return this.getRouteBRouter(points, profile, options);
    }
  },

  /**
   * Fetches route from BRouter API in CSV format to get surface information per coordinate
   */
  async getRouteBRouter(points, profile, options = null) {
    try {
      if (!points || points.length < 2) {
        throw new Error('Mindestens Start- und Endpunkt benötigt.');
      }
    
    const lonlats = points.map(pt => {
      const lon = pt.lon !== undefined ? pt.lon : pt.lng;
      return `${lon},${pt.lat}`;
    }).join('|');

    let response;
    
    // If we have options, generate custom profile and POST it
    if (options) {
      options.profile = profile;
      const customProfileText = generateBRouterProfile(options);
      const url = `https://brouter.de/brouter?lonlats=${encodeURIComponent(lonlats)}&profile=custom&alternativeidx=0&format=csv`;
      
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: customProfileText
        });
      } catch (err) {
        console.error('Failed to fetch BRouter custom profile route:', err);
      }
    }

    // Fallback: if we didn't use options, or the custom profile POST failed, fetch using standard GET profile
    if (!response || !response.ok) {
      console.warn('Falling back to standard BRouter GET request...');
      const url = `https://brouter.de/brouter?lonlats=${encodeURIComponent(lonlats)}&profile=${profile === 'foot-hiking' ? 'hiking' : (profile === 'cycling-road' ? 'fastbike' : 'trekking')}&alternativeidx=0&format=csv`;
      response = await fetch(url);
    }

    if (!response.ok) {
      throw new Error(`BRouter meldet Fehler ${response.status}`);
    }

    const csvText = await response.text();
    const parsed = this.parseBRouterCSV(csvText);
    if (!parsed) {
      throw new Error('BRouter Route konnte nicht geparst werden.');
    }

      const surfaceDistances = {};

      for (const seg of parsed.segments) {
        this.normalizePathSurface(seg);
        const segDist = seg.distance / 1000;
        const details = getSurfaceDetails(seg.effective_surface || seg.surface);
        const name = details.name;
        if (!surfaceDistances[name]) {
          surfaceDistances[name] = {
            distance: 0,
            color: details.color
          };
        }
        surfaceDistances[name].distance += segDist;
      }

      const surfacesSummary = Object.keys(surfaceDistances).map(name => {
        const data = surfaceDistances[name];
        const pct = parsed.stats.distance > 0 ? Math.round((data.distance / parsed.stats.distance) * 100) : 0;
        return {
          name: name,
          pct: pct,
          color: data.color,
          distance: data.distance
        };
      }).sort((a, b) => b.distance - a.distance);

      const geojson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: parsed.coordinates
            },
            properties: {
              'track-length': parsed.stats.distance * 1000,
              'total-time': parsed.stats.duration,
              'elevation-gain': parsed.stats.elevationGain,
              'elevation-loss': parsed.stats.elevationLoss
            }
          }
        ]
      };

      return {
        geojson: geojson,
        stats: parsed.stats,
        steps: [
          {
            instruction: 'Folge der berechneten Route',
            distance: parsed.stats.distance * 1000,
            way_points: [0, parsed.coordinates.length - 1]
          }
        ],
        coordinates: parsed.coordinates,
        segments: parsed.segments,
        surfaces: surfacesSummary
      };
    } catch (e) {
      console.error('BRouter Route Error:', e);
      throw e;
    }
  },

  /**
   * Parses BRouter CSV (TSV) response into structured coordinates and segment attributes
   */
  parseBRouterCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return null;
    
    const header = lines[0].split('\t');
    const lonIdx = header.indexOf('Longitude');
    const latIdx = header.indexOf('Latitude');
    const eleIdx = header.indexOf('Elevation');
    const distIdx = header.indexOf('Distance');
    const timeIdx = header.indexOf('Time');
    const energyIdx = header.indexOf('Energy');
    const tagsIdx = header.indexOf('WayTags') !== -1 ? header.indexOf('WayTags') : header.indexOf('OSM-Tags');

    if (lonIdx === -1 || latIdx === -1) {
      throw new Error('Ungültiges BRouter CSV Format: Koordinaten fehlen.');
    }

    const coordinates = [];
    const segments = [];
    
    let totalDistanceMeters = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let prevEle = null;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split('\t');
      if (row.length < header.length) continue;

      const lon = parseFloat(row[lonIdx]) / 1000000;
      const lat = parseFloat(row[latIdx]) / 1000000;
      const ele = eleIdx !== -1 ? parseFloat(row[eleIdx]) : null;

      coordinates.push([lon, lat, ele]);

      const dist = distIdx !== -1 ? parseFloat(row[distIdx]) : 0;
      const time = timeIdx !== -1 ? parseFloat(row[timeIdx]) : 0;
      const energy = energyIdx !== -1 ? parseFloat(row[energyIdx]) : 0;
      const tags = tagsIdx !== -1 ? row[tagsIdx] : '';

      totalDistanceMeters += dist;

      let surface = 'unbekannt';
      let highway = 'unbekannt';
      let tracktype = '';
      if (tags) {
        const pairs = tags.trim().split(/[\s,;]+/);
        for (const p of pairs) {
          const parts = p.split('=');
          if (parts[0] === 'surface') {
            surface = parts[1] || 'unbekannt';
          } else if (parts[0] === 'highway') {
            highway = parts[1] || 'unbekannt';
          } else if (parts[0] === 'tracktype') {
            tracktype = parts[1] || '';
          }
        }
      }

      segments.push({
        lat: lat,
        lon: lon,
        ele: ele,
        distance: dist,
        time: time,
        energy: energy,
        surface: surface,
        highway: highway,
        tracktype: tracktype
      });

      if (ele !== null) {
        if (prevEle !== null) {
          const diff = ele - prevEle;
          if (diff > 0) elevationGain += diff;
          else elevationLoss += Math.abs(diff);
        }
        prevEle = ele;
      }
    }

    if (segments.length === 0) return null;

    const lastSeg = segments[segments.length - 1];
    return {
      coordinates,
      segments,
      stats: {
        distance: totalDistanceMeters / 1000,
        duration: lastSeg.time,
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
        energyKcal: Math.round(lastSeg.energy * 0.000239006)
      }
    };
  },

  /**
   * Fetches route from OpenRouteService (requires API Key)
   */
  async getRouteORS(points, profile, apiKey) {
    if (!apiKey) {
      throw new Error('API_KEY_MISSING');
    }

    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;
    
    const lonlats = points.map(pt => {
      const lon = pt.lon !== undefined ? pt.lon : pt.lng;
      return [lon, pt.lat];
    });
    
    const body = {
      coordinates: lonlats,
      elevation: true,
      extra_info: ['surface', 'waytype']
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify(body)
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('API_KEY_INVALID');
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || `Fehler ${response.status}`;
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('Keine Route zwischen diesen Punkten gefunden.');
      }

      const feature = data.features[0];
      const properties = feature.properties;
      const segment = properties.segments[0];
      const coordinates = feature.geometry.coordinates;

      let totalAscent = 0;
      let totalDescent = 0;
      let prevEle = null;

      coordinates.forEach(coord => {
        if (coord.length >= 3) {
          const ele = coord[2];
          if (prevEle !== null) {
            const diff = ele - prevEle;
            if (diff > 0) totalAscent += diff;
            else totalDescent += Math.abs(diff);
          }
          prevEle = ele;
        }
      });

      const surfacesInfo = this.parseSurfaces(properties.extras?.surface, segment.distance, coordinates);

      // Build ORS segments for coordinate-level surface coloring
      const segments = [];
      const surfaceValues = properties.extras?.surface?.values || [];
      
      for (let i = 0; i < coordinates.length; i++) {
        const coord = coordinates[i];
        let surfaceName = 'unbekannt';
        const match = surfaceValues.find(([start, end]) => i >= start && i <= end);
        if (match) {
          const code = match[2];
          const mapping = SURFACE_MAPPING[code] || SURFACE_MAPPING[0];
          surfaceName = mapping.name;
        }
        
        segments.push({
          lat: coord[1],
          lon: coord[0],
          surface: surfaceName
        });
      }

      return {
        geojson: feature,
        stats: {
          distance: segment.distance / 1000,
          duration: segment.duration,
          elevationGain: Math.round(totalAscent),
          elevationLoss: Math.round(totalDescent)
        },
        steps: segment.steps || [
          {
            instruction: 'Folge der berechneten Route',
            distance: segment.distance,
            way_points: [0, coordinates.length - 1]
          }
        ],
        coordinates: coordinates,
        segments: segments,
        surfaces: surfacesInfo
      };
    } catch (e) {
      console.error('ORS Route Error:', e);
      throw e;
    }
  },

  /**
   * Parses ORS surface extra info list and maps indices to real coordinates
   */
  parseSurfaces(surfaceExtra, totalDistance, coordinates) {
    if (!surfaceExtra || !surfaceExtra.values) {
      return [{ name: 'Unbekannt', pct: 100, color: '#8E8E93' }];
    }

    const values = surfaceExtra.values;
    const distanceSegments = [];

    // Calculate length of each segment to represent percentages
    values.forEach(([startIndex, endIndex, code]) => {
      let segmentDistance = 0;
      for (let i = startIndex; i < endIndex; i++) {
        const c1 = coordinates[i];
        const c2 = coordinates[i+1];
        segmentDistance += this.calculateHaversine(c1[1], c1[0], c2[1], c2[0]);
      }
      
      const mapping = SURFACE_MAPPING[code] || SURFACE_MAPPING[0];
      distanceSegments.push({
        name: mapping.name,
        color: mapping.color,
        category: mapping.category,
        distance: segmentDistance
      });
    });

    // Group segments by category/name to get aggregate percentages
    const aggregate = {};
    let totalLengthCalculated = 0;

    distanceSegments.forEach(seg => {
      const key = seg.name;
      if (!aggregate[key]) {
        aggregate[key] = {
          name: seg.name,
          color: seg.color,
          category: seg.category,
          distance: 0
        };
      }
      aggregate[key].distance += seg.distance;
      totalLengthCalculated += seg.distance;
    });

    // Compute percentages
    const result = Object.values(aggregate).map(item => {
      const pct = totalLengthCalculated > 0 ? (item.distance / totalLengthCalculated) * 100 : 0;
      return {
        name: item.name,
        color: item.color,
        category: item.category,
        distance: item.distance / 1000, // in km
        pct: Math.round(pct)
      };
    });

    // Sort descending by percentage
    return result.sort((a, b) => b.pct - a.pct);
  },

  /**
   * Helper: Calculates the distance in meters between two coordinates
   */
  calculateHaversine(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  },

  /**
   * Reverse geocodes coordinates to a clean address using Nominatim
   */
  async reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=de,en`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'NaviApp-Client'
        }
      });
      if (!response.ok) throw new Error('Nominatim reverse failed');
      const data = await response.json();
      return this.formatAddress(data) || data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch (e) {
      console.error('Reverse Geocode Error:', e);
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  },

  /**
   * Communicates with Gemini API to generate route waypoints and details
   */
  async generateMagicTrackRoute(params) {
    // 1. Try to call Vercel serverless function
    try {
      const response = await fetch('/api/generate-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (response.ok) {
        return await response.json();
      }
      console.warn('Vercel serverless endpoint failed with status:', response.status);
    } catch (e) {
      console.warn('Vercel serverless function not available, trying client-side fallback...', e);
    }

    // 2. Client-side fallback (for local development or if not hosted on Vercel yet)
    let localKey = localStorage.getItem('naviapp_gemini_api_key');
    if (!localKey) {
      localKey = prompt('Bitte gib deinen Gemini API-Key für die lokale Ausführung ein:');
      if (!localKey) throw new Error('Gemini API-Key fehlt. Erstellung abgebrochen.');
      localStorage.setItem('naviapp_gemini_api_key', localKey);
    }

    return await this.callGeminiClientSide(params, localKey);
  },

  /**
   * Directly queries Gemini API from the client (fallback mode)
   */
  async callGeminiClientSide(params, apiKey) {
    const { lengthMin, lengthMax, timeMin, timeMax, effort, startLocation, profile, freeText } = params;

    if (apiKey === 'mock-key') {
      const city = startLocation.split(',')[0].trim();
      return {
        "chat_reply": `Ich habe eine wunderschöne ${effort.toLowerCase()}e Route rund um "${city}" zusammengestellt. Passend zu deinen Vorgaben (${lengthMin}-${lengthMax} km, ca. ${Math.round((timeMin+timeMax)/2)} Min) führt sie uns an schönen Aussichten und Naturwegen vorbei.`,
        "brouter_profile": profile === 'hiking' ? 'hiking' : 'trekking',
        "semantic_waypoints": [
          startLocation,
          `Aussichtspunkt, ${city}`,
          `Wald & Natur, ${city}`,
          startLocation
        ]
      };
    }

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
      throw new Error(`Gemini API returned ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error('Empty response from Gemini API.');

    return JSON.parse(resultText.trim());
  }
};

/**
 * Custom mapping for BRouter surface tags
 */
export function getSurfaceDetails(name) {
  if (!name) return { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' };
  
  const norm = name.toLowerCase().trim();
  
  const surfacesMap = {
    // Asphalt / Paved
    'asphalt': { name: 'Asphalt', color: '#636366', category: 'paved' },
    'paved': { name: 'Asphalt', color: '#636366', category: 'paved' },
    'concrete': { name: 'Asphalt', color: '#636366', category: 'paved' },
    'paving_stones': { name: 'Asphalt', color: '#636366', category: 'paved' },
    'sett': { name: 'Asphalt', color: '#636366', category: 'paved' },
    'cobblestone': { name: 'Asphalt', color: '#636366', category: 'paved' },
    
    // Schotter / Compacted
    'compacted': { name: 'Schotter', color: '#D97736', category: 'gravel' },
    'gravel': { name: 'Schotter', color: '#D97736', category: 'gravel' },
    'fine_gravel': { name: 'Schotter', color: '#D97736', category: 'gravel' },
    'kies': { name: 'Schotter', color: '#D97736', category: 'gravel' },
    
    // Waldweg / Naturboden
    'dirt': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
    'earth': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
    'grass': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
    'ground': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
    'unpaved': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
    'sand': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' },
    'mud': { name: 'Waldweg / Naturboden', color: '#8B5A2B', category: 'unpaved' }
  };
  
  if (norm === 'asphalt' || norm === 'schotter' || norm === 'waldweg / naturboden' || norm === 'unbekannt') {
    if (norm === 'asphalt') return surfacesMap['asphalt'];
    if (norm === 'schotter') return surfacesMap['gravel'];
    if (norm === 'waldweg / naturboden') return surfacesMap['dirt'];
    return { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' };
  }

  return surfacesMap[norm] || { name: 'Unbekannt', color: '#8E8E93', category: 'unknown' };
}
