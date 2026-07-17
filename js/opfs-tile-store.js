/**
 * OPFS Tile Store Utility
 * Manages caching map tiles inside the browser's Origin Private File System.
 */

/**
 * Gets a file handle to a specific tile in the OPFS directory tree.
 * Path structure: /tiles/{layer}/{z}/{x}/{y}.png
 */
async function getTileFileHandle(layer, z, x, y, create = false) {
  const root = await navigator.storage.getDirectory();
  const tilesDir = await root.getDirectoryHandle("tiles", { create });
  const layerDir = await tilesDir.getDirectoryHandle(layer, { create });
  const zDir = await layerDir.getDirectoryHandle(z.toString(), { create });
  const xDir = await zDir.getDirectoryHandle(x.toString(), { create });
  return await xDir.getFileHandle(`${y}.png`, { create });
}

export const OpfsTileStore = {
  /**
   * Saves a map tile blob to OPFS.
   */
  async saveTile(layer, z, x, y, blob) {
    try {
      const fileHandle = await getTileFileHandle(layer, z, x, y, true);
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      console.error('OPFS saveTile failed:', err);
      return false;
    }
  },

  /**
   * Retrieves a map tile file as a Blob. Returns null if not cached.
   */
  async getTile(layer, z, x, y) {
    try {
      const fileHandle = await getTileFileHandle(layer, z, x, y, false);
      return await fileHandle.getFile();
    } catch (err) {
      return null;
    }
  },

  /**
   * Checks if a specific tile is cached.
   */
  async hasTile(layer, z, x, y) {
    try {
      await getTileFileHandle(layer, z, x, y, false);
      return true;
    } catch (err) {
      return false;
    }
  },

  /**
   * Lists all cached zones by reading downloaded metadata or directories.
   * Returns coordinates and radii of cached centers for dashed green overlays.
   */
  async getCachedZones() {
    try {
      const root = await navigator.storage.getDirectory();
      const tilesDir = await root.getDirectoryHandle("tiles", { create: true });
      let zonesFile;
      try {
        zonesFile = await tilesDir.getFileHandle("metadata.json", { create: false });
      } catch {
        return [];
      }
      const file = await zonesFile.getFile();
      const text = await file.text();
      return JSON.parse(text || "[]");
    } catch (err) {
      console.warn('Failed to read cached zones metadata:', err);
      return [];
    }
  },

  /**
   * Registers a newly cached zone center/radius.
   */
  async saveCachedZone(lat, lng, radiusKm) {
    try {
      const root = await navigator.storage.getDirectory();
      const tilesDir = await root.getDirectoryHandle("tiles", { create: true });
      const zonesFile = await tilesDir.getFileHandle("metadata.json", { create: true });
      
      let zones = [];
      try {
        const file = await zonesFile.getFile();
        const text = await file.text();
        zones = JSON.parse(text || "[]");
      } catch {}

      // Avoid duplicates
      const isDup = zones.some(z => Math.abs(z.lat - lat) < 0.001 && Math.abs(z.lng - lng) < 0.001);
      if (!isDup) {
        zones.push({ lat, lng, radiusKm, timestamp: Date.now() });
        const writable = await zonesFile.createWritable();
        await writable.write(JSON.stringify(zones));
        await writable.close();
      }
      return zones;
    } catch (err) {
      console.error('Failed to save cached zone:', err);
      return [];
    }
  },

  /**
   * Deletes a specific cached zone by its timestamp and removes its associated tiles from OPFS.
   */
  async deleteCachedZone(timestamp) {
    try {
      const root = await navigator.storage.getDirectory();
      const tilesDir = await root.getDirectoryHandle("tiles", { create: true });
      const zonesFile = await tilesDir.getFileHandle("metadata.json", { create: true });
      
      let zones = [];
      try {
        const file = await zonesFile.getFile();
        const text = await file.text();
        zones = JSON.parse(text || "[]");
      } catch {}

      const zoneToDelete = zones.find(z => z.timestamp === timestamp);
      if (!zoneToDelete) return zones;

      const updatedZones = zones.filter(z => z.timestamp !== timestamp);
      
      const writable = await zonesFile.createWritable();
      await writable.write(JSON.stringify(updatedZones));
      await writable.close();

      // Delete tiles within the zone
      const lat = zoneToDelete.lat;
      const lng = zoneToDelete.lng;
      const radiusKm = zoneToDelete.radiusKm;

      const minZoom = 10;
      const maxZoom = 15;
      const latOffset = (radiusKm * 1000) / 111111;
      const lonOffset = (radiusKm * 1000) / (111111 * Math.cos(lat * Math.PI / 180));
      const minLat = lat - latOffset;
      const maxLat = lat + latOffset;
      const minLon = lng - lonOffset;
      const maxLon = lng + lonOffset;

      const layers = ['osm'];

      // Haversine distance helper
      const getDist = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      for (let z = minZoom; z <= maxZoom; z++) {
        const minX = Math.floor((minLon + 180) / 360 * Math.pow(2, z));
        const maxX = Math.floor((maxLon + 180) / 360 * Math.pow(2, z));
        const minY = Math.floor((1 - Math.log(Math.tan(maxLat * Math.PI / 180) + 1 / Math.cos(maxLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
        const maxY = Math.floor((1 - Math.log(Math.tan(minLat * Math.PI / 180) + 1 / Math.cos(minLat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            const tileLon = x / Math.pow(2, z) * 360 - 180;
            const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
            const tileLat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
            
            const distance = getDist(lat, lng, tileLat, tileLon);
            if (distance <= radiusKm * 1000 + 1000) {
              for (const layer of layers) {
                try {
                  const root = await navigator.storage.getDirectory();
                  const tilesDir = await root.getDirectoryHandle("tiles", { create: false });
                  const layerDir = await tilesDir.getDirectoryHandle(layer, { create: false });
                  const zDir = await layerDir.getDirectoryHandle(z.toString(), { create: false });
                  const xDir = await zDir.getDirectoryHandle(x.toString(), { create: false });
                  await xDir.removeEntry(`${y}.png`);
                } catch (e) {
                  // Ignore missing directory/file errors
                }
              }
            }
          }
        }
      }

      return updatedZones;
    } catch (err) {
      console.error('Failed to delete cached zone:', err);
      return [];
    }
  },

  /**
   * Clears all cached tiles and metadata zones from OPFS.
   */
  async clearAllTiles() {
    try {
      const root = await navigator.storage.getDirectory();
      try {
        await root.removeEntry("tiles", { recursive: true });
      } catch (e) {
        // Directory doesn't exist, ignore
      }
      return true;
    } catch (err) {
      console.error('Failed to clear all tiles from OPFS:', err);
      return false;
    }
  }
};
