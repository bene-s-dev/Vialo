/**
 * GPX Module for Vialo
 * Handles parsing GPX XML files into GeoJSON and exporting GeoJSON routes to GPX format.
 */

export const GPX = {
  /**
   * Parses a GPX string into a GeoJSON feature and calculates track metadata
   * @param {string} gpxText 
   * @returns {Object|null} GeoJSON object with stats or null
   */
  parse(gpxText) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(gpxText, 'text/xml');
      
      // Check for parsing errors
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        throw new Error('GPX Datei konnte nicht gelesen werden (XML-Parser-Fehler).');
      }

      const points = [];
      const trkpts = xmlDoc.getElementsByTagName('trkpt');
      const wpts = xmlDoc.getElementsByTagName('wpt');
      
      const sourcePoints = trkpts.length > 0 ? trkpts : wpts;

      if (sourcePoints.length === 0) {
        throw new Error('Keine Track-Punkte in der GPX-Datei gefunden.');
      }

      let totalElevationGain = 0;
      let totalElevationLoss = 0;
      let previousEle = null;

      for (let i = 0; i < sourcePoints.length; i++) {
        const pt = sourcePoints[i];
        const lat = parseFloat(pt.getAttribute('lat'));
        const lon = parseFloat(pt.getAttribute('lon'));
        
        if (isNaN(lat) || isNaN(lon)) continue;

        // Parse elevation if available
        let ele = null;
        const eleNode = pt.getElementsByTagName('ele')[0];
        if (eleNode) {
          ele = parseFloat(eleNode.textContent);
          if (!isNaN(ele)) {
            if (previousEle !== null) {
              const diff = ele - previousEle;
              if (diff > 0) {
                totalElevationGain += diff;
              } else {
                totalElevationLoss += Math.abs(diff);
              }
            }
            previousEle = ele;
          }
        }

        points.push({
          lat,
          lon,
          ele
        });
      }

      if (points.length === 0) {
        throw new Error('Keine gültigen Koordinaten gefunden.');
      }

      // Calculate total distance using Haversine formula
      let totalDistanceMeters = 0;
      for (let i = 1; i < points.length; i++) {
        totalDistanceMeters += this.calculateDistance(
          points[i-1].lat, points[i-1].lon,
          points[i].lat, points[i].lon
        );
      }

      // Extract metadata name
      let name = 'Importierte GPX-Tour';
      const nameNode = xmlDoc.getElementsByTagName('name')[0];
      if (nameNode && nameNode.textContent) {
        name = nameNode.textContent.trim();
      }

      // Convert points array to GeoJSON coordinates format: [lon, lat, ele]
      const geojsonCoordinates = points.map(pt => {
        return pt.ele !== null ? [pt.lon, pt.lat, pt.ele] : [pt.lon, pt.lat];
      });

      return {
        name: name,
        geojson: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: geojsonCoordinates
          }
        },
        stats: {
          distance: totalDistanceMeters / 1000, // in km
          elevationGain: Math.round(totalElevationGain),
          elevationLoss: Math.round(totalElevationLoss),
          duration: totalDistanceMeters / 3.6 // approximation: 13 km/h average speed in seconds
        }
      };
    } catch (e) {
      console.error('GPX parse error:', e);
      alert(e.message);
      return null;
    }
  },

  /**
   * Exports a route's GeoJSON to a GPX XML file format
   * @param {Object} geojson LineString GeoJSON
   * @param {string} routeName 
   * @returns {string} GPX XML String
   */
  export(geojson, routeName = 'Vialo Tour') {
    if (!geojson || !geojson.geometry || geojson.geometry.type !== 'LineString') {
      console.error('Invalid GeoJSON for GPX export');
      return '';
    }

    const coordinates = geojson.geometry.coordinates;
    const name = routeName.replace(/[&<>"']/g, ""); // escape XML chars
    
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="Vialo" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    gpx += `  <metadata>\n`;
    gpx += `    <name>${name}</name>\n`;
    gpx += `    <desc>Erstellt mit Vialo Fahrrad &amp; Wandernavigation</desc>\n`;
    gpx += `    <time>${new Date().toISOString()}</time>\n`;
    gpx += `  </metadata>\n`;
    gpx += `  <trk>\n`;
    gpx += `    <name>${name}</name>\n`;
    gpx += `    <trkseg>\n`;

    coordinates.forEach(coord => {
      const lon = coord[0];
      const lat = coord[1];
      const ele = coord[2]; // optional elevation

      gpx += `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">`;
      if (ele !== undefined && ele !== null) {
        gpx += `<ele>${ele.toFixed(1)}</ele>`;
      }
      gpx += `</trkpt>\n`;
    });

    gpx += `    </trkseg>\n`;
    gpx += `  </trk>\n`;
    gpx += `</gpx>`;

    return gpx;
  },

  /**
   * Helper: Haversine distance formula between two lat/lon coordinates in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
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
  }
};
