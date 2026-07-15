/**
 * Geolocation Module for NaviApp
 * Handles GPS tracking, compass heading, permissions, and route navigation logic.
 * Also includes a Route Simulator for demonstration and development purposes.
 */

export const Geolocation = {
  watchId: null,
  currentPosition: null,
  currentHeading: null,
  listeners: [],
  headingListeners: [],
  isSimulating: false,
  simulationInterval: null,

  /**
   * Register a listener for location updates
   */
  onLocationUpdate(callback) {
    this.listeners.push(callback);
  },

  /**
   * Register a listener for heading/compass updates
   */
  onHeadingUpdate(callback) {
    this.headingListeners.push(callback);
  },

  /**
   * Start watching the user's physical GPS location
   */
  startTracking() {
    if (this.isSimulating) {
      this.stopSimulation();
    }

    if (!navigator.geolocation) {
      alert('Geolocation wird von Ihrem Browser nicht unterstützt.');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || 0,
          altitude: position.coords.altitude || null
        };
        
        // Notify listeners
        this.listeners.forEach(cb => cb(this.currentPosition));
      },
      (error) => {
        console.error('GPS error:', error);
      },
      options
    );

    // Setup Compass Heading
    this.startHeadingTracking();
  },

  /**
   * Stop watching GPS
   */
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.stopHeadingTracking();
  },

  /**
   * Request device orientation permission (required for iOS 13+) and track heading
   */
  async startHeadingTracking() {
    const handleOrientation = (event) => {
      // webkitCompassHeading is iOS specific
      let heading = event.webkitCompassHeading;
      
      if (heading === undefined) {
        // standard alpha is 0 to 360, but counts counter-clockwise
        if (event.alpha !== null) {
          heading = 360 - event.alpha;
        }
      }

      if (heading !== undefined && heading !== null) {
        this.currentHeading = Math.round(heading);
        this.headingListeners.forEach(cb => cb(this.currentHeading));
      }
    };

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true);
        }
      } catch (e) {
        console.warn('DeviceOrientation permission request failed or rejected:', e);
      }
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  },

  stopHeadingTracking() {
    // There isn't a simple way to remove a specific lambda, but we can reset or ignore.
    // For simplicity, we just keep the event listener but check if tracking is enabled.
    this.currentHeading = null;
  },

  /**
   * Simulates walking/riding along a set of coordinates (from calculated route)
   * @param {Array} coordinates Array of [lon, lat] or [lon, lat, ele]
   * @param {number} speedKmh Speed of simulation in km/h
   */
  startSimulation(coordinates, speedKmh = 25) {
    this.stopTracking();
    if (this.simulationInterval) clearInterval(this.simulationInterval);
    
    this.isSimulating = true;
    let index = 0;
    
    // Average speed in meters per second
    const speedMps = speedKmh / 3.6;
    
    const run = () => {
      if (index >= coordinates.length) {
        this.stopSimulation();
        return;
      }

      const coord = coordinates[index];
      const lng = coord[0];
      const lat = coord[1];
      const ele = coord[2] || null;

      // Estimate heading based on next point
      if (index < coordinates.length - 1) {
        const nextCoord = coordinates[index + 1];
        this.currentHeading = Math.round(this.calculateBearing(lat, lng, nextCoord[1], nextCoord[0]));
        this.headingListeners.forEach(cb => cb(this.currentHeading));
      }

      this.currentPosition = {
        lat,
        lng,
        accuracy: 5,
        speed: speedMps,
        altitude: ele
      };

      // Notify location listeners
      this.listeners.forEach(cb => cb(this.currentPosition));

      index++;
    };

    // Run first step instantly
    run();
    
    // Adjust tick speed so the simulator updates every 2 seconds
    this.simulationInterval = setInterval(run, 2000);
  },

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    this.isSimulating = false;
  },

  /**
   * Helper: Calculates the bearing/heading from point 1 to point 2 in degrees (0 = North)
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  },

  /**
   * Helper: Calculates the distance in meters between two coordinates
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
