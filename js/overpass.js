/**
 * Overpass API Client Module for NaviApp
 * Performs bounding box search for OSM hiking & cycling relations
 * and parses way geometries for direct Leaflet rendering.
 * Features automatic server failover for high reliability.
 */

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

/**
 * Robust fetch helper that automatically tries fallback servers in sequence on timeout or error
 */
async function fetchFromOverpass(query, id = 'NaviApp-RouteFinder-v1.0') {
  let lastError = null;
  for (const server of OVERPASS_SERVERS) {
    const url = `${server}?data=${encodeURIComponent(query)}&id=${encodeURIComponent(id)}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds client timeout
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return await response.json();
      }
      console.warn(`Overpass server ${server} returned status ${response.status}`);
      lastError = new Error(`Overpass API responded with HTTP status ${response.status}`);
    } catch (e) {
      console.warn(`Failed to fetch from Overpass server ${server}:`, e);
      lastError = e;
    }
  }
  throw lastError || new Error('Alle verfügbaren Overpass-Server sind derzeit überlastet.');
}

export const Overpass = {
  /**
   * Search for hiking and cycling routes in a given Leaflet LatLngBounds.
   * @param {L.LatLngBounds} bounds 
   * @returns {Promise<Array<Object>>} List of routes with details and geometry
   */
  async searchRoutes(bounds) {
    const south = bounds.getSouth();
    const west = bounds.getWest();
    const north = bounds.getNorth();
    const east = bounds.getEast();
    
    const bbox = `${south},${west},${north},${east}`;
    
    const query = `[out:json][timeout:90];
relation["route"~"hiking|bicycle"](${bbox});
out geom;`;

    try {
      const data = await fetchFromOverpass(query);
      if (!data || !data.elements) return [];

      const routes = [];
      data.elements.forEach(el => {
        if (el.type === 'relation') {
          const tags = el.tags || {};
          const name = tags.name || tags.ref || `Unbenannte Route (ID: ${el.id})`;
          const routeType = tags.route === 'bicycle' ? 'Fahrrad' : 'Wandern';
          
          // Compile geometry ways
          const linePaths = [];
          if (el.members) {
            el.members.forEach(member => {
              if (member.type === 'way' && member.geometry) {
                const points = member.geometry.map(pt => [pt.lat, pt.lon]);
                if (points.length > 0) {
                  linePaths.push(points);
                }
              }
            });
          }
          
          if (linePaths.length > 0) {
            routes.push({
              id: el.id,
              name: name,
              type: routeType,
              tags: tags,
              geometry: linePaths // Array of coordinate arrays (MultiLineString format)
            });
          }
        }
      });

      return routes;
    } catch (e) {
      console.error('Overpass searchRoutes error:', e);
      throw e;
    }
  },

  /**
   * Search for POIs around a coordinate within a given radius based on free-text keywords.
   * @param {number} lat 
   * @param {number} lon 
   * @param {number} radius Radius in meters
   * @param {string} freeText Free-text to analyze for keywords
   * @returns {Promise<Array<Object>>} List of POIs { name, lat, lon }
   */
  async getPOIsAround(lat, lon, radius, freeText) {
    const keywordMap = {
      'biergarten': 'node["amenity"="biergarten"]',
      'biergärten': 'node["amenity"="biergarten"]',
      'spielplatz': 'node["leisure"="playground"]',
      'spielplätze': 'node["leisure"="playground"]',
      'see': 'node["natural"="water"]',
      'seen': 'node["natural"="water"]',
      'wasser': 'node["natural"="water"]',
      'cafe': 'node["amenity"="cafe"]',
      'café': 'node["amenity"="cafe"]',
      'cafes': 'node["amenity"="cafe"]',
      'schutzhütte': 'node["tourism"="alpine_hut"];node["amenity"="shelter"]',
      'hütte': 'node["tourism"="alpine_hut"];node["tourism"="wilderness_hut"]',
      'unterstand': 'node["amenity"="shelter"]',
      'attraktion': 'node["tourism"="attraction"]',
      'sehenswürdigkeit': 'node["tourism"="attraction"]',
      'schloss': 'node["historic"="castle"]',
      'burg': 'node["historic"="castle"]',
      'eis': 'node["amenity"="ice_cream"]',
      'eisdiele': 'node["amenity"="ice_cream"]',
      'restaurant': 'node["amenity"="restaurant"]',
      'wirtshaus': 'node["amenity"="restaurant"]',
      'gasthof': 'node["amenity"="restaurant"]'
    };

    const textLower = (freeText || '').toLowerCase();
    const subQueries = [];
    
    Object.keys(keywordMap).forEach(kw => {
      if (textLower.includes(kw)) {
        subQueries.push(keywordMap[kw]);
      }
    });

    // Default mix if no keywords match
    if (subQueries.length === 0) {
      subQueries.push('node["amenity"="cafe"]');
      subQueries.push('node["tourism"="attraction"]');
      subQueries.push('node["tourism"="viewpoint"]');
      subQueries.push('node["amenity"="restaurant"]');
    }

    // Build unique union of nodes query
    const query = `[out:json][timeout:30];
(
  ${subQueries.map(q => `${q}(around:${radius},${lat},${lon});`).join('\n  ')}
);
out 30;`;

    try {
      const data = await fetchFromOverpass(query);
      if (!data || !data.elements) return [];

      const pois = [];
      const seenNames = new Set();
      
      data.elements.forEach(el => {
        const name = el.tags?.name || el.tags?.ref || el.tags?.operator;
        if (name && !seenNames.has(name.toLowerCase())) {
          seenNames.add(name.toLowerCase());
          pois.push({
            name: name,
            lat: el.lat,
            lon: el.lon
          });
        }
      });
      
      return pois;
    } catch (e) {
      console.warn('Overpass POI query failed, returning empty list:', e);
      return [];
    }
  }
};
