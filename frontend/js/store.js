// store.js - Unified native and local persistent memory state manager for GameBeam

import { findTeam } from './teams_data.js';

const STORE_KEY = 'livescore_user_settings';
const DEFAULT_SETTINGS = {
  theme: 'frostbolt',
  pinnedMatchId: null,
  favourites: {
    teams: [],
    drivers: []
  },
  autoPinFavourites: true,
  autoHideOnFinal: true,
  selectedSport: 'all',
  selectedDateTab: 'today',
  recentSearches: [],
  lastPinnedMatchSnapshot: null,
  overlayPosition: {
    anchor: 'top-right',
    offsetX: 20,
    offsetY: 48,
    lastX: null,
    lastY: null
  },
  clickThrough: false
};

class Store {
  constructor() {
    this.data = { ...DEFAULT_SETTINGS };
    this.subscribers = new Set();
    this.init();
  }

  sanitizeSettings(settings) {
    if (!settings || typeof settings !== 'object') return { ...DEFAULT_SETTINGS };
    
    // Cleanse any legacy mock IDs
    if (settings.pinnedMatchId && (
      settings.pinnedMatchId.includes('ars_che') || 
      settings.pinnedMatchId.includes('kc_buf') || 
      settings.pinnedMatchId.startsWith('epl:live:')
    )) {
      settings.pinnedMatchId = null;
    }

    // Ensure favourites structures exist
    if (!settings.favourites || typeof settings.favourites !== 'object') {
      settings.favourites = { teams: [], drivers: [] };
    }
    if (!Array.isArray(settings.favourites.teams)) {
      settings.favourites.teams = [];
    }
    if (!Array.isArray(settings.favourites.drivers)) {
      settings.favourites.drivers = [];
    }
    if (!Array.isArray(settings.recentSearches)) {
      settings.recentSearches = [];
    }

    return { ...DEFAULT_SETTINGS, ...settings };
  }

  async init() {
    // 1. Instant synchronous load from localStorage (fast UI render)
    this.loadFromLocalStorage();
    this.applyTheme(this.data.theme);

    // 2. Asynchronous load from native macOS Application Support file
    if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
      try {
        const nativeMemory = await window.__TAURI__.core.invoke('get_app_memory');
        if (nativeMemory && typeof nativeMemory === 'object' && Object.keys(nativeMemory).length > 0) {
          this.data = this.sanitizeSettings({ ...this.data, ...nativeMemory });
          this.applyTheme(this.data.theme);
          this.syncToLocalStorage();
          this.notify();
        }
      } catch (err) {
        console.warn('[Store] Native memory fetch unavailable, using localStorage fallback:', err);
      }

      // 3. Listen for native memory broadcasts from other windows
      if (window.__TAURI__?.event?.listen) {
        try {
          await window.__TAURI__.event.listen('gamebeam://memory-updated', (event) => {
            if (event.payload && typeof event.payload === 'object') {
              this.data = this.sanitizeSettings({ ...this.data, ...event.payload });
              this.applyTheme(this.data.theme);
              this.notify();
            }
          });
        } catch (err) {
          console.warn('[Store] Tauri event listener error:', err);
        }
      }
    }

