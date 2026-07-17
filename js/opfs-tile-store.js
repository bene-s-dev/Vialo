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
  }
};
