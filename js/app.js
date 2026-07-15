/**
 * Main Application Module (NaviApp)
 * Glues all controllers and views together.
 */

import { MapController } from './map.js';
import { Routing } from './routing.js';
import { Storage } from './storage.js';
import { GPX } from './gpx.js';
import { Geolocation } from './geolocation.js';
import { POI } from './poi.js';

// Application State
const State = {
  profileMapping: {
    'cycling-regular': 'trekking',
    'foot-hiking': 'hiking'
  },
  routePoints: [], // Array of { name, lat, lon }
  activeProfile: 'cycling-regular', // 'cycling-regular' (Gravel), 'foot-hiking' (Wandern)
  calculatedRoute: null, // Holds route stats, coordinates, steps, surface info
  activePois: [], // Array of active POI categories e.g. ['drinking_water']
  isNavigating: false,
  isTracking: false,
  isPickOnMapActive: false,
  routingEngine: 'brouter',
  apiKey: null,
  brouterOptions: {}
};

// DOM Elements
const DOM = {
  // Offline badging
  offlineBadges: [document.getElementById('offline-badge'), document.getElementById('desktop-offline-badge')],
  
  // API warning card
  apiWarningCard: document.getElementById('api-key-warning'),
  setupKeyBtn: document.getElementById('setup-key-btn'),
  
  // Inputs & Autocomplete
  startInput: document.getElementById('start-input'),
  destInput: document.getElementById('dest-input'),
  startResults: document.getElementById('start-search-results'),
  destResults: document.getElementById('dest-search-results'),
  myLocationStartBtn: document.getElementById('my-location-start-btn'),
  pickOnMapBtn: document.getElementById('pick-on-map-btn'),
  
  // Buttons
  calculateBtn: document.getElementById('calculate-route-btn'),
  clearBtn: document.getElementById('clear-route-btn'),
  exportGpxBtn: document.getElementById('export-gpx-btn'),
  importGpxBtn: document.getElementById('import-gpx-btn'),
  gpxFileInput: document.getElementById('gpx-file-input'),
  gpsTrackBtn: document.getElementById('gps-track-btn'),
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  
  // Sidebar & Layout Toggles
  sidebar: document.getElementById('sidebar'),
  toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
  closeSidebarBtn: document.getElementById('close-sidebar-btn'),
  
  // Settings Modal
  settingsBtnDesktop: document.getElementById('desktop-settings-btn'),
  settingsBtnMobile: document.getElementById('mobile-settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  routingEngineSelect: document.getElementById('routing-engine-select'),
  brouterAllowSteps: document.getElementById('brouter-allow-steps'),
  brouterAllowFerries: document.getElementById('brouter-allow-ferries'),
  brouterIgnoreCycleroutes: document.getElementById('brouter-ignore-cycleroutes'),
  brouterStickToCycleroutes: document.getElementById('brouter-stick-to-cycleroutes'),
  brouterUseProposedCycleroutes: document.getElementById('brouter-use-proposed-cycleroutes'),
  brouterAvoidUnsafe: document.getElementById('brouter-avoid-unsafe'),
  brouterAddBeeline: document.getElementById('brouter-add-beeline'),
  brouterConsiderNoise: document.getElementById('brouter-consider-noise'),
  brouterConsiderRiver: document.getElementById('brouter-consider-river'),
  brouterConsiderForest: document.getElementById('brouter-consider-forest'),
  brouterConsiderTown: document.getElementById('brouter-consider-town'),
  brouterConsiderTraffic: document.getElementById('brouter-consider-traffic'),
  brouterConsiderElevation: document.getElementById('brouter-consider-elevation'),
  cacheSizeLabel: document.getElementById('cache-size-label'),
  clearCacheBtn: document.getElementById('clear-cache-btn'),
  
  // Stats Panel
  routeInfoSection: document.getElementById('route-info-section'),
  distance: document.getElementById('metric-distance'),
  duration: document.getElementById('metric-duration'),
  elevationGain: document.getElementById('metric-elevation-gain'),
  elevationLoss: document.getElementById('metric-elevation-loss'),
  progressBar: document.getElementById('surface-progress-bar'),
  surfaceList: document.getElementById('surface-list'),
  savedRoutesList: document.getElementById('saved-routes-list'),
  routePointsList: document.getElementById('route-points-list'),
  
  // Map overlays
  mapThemeBtn: document.getElementById('map-theme-btn'),
  mapThemeMenu: document.getElementById('map-theme-menu'),
  navBanner: document.getElementById('nav-instruction-banner'),
  navIcon: document.getElementById('nav-instruction-icon'),
  navDist: document.getElementById('nav-instruction-dist'),
  navText: document.getElementById('nav-instruction-text'),
  stopNavBtn: document.getElementById('stop-nav-btn'),
  
  // Mobile Bottom Sheet
  bottomSheet: document.getElementById('bottom-sheet'),
  bottomSheetHandle: document.querySelector('.bottom-sheet-handle'),
  sheetSummaryDist: document.getElementById('sheet-summary-dist'),
  sheetSummaryDur: document.getElementById('sheet-summary-dur'),
  sheetActionBtn: document.getElementById('sheet-action-btn'),
  mobileRouteDetails: document.getElementById('mobile-route-details')
};

// Init application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet Map
  MapController.init();
  
  // Load settings (BRouter Profiles & Mappings)
  loadSettings();
  
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Load Saved Routes
  renderSavedRoutes();
  
  // Setup Event Listeners
  setupEventListeners();
  
  // Setup Geolocation callbacks
  setupGeolocation();
  
  // Handle Service Worker
  registerServiceWorker();
  
  // Set up online/offline status detection
  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

// Update UI depending on connectivity
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  DOM.offlineBadges.forEach(badge => {
    if (badge) {
      if (isOnline) {
        badge.classList.add('hidden');
      } else {
        badge.classList.remove('hidden');
      }
    }
  });
}

