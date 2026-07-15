/**
 * Storage Module for NaviApp
 * Manages saving API Keys and planned/imported routes in LocalStorage.
 */

const STORAGE_KEYS = {
  API_KEY: 'naviapp_ors_api_key',
  SAVED_ROUTES: 'naviapp_saved_routes',
  ROUTING_PREFS: 'naviapp_brouter_prefs',
  ROUTING_ENGINE: 'naviapp_routing_engine',
  ROUTING_OPTIONS: 'naviapp_brouter_options'
};

export const Storage = {
  /**
   * Retrieves the stored OpenRouteService API Key
   * @returns {string|null} The API Key or null
   */
  getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZjNTA3N2ZkNDU5NjQzYTNhMTgxOWUxNTgwYTE4MTk1IiwiaCI6Im11cm11cjY0In0=';
  },

  /**
   * Saves the OpenRouteService API Key
   * @param {string} key 
   */
  saveApiKey(key) {
    if (key) {
      localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
  },

  /**
   * Gets the active routing engine (default 'brouter')
   * @returns {string} 'brouter' or 'ors'
   */
  getRoutingEngine() {
    return localStorage.getItem(STORAGE_KEYS.ROUTING_ENGINE) || 'brouter';
  },

  /**
   * Saves the active routing engine
   * @param {string} engine 
   */
  saveRoutingEngine(engine) {
    localStorage.setItem(STORAGE_KEYS.ROUTING_ENGINE, engine);
  },

  /**
   * Retrieves the stored BRouter options or default values
   * @returns {Object} BRouter options checklist status
   */
  getBRouterOptions() {
    const defaults = {
      allow_steps: true,
      allow_ferries: true,
      ignore_cycleroutes: false,
      stick_to_cycleroutes: false,
      use_proposed_cycleroutes: false,
      avoid_unsafe: false,
      add_beeline: false,
      consider_noise: false,
      consider_river: false,
      consider_forest: false,
      consider_town: false,
      consider_traffic: false,
      consider_elevation: true
    };
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ROUTING_OPTIONS);
      return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    } catch (e) {
      console.warn('Could not parse stored BRouter options, using defaults:', e);
      return defaults;
    }
  },

  /**
   * Saves the BRouter options
   * @param {Object} options 
   */
  saveBRouterOptions(options) {
    localStorage.setItem(STORAGE_KEYS.ROUTING_OPTIONS, JSON.stringify(options));
  },

  /**
   * Gets all saved routes
   * @returns {Array} List of route objects
   */
  getSavedRoutes() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVED_ROUTES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading saved routes:', e);
      return [];
    }
  },

  /**
   * Saves a new route or updates an existing one
   * @param {Object} route The route data containing geojson, name, stats, and profile
   * @returns {Array} The updated list of routes
   */
  saveRoute(route) {
    const routes = this.getSavedRoutes();
    
    // Add id and timestamp if not present
    if (!route.id) {
      route.id = 'route_' + Date.now();
    }
    route.timestamp = route.timestamp || Date.now();

    // Check for duplicates/updates
    const index = routes.findIndex(r => r.id === route.id);
    if (index !== -1) {
      routes[index] = route;
    } else {
      routes.push(route);
    }

    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(routes));
    return routes;
  },

  /**
   * Deletes a route by its ID
   * @param {string} id 
   * @returns {Array} The updated list of routes
   */
  deleteRoute(id) {
    let routes = this.getSavedRoutes();
    routes = routes.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_ROUTES, JSON.stringify(routes));
    return routes;
  }
};
