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
import { Overpass } from './overpass.js';

// Application State
const State = {
  profileMapping: {
    'cycling-regular': 'trekking',
    'cycling-road': 'cycling-road',
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
  brouterOptions: {},
  magicStartCoord: null,
  longPressCoord: null,
  longPressTriggered: false,
  overpassLayerGroup: null,
  overpassRoutes: [] // Array of loaded Overpass route objects
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
  
  // Mobile Bottom Sheet & Panels
  bottomSheet: document.getElementById('bottom-sheet'),
  bottomSheetHandle: document.querySelector('.bottom-sheet-handle'),
  sheetSummaryDist: document.getElementById('sheet-summary-dist'),
  sheetSummaryDur: document.getElementById('sheet-summary-dur'),
  sheetActionBtn: document.getElementById('sheet-action-btn'),
  
  // Floating Search Bar & Undo Button
  floatingSearchBar: document.getElementById('floating-search-bar'),
  hamburgerMenuBtn: document.getElementById('hamburger-menu-btn'),
  searchBarInput: document.getElementById('search-bar-input'),
  quickOptionsBtn: document.getElementById('quick-options-btn'),
  searchBarResults: document.getElementById('search-bar-results'),
  quickOptionsPanel: document.getElementById('quick-options-panel'),
  mapUndoBtn: document.getElementById('map-undo-btn'),
  offlineMapsBtn: document.getElementById('offline-maps-btn'),

  // Bottom Sheet Containers
  sheetPlanningContainer: document.getElementById('sheet-planning-container'),
  sheetResultsContainer: document.getElementById('sheet-results-container'),
  tabBtnRoute: document.getElementById('tab-btn-route'),
  tabBtnSettings: document.getElementById('tab-btn-settings'),
  tabContentRoute: document.getElementById('tab-content-route'),
  tabContentSettings: document.getElementById('tab-content-settings'),
  resultsBackBtn: document.getElementById('results-back-btn'),
  navigationInstructions: document.getElementById('navigation-instructions'),

  // Long Press Actions
  longPressActions: document.getElementById('long-press-actions'),
  longPressAddress: document.getElementById('long-press-address'),
  longPressStartBtn: document.getElementById('long-press-start-btn'),
  longPressWpBtn: document.getElementById('long-press-wp-btn'),
  longPressCancelBtn: document.getElementById('long-press-cancel-btn'),

  // Activities selector
  activityBikeBtn: document.getElementById('activity-bike-btn'),
  activityFootBtn: document.getElementById('activity-foot-btn'),

  // Level 1 Settings
  settingsProfileSelect: document.getElementById('settings-profile-select'),
  settingsAsphaltSelect: document.getElementById('settings-asphalt-select'),
  settingsAvoidUnsafe: document.getElementById('settings-avoid-unsafe'),
  settingsAvoidSteep: document.getElementById('settings-avoid-steep'),
  settingsOfflineCache: document.getElementById('settings-offline-cache'),

  // Level 2 Settings Sliders & Toggles
  settingsSliderUnpaved: document.getElementById('settings-slider-unpaved'),
  settingsSliderPath: document.getElementById('settings-slider-path'),
  settingsToggleNoise: document.getElementById('settings-toggle-noise'),
  settingsToggleRiver: document.getElementById('settings-toggle-river'),
  settingsToggleForest: document.getElementById('settings-toggle-forest'),
  settingsToggleTown: document.getElementById('settings-toggle-town'),
  settingsToggleFerries: document.getElementById('settings-toggle-ferries'),
  settingsToggleSteps: document.getElementById('settings-toggle-steps'),
  settingsToggleTraffic: document.getElementById('settings-toggle-traffic'),

  // Level 3 Settings
  settingsSliderCobblestone: document.getElementById('settings-slider-cobblestone'),
  settingsSliderSandmud: document.getElementById('settings-slider-sandmud'),
  settingsToggleOneway: document.getElementById('settings-toggle-oneway'),
  settingsCyclerouteSelect: document.getElementById('settings-cycleroute-select'),
  settingsToggleProposedCycleways: document.getElementById('settings-toggle-proposed-cycleways'),
  settingsToggleTunnel: document.getElementById('settings-toggle-tunnel'),
  settingsSliderUphill: document.getElementById('settings-slider-uphill'),
  settingsSliderDownhill: document.getElementById('settings-slider-downhill'),

  // Map Stats Ticker
  mapStatsTicker: document.getElementById('map-stats-ticker'),
  tickerDistVal: document.getElementById('ticker-dist-val'),
  tickerElevVal: document.getElementById('ticker-elev-val'),

  // MagicTrack AI Modal
  magicTrackBtn: document.getElementById('magic-track-btn'),
  magicTrackModal: document.getElementById('magic-track-modal'),
  closeMagicModalBtn: document.getElementById('close-magic-modal-btn'),
  magicStartInput: document.getElementById('magic-start-input'),
  magicGpsBtn: document.getElementById('magic-gps-btn'),
  magicGpsStatus: document.getElementById('magic-gps-status'),
  magicFreeText: document.getElementById('magic-free-text'),
  magicLengthMin: document.getElementById('magic-length-min'),
  magicLengthMax: document.getElementById('magic-length-max'),
  magicLengthTrack: document.getElementById('magic-length-track'),
  magicLengthVal: document.getElementById('magic-length-val'),
  magicTimeMin: document.getElementById('magic-time-min'),
  magicTimeMax: document.getElementById('magic-time-max'),
  magicTimeTrack: document.getElementById('magic-time-track'),
  magicTimeVal: document.getElementById('magic-time-val'),
  magicEffortSelect: document.getElementById('magic-effort-select'),
  magicGenerateBtn: document.getElementById('magic-generate-btn'),
  magicInputState: document.getElementById('magic-input-state'),
  magicLoadingState: document.getElementById('magic-loading-state'),
  magicResultState: document.getElementById('magic-result-state'),
  magicLoadingTitle: document.getElementById('magic-loading-title'),
  magicLoadingDesc: document.getElementById('magic-loading-desc'),
  magicStep1: document.getElementById('magic-step-1'),
  magicStep2: document.getElementById('magic-step-2'),
  magicStep3: document.getElementById('magic-step-3'),
  magicResultReply: document.getElementById('magic-result-reply'),
  magicResultWaypoints: document.getElementById('magic-result-waypoints'),
  magicResultApplyBtn: document.getElementById('magic-result-apply-btn'),
  magicResultEditBtn: document.getElementById('magic-result-edit-btn'),
  searchMapRoutesBtn: document.getElementById('search-map-routes-btn'),
  overpassPanel: document.getElementById('overpass-routes-panel'),
  closeOverpassBtn: document.getElementById('close-overpass-btn'),
  overpassLoading: document.getElementById('overpass-loading'),
  overpassRouteListUl: document.getElementById('overpass-route-list-ul')
};

// Init application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Leaflet Map
  MapController.init();
  State.overpassLayerGroup = L.layerGroup().addTo(MapController.map);
  
  // Load settings (BRouter Profiles & Mappings)
  loadSettings();
  
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Load Saved Routes
  renderSavedRoutes();
  
  // Setup Event Listeners
  setupEventListeners();
  
  // Setup MagicTrack Modal
  initMagicTrack();
  
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

function syncBRouterCheckboxes() {
  const opts = State.brouterOptions;

  // Let's set defaults for any missing options
  const getOpt = (key, def) => opts[key] !== undefined ? opts[key] : def;

  // Level 1
  if (DOM.settingsProfileSelect) DOM.settingsProfileSelect.value = getOpt('profile', State.activeProfile);
  
  // Asphalt select active state
  const asphaltVal = getOpt('asphalt_preference', 'any');
  if (DOM.settingsAsphaltSelect) {
    DOM.settingsAsphaltSelect.querySelectorAll('.segment-btn').forEach(btn => {
      if (btn.dataset.value === asphaltVal) {
        btn.classList.add('active');
        btn.style.backgroundColor = 'var(--color-primary)';
        btn.style.color = '#121214';
      } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    });
  }

  // Toggles Level 1
  if (DOM.settingsAvoidUnsafe) DOM.settingsAvoidUnsafe.checked = !!getOpt('avoid_unsafe', false);
  if (DOM.settingsAvoidSteep) DOM.settingsAvoidSteep.checked = !!getOpt('avoid_steep', false);
  if (DOM.settingsOfflineCache) DOM.settingsOfflineCache.checked = !!getOpt('offline_cache', true);

  // Sliders Level 2
  const unpavedVal = getOpt('unpaved_preference', 5);
  if (DOM.settingsSliderUnpaved) DOM.settingsSliderUnpaved.value = unpavedVal;
  updateSliderLabel('unpaved', unpavedVal);

  const pathVal = getOpt('path_preference', 5);
  if (DOM.settingsSliderPath) DOM.settingsSliderPath.value = pathVal;
  updateSliderLabel('path', pathVal);

  // Toggles Level 2
  if (DOM.settingsToggleNoise) DOM.settingsToggleNoise.checked = !!getOpt('consider_noise', false);
  if (DOM.settingsToggleRiver) DOM.settingsToggleRiver.checked = !!getOpt('consider_river', false);
  if (DOM.settingsToggleForest) DOM.settingsToggleForest.checked = !!getOpt('consider_forest', false);
  if (DOM.settingsToggleTown) DOM.settingsToggleTown.checked = !!getOpt('consider_town', false);
  if (DOM.settingsToggleFerries) DOM.settingsToggleFerries.checked = !!getOpt('allow_ferries', true);
  if (DOM.settingsToggleSteps) DOM.settingsToggleSteps.checked = !!getOpt('allow_steps', true);
  if (DOM.settingsToggleTraffic) DOM.settingsToggleTraffic.checked = !!getOpt('consider_traffic', false);

  // Sliders Level 3
  const cobbleVal = getOpt('cobblestone_preference', 1);
  if (DOM.settingsSliderCobblestone) DOM.settingsSliderCobblestone.value = cobbleVal;
  updateSliderLabel('cobblestone', cobbleVal);

  const sandmudVal = getOpt('sandmud_preference', 1);
  if (DOM.settingsSliderSandmud) DOM.settingsSliderSandmud.value = sandmudVal;
  updateSliderLabel('sandmud', sandmudVal);

  // Cycleroute focus selector active state
  const cycleFocusVal = getOpt('cycleroute_focus', 'neutral');
  if (DOM.settingsCyclerouteSelect) {
    DOM.settingsCyclerouteSelect.querySelectorAll('.segment-btn').forEach(btn => {
      if (btn.dataset.value === cycleFocusVal) {
        btn.classList.add('active');
        btn.style.backgroundColor = 'var(--color-primary)';
        btn.style.color = '#121214';
      } else {
        btn.classList.remove('active');
        btn.style.backgroundColor = 'transparent';
        btn.style.color = 'var(--text-muted)';
      }
    });
  }

  // Toggles Level 3
  if (DOM.settingsToggleOneway) DOM.settingsToggleOneway.checked = !!getOpt('ignore_oneway', false);
  if (DOM.settingsToggleProposedCycleways) DOM.settingsToggleProposedCycleways.checked = !!getOpt('use_proposed_cycleroutes', false);
  if (DOM.settingsToggleTunnel) DOM.settingsToggleTunnel.checked = !!getOpt('avoid_tunnel', false);

  // Sliders Level 3 Tuning
  const uphillVal = getOpt('uphillcost', 0);
  if (DOM.settingsSliderUphill) DOM.settingsSliderUphill.value = uphillVal;
  if (document.getElementById('slider-val-uphill')) document.getElementById('slider-val-uphill').textContent = uphillVal;

  const downhillVal = getOpt('downhillcost', 0);
  if (DOM.settingsSliderDownhill) DOM.settingsSliderDownhill.value = downhillVal;
  if (document.getElementById('slider-val-downhill')) document.getElementById('slider-val-downhill').textContent = downhillVal;

  // Sync to Map Quick Options Panel checkboxes (if they exist)
  if (DOM.brouterAllowSteps) DOM.brouterAllowSteps.checked = !!getOpt('allow_steps', true);
  if (DOM.brouterAllowFerries) DOM.brouterAllowFerries.checked = !!getOpt('allow_ferries', true);
  if (DOM.brouterAvoidUnsafe) DOM.brouterAvoidUnsafe.checked = !!getOpt('avoid_unsafe', false);
  if (DOM.brouterConsiderElevation) DOM.brouterConsiderElevation.checked = !!getOpt('avoid_steep', false);
  if (DOM.brouterStickToCycleroutes) DOM.brouterStickToCycleroutes.checked = (cycleFocusVal === 'prefer');
}

function updateSliderLabel(type, val) {
  const el = document.getElementById(`slider-val-${type}`);
  if (!el) return;
  if (type === 'unpaved' || type === 'path') {
    if (val < 5) el.textContent = 'Bevorzugen';
    else if (val == 5) el.textContent = 'Egal';
    else el.textContent = 'Meiden';
  } else if (type === 'cobblestone' || type === 'sandmud') {
    if (val == 1) el.textContent = 'Egal';
    else if (val < 5) el.textContent = 'Leicht meiden';
    else if (val < 9) el.textContent = 'Meiden';
    else el.textContent = 'Stark meiden';
  }
}

function updateActivityUI(profile) {
  const isHiking = profile === 'foot-hiking' || profile === 'hiking';
  
  // Update active button state
  if (isHiking) {
    if (DOM.activityBikeBtn) DOM.activityBikeBtn.classList.remove('active');
    if (DOM.activityBikeBtn) DOM.activityBikeBtn.style.color = 'var(--text-muted)';
    if (DOM.activityFootBtn) DOM.activityFootBtn.classList.add('active');
    if (DOM.activityFootBtn) DOM.activityFootBtn.style.color = '#121214';
  } else {
    if (DOM.activityBikeBtn) DOM.activityBikeBtn.classList.add('active');
    if (DOM.activityBikeBtn) DOM.activityBikeBtn.style.color = '#121214';
    if (DOM.activityFootBtn) DOM.activityFootBtn.classList.remove('active');
    if (DOM.activityFootBtn) DOM.activityFootBtn.style.color = 'var(--text-muted)';
  }

  // Hide cycling-only elements
  const bikeElements = document.querySelectorAll('.class-cycle-only');
  bikeElements.forEach(el => {
    if (isHiking) {
      el.style.setProperty('display', 'none', 'important');
    } else {
      el.style.removeProperty('display');
    }
  });

  // Hide "Nur Asphalt" option for Wandern (Hiking)
  const onlyAsphaltBtn = document.querySelector('#settings-asphalt-select [data-value="only_asphalt"]');
  if (onlyAsphaltBtn) {
    if (isHiking) {
      onlyAsphaltBtn.style.display = 'none';
      // Reset if it was active
      if (State.brouterOptions.asphalt_preference === 'only_asphalt') {
        State.brouterOptions.asphalt_preference = 'any';
        Storage.saveBRouterOptions(State.brouterOptions);
      }
    } else {
      onlyAsphaltBtn.style.display = '';
    }
  }
}

function loadSettings() {
  State.routingEngine = Storage.getRoutingEngine();
  State.apiKey = Storage.getApiKey();
  State.brouterOptions = Storage.getBRouterOptions();

  if (DOM.routingEngineSelect) {
    DOM.routingEngineSelect.value = State.routingEngine;
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

  updateActivityUI(State.activeProfile);
  syncBRouterCheckboxes();

  // Restore active map layer preference
  const savedLayer = localStorage.getItem('active_map_layer');
  if (savedLayer) {
    // Delay execution slightly so MapController.init has finished
    setTimeout(() => {
      MapController.switchLayer(savedLayer);
      // Sync active button class in layer selector menu
      const layerOptions = document.querySelectorAll('.layer-option');
      layerOptions.forEach(opt => {
        if (opt.dataset.layer === savedLayer) opt.classList.add('active');
        else opt.classList.remove('active');
      });
    }, 200);
  }

  // Restore planned route
  try {
    const savedRoute = localStorage.getItem('planned_route');
    if (savedRoute) {
      const parsed = JSON.parse(savedRoute);
      if (Array.isArray(parsed) && parsed.length > 0) {
        State.routePoints = parsed;
        
        // Truncate search bar on startup if points exist (Clean Map Mode)
        if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.add('search-hidden');
        if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.remove('hidden');

        // Delay execution slightly so map is ready
        setTimeout(() => {
          updateSearchInputsFromPoints();
          renderRoutePoints();
          if (State.routePoints.length >= 2) {
            calculateAndDisplayRoute();
          }
        }, 500);
      }
    }
  } catch (err) {
    console.error('Failed to restore planned route from localStorage:', err);
  }
}

function setupEventListeners() {
  // Sidebar Toggles
  if (DOM.hamburgerMenuBtn) {
    DOM.hamburgerMenuBtn.addEventListener('click', () => DOM.sidebar.classList.add('open'));
  }
  if (DOM.closeSidebarBtn) {
    DOM.closeSidebarBtn.addEventListener('click', () => DOM.sidebar.classList.remove('open'));
  }

  // Quick Options Toggle
  if (DOM.quickOptionsBtn) {
    DOM.quickOptionsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      DOM.quickOptionsPanel.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
      if (DOM.quickOptionsPanel && !DOM.quickOptionsPanel.contains(e.target) && e.target !== DOM.quickOptionsBtn) {
        DOM.quickOptionsPanel.classList.add('hidden');
      }
    });
  }

  // Offline Karten Button in Sidebar
  if (DOM.offlineMapsBtn) {
    DOM.offlineMapsBtn.addEventListener('click', () => {
      alert('Offline-Karten aktiv: Der Cache speichert alle angezeigten Kartenabschnitte automatisch im Hintergrund.');
      DOM.sidebar.classList.remove('open');
    });
  }

  // Settings Modal
  const openSettings = async () => {
    DOM.settingsModal.classList.remove('hidden');
    await updateCacheSizeDisplay();
  };
  if (DOM.settingsBtnDesktop) DOM.settingsBtnDesktop.addEventListener('click', openSettings);
  
  if (DOM.closeModalBtn) DOM.closeModalBtn.addEventListener('click', () => DOM.settingsModal.classList.add('hidden'));
  if (DOM.saveSettingsBtn) {
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
  }

  // Bottom Sheet Tabs
  if (DOM.tabBtnRoute && DOM.tabBtnSettings) {
    DOM.tabBtnRoute.addEventListener('click', () => {
      DOM.tabBtnRoute.classList.add('active');
      DOM.tabBtnSettings.classList.remove('active');
      DOM.tabContentRoute.classList.remove('hidden');
      DOM.tabContentSettings.classList.add('hidden');
    });
    DOM.tabBtnSettings.addEventListener('click', () => {
      DOM.tabBtnSettings.classList.add('active');
      DOM.tabBtnRoute.classList.remove('active');
      DOM.tabContentSettings.classList.remove('hidden');
      DOM.tabContentRoute.classList.add('hidden');
    });
  }

  // Results back button to planning mode
  if (DOM.resultsBackBtn) {
    DOM.resultsBackBtn.addEventListener('click', () => {
      DOM.sheetPlanningContainer.classList.remove('hidden');
      DOM.sheetResultsContainer.classList.add('hidden');
      
      // Also restore search bar if it was hidden
      if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.remove('search-hidden');
      if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.add('hidden');
    });
  }

  // Undo button for clean map mode
  if (DOM.mapUndoBtn) {
    DOM.mapUndoBtn.addEventListener('click', () => {
      if (State.routePoints.length > 0) {
        State.routePoints.pop();
        updateSearchInputsFromPoints();
        renderRoutePoints();
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute();
        } else {
          MapController.clearRouteGraphics();
          if (DOM.routeInfoSection) DOM.routeInfoSection.classList.add('hidden');
          // If all points removed, restore search bar
          if (State.routePoints.length === 0) {
            if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.remove('search-hidden');
            if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.add('hidden');
            if (DOM.searchBarInput) DOM.searchBarInput.value = '';
          }
        }
      }
    });
  }

  // Setup settings accordions
  const accordionTriggers = document.querySelectorAll('.accordion-trigger');
  accordionTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const targetId = trigger.dataset.target;
      const content = document.getElementById(targetId);
      if (!content) return;
      const isCollapsed = content.classList.contains('collapsed');
      
      if (isCollapsed) {
        content.classList.remove('collapsed');
        content.style.display = 'flex';
        trigger.classList.add('active');
      } else {
        content.classList.add('collapsed');
        content.style.display = 'none';
        trigger.classList.remove('active');
      }
    });
  });


  if (DOM.activityBikeBtn) {
    DOM.activityBikeBtn.addEventListener('click', () => {
      State.activeProfile = 'cycling-regular';
      localStorage.setItem('naviapp_active_profile', 'cycling-regular');
      
      // Update BRouter options base profile
      State.brouterOptions.profile = 'cycling-regular';
      Storage.saveBRouterOptions(State.brouterOptions);
      
      updateActivityUI('cycling-regular');
      syncBRouterCheckboxes();

      // Update profile button UI
      const profileBtns = document.querySelectorAll('.profile-btn');
      profileBtns.forEach(btn => {
        if (btn.dataset.profile === 'cycling-regular') btn.classList.add('active');
        else btn.classList.remove('active');
      });

      if (State.routePoints.length >= 2) {
        calculateAndDisplayRoute(true);
      }
    });
  }

  if (DOM.activityFootBtn) {
    DOM.activityFootBtn.addEventListener('click', () => {
      State.activeProfile = 'foot-hiking';
      localStorage.setItem('naviapp_active_profile', 'foot-hiking');
      
      // Update BRouter options base profile
      State.brouterOptions.profile = 'foot-hiking';
      Storage.saveBRouterOptions(State.brouterOptions);
      
      updateActivityUI('foot-hiking');
      syncBRouterCheckboxes();

      // Update profile button UI
      const profileBtns = document.querySelectorAll('.profile-btn');
      profileBtns.forEach(btn => {
        if (btn.dataset.profile === 'foot-hiking') btn.classList.add('active');
        else btn.classList.remove('active');
      });

      if (State.routePoints.length >= 2) {
        calculateAndDisplayRoute(true);
      }
    });
  }

  if (DOM.settingsProfileSelect) {
    DOM.settingsProfileSelect.addEventListener('change', (e) => {
      const prof = e.target.value;
      State.activeProfile = prof;
      localStorage.setItem('naviapp_active_profile', prof);
      
      // Update BRouter options
      State.brouterOptions.profile = prof;
      Storage.saveBRouterOptions(State.brouterOptions);

      const isHiking = prof === 'foot-hiking';
      updateActivityUI(prof);

      // Sync standard profile buttons too
      const profileBtns = document.querySelectorAll('.profile-btn');
      profileBtns.forEach(btn => {
        if (btn.dataset.profile === (isHiking ? 'foot-hiking' : 'cycling-regular')) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      if (State.routePoints.length >= 2) {
        calculateAndDisplayRoute(true);
      }
    });
  }

  if (DOM.settingsAsphaltSelect) {
    DOM.settingsAsphaltSelect.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        State.brouterOptions.asphalt_preference = val;
        Storage.saveBRouterOptions(State.brouterOptions);
        syncBRouterCheckboxes();
        
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute(true);
        }
      });
    });
  }

  if (DOM.settingsCyclerouteSelect) {
    DOM.settingsCyclerouteSelect.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        State.brouterOptions.cycleroute_focus = val;
        Storage.saveBRouterOptions(State.brouterOptions);
        syncBRouterCheckboxes();
        
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute(true);
        }
      });
    });
  }

  // Define all settings toggles/inputs mapping
  const optionMappings = [
    { el: DOM.settingsAvoidUnsafe, key: 'avoid_unsafe' },
    { el: DOM.settingsAvoidSteep, key: 'avoid_steep' },
    { el: DOM.settingsOfflineCache, key: 'offline_cache' },
    { el: DOM.settingsToggleNoise, key: 'consider_noise' },
    { el: DOM.settingsToggleRiver, key: 'consider_river' },
    { el: DOM.settingsToggleForest, key: 'consider_forest' },
    { el: DOM.settingsToggleTown, key: 'consider_town' },
    { el: DOM.settingsToggleFerries, key: 'allow_ferries' },
    { el: DOM.settingsToggleSteps, key: 'allow_steps' },
    { el: DOM.settingsToggleTraffic, key: 'consider_traffic' },
    { el: DOM.settingsToggleOneway, key: 'ignore_oneway' },
    { el: DOM.settingsToggleProposedCycleways, key: 'use_proposed_cycleroutes' },
    { el: DOM.settingsToggleTunnel, key: 'avoid_tunnel' }
  ];

  optionMappings.forEach(m => {
    if (m.el) {
      m.el.addEventListener('change', (e) => {
        State.brouterOptions[m.key] = e.target.checked;
        Storage.saveBRouterOptions(State.brouterOptions);
        syncBRouterCheckboxes();
        
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute(true);
        }
      });
    }
  });

  // Map Quick Options Panel checkboxes (bidirectional syncing)
  const quickMappings = [
    { el: DOM.brouterAllowSteps, key: 'allow_steps' },
    { el: DOM.brouterAllowFerries, key: 'allow_ferries' },
    { el: DOM.brouterAvoidUnsafe, key: 'avoid_unsafe' },
    { el: DOM.brouterConsiderElevation, key: 'avoid_steep' }
  ];

  quickMappings.forEach(m => {
    if (m.el) {
      m.el.addEventListener('change', (e) => {
        State.brouterOptions[m.key] = e.target.checked;
        Storage.saveBRouterOptions(State.brouterOptions);
        syncBRouterCheckboxes();
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute(true);
        }
      });
    }
  });

  if (DOM.brouterStickToCycleroutes) {
    DOM.brouterStickToCycleroutes.addEventListener('change', (e) => {
      State.brouterOptions.cycleroute_focus = e.target.checked ? 'prefer' : 'neutral';
      Storage.saveBRouterOptions(State.brouterOptions);
      syncBRouterCheckboxes();
      if (State.routePoints.length >= 2) {
        calculateAndDisplayRoute(true);
      }
    });
  }

  // Sliders mapping
  const sliders = [
    { el: DOM.settingsSliderUnpaved, type: 'unpaved', key: 'unpaved_preference' },
    { el: DOM.settingsSliderPath, type: 'path', key: 'path_preference' },
    { el: DOM.settingsSliderCobblestone, type: 'cobblestone', key: 'cobblestone_preference' },
    { el: DOM.settingsSliderSandmud, type: 'sandmud', key: 'sandmud_preference' },
    { el: DOM.settingsSliderUphill, type: 'uphill', key: 'uphillcost' },
    { el: DOM.settingsSliderDownhill, type: 'downhill', key: 'downhillcost' }
  ];

  sliders.forEach(s => {
    if (s.el) {
      s.el.addEventListener('input', (e) => {
        const val = e.target.value;
        if (s.type === 'uphill' || s.type === 'downhill') {
          const label = document.getElementById(`slider-val-${s.type}`);
          if (label) label.textContent = val;
        } else {
          updateSliderLabel(s.type, val);
        }
      });

      s.el.addEventListener('change', (e) => {
        State.brouterOptions[s.key] = parseInt(e.target.value);
        Storage.saveBRouterOptions(State.brouterOptions);
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute(true);
        }
      });
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

  setupAddressSearch(DOM.searchBarInput, DOM.searchBarResults, (loc) => {
    // When search item is selected, it acts as destination (Zielort)
    if (State.routePoints.length === 0) {
      State.routePoints = [
        { name: 'Mein Standort', lat: 0, lon: 0 },
        loc
      ];
    } else if (State.routePoints.length === 1) {
      State.routePoints.push(loc);
    } else {
      State.routePoints[1] = loc;
    }
    
    // Try to set current location as start if start lat/lon is 0
    if (State.routePoints[0] && State.routePoints[0].lat === 0 && Geolocation.currentPosition) {
      State.routePoints[0] = {
        name: 'Mein Standort',
        lat: Geolocation.currentPosition.lat,
        lon: Geolocation.currentPosition.lng
      };
    }
    
    updateSearchInputsFromPoints();
    renderRoutePoints();
    
    // Open Bottom Sheet in planning mode (Zustand 1)
    DOM.sheetPlanningContainer.classList.remove('hidden');
    DOM.sheetResultsContainer.classList.add('hidden');
    DOM.bottomSheet.classList.add('half-open');
    
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
    // Avoid double trigger if long press was just executed
    if (State.longPressTriggered) {
      State.longPressTriggered = false;
      return;
    }

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
    
    // Clean Map Mode: slide search bar up and show undo button
    if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.add('search-hidden');
    if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.remove('hidden');

    updateSearchInputsFromPoints();
    renderRoutePoints();
    triggerAutoRouting();
  });

  // Long-press detection on Map
  let pressTimer = null;
  const cancelPressTimer = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  MapController.map.on('mousedown', (e) => {
    cancelPressTimer();
    // Only trigger for primary clicks
    if (e.originalEvent && e.originalEvent.button !== 0) return;
    pressTimer = setTimeout(() => {
      handleMapLongPress(e.latlng);
    }, 600);
  });

  MapController.map.on('mouseup mousemove zoomstart dragstart', cancelPressTimer);

  MapController.map.on('touchstart', (e) => {
    cancelPressTimer();
    if (e.latlng) {
      pressTimer = setTimeout(() => {
        handleMapLongPress(e.latlng);
      }, 600);
    }
  });

  MapController.map.on('touchend touchmove', cancelPressTimer);

  async function handleMapLongPress(latlng) {
    State.longPressTriggered = true;
    
    // Highlight pin on map
    MapController.setLongPressMarker(latlng);
    
    // Save to temp state
    State.longPressCoord = {
      name: `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`,
      lat: latlng.lat,
      lon: latlng.lng
    };

    // Open Bottom Sheet in planning mode (Zustand 1)
    DOM.sheetPlanningContainer.classList.remove('hidden');
    DOM.sheetResultsContainer.classList.add('hidden');
    DOM.bottomSheet.classList.add('half-open');

    // Show long press actions overlay
    DOM.longPressActions.classList.remove('hidden');
    DOM.longPressAddress.textContent = 'Suche Adresse...';

    // Reverse geocode address in background
    try {
      const address = await Routing.reverseGeocode(latlng.lat, latlng.lng);
      if (address) {
        State.longPressCoord.name = address;
        DOM.longPressAddress.textContent = address;
      } else {
        DOM.longPressAddress.textContent = `Kartenpunkt (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
      DOM.longPressAddress.textContent = `Kartenpunkt (${latlng.lat.toFixed(4)}, ${latlng.lng.toFixed(4)})`;
    }
  }

  // Long-press Actions Button wiring
  if (DOM.longPressStartBtn) {
    DOM.longPressStartBtn.addEventListener('click', () => {
      if (State.longPressCoord) {
        if (State.routePoints.length === 0) {
          State.routePoints.push(State.longPressCoord);
        } else {
          State.routePoints[0] = State.longPressCoord;
        }
        
        // Clean Map Mode trigger
        if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.add('search-hidden');
        if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.remove('hidden');
        
        updateSearchInputsFromPoints();
        renderRoutePoints();
        
        DOM.longPressActions.classList.add('hidden');
        MapController.clearLongPressMarker();
        State.longPressCoord = null;
        
        triggerAutoRouting();
      }
    });
  }

  if (DOM.longPressWpBtn) {
    DOM.longPressWpBtn.addEventListener('click', () => {
      if (State.longPressCoord) {
        State.routePoints.push(State.longPressCoord);
        
        // Clean Map Mode trigger
        if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.add('search-hidden');
        if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.remove('hidden');
        
        updateSearchInputsFromPoints();
        renderRoutePoints();
        
        DOM.longPressActions.classList.add('hidden');
        MapController.clearLongPressMarker();
        State.longPressCoord = null;
        
        triggerAutoRouting();
      }
    });
  }

  if (DOM.longPressCancelBtn) {
    DOM.longPressCancelBtn.addEventListener('click', () => {
      DOM.longPressActions.classList.add('hidden');
      MapController.clearLongPressMarker();
      State.longPressCoord = null;
    });
  }

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
      
      // Update BRouter options base profile
      State.brouterOptions.profile = State.activeProfile;
      Storage.saveBRouterOptions(State.brouterOptions);

      updateActivityUI(State.activeProfile);
      syncBRouterCheckboxes();

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
      const selectedLayer = e.target.dataset.layer;
      layerOptions.forEach(o => o.classList.remove('active'));
      e.target.classList.add('active');
      MapController.switchLayer(selectedLayer);
      localStorage.setItem('active_map_layer', selectedLayer);
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
  // Overpass Route Search Action Event Listeners
  const updateSearchBtnState = () => {
    if (!DOM.searchMapRoutesBtn) return;
    const currentZoom = MapController.map.getZoom();
    if (currentZoom < 13) {
      DOM.searchMapRoutesBtn.classList.add('disabled');
      DOM.searchMapRoutesBtn.title = 'Bitte zoome weiter hinein, um die Suche zu aktivieren.';
    } else {
      DOM.searchMapRoutesBtn.classList.remove('disabled');
      DOM.searchMapRoutesBtn.title = 'Nach Wander- und Fahrradrouten im Kartenausschnitt suchen';
    }
  };

  if (DOM.searchMapRoutesBtn) {
    DOM.searchMapRoutesBtn.addEventListener('click', () => {
      if (DOM.searchMapRoutesBtn.classList.contains('disabled')) {
        alert('Der Kartenausschnitt ist zu groß. Bitte zoome weiter hinein (mindestens Zoom-Stufe 13), um Routen zu suchen.');
        return;
      }
      performOverpassSearch();
    });
  }

  if (DOM.closeOverpassBtn) {
    DOM.closeOverpassBtn.addEventListener('click', () => {
      DOM.overpassPanel.classList.add('hidden');
      if (State.overpassLayerGroup) {
        State.overpassLayerGroup.clearLayers();
      }
    });
  }

  MapController.map.on('zoomend', updateSearchBtnState);
  // Initial run to set correct state based on initial zoom
  setTimeout(updateSearchBtnState, 200);

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
    if (!pt) return; // safeguard against null points
    const li = document.createElement('li');
    li.className = 'saved-item drag-item';
    li.draggable = true;
    li.dataset.index = i;
    li.style.padding = '8px 10px';
    li.style.margin = '4px 0';
    li.style.background = 'rgba(255,255,255,0.03)';
    li.style.borderRadius = '8px';
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.cursor = 'grab';
    
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
        <span class="badge" style="background-color: ${badgeColor}; color: #121214; font-size: 0.68rem; padding: 2px 5px; flex-shrink: 0; user-select: none;">${label}</span>
        <span style="font-size: 0.82rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; user-select: none;">${shortName}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
        ${i > 0 ? `
          <button class="move-point-btn" data-index="${i}" data-dir="up" title="Nach oben verschieben" style="background: transparent; border: none; color: var(--text-dimmed); cursor: pointer; padding: 2px;">
            <i data-lucide="chevron-up" style="width: 14px; height: 14px;"></i>
          </button>
        ` : ''}
        ${i < State.routePoints.length - 1 ? `
          <button class="move-point-btn" data-index="${i}" data-dir="down" title="Nach unten verschieben" style="background: transparent; border: none; color: var(--text-dimmed); cursor: pointer; padding: 2px;">
            <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
          </button>
        ` : ''}
        <button class="delete-point-btn" data-index="${i}" title="Wegpunkt löschen" style="background: transparent; border: none; color: var(--text-dimmed); cursor: pointer; padding: 2px;">
          <i data-lucide="x" style="width: 14px; height: 14px;"></i>
        </button>
      </div>
    `;

    // Delete Button Listener
    li.querySelector('.delete-point-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(e.currentTarget.dataset.index);
      removeRoutePoint(index);
    });

    // Move Button Listener (Up/Down)
    li.querySelectorAll('.move-point-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const dir = btn.dataset.dir;
        const targetIndex = dir === 'up' ? index - 1 : index + 1;
        const moved = State.routePoints.splice(index, 1)[0];
        State.routePoints.splice(targetIndex, 0, moved);
        updateSearchInputsFromPoints();
        renderRoutePoints();
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute();
        }
      });
    });

    // HTML5 Drag and Drop Events
    li.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i);
      li.classList.add('dragging');
      li.style.cursor = 'grabbing';
    });

    li.addEventListener('dragend', () => {
      li.classList.remove('dragging');
      li.style.cursor = 'grab';
    });

    li.addEventListener('dragover', (e) => {
      e.preventDefault();
      li.classList.add('drag-over');
    });

    li.addEventListener('dragleave', () => {
      li.classList.remove('drag-over');
    });

    li.addEventListener('drop', (e) => {
      e.preventDefault();
      li.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = i;
      if (fromIdx !== toIdx) {
        const moved = State.routePoints.splice(fromIdx, 1)[0];
        State.routePoints.splice(toIdx, 0, moved);
        updateSearchInputsFromPoints();
        renderRoutePoints();
        if (State.routePoints.length >= 2) {
          calculateAndDisplayRoute();
        }
      }
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

  // Autosave current route planning
  localStorage.setItem('planned_route', JSON.stringify(State.routePoints));
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
 * Overpass API route search operations
 */
async function performOverpassSearch() {
  if (!State.overpassLayerGroup) return;

  // Clear previous layers & UI list
  State.overpassLayerGroup.clearLayers();
  DOM.overpassRouteListUl.innerHTML = '';
  State.overpassRoutes = [];

  // Show panel and loading spinner
  DOM.overpassPanel.classList.remove('hidden');
  DOM.overpassLoading.classList.remove('hidden');

  const bounds = MapController.map.getBounds();

  try {
    const routes = await Overpass.searchRoutes(bounds);
    DOM.overpassLoading.classList.add('hidden');
    State.overpassRoutes = routes;

    if (routes.length === 0) {
      DOM.overpassRouteListUl.innerHTML = '<li style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">Keine Routen in diesem Kartenausschnitt gefunden.</li>';
      return;
    }

    // Render routes
    routes.forEach((route, index) => {
      // Create Leaflet Polyline/MultiPolyline
      // Cycle is blue, hiking is emerald green
      const color = route.type === 'Fahrrad' ? '#3b82f6' : '#10b981';
      
      route.polyline = L.polyline(route.geometry, {
        color: color,
        weight: 4,
        opacity: 0.65,
        dashArray: '4, 6',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(State.overpassLayerGroup);

      // Tooltip
      route.polyline.bindTooltip(route.name, { sticky: true });

      // Click on map polyline -> highlight in list
      route.polyline.on('click', () => {
        selectOverpassRoute(index);
      });

      // Create List Item
      const li = document.createElement('li');
      li.className = 'overpass-route-item';
      li.dataset.index = index;
      li.innerHTML = `
        <span class="overpass-route-name">${route.name}</span>
        <span class="overpass-route-type" style="color: ${color};">${route.type}</span>
      `;
      
      li.addEventListener('click', () => {
        selectOverpassRoute(index, true);
      });

      DOM.overpassRouteListUl.appendChild(li);
    });

  } catch (err) {
    DOM.overpassLoading.classList.add('hidden');
    DOM.overpassRouteListUl.innerHTML = `<li style="text-align: center; color: #ef4444; font-size: 0.85rem; padding: 20px 0;">Fehler bei der Suche: ${err.message}</li>`;
  }
}

let lastSelectedOverpassIndex = null;
function selectOverpassRoute(index, zoomTo = false) {
  const route = State.overpassRoutes[index];
  if (!route) return;

  // Reset last selected route styling
  if (lastSelectedOverpassIndex !== null && State.overpassRoutes[lastSelectedOverpassIndex]) {
    const prevRoute = State.overpassRoutes[lastSelectedOverpassIndex];
    const prevColor = prevRoute.type === 'Fahrrad' ? '#3b82f6' : '#10b981';
    prevRoute.polyline.setStyle({
      weight: 4,
      opacity: 0.65,
      dashArray: '4, 6'
    });
  }

  // Highlight new route
  route.polyline.setStyle({
    weight: 7,
    opacity: 1.0,
    dashArray: null
  });
  route.polyline.bringToFront();

  // Highlight list item
  const listItems = DOM.overpassRouteListUl.querySelectorAll('.overpass-route-item');
  listItems.forEach(li => {
    if (parseInt(li.dataset.index) === index) {
      li.classList.add('active');
      li.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      li.classList.remove('active');
    }
  });

  lastSelectedOverpassIndex = index;

  if (zoomTo) {
    MapController.map.fitBounds(route.polyline.getBounds());
  }
}


/**
 * Calculates directions via ORS and updates UI & Map
 */
async function calculateAndDisplayRoute(isSettingsChange = false) {
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

    if (isSettingsChange && DOM.tabBtnRoute) {
      DOM.tabBtnRoute.click();
    }

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
  // Standard formatters
  const formattedDist = route.stats.distance.toFixed(1) + ' km';
  const hours = Math.floor(route.stats.duration / 3600);
  const minutes = Math.floor((route.stats.duration % 3600) / 60);
  const formattedDur = `${hours > 0 ? hours + 'h ' : ''}${minutes}m`;
  const gain = `+${route.stats.elevationGain} m`;
  const loss = `-${route.stats.elevationLoss} m`;

  if (DOM.distance) DOM.distance.textContent = formattedDist;
  if (DOM.duration) DOM.duration.textContent = formattedDur;
  if (DOM.elevationGain) DOM.elevationGain.textContent = gain;
  if (DOM.elevationLoss) DOM.elevationLoss.textContent = loss;

  // Mobile Bottom Sheet
  DOM.sheetSummaryDist.textContent = formattedDist;
  DOM.sheetSummaryDur.textContent = formattedDur;
  DOM.sheetActionBtn.classList.remove('hidden');

  // Update map stats ticker
  if (DOM.mapStatsTicker) {
    DOM.mapStatsTicker.classList.remove('hidden');
    if (DOM.tickerDistVal) DOM.tickerDistVal.textContent = formattedDist;
    if (DOM.tickerElevVal) DOM.tickerElevVal.textContent = `↑ ${route.stats.elevationGain}m  ↓ ${route.stats.elevationLoss}m`;
  }

  // Surface rendering
  renderSurfaceBreakdown(route.surfaces);

  // Render elevation profile on canvas
  drawElevationProfile(route.coordinates);

  // Render Turn-by-Turn directions list
  renderNavigationInstructions(route.steps);

  // Render route points list
  renderRoutePoints();

  // Transition Bottom Sheet to Zustand 2 (Results Mode)
  DOM.sheetPlanningContainer.classList.add('hidden');
  DOM.sheetResultsContainer.classList.remove('hidden');
  
  // Expand bottom sheet to half-open
  DOM.bottomSheet.classList.add('half-open');
}

function renderNavigationInstructions(steps) {
  if (!DOM.navigationInstructions) return;
  DOM.navigationInstructions.innerHTML = '';
  if (!steps || steps.length === 0) {
    DOM.navigationInstructions.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-dimmed); text-align: center; padding: 12px 0;">Keine Abbiegehinweise vorhanden.</div>';
    return;
  }

  steps.forEach((step, i) => {
    const el = document.createElement('div');
    el.className = 'instruction-item';
    el.style.display = 'flex';
    el.style.gap = '10px';
    el.style.alignItems = 'flex-start';
    el.style.padding = '8px 10px';
    el.style.background = 'rgba(255,255,255,0.03)';
    el.style.borderRadius = '8px';
    el.style.border = '1px solid var(--color-border)';

    // Get an appropriate icon based on instruction text
    let icon = 'navigation';
    const text = step.instruction.toLowerCase();
    if (text.includes('links') || text.includes('left')) icon = 'arrow-up-left';
    else if (text.includes('rechts') || text.includes('right')) icon = 'arrow-up-right';
    else if (text.includes('geradeaus') || text.includes('straight') || text.includes('weiter')) icon = 'arrow-up';
    else if (text.includes('kreisverkehr') || text.includes('roundabout')) icon = 'rotate-cw';
    else if (text.includes('ankunft') || text.includes('ziel') || text.includes('arrive')) icon = 'flag';

    el.innerHTML = `
      <div style="background: rgba(16, 185, 129, 0.1); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--color-primary);">
        <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i>
      </div>
      <div style="flex: 1; min-width: 0;">
        <span style="font-size: 0.82rem; color: var(--text-main); display: block; line-height: 1.3;">${step.instruction}</span>
        <span style="font-size: 0.72rem; color: var(--text-dimmed); display: block; margin-top: 2px;">In ${step.distance >= 1000 ? (step.distance / 1000).toFixed(1) + ' km' : Math.round(step.distance) + ' m'}</span>
      </div>
    `;
    DOM.navigationInstructions.appendChild(el);
  });
  lucide.createIcons();
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
  if (DOM.searchBarInput) DOM.searchBarInput.value = '';
  
  DOM.routeInfoSection.classList.add('hidden');
  DOM.longPressActions.classList.add('hidden');
  MapController.clearLongPressMarker();

  // Clean Map Mode Reset
  if (DOM.floatingSearchBar) DOM.floatingSearchBar.classList.remove('search-hidden');
  if (DOM.mapUndoBtn) DOM.mapUndoBtn.classList.add('hidden');
  
  // Reset Bottom sheet
  DOM.sheetSummaryDist.textContent = '0.0 km';
  DOM.sheetSummaryDur.textContent = '00:00';
  DOM.bottomSheet.classList.remove('half-open', 'fully-open');

  // Show planning and hide results container
  DOM.sheetPlanningContainer.classList.remove('hidden');
  DOM.sheetResultsContainer.classList.add('hidden');
  
  MapController.clearRouteGraphics();
  renderRoutePoints();

  // Remove autosave route
  localStorage.removeItem('planned_route');

  // Hide map stats ticker
  if (DOM.mapStatsTicker) DOM.mapStatsTicker.classList.add('hidden');
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

/**
 * Initialisiert das MagicTrack AI Modal, Event Listener und Slider-Dynamik
 */
function initMagicTrack() {
  if (!DOM.magicTrackBtn) return;

  // Hilfsfunktion: Formatierung der Slider-Dauer in Std/Min
  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')} Std` : `${m} Min`;
  };

  // Hilfsfunktion: Update der Slider-Tracks
  const updateSliderTrack = (minEl, maxEl, trackEl, valEl, type) => {
    let minVal = parseInt(minEl.value);
    let maxVal = parseInt(maxEl.value);

    if (minVal > maxVal) {
      if (document.activeElement === minEl) {
        maxEl.value = minVal;
        maxVal = minVal;
      } else {
        minEl.value = maxVal;
        minVal = maxVal;
      }
    }

    if (type === 'length') {
      valEl.textContent = `${minVal} - ${maxVal} km`;
    } else {
      valEl.textContent = `${formatTime(minVal)} - ${formatTime(maxVal)}`;
    }

    const minPercent = ((minVal - minEl.min) / (minEl.max - minEl.min)) * 100;
    const maxPercent = ((maxVal - minEl.min) / (minEl.max - minEl.min)) * 100;
    trackEl.style.background = `linear-gradient(to right, rgba(255, 255, 255, 0.1) ${minPercent}%, var(--color-primary) ${minPercent}%, var(--color-primary) ${maxPercent}%, rgba(255, 255, 255, 0.1) ${maxPercent}%)`;
  };

  // Event Listener für Dual-Slider (Länge)
  if (DOM.magicLengthMin && DOM.magicLengthMax) {
    const updateLength = () => updateSliderTrack(DOM.magicLengthMin, DOM.magicLengthMax, DOM.magicLengthTrack, DOM.magicLengthVal, 'length');
    DOM.magicLengthMin.addEventListener('input', updateLength);
    DOM.magicLengthMax.addEventListener('input', updateLength);
    updateLength(); // Initialer Aufruf
  }

  // Event Listener für Dual-Slider (Dauer)
  if (DOM.magicTimeMin && DOM.magicTimeMax) {
    const updateTime = () => updateSliderTrack(DOM.magicTimeMin, DOM.magicTimeMax, DOM.magicTimeTrack, DOM.magicTimeVal, 'time');
    DOM.magicTimeMin.addEventListener('input', updateTime);
    DOM.magicTimeMax.addEventListener('input', updateTime);
    updateTime(); // Initialer Aufruf
  }

  // Modal öffnen
  DOM.magicTrackBtn.addEventListener('click', () => {
    DOM.magicTrackModal.classList.remove('hidden');
    
    // UI-Zustand zurücksetzen
    DOM.magicInputState.classList.remove('hidden');
    DOM.magicLoadingState.classList.add('hidden');
    DOM.magicResultState.classList.add('hidden');
    DOM.magicGpsStatus.textContent = '';

    // Falls bereits Startpunkt in Hauptanwendung gesetzt, übernehmen
    if (State.routePoints.length > 0) {
      DOM.magicStartInput.value = State.routePoints[0].name;
      State.magicStartCoord = { ...State.routePoints[0] };
    } else {
      DOM.magicStartInput.value = '';
      State.magicStartCoord = null;
    }
  });

  // Modal schließen
  DOM.closeMagicModalBtn.addEventListener('click', () => {
    DOM.magicTrackModal.classList.add('hidden');
  });

  // Schließen bei Klick außerhalb der Modal-Card
  DOM.magicTrackModal.addEventListener('click', (e) => {
    if (e.target === DOM.magicTrackModal) {
      DOM.magicTrackModal.classList.add('hidden');
    }
  });

  // GPS Standortbestimmung im Modal
  DOM.magicGpsBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      DOM.magicGpsStatus.textContent = 'GPS nicht unterstützt';
      DOM.magicGpsStatus.style.color = '#ef4444';
      return;
    }

    DOM.magicGpsStatus.textContent = 'Ermittle Standort...';
    DOM.magicGpsStatus.style.color = 'var(--text-muted)';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        DOM.magicGpsStatus.textContent = 'Suche Adresse...';

        const address = await Routing.reverseGeocode(lat, lon);
        DOM.magicStartInput.value = address;
        State.magicStartCoord = {
          name: address,
          lat: lat,
          lon: lon
        };
        DOM.magicGpsStatus.textContent = 'Standort erfolgreich erfasst';
        DOM.magicGpsStatus.style.color = 'var(--color-primary)';
      },
      (error) => {
        console.error('GPS Modal Error:', error);
        DOM.magicGpsStatus.textContent = 'GPS-Ortung fehlgeschlagen';
        DOM.magicGpsStatus.style.color = '#ef4444';
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });
    // KI-Routen-Generierung
  DOM.magicGenerateBtn.addEventListener('click', async () => {
    const startText = DOM.magicStartInput.value.trim();
    if (!startText) {
      DOM.magicStartInput.focus();
      return;
    }

    // Lade-Zustand aktivieren
    DOM.magicInputState.classList.add('hidden');
    DOM.magicLoadingState.classList.remove('hidden');
    DOM.magicResultState.classList.add('hidden');

    DOM.magicStep1.className = 'loading-step active';
    DOM.magicStep2.className = 'loading-step';
    DOM.magicStep3.className = 'loading-step';
    DOM.magicLoadingTitle.textContent = 'MagicTrack läuft...';
    DOM.magicLoadingDesc.textContent = 'Die KI webt deine perfekte Route zusammen.';

    try {
      // 1. Startkoordinaten validieren / geokodieren falls nötig
      if (!State.magicStartCoord || State.magicStartCoord.name !== startText) {
        DOM.magicLoadingDesc.textContent = 'Geokodiere Startort...';
        const searchRes = await Routing.searchAddress(startText);
        if (searchRes && searchRes.length > 0) {
          State.magicStartCoord = {
            name: searchRes[0].name,
            lat: searchRes[0].lat,
            lon: searchRes[0].lon
          };
        } else {
          throw new Error('Startort konnte nicht geokodiert werden. Bitte gebe einen gültigen Ort an.');
        }
      }

      // 2. POI-Vorabfrage (Overpass API)
      DOM.magicLoadingDesc.textContent = 'Suche reale POIs im Umkreis...';
      const lengthMax = parseInt(DOM.magicLengthMax.value) || 15;
      const radius = Math.min(25000, Math.max(5000, (lengthMax * 1000) / 2));
      const freeText = DOM.magicFreeText.value.trim();

      const poiCandidates = await Overpass.getPOIsAround(
        State.magicStartCoord.lat,
        State.magicStartCoord.lon,
        radius,
        freeText
      );

      // 3. Gemini-API aufrufen (Schritt 1)
      DOM.magicStep1.className = 'loading-step';
      DOM.magicStep2.className = 'loading-step active';
      DOM.magicLoadingDesc.textContent = 'Rufe Gemini-API auf...';

      const lengthMin = parseInt(DOM.magicLengthMin.value);
      const timeMin = parseInt(DOM.magicTimeMin.value);
      const timeMax = parseInt(DOM.magicTimeMax.value);
      const effort = DOM.magicEffortSelect.value;
      const currentProfile = State.activeProfile === 'foot-hiking' ? 'hiking' : 'trekking';

      let routeData = await Routing.generateMagicTrackRoute({
        lengthMin,
        lengthMax,
        timeMin,
        timeMax,
        effort,
        startLocation: State.magicStartCoord.name,
        startLat: State.magicStartCoord.lat,
        startLon: State.magicStartCoord.lon,
        profile: currentProfile,
        freeText,
        poiCandidates
      });

      // 4. BRouter-Route berechnen (Schritt 3)
      DOM.magicStep2.className = 'loading-step';
      DOM.magicStep3.className = 'loading-step active';
      DOM.magicLoadingDesc.textContent = 'Berechne ideale Wegführung...';

      const points = [];
      const semanticWaypoints = routeData.semantic_waypoints || [];

      semanticWaypoints.forEach(wp => {
        if (wp.lat && wp.lon) {
          points.push({
            name: wp.name,
            lat: parseFloat(wp.lat),
            lon: parseFloat(wp.lon),
            description: wp.description || ''
          });
        }
      });

      // Falls keine gültigen Punkte zurückgegeben wurden, Fallback
      if (points.length < 2) {
        points.push(State.magicStartCoord);
        if (poiCandidates.length > 0) {
          points.push(poiCandidates[0]);
        }
        points.push(State.magicStartCoord);
      }

      const resolvedProfile = routeData.brouter_profile || (State.activeProfile === 'foot-hiking' ? 'hiking' : 'trekking');
      const finalRoute = await Routing.getRoute(
        points,
        resolvedProfile,
        State.routingEngine,
        State.apiKey,
        State.brouterOptions
      );

      // Ergebnis speichern
      State.magicResult = {
        route: finalRoute,
        points: points,
        reply: routeData.chat_reply
      };

      // Ergebnis anzeigen
      DOM.magicLoadingState.classList.add('hidden');
      DOM.magicResultState.classList.remove('hidden');

      DOM.magicResultReply.textContent = routeData.chat_reply;

      // Liste der Wegpunkte rendern
      DOM.magicResultWaypoints.innerHTML = '';
      points.forEach((pt, idx) => {
        // Ignoriere den letzten doppelten Zielpunkt in der UI-Liste, falls Start und Ziel identisch sind
        if (idx === points.length - 1 && idx > 0 && pt.lat === points[0].lat && pt.lon === points[0].lon) {
          return;
        }

        const shortName = pt.name.split(',')[0];
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.padding = '6px 0';
        item.style.borderBottom = '1px solid rgba(255,255,255,0.05)';

        const isStart = idx === 0;
        let badgeColor = 'var(--text-dimmed)';
        let label = `${idx + 1}`;
        if (isStart) {
          badgeColor = 'var(--color-secondary)';
          label = 'Start';
        }

        item.innerHTML = `
          <span class="badge" style="background-color: ${badgeColor}; color: #121214; font-size: 0.65rem; padding: 2px 5px; border-radius: 4px; font-weight: bold; width: 34px; text-align: center; display: inline-block; flex-shrink: 0;">${label}</span>
          <div style="display: flex; flex-direction: column; min-width: 0; flex-grow: 1;">
            <span style="font-size: 0.84rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${shortName}</span>
            ${pt.description ? `<span style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${pt.description}</span>` : ''}
          </div>
        `;
        DOM.magicResultWaypoints.appendChild(item);
      });

      // Ein letztes Badge für das Ziel anzeigen, um die Schleife zu verdeutlichen
      if (points.length > 1) {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.gap = '8px';
        item.style.padding = '6px 0';
        item.innerHTML = `
          <span class="badge" style="background-color: var(--color-primary); color: #121214; font-size: 0.65rem; padding: 2px 5px; border-radius: 4px; font-weight: bold; width: 34px; text-align: center; display: inline-block; flex-shrink: 0;">Ziel</span>
          <div style="display: flex; flex-direction: column; min-width: 0; flex-grow: 1;">
            <span style="font-size: 0.84rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">${points[0].name.split(',')[0]}</span>
            <span style="font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Zielort</span>
          </div>
        `;
        DOM.magicResultWaypoints.appendChild(item);
      }

      lucide.createIcons();

    } catch (err) {
      console.error('MagicTrack Error:', err);
      alert('Fehler bei der Generierung: ' + err.message);
      
      // Zurück zum Eingabezustand
      DOM.magicLoadingState.classList.add('hidden');
      DOM.magicInputState.classList.remove('hidden');
    }
  });

  // Route auf Karte anwenden
  DOM.magicResultApplyBtn.addEventListener('click', () => {
    if (!State.magicResult) return;

    DOM.magicTrackModal.classList.add('hidden');

    // 1. State-Variablen anpassen
    State.routePoints = [...State.magicResult.points];
    State.calculatedRoute = State.magicResult.route;

    // 2. UI-Eingabefelder und Listen synchronisieren
    updateSearchInputsFromPoints();
    renderRoutePoints();

    // 3. Route auf Karte zeichnen und einpassen
    MapController.drawRoute(State.magicResult.route.geojson, State.magicResult.route.segments);
    
    // 4. Statistiken in Sidebar und Mobile Sheet rendern
    updateRouteUI(State.magicResult.route);

    // 5. Automatisch im Speicher/Verlauf ablegen
    saveRouteToHistory(State.magicResult.route);
  });

  // Zurück zur Parametereingabe
  DOM.magicResultEditBtn.addEventListener('click', () => {
    DOM.magicResultState.classList.add('hidden');
    DOM.magicInputState.classList.remove('hidden');
  });
}

/**
 * Erstellt Mock-Daten für die Routengenerierung im lokalen Modus
 */
function getMockRouteData(startText, activeProfile) {
  const city = startText.split(',')[0].trim();
  const isHiking = activeProfile === 'foot-hiking';
  if (isHiking) {
    return {
      "chat_reply": `Hier ist ein lokaler Wandervorschlag rund um "${city}". Die Route führt dich durch schöne Naturpfade und Aussichtspunkte der Region.`,
      "brouter_profile": "hiking",
      "semantic_waypoints": [startText, `Aussichtspunkt, ${city}`, `Waldweg, ${city}`, `Park, ${city}`, startText]
    };
  } else {
    return {
      "chat_reply": `Ich habe eine tolle Radroute ab "${city}" zusammengestellt. Wir fahren durch verkehrsarme Straßen und Radwege der Gegend.`,
      "brouter_profile": "trekking",
      "semantic_waypoints": [startText, `Rathaus, ${city}`, `See, ${city}`, `Flussweg, ${city}`, startText]
    };
  }
}