function loadSettings() {
  State.routingEngine = Storage.getRoutingEngine();
  State.apiKey = Storage.getApiKey();
  State.brouterOptions = Storage.getBRouterOptions();

  if (DOM.routingEngineSelect) {
    DOM.routingEngineSelect.value = State.routingEngine;
  }

  if (DOM.brouterAllowSteps) {
    DOM.brouterAllowSteps.checked = State.brouterOptions.allow_steps !== false;
    DOM.brouterAllowFerries.checked = State.brouterOptions.allow_ferries !== false;
    DOM.brouterIgnoreCycleroutes.checked = !!State.brouterOptions.ignore_cycleroutes;
    DOM.brouterStickToCycleroutes.checked = !!State.brouterOptions.stick_to_cycleroutes;
    DOM.brouterUseProposedCycleroutes.checked = !!State.brouterOptions.use_proposed_cycleroutes;
    DOM.brouterAvoidUnsafe.checked = !!State.brouterOptions.avoid_unsafe;
    DOM.brouterAddBeeline.checked = !!State.brouterOptions.add_beeline;
    DOM.brouterConsiderNoise.checked = !!State.brouterOptions.consider_noise;
    DOM.brouterConsiderRiver.checked = !!State.brouterOptions.consider_river;
    DOM.brouterConsiderForest.checked = !!State.brouterOptions.consider_forest;
    DOM.brouterConsiderTown.checked = !!State.brouterOptions.consider_town;
    DOM.brouterConsiderTraffic.checked = !!State.brouterOptions.consider_traffic;
    DOM.brouterConsiderElevation.checked = State.brouterOptions.consider_elevation !== false;
  }

  // Set active profile from localstorage if saved previously
  const savedProfile = localStorage.getItem('naviapp_active_profile');
  if (savedProfile) {
    State.activeProfile = savedProfile;
    // Update profile button UI
    const profileBtns = document.querySelectorAll('.profile-btn');
    profileBtns.forEach(btn => {
      if (btn.dataset.profile === savedProfile) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}

function setupEventListeners() {
  // Sidebar Toggles (Mobile drawer)
  DOM.toggleSidebarBtn.addEventListener('click', () => DOM.sidebar.classList.add('open'));
  DOM.closeSidebarBtn.addEventListener('click', () => DOM.sidebar.classList.remove('open'));

  // Settings Modal
  const openSettings = async () => {
    DOM.settingsModal.classList.remove('hidden');
    await updateCacheSizeDisplay();
  };
  DOM.settingsBtnDesktop.addEventListener('click', openSettings);
  DOM.settingsBtnMobile.addEventListener('click', openSettings);
  
  DOM.closeModalBtn.addEventListener('click', () => DOM.settingsModal.classList.add('hidden'));
  DOM.saveSettingsBtn.addEventListener('click', () => {
    const engine = DOM.routingEngineSelect.value;
    
    const brouterOpts = {
      allow_steps: DOM.brouterAllowSteps.checked,
      allow_ferries: DOM.brouterAllowFerries.checked,
      ignore_cycleroutes: DOM.brouterIgnoreCycleroutes.checked,
      stick_to_cycleroutes: DOM.brouterStickToCycleroutes.checked,
      use_proposed_cycleroutes: DOM.brouterUseProposedCycleroutes.checked,
      avoid_unsafe: DOM.brouterAvoidUnsafe.checked,
      add_beeline: DOM.brouterAddBeeline.checked,
      consider_noise: DOM.brouterConsiderNoise.checked,
      consider_river: DOM.brouterConsiderRiver.checked,
      consider_forest: DOM.brouterConsiderForest.checked,
      consider_town: DOM.brouterConsiderTown.checked,
      consider_traffic: DOM.brouterConsiderTraffic.checked,
      consider_elevation: DOM.brouterConsiderElevation.checked
    };
    
    Storage.saveRoutingEngine(engine);
    Storage.saveBRouterOptions(brouterOpts);
    
    loadSettings();
    DOM.settingsModal.classList.add('hidden');
    // If route already exists, recalculate it
    if (State.routePoints.length >= 2) {
      calculateAndDisplayRoute();
    }
  });

  // Autocomplete Geocoding Search (Start & Destination)
  setupAddressSearch(DOM.startInput, DOM.startResults, (loc) => {
    if (State.routePoints.length === 0) {
      State.routePoints.push(loc);
    } else {
      State.routePoints[0] = loc;
    }
    updateSearchInputsFromPoints();
    renderRoutePoints();
    triggerAutoRouting();
  });
  
  setupAddressSearch(DOM.destInput, DOM.destResults, (loc) => {
    if (State.routePoints.length <= 1) {
      State.routePoints.push(loc);
    } else {
      State.routePoints[State.routePoints.length - 1] = loc;
    }
    updateSearchInputsFromPoints();
    renderRoutePoints();
    triggerAutoRouting();
  });

  // Use my location for Start
  DOM.myLocationStartBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            name: 'Aktueller Standort',
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          if (State.routePoints.length === 0) {
            State.routePoints.push(loc);
          } else {
            State.routePoints[0] = loc;
          }
          updateSearchInputsFromPoints();
          renderRoutePoints();
          triggerAutoRouting();
        },
        (err) => alert('Standort konnte nicht ermittelt werden.')
      );
    }
  });

  // Pick target directly on Map
  DOM.pickOnMapBtn.addEventListener('click', () => {
    State.isPickOnMapActive = true;
    DOM.pickOnMapBtn.classList.add('active');
    alert('Klicke auf die Karte, um einen Wegpunkt festzulegen.');
  });

  MapController.map.on('click', (e) => {
    const loc = {
      name: `Kartenpunkt (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`,
      lat: e.latlng.lat,
      lon: e.latlng.lng
    };
    
    if (State.isPickOnMapActive) {
      // Pick on Map sets/replaces the destination (or appends if less than 2)
      if (State.routePoints.length <= 1) {
        State.routePoints.push(loc);
      } else {
        State.routePoints[State.routePoints.length - 1] = loc;
      }
      State.isPickOnMapActive = false;
      DOM.pickOnMapBtn.classList.remove('active');
    } else {
      // Regular map click: appends waypoints!
      State.routePoints.push(loc);
    }
    
    updateSearchInputsFromPoints();
    renderRoutePoints();
    triggerAutoRouting();
  });

  // Profile selection
  const profileBtns = document.querySelectorAll('.profile-btn');
  profileBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      profileBtns.forEach(b => b.classList.remove('active'));
      const activeBtn = e.currentTarget;
      activeBtn.classList.add('active');
      State.activeProfile = activeBtn.dataset.profile;
      
      // Save profile choice locally
      localStorage.setItem('naviapp_active_profile', State.activeProfile);
      
      // Update user position marker icon immediately if geolocation is active
      if (Geolocation.currentPosition) {
        MapController.updateUserPosition(Geolocation.currentPosition, false, State.activeProfile);
      }
      
      // Auto recalculate route if points exist
      if (State.routePoints.length >= 2) {
        calculateAndDisplayRoute();
      }
    });
  });

  // Action Buttons
  DOM.calculateBtn.addEventListener('click', calculateAndDisplayRoute);
  DOM.clearBtn.addEventListener('click', clearRoute);

  // GPX Handling
  DOM.exportGpxBtn.addEventListener('click', exportGPXRoute);
  DOM.importGpxBtn.addEventListener('click', () => DOM.gpxFileInput.click());
  DOM.gpxFileInput.addEventListener('change', importGPXRoute);

  // Cache Clear in Settings
  DOM.clearCacheBtn.addEventListener('click', async () => {
    if (confirm('Möchtest du alle heruntergeladenen Kartenkacheln löschen?')) {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.includes('tiles')) {
          await caches.delete(key);
        }
      }
      await updateCacheSizeDisplay();
      alert('Karten-Cache gelöscht.');
    }
  });

  // Layer Theme Selection Floating Menu
  DOM.mapThemeBtn.addEventListener('click', () => {
    DOM.mapThemeMenu.classList.toggle('hidden');
  });

  const layerOptions = document.querySelectorAll('.layer-option');
  layerOptions.forEach(opt => {
    opt.addEventListener('click', (e) => {
      layerOptions.forEach(o => o.classList.remove('active'));
      e.target.classList.add('active');
      MapController.switchLayer(e.target.dataset.layer);
      DOM.mapThemeMenu.classList.add('hidden');
    });
  });

  // POI Checkbox Toggles
  const poiCheckboxes = document.querySelectorAll('.poi-checkbox');
  poiCheckboxes.forEach(cb => {
    cb.addEventListener('change', (e) => {
      const poiType = e.currentTarget.dataset.poi;
      if (e.currentTarget.checked) {
        State.activePois.push(poiType);
      } else {
        State.activePois = State.activePois.filter(t => t !== poiType);
      }
      refreshPOIs();
    });
  });

  // Re-fetch POIs when map viewport changes
  MapController.map.on('moveend', () => {
    if (State.activePois.length > 0) {
      refreshPOIs();
    }
  });

  // Navigation start/stop
  DOM.sheetActionBtn.addEventListener('click', toggleNavigation);
  DOM.stopNavBtn.addEventListener('click', stopNavigation);
  DOM.gpsTrackBtn.addEventListener('click', toggleGPSTracking);
  DOM.zoomInBtn.addEventListener('click', () => MapController.map.zoomIn());
  DOM.zoomOutBtn.addEventListener('click', () => MapController.map.zoomOut());

  // Bottom Sheet Mobile Drag Gestures
  setupBottomSheetGestures();
}

