/**
 * Map Module for Vialo
 * Handles Leaflet initialization, layer management, marker rendering (using offline-friendly SVGs),
 * and route visualization.
 */
import { getSurfaceDetails } from './routing.js';

// Custom SVGs for Map Markers
const MARKER_SVGS = {
  start: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="8" fill="#8DB600" stroke="#FFFFFF" stroke-width="3" />
      <circle cx="16" cy="16" r="4" fill="#FFFFFF" />
    </svg>`,
  dest: `
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2C10.5 2 6 6.5 6 12C6 19.5 16 30 16 30C16 30 26 19.5 26 12C26 6.5 21.5 2 16 2ZM16 16.2C13.7 16.2 11.8 14.3 11.8 12C11.8 9.7 13.7 7.8 16 7.8C18.3 7.8 20.2 9.7 20.2 12C20.2 14.3 18.3 16.2 16 16.2Z" fill="#ABC1AD" stroke="#FFFFFF" stroke-width="1.5" />
    </svg>`,
  userBike: `
    <div class="user-position-marker">
      <div class="pulse" style="background: rgba(0, 122, 255, 0.25);"></div>
      <div class="marker-icon-wrapper">
        <i data-lucide="bike" style="color: #007AFF; width: 28px; height: 28px;"></i>
      </div>
    </div>`,
  userHiking: `
    <div class="user-position-marker">
      <div class="pulse" style="background: rgba(141, 182, 0, 0.25);"></div>
      <div class="marker-icon-wrapper">
        <i data-lucide="person-standing" style="color: #8DB600; width: 28px; height: 28px;"></i>
      </div>
    </div>`,
  drinking_water: `
    <div class="poi-marker poi-water">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-4.3-7-11-7-11S5 10.7 5 15a7 7 0 0 0 7 7z" fill="#007AFF"/>
      </svg>
    </div>`,
  shelter: `
    <div class="poi-marker poi-shelter">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#A27B5C"/>
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </div>`,
  viewpoint: `
    <div class="poi-marker poi-viewpoint">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" fill="#8DB600"/>
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>`,
  bicycle_repair: `
    <div class="poi-marker poi-bike">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="#ABC1AD"/>
      </svg>
    </div>`
};

export const MapController = {
  map: null,
  layers: {},
  markers: {
    start: null,
    dest: null,
    user: null,
    accuracy: null,
    pois: [],
    waypoints: [],
    longPress: null
  },
  routePolyline: null,
  routeHighlightPolyline: null,
  activeLayerName: 'osm',

  /**
   * Initializes the Leaflet map on the #map div
   */
  init() {
    // Standard coordinates (Germany center)
    const defaultCoords = [51.1657, 10.4515];
    const defaultZoom = 6;

    this.map = L.map('map', {
      zoomControl: false,
      attributionControl: true
    }).setView(defaultCoords, defaultZoom);

    // Set up standard tile layers
    this.layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    });

    this.layers.opentopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; OpenTopoMap'
    });

    this.layers.cyclosm = L.tileLayer('https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png', {
      maxZoom: 20,
      attribution: '&copy; CyclOSM &amp; OpenStreetMap'
    });

    // Add standard layer
    this.layers.osm.addTo(this.map);
  },

  /**
   * Switch the map's active tile layer
   * @param {string} layerName 'osm', 'opentopo' or 'cyclosm'
   */
  switchLayer(layerName) {
    if (!this.layers[layerName]) return;

    // Remove current layers
    Object.keys(this.layers).forEach(name => {
      this.map.removeLayer(this.layers[name]);
    });

    // Add new layer
    this.layers[layerName].addTo(this.map);
    this.activeLayerName = layerName;
  },

  /**
   * Sets the Start marker coordinate on the map
   */
  setStartMarker(latlng) {
    if (this.markers.start) {
      this.markers.start.setLatLng(latlng);
    } else {
      const startIcon = L.divIcon({
        html: MARKER_SVGS.start,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      this.markers.start = L.marker(latlng, { icon: startIcon, draggable: true }).addTo(this.map);
    }
  },

  /**
   * Sets the Destination marker coordinate on the map
   */
  setDestMarker(latlng) {
    if (this.markers.dest) {
      this.markers.dest.setLatLng(latlng);
    } else {
      const destIcon = L.divIcon({
        html: MARKER_SVGS.dest,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 30] // bottom tip anchors at point
      });

      this.markers.dest = L.marker(latlng, { icon: destIcon, draggable: true }).addTo(this.map);
    }
  },

  /**
   * Draws intermediate waypoints on the map as simple markers
   */
  drawWaypoints(points) {
    // Clear old waypoints
    this.markers.waypoints.forEach(w => this.map.removeLayer(w));
    this.markers.waypoints = [];

    // Draw intermediate points (skip first and last which are start/dest)
    for (let i = 1; i < points.length - 1; i++) {
      const pt = points[i];
      const latlng = [pt.lat, pt.lon !== undefined ? pt.lon : pt.lng];
      
      const waypointIcon = L.divIcon({
        html: `
          <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="6" fill="#ABC1AD" stroke="#FFFFFF" stroke-width="2" />
          </svg>`,
        className: 'custom-div-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker(latlng, { icon: waypointIcon }).addTo(this.map);
      this.markers.waypoints.push(marker);
    }
  },

  /**
   * Clears start and/or destination markers and route lines
   */
  clearRouteGraphics() {
    if (this.markers.start) {
      this.map.removeLayer(this.markers.start);
      this.markers.start = null;
    }
    if (this.markers.dest) {
      this.map.removeLayer(this.markers.dest);
      this.markers.dest = null;
    }
    this.markers.waypoints.forEach(w => this.map.removeLayer(w));
    this.markers.waypoints = [];
    this.clearRouteLine();
  },

  /**
   * Clears route line polyline only
   */
  clearRouteLine() {
    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
    if (this.routeHighlightPolyline) {
      this.map.removeLayer(this.routeHighlightPolyline);
      this.routeHighlightPolyline = null;
    }
  },

  /**
   * Draws a route polyline on the map, with optional segment-level surface coloring
   * @param {Object} geojson GeoJSON feature representing the route line
   * @param {Array<Object>} segments Array of segment details for coloring
   */
  drawRoute(geojson, segments = null) {
    this.clearRouteLine();

    // Custom multi-layer line effect: white shadow border
    this.routeHighlightPolyline = L.geoJSON(geojson, {
      style: {
        color: '#FFFFFF',
        weight: 8,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }
    }).addTo(this.map);

    if (segments && segments.length > 0) {
      // Draw colored segments
      const polylines = [];
      let currentCoords = [];
      let currentSurface = segments[0].effective_surface || segments[0].surface || 'unbekannt';

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        currentCoords.push([seg.lat, seg.lon]);

        const isLast = i === segments.length - 1;
        const nextSurface = !isLast ? (segments[i + 1].effective_surface || segments[i + 1].surface || 'unbekannt') : '';
        const surfaceChanged = !isLast && nextSurface !== currentSurface;

        if (surfaceChanged || isLast) {
          const details = getSurfaceDetails(currentSurface);
          
          const pl = L.polyline(currentCoords, {
            color: details.color,
            weight: 5,
            opacity: 1.0,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(this.map);
          
          polylines.push(pl);
          
          if (!isLast) {
            // Keep overlap coordinate
            currentCoords = [[seg.lat, seg.lon]];
            currentSurface = nextSurface;
          }
        }
      }
      this.routePolyline = L.featureGroup(polylines).addTo(this.map);
    } else {
      // Fallback solid Aloe Green polyline
      this.routePolyline = L.geoJSON(geojson, {
        style: {
          color: '#ABC1AD', // Aloe Green
          weight: 5,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }
      }).addTo(this.map);
    }

    // Zoom map to fit the route bounds
    const bounds = this.routeHighlightPolyline.getBounds();
    this.map.fitBounds(bounds, { padding: [50, 50] });
  },

  /**
   * Draws user position and tracking circle
   * @param {Object} pos Location object { lat, lng, accuracy }
   * @param {boolean} centerMap If map should center on user
   */
  updateUserPosition(pos, centerMap = false, profile = 'cycling-regular') {
    const latlng = [pos.lat, pos.lng];

    // Accuracy Circle
    if (this.markers.accuracy) {
      this.markers.accuracy.setLatLng(latlng);
      this.markers.accuracy.setRadius(pos.accuracy);
      this.markers.accuracy.setStyle({
        color: profile === 'foot-hiking' ? '#8DB600' : '#007AFF',
        fillColor: profile === 'foot-hiking' ? '#8DB600' : '#007AFF'
      });
    } else {
      this.markers.accuracy = L.circle(latlng, {
        radius: pos.accuracy,
        color: profile === 'foot-hiking' ? '#8DB600' : '#007AFF',
        fillColor: profile === 'foot-hiking' ? '#8DB600' : '#007AFF',
        fillOpacity: 0.15,
        weight: 1
      }).addTo(this.map);
    }

    // User Dot based on active profile
    const isHiking = profile === 'foot-hiking';
    const userHtml = isHiking ? MARKER_SVGS.userHiking : MARKER_SVGS.userBike;

    const userIcon = L.divIcon({
      html: userHtml,
      className: 'custom-div-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    if (this.markers.user) {
      this.markers.user.setLatLng(latlng);
      this.markers.user.setIcon(userIcon);
    } else {
      this.markers.user = L.marker(latlng, { icon: userIcon, zIndexOffset: 2000 }).addTo(this.map);
    }

    // Trigger Lucide to render the dynamic elements in the marker
    setTimeout(() => {
      if (typeof lucide !== 'undefined') {
        const container = this.map.getContainer();
        lucide.createIcons({
          attrs: { 'stroke-width': '2.5' },
          nodes: container.querySelectorAll('.user-position-marker [data-lucide]')
        });
      }
    }, 50);

    if (centerMap) {
      // Zoom in closer if it was zoomed out
      const currentZoom = this.map.getZoom();
      const targetZoom = currentZoom < 15 ? 15 : currentZoom;
      this.map.setView(latlng, targetZoom, { animate: true });
    }
  },

  /**
   * Rotates the user marker's compass needle
   * @param {number} heading Compass heading in degrees (0 - 360)
   */
  updateUserHeading(heading) {
    const arrow = document.getElementById('user-arrow');
    if (arrow) {
      arrow.style.transform = `rotate(${heading}deg)`;
    }
  },

  /**
   * Draws a list of POI markers on the map
   */
  drawPOIs(poiList) {
    // Clear old POIs
    this.clearPOIs();

    poiList.forEach(poi => {
      const svg = MARKER_SVGS[poi.type] || MARKER_SVGS.drinking_water;
      
      const poiIcon = L.divIcon({
        html: svg,
        className: 'custom-div-icon poi-map-icon',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([poi.lat, poi.lng], { icon: poiIcon })
        .addTo(this.map)
        .bindPopup(`<strong>${poi.name}</strong>`);

      this.markers.pois.push(marker);
    });
  },

  clearPOIs() {
    this.markers.pois.forEach(m => this.map.removeLayer(m));
    this.markers.pois = [];
  },

  /**
   * Sets the temporary long press pin on the map
   */
  setLongPressMarker(latlng) {
    if (this.markers.longPress) {
      this.markers.longPress.setLatLng(latlng);
    } else {
      const pinIcon = L.divIcon({
        html: `
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2C10.5 2 6 6.5 6 12C6 19.5 16 30 16 30C16 30 26 19.5 26 12C26 6.5 21.5 2 16 2Z" fill="#ef4444" stroke="#FFFFFF" stroke-width="1.5" />
            <circle cx="16" cy="12" r="4" fill="#FFFFFF" />
          </svg>`,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 30]
      });
      this.markers.longPress = L.marker(latlng, { icon: pinIcon }).addTo(this.map);
    }
  },

  /**
   * Removes the temporary long press pin
   */
  clearLongPressMarker() {
    if (this.markers.longPress) {
      this.map.removeLayer(this.markers.longPress);
      this.markers.longPress = null;
    }
  },

  /**
   * Rotates the entire map by rotating the #map container element.
   * This avoids coordinate-system drift caused by rotating individual panes.
   * @param {number} bearing Device heading in degrees (0 = north)
   */
  setMapRotation(bearing) {
    const container = this.map.getContainer();
    const angle = -bearing; // negative: device points East (90°) → map rotates West

    // Apply rotation to the whole container
    container.style.transformOrigin = '50% 50%';
    container.style.transition = 'transform 0.25s ease-out';
    container.style.transform = bearing !== 0 ? `rotate(${angle}deg)` : '';

    // Clear any previous pending invalidation
    if (this._rotationTimer) clearTimeout(this._rotationTimer);

    this._rotationTimer = setTimeout(() => {
      // Re-center on current position to prevent map drift after rotation
      const center = this.map.getCenter();
      this.map.invalidateSize({ animate: false });
      this.map.panTo(center, { animate: false });
    }, 260); // slightly after the CSS transition ends (250ms)

    this._currentBearing = bearing;
  }
};
