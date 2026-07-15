/**
 * POI Module for NaviApp
 * Interfaces with the OpenStreetMap Overpass API to query POIs in the map's current bounding box.
 */

// Overpass tag mapping for our supported POI categories
const POI_QUERIES = {
  drinking_water: 'node["amenity"="drinking_water"]',
  shelter: '(node["tourism"="alpine_hut"];node["tourism"="shelter"];node["amenity"="shelter"];)',
  viewpoint: 'node["tourism"="viewpoint"]',
  bicycle_repair: '(node["amenity"="bicycle_repair_station"];node["shop"="bicycle"];)'
};

export const POI = {
  /**
   * Fetches POIs of selected types within a Leaflet bounding box
   * @param {Object} bounds Leaflet LatLngBounds object
   * @param {Array<string>} activeTypes Array of active POI types (e.g. ['drinking_water', 'shelter'])
   * @returns {Promise<Array>} A promise that resolves to an array of POI objects
   */
  async fetchInBounds(bounds, activeTypes) {
    if (!activeTypes || activeTypes.length === 0) {
      return [];
    }

    // Convert Leaflet bounds to Overpass bbox string: south,west,north,east
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const bbox = `${sw.lat.toFixed(6)},${sw.lng.toFixed(6)},${ne.lat.toFixed(6)},${ne.lng.toFixed(6)}`;

    // Build the query clauses for each active type
    let queries = '';
    activeTypes.forEach(type => {
      const tagQuery = POI_QUERIES[type];
      if (tagQuery) {
        // Apply bbox filter to query
        // E.g. node["amenity"="drinking_water"](52.1,13.1,52.2,13.2);
        if (tagQuery.startsWith('(')) {
          // If it's a union, inject bbox into each part
          const parts = tagQuery.substring(1, tagQuery.length - 1).split(';');
          const queryWithBbox = parts
            .filter(p => p.trim())
            .map(p => `${p}(${bbox})`)
            .join(';');
          queries += `(${queryWithBbox});`;
        } else {
          queries += `${tagQuery}(${bbox});`;
        }
      }
    });

    const overpassQL = `
      [out:json][timeout:25];
      (
        ${queries}
      );
      out body;
    `;

    try {
      const url = 'https://overpass-api.de/api/interpreter';
      const response = await fetch(url, {
        method: 'POST',
        body: 'data=' + encodeURIComponent(overpassQL),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        throw new Error('Overpass API returned status ' + response.status);
      }

      const data = await response.json();
      return this.parseOverpassData(data.elements);
    } catch (e) {
      console.error('Error fetching POIs from Overpass:', e);
      return [];
    }
  },

  /**
   * Parses Overpass API JSON elements into local POI objects
   */
  parseOverpassData(elements) {
    if (!elements) return [];

    return elements.map(el => {
      let type = 'unknown';
      let name = '';

      if (el.tags) {
        name = el.tags.name || el.tags.operator || '';
        
        if (el.tags.amenity === 'drinking_water') {
          type = 'drinking_water';
          name = name || 'Trinkwasserstelle';
        } else if (el.tags.tourism === 'alpine_hut' || el.tags.tourism === 'shelter' || el.tags.amenity === 'shelter') {
          type = 'shelter';
          name = name || (el.tags.tourism === 'alpine_hut' ? 'Almhütte' : 'Schutzhütte');
        } else if (el.tags.tourism === 'viewpoint') {
          type = 'viewpoint';
          name = name || 'Aussichtspunkt';
        } else if (el.tags.amenity === 'bicycle_repair_station' || el.tags.shop === 'bicycle') {
          type = 'bicycle_repair';
          name = name || (el.tags.shop === 'bicycle' ? 'Fahrradladen' : 'Fahrrad-Reparaturstation');
        }
      }

      return {
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        type: type,
        name: name,
        details: el.tags || {}
      };
    });
  }
};