/**
 * Automatically triggers route calculation when start and destination are set
 */
function triggerAutoRouting() {
  if (State.routePoints.length >= 2) {
    calculateAndDisplayRoute();
  }
}

/**
 * Renders the route points (Wegpunkte) list in the sidebar
 */
function renderRoutePoints() {
  const list = DOM.routePointsList || document.getElementById('route-points-list');
  if (!list) return;

  list.innerHTML = '';
  
  if (State.routePoints.length === 0) {
    list.innerHTML = '<li class="empty-msg" style="font-size: 0.78rem; text-align: center; color: var(--text-dimmed); padding: 8px 0;">Klicke auf die Karte oder suche Orte, um Wegpunkte hinzuzufügen.</li>';
    return;
  }

  State.routePoints.forEach((pt, i) => {
    const li = document.createElement('li');
    li.className = 'saved-item';
    li.style.padding = '8px 10px';
    li.style.margin = '4px 0';
    li.style.background = 'rgba(255,255,255,0.03)';
    li.style.borderRadius = '8px';
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    
    const shortName = pt.name.split(',')[0];
    const isStart = i === 0;
    const isDest = i === State.routePoints.length - 1;
    let label = `${i + 1}`;
    let badgeColor = 'var(--text-dimmed)';
    if (isStart) {
      label = 'Start';
      badgeColor = 'var(--color-secondary)';
    } else if (isDest) {
      label = 'Ziel';
      badgeColor = 'var(--color-primary)';
    }

    li.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
        <span class="badge" style="background-color: ${badgeColor}; color: #121214; font-size: 0.68rem; padding: 2px 5px;">${label}</span>
        <span style="font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${shortName}</span>
      </div>
      <button class="delete-point-btn" data-index="${i}" title="Wegpunkt löschen" style="background: transparent; border: none; color: var(--text-dimmed); cursor: pointer; padding: 2px;">
        <i data-lucide="x" style="width: 14px; height: 14px;"></i>
      </button>
    `;

    li.querySelector('.delete-point-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(e.currentTarget.dataset.index);
      removeRoutePoint(index);
    });

    list.appendChild(li);
  });
  lucide.createIcons();
}

/**
 * Removes a route waypoint at the specified index
 */
function removeRoutePoint(index) {
  State.routePoints.splice(index, 1);
  
  renderRoutePoints();
  updateSearchInputsFromPoints();
  
  if (State.routePoints.length >= 2) {
    calculateAndDisplayRoute();
  } else {
    MapController.clearRouteLine();
    if (State.routePoints.length === 1) {
      MapController.setStartMarker([State.routePoints[0].lat, State.routePoints[0].lon]);
      if (MapController.markers.dest) {
        MapController.map.removeLayer(MapController.markers.dest);
        MapController.markers.dest = null;
      }
      MapController.drawWaypoints(State.routePoints);
    } else {
      clearRoute();
    }
  }
}

/**
 * Synchronizes search input text fields and Leaflet markers with routePoints array
 */
function updateSearchInputsFromPoints() {
  if (State.routePoints.length > 0) {
    DOM.startInput.value = State.routePoints[0].name;
    MapController.setStartMarker([State.routePoints[0].lat, State.routePoints[0].lon]);
  } else {
    DOM.startInput.value = '';
    if (MapController.markers.start) {
      MapController.map.removeLayer(MapController.markers.start);
      MapController.markers.start = null;
    }
  }

  if (State.routePoints.length > 1) {
    const lastPt = State.routePoints[State.routePoints.length - 1];
    DOM.destInput.value = lastPt.name;
    MapController.setDestMarker([lastPt.lat, lastPt.lon]);
  } else {
    DOM.destInput.value = '';
    if (MapController.markers.dest) {
      MapController.map.removeLayer(MapController.markers.dest);
      MapController.markers.dest = null;
    }
  }
  
  // Draw intermediate waypoints (excluding start/dest)
  MapController.drawWaypoints(State.routePoints);
}

/**
 * Handle address geocode searches (debounced)
 */
function setupAddressSearch(inputEl, resultsEl, onSelectCallback) {
  let timeoutId = null;

  inputEl.addEventListener('input', () => {
    clearTimeout(timeoutId);
    const query = inputEl.value;

    if (query.trim().length < 3) {
      resultsEl.innerHTML = '';
      resultsEl.classList.add('hidden');
      return;
    }

    timeoutId = setTimeout(async () => {
      let viewbox = null;
      try {
        if (MapController.map && typeof MapController.map.getBounds === 'function') {
          const bounds = MapController.map.getBounds();
          if (bounds) {
            const sw = bounds.getSouthWest();
            const ne = bounds.getNorthEast();
            if (sw && ne && typeof sw.lng === 'number' && !isNaN(sw.lng) && typeof sw.lat === 'number' && !isNaN(sw.lat)) {
              // Nominatim viewbox format: west,north,east,south (lonMin, latMax, lonMax, latMin)
              viewbox = `${sw.lng.toFixed(6)},${ne.lat.toFixed(6)},${ne.lng.toFixed(6)},${sw.lat.toFixed(6)}`;
            }
          }
        }
      } catch (err) {
        console.warn('Could not determine map bounds for search biasing:', err);
      }
      const results = await Routing.searchAddress(query, viewbox);
      
      resultsEl.innerHTML = '';
      if (results.length > 0) {
        resultsEl.classList.remove('hidden');
        results.forEach(loc => {
          const item = document.createElement('div');
          item.className = 'search-result-item';
          item.innerHTML = `<i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${loc.name}`;
          
          item.addEventListener('click', () => {
            inputEl.value = loc.name;
            resultsEl.classList.add('hidden');
            onSelectCallback(loc);
          });
          resultsEl.appendChild(item);
        });
        lucide.createIcons({ attrs: { class: 'search-result-icon' } });
      } else {
        resultsEl.classList.add('hidden');
      }
    }, 400);
  });

  // Hide lists when clicking outside
  document.addEventListener('click', (e) => {
    if (e.target !== inputEl) {
      resultsEl.classList.add('hidden');
    }
  });
}

/**
 * Calculates directions via ORS and updates UI & Map
 */
async function calculateAndDisplayRoute() {
  if (State.routePoints.length < 2) {
    alert('Bitte wähle mindestens zwei Wegpunkte aus.');
    return;
  }

  // Visual feedback based on active profile: spinning bike wheels or bobbing runner
  const isHiking = State.activeProfile === 'foot-hiking';
  if (isHiking) {
    DOM.calculateBtn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="loading-runner" style="display: block;">
          <circle cx="12" cy="4" r="2.5" />
          <path d="M13.5 7.5c-.3-.3-.8-.5-1.2-.5H10.5c-1.1 0-2 .9-2 2v4.5c0 .3.2.5.5.5s.5-.2.5-.5V9.5h1.2v6.2l-2.2 4.4c-.1.2-.1.5.1.7.1.1.2.1.3.1.2 0 .4-.1.5-.3l2.1-4.2V21c0 .3.2.5.5.5s.5-.2.5-.5v-4.8l2-2.5c.2-.2.2-.5.1-.7l-1.6-3.2 1.4-2.8 1.8 1.8c.2.2.5.2.7 0 .2-.2.2-.5 0-.7L13.5 7.5z" />
        </svg>
        Lade Route...
      </span>`;
  } else {
    DOM.calculateBtn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
          <circle cx="5.5" cy="17.5" r="3.5" class="spinning-wheel" stroke-dasharray="3 2" />
          <circle cx="18.5" cy="17.5" r="3.5" class="spinning-wheel" stroke-dasharray="3 2" />
          <path d="M18.5 17.5 H12 V10 M18.5 17.5 L12 10 M12 10 H7 L12 17.5 M5.5 17.5 L7 10 L7.5 7.5 H9.5" />
        </svg>
        Lade Route...
      </span>`;
  }

  try {
    let activeEngine = State.routingEngine;
    let resolvedProfile = activeEngine === 'ors' 
      ? State.activeProfile 
      : (State.profileMapping[State.activeProfile] || 'trekking');

    let route;
    try {
      route = await Routing.getRoute(
        State.routePoints,
        resolvedProfile,
        activeEngine,
        State.apiKey,
        State.brouterOptions
      );
    } catch (brouterError) {
      if (activeEngine === 'brouter') {
        console.warn('BRouter failed. Retrying with OpenRouteService fallback...', brouterError);
        activeEngine = 'ors';
        resolvedProfile = State.activeProfile;
        
        const fallbackKey = State.apiKey || Storage.getApiKey();
        route = await Routing.getRoute(
          State.routePoints,
          resolvedProfile,
          activeEngine,
          fallbackKey,
          State.brouterOptions
        );
      } else {
        throw brouterError;
      }
    }

    State.calculatedRoute = route;
    
    // Draw on Map
    MapController.drawRoute(route.geojson, route.segments);
    
    // Update Stats
    updateRouteUI(route);

    // Save automatically to history
    saveRouteToHistory(route);

  } catch (e) {
    alert('Fehler bei der Routenberechnung: ' + e.message);
  } finally {
    DOM.calculateBtn.innerHTML = '<i data-lucide="route"></i> Route berechnen';
    lucide.createIcons();
  }
}

/**
 * Updates UI stats & Surface indicator lists
 */
function updateRouteUI(route) {
  DOM.routeInfoSection.classList.remove('hidden');
  
  // Standard formatters
  const formattedDist = route.stats.distance.toFixed(1) + ' km';
  const hours = Math.floor(route.stats.duration / 3600);
  const minutes = Math.floor((route.stats.duration % 3600) / 60);
  const formattedDur = `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
  const gain = `+${route.stats.elevationGain} m`;
  const loss = `-${route.stats.elevationLoss} m`;

  // Desktop sidebars
  DOM.distance.textContent = formattedDist;
  DOM.duration.textContent = formattedDur;
  DOM.elevationGain.textContent = gain;
  DOM.elevationLoss.textContent = loss;

  // Mobile Bottom Sheet
  DOM.sheetSummaryDist.textContent = formattedDist;
  DOM.sheetSummaryDur.textContent = formattedDur;
  DOM.sheetActionBtn.classList.remove('hidden');

  // Surface rendering
  renderSurfaceBreakdown(route.surfaces);

  // Sync to mobile sheet container
  DOM.mobileRouteDetails.innerHTML = '';
  // Clone sections for mobile view in drawer
  const clone = DOM.routeInfoSection.cloneNode(true);
  clone.id = 'mobile-route-info';
  clone.classList.remove('hidden');
  DOM.mobileRouteDetails.appendChild(clone);
  
  // Render elevation profile on all canvases
  drawElevationProfile(route.coordinates);
  
  // Expand mobile bottom sheet to show stats
  DOM.bottomSheet.classList.add('half-open');
}

/**
 * Surface progress bar and lists rendering
 */
function renderSurfaceBreakdown(surfaces) {
  // Clear lists
  DOM.progressBar.innerHTML = '';
  DOM.surfaceList.innerHTML = '';

  surfaces.forEach(item => {
    // 1. Progress segment
    const segment = document.createElement('div');
    segment.className = 'progress-segment';
    segment.style.backgroundColor = item.color;
    segment.style.width = item.pct + '%';
    segment.title = `${item.name}: ${item.pct}%`;
    DOM.progressBar.appendChild(segment);

    // 2. Text entry
    const row = document.createElement('div');
    row.className = 'surface-item';
    row.innerHTML = `
      <span class="surface-name-box">
        <span class="surface-color-dot" style="background-color: ${item.color}"></span>
        <span>${item.name}</span>
      </span>
      <span>${item.distance.toFixed(1)} km (${item.pct}%)</span>
    `;
    DOM.surfaceList.appendChild(row);
  });
}

function clearRoute() {
  State.routePoints = [];
  State.calculatedRoute = null;
  
  DOM.startInput.value = '';
  DOM.destInput.value = '';
  DOM.routeInfoSection.classList.add('hidden');
  
  // Reset Bottom sheet
  DOM.sheetSummaryDist.textContent = '0.0 km';
  DOM.sheetSummaryDur.textContent = '00:00';
  DOM.bottomSheet.classList.remove('half-open', 'fully-open');
  
  MapController.clearRouteGraphics();
  renderRoutePoints();
}

/**
 * Exports current route as GPX file download
 */
function exportGPXRoute() {
  if (!State.calculatedRoute || State.routePoints.length === 0) return;
  
  const startName = State.routePoints[0].name.split(',')[0];
  const destName = State.routePoints[State.routePoints.length - 1].name.split(',')[0];
  
  const gpxString = GPX.export(
    State.calculatedRoute.geojson,
    `Tour ${startName} nach ${destName}`
  );
  
  const blob = new Blob([gpxString], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `naviapp_route_${Date.now()}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imports a GPX route from local filesystem
 */
function importGPXRoute(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const gpxText = event.target.result;
    const parsed = GPX.parse(gpxText);
    
    if (parsed) {
      // Clear current routing values
      clearRoute();

      // Mock start and destination markers from endpoints
      const coords = parsed.geojson.geometry.coordinates;
      const startCoord = coords[0];
      const endCoord = coords[coords.length - 1];

      State.routePoints = [
        { name: 'GPX Start', lat: startCoord[1], lon: startCoord[0] },
        { name: 'GPX Ziel', lat: endCoord[1], lon: endCoord[0] }
      ];
      
      updateSearchInputsFromPoints();
      renderRoutePoints();

      State.calculatedRoute = {
        geojson: parsed.geojson,
        stats: parsed.stats,
        coordinates: coords,
        // Since we imported GPX, we do not have individual ORS turn directions,
        // but we can generate a mock list or skip instructions
        steps: [{ instruction: 'Folge dem importierten GPX Track', distance: parsed.stats.distance * 1000, way_points: [0, coords.length - 1] }],
        surfaces: [{ name: 'GPX Track', pct: 100, color: '#ABC1AD' }]
      };

      MapController.drawRoute(parsed.geojson);
      
      updateRouteUI(State.calculatedRoute);
      saveRouteToHistory(State.calculatedRoute);
    }
  };
  reader.readAsText(file);
}

/**
 * Query Overpass POIs and update map markers
 */
async function refreshPOIs() {
  if (State.activePois.length === 0) {
    MapController.clearPOIs();
    return;
  }

  const bounds = MapController.map.getBounds();
  const pois = await POI.fetchInBounds(bounds, State.activePois);
  MapController.drawPOIs(pois);
}

/**
 * Saves calculated/imported route to browser storage
 */
function saveRouteToHistory(route) {
  if (State.routePoints.length === 0) return;
  const startName = State.routePoints[0].name.split(',')[0];
  const destName = State.routePoints[State.routePoints.length - 1].name.split(',')[0];

  const routeData = {
    name: `${startName} → ${destName}`,
    stats: route.stats,
    profile: State.activeProfile,
    routePoints: State.routePoints,
    geojson: route.geojson,
    steps: route.steps,
    coordinates: route.coordinates,
    surfaces: route.surfaces
  };

  Storage.saveRoute(routeData);
  renderSavedRoutes();
}

/**
 * Loads and renders saved routes in sidebar list
 */
function renderSavedRoutes() {
  const list = DOM.savedRoutesList;
  list.innerHTML = '';
  
  const saved = Storage.getSavedRoutes();
  if (saved.length === 0) {
    list.innerHTML = '<li class="empty-msg">Keine gespeicherten Touren vorhanden.</li>';
    return;
  }

  saved.forEach(route => {
    const li = document.createElement('li');
    li.className = 'saved-item';
    
    const durationMin = Math.round(route.stats.duration / 60);
    const durationStr = durationMin > 60 
      ? Math.floor(durationMin / 60) + 'h ' + (durationMin % 60) + 'm'
      : durationMin + 'm';

    li.innerHTML = `
      <div class="saved-info" style="flex: 1;">
        <div class="saved-item-title">${route.name}</div>
        <div class="saved-item-meta">${route.stats.distance.toFixed(1)} km • ${durationStr} • +${route.stats.elevationGain}m</div>
      </div>
      <button class="delete-saved-btn" data-id="${route.id}" title="Tour löschen">
        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
      </button>
    `;

    // Load saved route on click
    li.addEventListener('click', (e) => {
      if (e.target.closest('.delete-saved-btn')) return;

      clearRoute();
      State.routePoints = route.routePoints || [route.startPoint, route.destPoint];
      State.activeProfile = route.profile;
      State.calculatedRoute = route;

      updateSearchInputsFromPoints();
      renderRoutePoints();

      // Update profile active button status
      const profileBtns = document.querySelectorAll('.profile-btn');
      profileBtns.forEach(btn => {
        if (btn.dataset.profile === route.profile) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      MapController.drawRoute(route.geojson, route.segments);
      updateRouteUI(route);
    });

    // Delete button
    li.querySelector('.delete-saved-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.dataset.id;
      if (confirm('Möchtest du diese Tour wirklich löschen?')) {
        Storage.deleteRoute(id);
        renderSavedRoutes();
      }
    });

    list.appendChild(li);
  });
  lucide.createIcons();
}

/**
 * Handle GPS tracking button toggles
 */
function toggleGPSTracking() {
  if (State.isTracking) {
    Geolocation.stopTracking();
    DOM.gpsTrackBtn.classList.remove('active');
    State.isTracking = false;
  } else {
    Geolocation.startTracking();
    DOM.gpsTrackBtn.classList.add('active');
    State.isTracking = true;
    
    // Request permission/iOS orientations
    Geolocation.startHeadingTracking();

    // Center on user position once loaded
    if (Geolocation.currentPosition) {
      MapController.updateUserPosition(Geolocation.currentPosition, true, State.activeProfile);
    }
  }
}

/**
 * Geolocation callbacks
 */
function setupGeolocation() {
  Geolocation.onLocationUpdate((pos) => {
    // 1. Draw dot and accuracy circle
    MapController.updateUserPosition(pos, State.isNavigating, State.activeProfile); // Center map if in Navigation mode

    // 2. If in active Navigation Mode, update instructions
    if (State.isNavigating && State.calculatedRoute) {
      updateNavigationLogic(pos);
    }
  });

  Geolocation.onHeadingUpdate((heading) => {
    MapController.updateUserHeading(heading);
  });
}

/**
 * Turn-by-Turn Navigation Engine
 */
function updateNavigationLogic(userPos) {
  const coords = State.calculatedRoute.coordinates;
  const steps = State.calculatedRoute.steps;
  
  if (!coords || coords.length === 0 || !steps || steps.length === 0) return;

  // 1. Find closest coordinate on the route to snap user location
  let closestIndex = 0;
  let minDistance = Infinity;

  for (let i = 0; i < coords.length; i++) {
    const dist = Geolocation.calculateDistance(userPos.lat, userPos.lng, coords[i][1], coords[i][0]);
    if (dist < minDistance) {
      minDistance = dist;
      closestIndex = i;
    }
  }

  // Check if off route (e.g. user is more than 60m away from the path)
  if (minDistance > 60) {
    DOM.navDist.textContent = 'Off-Route';
    DOM.navText.textContent = 'Bitte kehre auf den geplanten Weg zurück.';
    DOM.navIcon.setAttribute('data-lucide', 'alert-circle');
    lucide.createIcons();
    return;
  }

  // 2. Match coordinate index with routing steps
  // ORS steps contain waypoint indices: step.way_points = [startIndex, endIndex]
  let currentStep = null;
  let nextStep = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (closestIndex >= step.way_points[0] && closestIndex <= step.way_points[1]) {
      currentStep = step;
      nextStep = steps[i + 1] || null;
      break;
    }
  }

  if (currentStep) {
    // Calculate distance to the next step point
    let distanceToNextText = '';
    
    if (nextStep) {
      const nextStepStartCoord = coords[nextStep.way_points[0]];
      const distToNext = Geolocation.calculateDistance(
        userPos.lat, userPos.lng,
        nextStepStartCoord[1], nextStepStartCoord[0]
      );
      
      distanceToNextText = distToNext > 1000 
        ? `In ${(distToNext / 1000).toFixed(1)} km` 
        : `In ${Math.round(distToNext)} m`;

      DOM.navDist.textContent = distanceToNextText;
      DOM.navText.textContent = currentStep.instruction;
      
      // Determine Direction Icon
      const iconName = getNavigationIcon(currentStep.type);
      DOM.navIcon.setAttribute('data-lucide', iconName);
    } else {
      DOM.navDist.textContent = 'Ziel erreicht';
      DOM.navText.textContent = 'Du hast dein Ziel erreicht.';
      DOM.navIcon.setAttribute('data-lucide', 'check-circle');
    }
    lucide.createIcons();
  }
}

/**
 * Returns Lucide icon name matching ORS action codes
 * Codes mapping: 0=Left, 1=Right, 2=Sharp left, 3=Sharp right, 4=Slight left, 5=Slight right, 6=Straight, etc.
 */
function getNavigationIcon(type) {
  switch (type) {
    case 0: // Left
    case 2: // Sharp left
      return 'arrow-left-to-line';
    case 4: // Slight left
      return 'arrow-up-left';
    case 1: // Right
    case 3: // Sharp right
      return 'arrow-right-to-line';
    case 5: // Slight right
      return 'arrow-up-right';
    case 6: // Straight
    case 11: // Keep straight
      return 'arrow-up';
    case 12: // Roundabout
    case 13:
      return 'rotate-cw';
    default:
      return 'navigation';
  }
}

/**
 * Controls Starting / Stopping the GPS Tracking navigation or Simulator
 */
function toggleNavigation() {
  if (State.isNavigating) {
    stopNavigation();
  } else {
    if (!State.calculatedRoute) {
      alert('Bitte plane zuerst eine Route.');
      return;
    }

    State.isNavigating = true;
    DOM.navBanner.classList.remove('hidden');
    DOM.sheetActionBtn.textContent = 'Stopp';
    DOM.sheetActionBtn.classList.remove('btn-accent');
    DOM.sheetActionBtn.classList.add('btn-secondary');

    // Snug fit the bottom sheet down to collapsed view so the banner and map are fully visible
    DOM.bottomSheet.classList.remove('half-open', 'fully-open');

    // Determine if we should simulate or track:
    // If we're on a desktop browser, or the user is not moving, the Simulator is the perfect showcase.
    // We start the simulation along the route!
    const coords = State.calculatedRoute.coordinates;
    if (coords && coords.length > 0) {
      Geolocation.startSimulation(coords, 28); // 28 km/h cycle simulation
    }
  }
}

function stopNavigation() {
  State.isNavigating = false;
  Geolocation.stopSimulation();
  DOM.navBanner.classList.add('hidden');
  DOM.sheetActionBtn.textContent = 'Start';
  DOM.sheetActionBtn.classList.remove('btn-secondary');
  DOM.sheetActionBtn.classList.add('btn-accent');
}

/**
 * Mobile Drawer Drag gestures
 */
function setupBottomSheetGestures() {
  let startY = 0;
  let startHeight = 0;
  
  DOM.bottomSheetHandle.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
    DOM.bottomSheet.style.transition = 'none'; // temporary disable animation during drag
  });

  DOM.bottomSheetHandle.addEventListener('touchmove', (e) => {
    const currentY = e.touches[0].clientY;
    const deltaY = startY - currentY; // positive = dragging up
    
    // We can just calculate basic thresholds or direct transform translations.
    // For simplicity and fluid performance, we toggle classes on touch end rather than raw heights.
  });

  DOM.bottomSheetHandle.addEventListener('touchend', (e) => {
    DOM.bottomSheet.style.transition = ''; // restore animation
    
    const endY = e.changedTouches[0].clientY;
    const deltaY = startY - endY;

    if (deltaY > 60) {
      // Dragged up
      if (!DOM.bottomSheet.classList.contains('half-open') && !DOM.bottomSheet.classList.contains('fully-open')) {
        DOM.bottomSheet.classList.add('half-open');
      } else if (DOM.bottomSheet.classList.contains('half-open')) {
        DOM.bottomSheet.classList.remove('half-open');
        DOM.bottomSheet.classList.add('fully-open');
      }
    } else if (deltaY < -60) {
      // Dragged down
      if (DOM.bottomSheet.classList.contains('fully-open')) {
        DOM.bottomSheet.classList.remove('fully-open');
        DOM.bottomSheet.classList.add('half-open');
      } else if (DOM.bottomSheet.classList.contains('half-open')) {
        DOM.bottomSheet.classList.remove('half-open');
      }
    }
  });

  // Cycle heights on click too
  DOM.bottomSheetHandle.addEventListener('click', () => {
    if (!DOM.bottomSheet.classList.contains('half-open') && !DOM.bottomSheet.classList.contains('fully-open')) {
      DOM.bottomSheet.classList.add('half-open');
    } else if (DOM.bottomSheet.classList.contains('half-open')) {
      DOM.bottomSheet.classList.remove('half-open');
      DOM.bottomSheet.classList.add('fully-open');
    } else {
      DOM.bottomSheet.classList.remove('fully-open', 'half-open');
    }
  });
}

/**
 * Calculates current cached file size
 */
async function updateCacheSizeDisplay() {
  if (!('caches' in window)) {
    DOM.cacheSizeLabel.textContent = 'Nicht unterstützt';
    return;
  }

  try {
    let size = 0;
    const keys = await caches.keys();
    for (const key of keys) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      for (const req of requests) {
        const res = await cache.match(req);
        if (res) {
          const blob = await res.blob();
          size += blob.size;
        }
      }
    }
    
    const sizeMb = (size / (1024 * 1024)).toFixed(2);
    DOM.cacheSizeLabel.textContent = `${sizeMb} MB belegt`;
  } catch (e) {
    console.error('Error reading cache size:', e);
    DOM.cacheSizeLabel.textContent = 'Unbekannt';
  }
}

/**
 * PWA Service Worker setup
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[PWA] Service Worker erfolgreich registriert für Scope:', reg.scope);
      })
      .catch(err => {
        console.error('[PWA] Service Worker Registrierung fehlgeschlagen:', err);
      });
  }
}

/**
 * Draws a premium, smooth elevation profile onto all route canvas elements (including clones)
 * @param {Array<Array>} coordinates GPS coordinate list [lon, lat, elevation]
 */
function drawElevationProfile(coordinates) {
  const canvases = document.querySelectorAll('#elevation-profile-canvas');
  if (canvases.length === 0) return;

  // Filter coordinates with valid elevation (index 2)
  const data = coordinates
    .map((coord) => ({
      lon: coord[0],
      lat: coord[1],
      ele: coord.length >= 3 && coord[2] !== null ? coord[2] : 0
    }));

  if (data.length === 0) return;

  // Compute cumulative distance along the path for the X axis
  let cumulativeDist = 0;
  const dataPoints = [{ dist: 0, ele: data[0].ele }];
  
  for (let i = 1; i < data.length; i++) {
    const c1 = data[i-1];
    const c2 = data[i];
    const d = Routing.calculateHaversine(c1.lat, c1.lon, c2.lat, c2.lon);
    cumulativeDist += d / 1000; // in km
    dataPoints.push({ dist: cumulativeDist, ele: c2.ele });
  }

  const maxDist = cumulativeDist;
  const elevations = dataPoints.map(d => d.ele);
  const minEle = Math.min(...elevations);
  const maxEle = Math.max(...elevations);
  const eleRange = maxEle - minEle;

  // Render on all active canvas instances (original desktop + cloned mobile bottom sheet)
  canvases.forEach(canvas => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset dimensions to match display size for crisp rendering on high-DPI screens
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Padding
    const paddingLeft = 32;
    const paddingRight = 10;
    const paddingTop = 12;
    const paddingBottom = 18;

    const chartW = w - paddingLeft - paddingRight;
    const chartH = h - paddingTop - paddingBottom;

    // Draw horizontal grid lines (elevation)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridCount = 3;
    for (let i = 0; i <= gridCount; i++) {
      const val = minEle + (eleRange * (i / gridCount));
      const y = paddingTop + chartH - (chartH * (i / gridCount));
      
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - paddingRight, y);
      ctx.stroke();

      ctx.fillText(Math.round(val) + 'm', paddingLeft - 6, y);
    }

    // Draw vertical grid lines (distance labels in km)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const distGridCount = 4;
    for (let i = 0; i <= distGridCount; i++) {
      const val = (maxDist * (i / distGridCount));
      const x = paddingLeft + (chartW * (i / distGridCount));

      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, paddingTop + chartH);
      ctx.stroke();

      ctx.fillText(val.toFixed(1) + ' km', x, paddingTop + chartH + 4);
    }

    // Area Gradient Fill
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop + chartH);

    dataPoints.forEach(pt => {
      const x = paddingLeft + (chartW * (pt.dist / (maxDist || 1)));
      const yNorm = eleRange > 0 ? (pt.ele - minEle) / eleRange : 0.5;
      const y = paddingTop + chartH - (chartH * yNorm);
      ctx.lineTo(x, y);
    });

    ctx.lineTo(paddingLeft + chartW, paddingTop + chartH);
    ctx.closePath();

    const areaGrad = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartH);
    areaGrad.addColorStop(0, 'rgba(171, 193, 173, 0.35)'); // Primary color matching (#ABC1AD)
    areaGrad.addColorStop(1, 'rgba(171, 193, 173, 0.00)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Spline/Path Line
    ctx.beginPath();
    dataPoints.forEach((pt, idx) => {
      const x = paddingLeft + (chartW * (pt.dist / (maxDist || 1)));
      const yNorm = eleRange > 0 ? (pt.ele - minEle) / eleRange : 0.5;
      const y = paddingTop + chartH - (chartH * yNorm);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#ABC1AD'; // Primary color matching
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}