    // 4. Cross-window storage events (Picker <-> Overlay sync)
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (e) => {
        if (e.key === STORE_KEY && e.newValue) {
          try {
            this.data = this.sanitizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(e.newValue) });
            this.applyTheme(this.data.theme);
            this.notify();
          } catch (err) {
            console.warn('[Store] Cross-window storage sync parse error:', err);
          }
        }
      });

      window.addEventListener('livescore-settings-changed', (e) => {
        if (e.detail && typeof e.detail === 'object') {
          this.data = this.sanitizeSettings({ ...this.data, ...e.detail });
          this.applyTheme(this.data.theme);
          this.notify();
        }
      });
    }

    this.notify();
  }

  loadFromLocalStorage() {
    if (typeof localStorage === 'undefined' || !localStorage.getItem) return;
    try {
      const item = localStorage.getItem(STORE_KEY);
      if (item) {
        this.data = this.sanitizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(item) });
      }
    } catch (e) {
      console.warn('[Store] LocalStorage read failed:', e);
    }
  }

  syncToLocalStorage() {
    if (typeof localStorage === 'undefined' || !localStorage.setItem) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('[Store] LocalStorage write failed:', e);
    }
  }

  async save() {
    // 1. Immediate sync to local storage
    this.syncToLocalStorage();

    // 2. Persist to native macOS application support directory (survives app updates/cache clears)
    if (typeof window !== 'undefined' && window.__TAURI__?.core?.invoke) {
      try {
        await window.__TAURI__.core.invoke('save_app_memory', { memory: this.data });
      } catch (e) {
        console.warn('[Store] Native save_app_memory error:', e);
      }
    }

    // 3. Notify same-process windows
    if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('livescore-settings-changed', { detail: this.data }));
    }
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    callback(this.data);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const sub of this.subscribers) {
      try {
        sub(this.data);
      } catch (e) {
        console.error('[Store] Subscriber callback error:', e);
      }
    }
  }

  /* --- Navigation & Memory State --- */

  getSelectedSport() {
    return this.data.selectedSport || 'all';
  }

  setSelectedSport(sportKey) {
    if (!sportKey) return;
    this.data.selectedSport = String(sportKey).toLowerCase();
    this.save();
  }

  getSelectedDateTab() {
    return this.data.selectedDateTab || 'today';
  }

  setSelectedDateTab(tabKey) {
    if (!tabKey) return;
    this.data.selectedDateTab = String(tabKey).toLowerCase();
    this.save();
  }

  getRecentSearches() {
    return this.data.recentSearches || [];
  }

  addRecentSearch(query) {
    const q = String(query || '').trim();
    if (!q || q.length < 2) return;
    
    let list = this.data.recentSearches || [];
    list = [q, ...list.filter(item => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    this.data.recentSearches = list;
    this.save();
  }

  clearRecentSearches() {
    this.data.recentSearches = [];
    this.save();
  }

  getLastPinnedMatchSnapshot() {
    return this.data.lastPinnedMatchSnapshot || null;
  }

  setLastPinnedMatchSnapshot(snapshot) {
    this.data.lastPinnedMatchSnapshot = snapshot;
    this.save();
  }

  /* --- Theme --- */

  getTheme() {
    return this.data.theme || 'frostbolt';
  }

  setTheme(themeName) {
    if (themeName !== 'frostbolt' && themeName !== 'regrowth') return;
    this.data.theme = themeName;
    this.applyTheme(themeName);
    this.save();
  }

  toggleTheme() {
    const next = this.data.theme === 'frostbolt' ? 'regrowth' : 'frostbolt';
    this.setTheme(next);
  }

  applyTheme(themeName) {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', themeName);
    }
  }

  /* --- Pinned Match State --- */

  getPinnedMatchId() {
    return this.data.pinnedMatchId;
  }

  setPinnedMatchId(id, snapshot = null) {
    this.data.pinnedMatchId = id;
    if (snapshot) {
      this.data.lastPinnedMatchSnapshot = snapshot;
    } else if (!id) {
      this.data.lastPinnedMatchSnapshot = null;
    }
    this.save();
  }

  isPinned(id) {
    return this.data.pinnedMatchId === id;
  }

  /* --- Automation Settings --- */

  isAutoPinFavouritesEnabled() {
    return this.data.autoPinFavourites !== false;
  }

  setAutoPinFavourites(enabled) {
    this.data.autoPinFavourites = Boolean(enabled);
    this.save();
  }

  isAutoHideOnFinalEnabled() {
    return this.data.autoHideOnFinal !== false;
  }

  setAutoHideOnFinal(enabled) {
    this.data.autoHideOnFinal = Boolean(enabled);
    this.save();
  }

  /* --- Favourite Teams & Drivers --- */

  getFavouriteTeams() {
    return this.data.favourites.teams || [];
  }

  isFavouriteTeam(identifier, sport = null) {
    if (!identifier) return false;
    const teams = this.data.favourites.teams || [];
    if (teams.length === 0) return false;

    // If identifier is an object: { id, abbreviation, abbrev, name, sport, ... }
    if (typeof identifier === 'object') {
      const id = String(identifier.id || '');
      const sp = identifier.sport || sport || '';
      const abbrev = (identifier.abbreviation || identifier.abbrev || '').toUpperCase();
      const name = (identifier.name || '').toLowerCase();

      return teams.some(fav => {
        const strFav = String(fav);
        if (sp && (strFav === `${sp}:${id}` || strFav === `${sp}:${abbrev}`)) return true;
        if (strFav === id) return true;
        if (abbrev && strFav.toUpperCase() === abbrev) return true;
        if (name && strFav.toLowerCase() === name) return true;
        if (id && strFav.endsWith(`:${id}`)) return true;
        return false;
      });
    }

    const str = String(identifier);
    if (teams.includes(str)) return true;

    // Check with sport prefix
    if (sport && teams.includes(`${sport}:${str}`)) return true;

    // Check if any item in teams matches ID or abbrev suffix
    const suffixMatch = teams.some(fav => {
      const strFav = String(fav);
      if (strFav === str) return true;
      if (strFav.endsWith(`:${str}`)) return true;
      if (str.endsWith(`:${strFav}`)) return true;
      return false;
    });
    if (suffixMatch) return true;

    // Look up via teams directory (e.g. query might be "LAD" or "Chiefs")
    const lookup = findTeam(str, sport);
    if (lookup) {
      return teams.some(fav => {
        const strFav = String(fav);
        if (strFav === `${lookup.sport}:${lookup.id}`) return true;
        if (strFav === lookup.id) return true;
        if (strFav.toUpperCase() === lookup.abbrev.toUpperCase()) return true;
        return false;
      });
    }

    return false;
  }

  toggleFavouriteTeam(identifier, sport = null) {
    const teams = this.data.favourites.teams;
    let key = '';

    if (typeof identifier === 'object') {
      const sp = identifier.sport || sport;
      const id = identifier.id;
      key = sp ? `${sp}:${id}` : String(id);
    } else {
      key = sport ? `${sport}:${identifier}` : String(identifier);
    }

    // Check if already in list (either exact or sport-qualified match)
    const existingIdx = teams.findIndex(fav => {
      const s = String(fav);
      if (s === key) return true;
      if (typeof identifier === 'object' && identifier.id) {
        if (s === String(identifier.id)) return true;
        if (s.endsWith(`:${identifier.id}`)) return true;
      } else {
        if (s.endsWith(`:${identifier}`)) return true;
        if (String(identifier).endsWith(`:${s}`)) return true;
      }
      return false;
    });

    if (existingIdx >= 0) {
      teams.splice(existingIdx, 1);
    } else {
      teams.push(key);
    }
    this.save();
  }

  isFavouriteDriver(driverNameOrAbbrev) {
    return (this.data.favourites.drivers || []).includes(driverNameOrAbbrev);
  }

  toggleFavouriteDriver(driverNameOrAbbrev) {
    const list = this.data.favourites.drivers || [];
    const idx = list.indexOf(driverNameOrAbbrev);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(driverNameOrAbbrev);
    }
    this.data.favourites.drivers = list;
    this.save();
  }

  /* --- Overlay Position --- */

  getOverlayPosition() {
    return this.data.overlayPosition;
  }

  setOverlayPosition(pos) {
    this.data.overlayPosition = { ...this.data.overlayPosition, ...pos };
    this.save();
  }

  /* --- Full Memory Controls --- */

  getMemorySnapshot() {
    return JSON.parse(JSON.stringify(this.data));
  }

  clearAllMemory() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
  }
}

export const appStore = new Store();

