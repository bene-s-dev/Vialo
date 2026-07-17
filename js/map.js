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
      <div class="pulse" style="background: rgba(0, 122, 255, 0.4);"></div>
      <div style="background: #007AFF; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); position: relative; z-index: 2;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color: #FFFFFF; display: block;">
          <path d="M19.5 14c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5zm0 6c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zM4.5 14C2.6 14 1 15.6 1 17.5S2.6 21 4.5 21 8 19.4 8 17.5 6.4 14 4.5 14zm0 6C3.1 20 2 18.9 2 17.5S3.1 15 4.5 15 7 16.1 7 17.5 5.9 20 4.5 20zm9.3-8.8l-1.3-2.6C12.2 8.1 11.7 8 11.2 8H8.5c-.3 0-.5.2-.5.5s.2.5.5.5h2.4c.2 0 .4.1.5.2l1.1 2.2-2.8 3.6H6.5c-.3 0-.5.2-.5.5s.2.5.5.5h3.5c.2 0 .4-.1.5-.2l2.6-3.4 1.2 2.4c.1.2.3.3.5.3H17c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-1.9l-1.3-2.6z" />
        </svg>
      </div>
    </div>`,
  userHiking: `
    <div class="user-position-marker">
      <div class="pulse" style="background: rgba(141, 182, 0, 0.4);"></div>
      <div style="background: #8DB600; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); position: relative; z-index: 2;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="color: #FFFFFF; display: block;">
          <circle cx="12" cy="4" r="2.5" />
          <path d="M13.5 7.5c-.3-.3-.8-.5-1.2-.5H10.5c-1.1 0-2 .9-2 2v4.5c0 .3.2.5.5.5s.5-.2.5-.5V9.5h1.2v6.2l-2.2 4.4c-.1.2-.1.5.1.7.1.1.2.1.3.1.2 0 .4-.1.5-.3l2.1-4.2V21c0 .3.2.5.5.5s.5-.2.5-.5v-4.8l2-2.5c.2-.2.2-.5.1-.7l-1.6-3.2 1.4-2.8 1.8 1.8c.2.2.5.2.7 0 .2-.2.2-.5 0-.7L13.5 7.5z" />
        </svg>
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
   * Rotates the entire map to a given bearing (degrees, 0 = north).
   * Rotates the tile/overlay pane and counter-rotates markers so they stay upright.
   * @param {number} bearing Device heading in degrees
   */
  setMapRotation(bearing) {
    const angle = -bearing; // CSS rotates counter-clockwise, heading is CW from north

    // Rotate the map container panes
    const mapPane = this.map.getPane('mapPane');
    if (mapPane) {
      mapPane.style.transformOrigin = '50% 50%';
      mapPane.style.transform = `rotate(${angle}deg)`;
      mapPane.style.transition = 'transform 0.25s ease-out';
    }

    // Counter-rotate marker pane so icons stay upright
    const markerPane = this.map.getPane('markerPane');
    if (markerPane) {
      markerPane.style.transformOrigin = '50% 50%';
      markerPane.style.transform = `rotate(${-angle}deg)`;
      markerPane.style.transition = 'transform 0.25s ease-out';
    }

    // Counter-rotate shadow pane too
    const shadowPane = this.map.getPane('shadowPane');
    if (shadowPane) {
      shadowPane.style.transformOrigin = '50% 50%';
      shadowPane.style.transform = `rotate(${-angle}deg)`;
    }

    this._currentBearing = bearing;
  }
};
