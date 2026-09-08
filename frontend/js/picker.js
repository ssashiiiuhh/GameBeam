import { appStore } from './store.js';
import { sportsService } from './sports_service.js';
import { ALL_TEAMS } from './teams_data.js';
import { evaluateAutoPinLifecycle, updateMenuBarScore } from './auto_pin_manager.js';
import {
  LEAGUE_ORDER,
  groupMatchesByLeague,
  calculateSportCounts,
  isMatchForToday,
  isMatchForDateScope,
  getCardSituation,
  renderBasesDiamond,
  renderOutsDots,
  getSportEmoji
} from './homepage_helpers.js';

class MatchPickerController {
  constructor() {
    this.currentFilter = appStore.getSelectedSport() || 'all';
    this.currentDateTab = appStore.getSelectedDateTab() || 'today';
    this.searchQuery = '';
    this.matches = [];
    this.isLoading = false;
    this.lastRefresh = 0;
    this.selectedMatchForDrawer = null;
    this.keyboardFocusedIndex = -1;

    // Settings Team Picker State
    this.teamPickerSport = 'all';
    this.teamPickerSearch = '';

    // DOM Elements
    this.container = document.getElementById('matches-container');
    this.spotlightContainer = document.getElementById('spotlight-container');
    this.searchInput = document.getElementById('search-input');
    this.searchClearBtn = document.getElementById('search-clear-btn');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.settingsToggleBtn = document.getElementById('settings-toggle-btn');
    this.settingsSheet = document.getElementById('settings-sheet');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.closeBtn = document.getElementById('close-picker-btn');
    this.sportPillsContainer = document.getElementById('sport-pills-container');
    this.dateTabsContainer = document.getElementById('date-tabs-container');
    this.todayBadge = document.getElementById('today-badge');
    this.footerStatus = document.getElementById('footer-status-text');
    this.footerPinned = document.getElementById('footer-pinned-summary');

    // Settings Automation & Favourite Teams Controls
    this.settingAutoPin = document.getElementById('setting-auto-pin');
    this.settingAutoHide = document.getElementById('setting-auto-hide');
    this.favTeamsCountBadge = document.getElementById('fav-teams-count-badge');
    this.teamSportTabsContainer = document.getElementById('team-sport-tabs');
    this.teamSearchInput = document.getElementById('team-search-input');
    this.teamsPickerGrid = document.getElementById('teams-picker-grid');

    // Details Drawer Elements
    this.detailsDrawer = document.getElementById('details-drawer');
    this.closeDrawerBtn = document.getElementById('close-drawer-btn');
    this.drawerCompBadge = document.getElementById('drawer-comp-badge');
    this.drawerTitle = document.getElementById('drawer-title');
    this.drawerBody = document.getElementById('drawer-body');
    this.drawerPinBtn = document.getElementById('drawer-pin-btn');
    this.drawerFavBtn = document.getElementById('drawer-fav-btn');

    this.init();
  }

  async init() {
    this.bindEvents();
    this.setupKeyboardNavigation();

    // Initial sync of settings controls
    if (this.settingAutoPin) {
      this.settingAutoPin.checked = appStore.isAutoPinFavouritesEnabled();
    }
    if (this.settingAutoHide) {
      this.settingAutoHide.checked = appStore.isAutoHideOnFinalEnabled();
    }

    // Restore remembered sport filter & date tab pills
    this.sportPillsContainer?.querySelectorAll('.sport-pill').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === this.currentFilter);
    });
    this.dateTabsContainer?.querySelectorAll('.date-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === this.currentDateTab);
    });

    this.renderTeamsGrid();

    // Subscribe to store updates
    appStore.subscribe(settings => {
      this.updatePinnedFooter(settings.pinnedMatchId);
      this.syncThemeButtons(settings.theme);
      this.render();
      this.renderTeamsGrid();
    });

    // Render loading skeleton
    this.renderLoading();

    // Fetch live updates from APIs in parallel
    await this.fetchScores(false);

    // Auto-refresh every 30s when picker is open
    setInterval(() => this.fetchScores(false), 30000);
  }

  renderLoading() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="skeleton" style="height: 104px; margin-bottom: 8px; border-radius: 8px;"></div>
      <div class="skeleton" style="height: 104px; margin-bottom: 8px; border-radius: 8px;"></div>
      <div class="skeleton" style="height: 104px; margin-bottom: 8px; border-radius: 8px;"></div>
      <div class="skeleton" style="height: 104px; margin-bottom: 8px; border-radius: 8px;"></div>
    `;
  }

  bindEvents() {
    // Search input (live filtering)
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').trim().toLowerCase();
      if (this.searchClearBtn) {
        this.searchClearBtn.style.display = this.searchQuery ? 'flex' : 'none';
      }
      this.render();
    });

    // Search clear button
    this.searchClearBtn?.addEventListener('click', () => {
      if (this.searchInput) {
        this.searchInput.value = '';
      }
      this.searchQuery = '';
      this.searchClearBtn.style.display = 'none';
      this.searchInput?.focus();
      this.render();
    });

    // Clear search on Escape
    this.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.searchInput.value = '';
        this.searchQuery = '';
        if (this.searchClearBtn) this.searchClearBtn.style.display = 'none';
        this.searchInput.blur();
        this.render();
      }
    });

    // Theme toggle in header
    this.themeToggleBtn?.addEventListener('click', () => {
      appStore.toggleTheme();
    });

    // Settings sheet toggle
    this.settingsToggleBtn?.addEventListener('click', () => {
      this.settingsSheet?.classList.toggle('open');
    });

    this.closeSettingsBtn?.addEventListener('click', () => {
      this.settingsSheet?.classList.remove('open');
    });

    // Theme buttons inside settings sheet
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.themeSet;
        if (theme) {
          appStore.setTheme(theme);
        }
      });
    });

    // Automation switches in Settings
    this.settingAutoPin?.addEventListener('change', (e) => {
      appStore.setAutoPinFavourites(e.target.checked);
      this.evaluateAndTriggerAutoPin();
    });

    this.settingAutoHide?.addEventListener('change', (e) => {
      appStore.setAutoHideOnFinal(e.target.checked);
    });

    // Team sport tab filters in Settings
    this.teamSportTabsContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.team-tab-btn');
      if (!btn) return;
      this.teamPickerSport = btn.dataset.sport;
      this.teamSportTabsContainer.querySelectorAll('.team-tab-btn').forEach(b => {
        b.classList.toggle('active', b === btn);
      });
      this.renderTeamsGrid();
    });

    // Team search in Settings
    this.teamSearchInput?.addEventListener('input', (e) => {
      this.teamPickerSearch = (e.target.value || '').trim().toLowerCase();
      this.renderTeamsGrid();
    });

    // Refresh button
    this.refreshBtn?.addEventListener('click', () => {
      this.fetchScores(true);
    });

    // Close button (Hides picker window in macOS)
    this.closeBtn?.addEventListener('click', () => {
      this.hidePickerWindow();
    });

    // Sport pills filter
    this.sportPillsContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.sport-pill');
      if (!btn) return;
      const filter = btn.dataset.filter;
      this.setSportFilter(filter);
    });

    // Date tabs filter
    this.dateTabsContainer?.addEventListener('click', (e) => {
      const btn = e.target.closest('.date-tab');
      if (!btn) return;
      const tab = btn.dataset.tab;
      this.setDateTab(tab);
    });

    // Drawer close button
    this.closeDrawerBtn?.addEventListener('click', () => {
      this.closeDetailsDrawer();
    });

    // Drawer Pin button
    this.drawerPinBtn?.addEventListener('click', async () => {
      if (!this.selectedMatchForDrawer) return;
      const matchId = this.selectedMatchForDrawer.id;
      if (appStore.isPinned(matchId)) {
        appStore.setPinnedMatchId(null);
        await this.hideOverlayWindow();
      } else {
        appStore.setPinnedMatchId(matchId, this.selectedMatchForDrawer);
        await this.showOverlayWindow();
      }
      this.openDetailsDrawer(this.selectedMatchForDrawer);
      this.render();
    });

    // Drawer Favourite button
    this.drawerFavBtn?.addEventListener('click', () => {
      if (!this.selectedMatchForDrawer) return;
      const m = this.selectedMatchForDrawer;
      const isFav = appStore.isFavouriteTeam(m.homeTeam, m.sport) || appStore.isFavouriteTeam(m.awayTeam, m.sport);
      if (isFav) {
        if (m.homeTeam) appStore.toggleFavouriteTeam(m.homeTeam, m.sport);
        if (m.awayTeam) appStore.toggleFavouriteTeam(m.awayTeam, m.sport);
      } else {
        if (m.homeTeam) appStore.toggleFavouriteTeam(m.homeTeam, m.sport);
        if (m.awayTeam) appStore.toggleFavouriteTeam(m.awayTeam, m.sport);
      }
      this.openDetailsDrawer(m);
      this.render();
      this.renderTeamsGrid();
      this.evaluateAndTriggerAutoPin();
    });
  }

  async hidePickerWindow() {
    if (window.__TAURI__?.core?.invoke) {
      try {
        await window.__TAURI__.core.invoke('hide_picker_window');
        return;
      } catch (e) {
        console.warn('[Picker] hide_picker_window command failed:', e);
      }
    }
    if (window.__TAURI__?.window?.getCurrentWindow) {
      try {
        await window.__TAURI__.window.getCurrentWindow().hide();
      } catch (e) {
        console.warn('[Picker] getCurrentWindow().hide() failed:', e);
      }
    }
  }

  async showOverlayWindow() {
    await updateMenuBarScore({
      matches: this.matches,
      isOverlayVisible: true,
      isFavouriteTeamFn: (t, sp) => appStore.isFavouriteTeam(t, sp)
    });
    if (window.__TAURI__?.core?.invoke) {
      try {
        await window.__TAURI__.core.invoke('show_overlay_window');
        return;
      } catch (e) {
        console.warn('[Picker] show_overlay_window command failed:', e);
      }
    }
    if (window.__TAURI__?.window?.getAllWindows) {
      try {
        const wins = await window.__TAURI__.window.getAllWindows();
        const overlay = wins.find(w => w.label === 'overlay');
        if (overlay) await overlay.show();
      } catch (e) {
        console.warn('[Picker] Error showing overlay via window API:', e);
      }
    }
  }

  async hideOverlayWindow(completedMatch = null) {
    await updateMenuBarScore({
      matches: this.matches,
      isOverlayVisible: false,
      isFavouriteTeamFn: (t, sp) => appStore.isFavouriteTeam(t, sp),
      specificMatch: completedMatch
    });
    if (window.__TAURI__?.core?.invoke) {
      try {
        await window.__TAURI__.core.invoke('hide_overlay_window');
        return;
      } catch (e) {
        console.warn('[Picker] hide_overlay_window command failed:', e);
      }
    }
    if (window.__TAURI__?.window?.getAllWindows) {
      try {
        const wins = await window.__TAURI__.window.getAllWindows();
        const overlay = wins.find(w => w.label === 'overlay');
        if (overlay) await overlay.hide();
      } catch (e) {
        console.warn('[Picker] Error hiding overlay via window API:', e);
      }
    }
  }

  syncThemeButtons(currentTheme) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themeSet === currentTheme);
    });
  }

  setSportFilter(filter) {
    this.currentFilter = filter;
    appStore.setSelectedSport(filter);
    document.querySelectorAll('.sport-pill').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === filter);
    });

    // If viewing a specific league (e.g. MLB, NFL, NBA) and currently on 'today' with 0 games today,
    // auto-switch date tab to 'upcoming' so the user sees the league's upcoming games immediately
    if (filter !== 'all' && filter !== 'favs' && this.currentDateTab === 'today') {
      const now = new Date();
      const leagueMatches = this.matches.filter(m => {
        if (filter === 'mlb') return m.sport === 'baseball';
        if (filter === 'nfl') return m.sport === 'football';
        if (filter === 'nba') return m.sport === 'basketball';
        return false;
      });
      const todayMatches = leagueMatches.filter(m => isMatchForDateScope(m, 'today', now));
      if (todayMatches.length === 0 && leagueMatches.length > 0) {
        this.setDateTab('upcoming');
        return;
      }
    }

    this.render();
  }

  setDateTab(tab) {
    this.currentDateTab = tab;
    appStore.setSelectedDateTab(tab);
    document.querySelectorAll('.date-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });
    this.render();
  }

  async fetchScores(isManual = false) {
    if (this.isLoading) return;
    this.isLoading = true;

    if (this.refreshBtn && isManual) {
      this.refreshBtn.style.animation = 'spin 0.6s linear infinite';
    }
    if (this.footerStatus) {
      this.footerStatus.textContent = 'Updating...';
    }

    try {
      const realMatches = await sportsService.fetchAllLiveMatches();
      this.matches = realMatches || [];
    } catch (err) {
      console.warn('[Picker] Error fetching live scores:', err);
      this.matches = sportsService.getCachedMatches() || [];
    }

    // Auto-pin check: If autoPinFavourites is enabled, evaluate favourite matches lifecycle!
    if (appStore.isAutoPinFavouritesEnabled()) {
      const autoPin = evaluateAutoPinLifecycle(
        this.matches,
        appStore.data,
        (teamOrId, sp) => appStore.isFavouriteTeam(teamOrId, sp)
      );

      if (autoPin.matchToPin) {
        const currentPinned = appStore.getPinnedMatchId();
        if (currentPinned !== autoPin.matchToPin.id) {
          console.log('[Picker] Auto-pinning live favourite match:', autoPin.matchToPin.id);
          appStore.setPinnedMatchId(autoPin.matchToPin.id);
          await this.showOverlayWindow();
        }
      } else if (autoPin.shouldHideHUD && appStore.isAutoHideOnFinalEnabled()) {
        console.log('[Picker] Auto-hiding HUD as favourite match completed.');
        const completedMatch = autoPin.isCurrentPinnedCompleted ? this.matches.find(m => m.id === appStore.getPinnedMatchId()) : null;
        appStore.setPinnedMatchId(null);
        await this.hideOverlayWindow(completedMatch);
      } else {
        // Fallback: If no match pinned or pinned ID is invalid, pin top real match
        const currentPinned = appStore.getPinnedMatchId();
        if (!currentPinned || !this.matches.some(m => m.id === currentPinned)) {
          const best = sportsService.getBestMatchToPin(this.matches);
          if (best) {
            appStore.setPinnedMatchId(best.id);
          }
        }
      }
    } else {
      // Auto-pin disabled fallback
      const currentPinned = appStore.getPinnedMatchId();
      if (!currentPinned || !this.matches.some(m => m.id === currentPinned)) {
        const best = sportsService.getBestMatchToPin(this.matches);
        if (best) {
          appStore.setPinnedMatchId(best.id);
        }
      }
    }

    this.isLoading = false;
    this.lastRefresh = Date.now();

    if (this.refreshBtn?.style) {
      this.refreshBtn.style.animation = '';
    }

    if (this.footerStatus) {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.footerStatus.textContent = `Updated at ${timeStr} · ${this.matches.length} matches`;
    }

    this.updateTodayBadge();
    this.updateSportPillCounts();
    this.render();
  }

  isMatchForToday(m, now = new Date()) {
    return isMatchForToday(m, now);
  }

  updateTodayBadge() {
    if (!this.todayBadge) return;
    const now = new Date();
    const todayCount = this.matches.filter(m => this.isMatchForToday(m, now)).length;
    this.todayBadge.textContent = String(todayCount);
  }

  updateSportPillCounts() {
    if (!this.sportPillsContainer) return;

    const counts = calculateSportCounts(this.matches, m =>
      appStore.isFavouriteTeam(m.homeTeam, m.sport) ||
      appStore.isFavouriteTeam(m.awayTeam, m.sport) ||
      appStore.isPinned(m.id)
    );

    this.sportPillsContainer.querySelectorAll('.sport-pill').forEach(btn => {
      const filter = btn.dataset.filter;
      const count = counts[filter] ?? 0;
      let countEl = btn.querySelector('.pill-count');
      if (!countEl) {
        countEl = document.createElement('span');
        countEl.className = 'pill-count';
        btn.appendChild(countEl);
      }
      countEl.textContent = String(count);
    });
  }

  getFilteredMatches() {
    const now = new Date();

    const sportMatches = this.matches.filter(m => {
      // 1. Sport filter (Focused strictly on MLB, NFL, NBA, Favs)
      if (this.currentFilter === 'favs') {
        const homeFav = appStore.isFavouriteTeam(m.homeTeam, m.sport);
        const awayFav = appStore.isFavouriteTeam(m.awayTeam, m.sport);
        const isPinned = appStore.isPinned(m.id);
        if (!homeFav && !awayFav && !isPinned) return false;
      } else if (this.currentFilter === 'mlb') {
        if (m.sport !== 'baseball') return false;
      } else if (this.currentFilter === 'nfl') {
        if (m.sport !== 'football') return false;
      } else if (this.currentFilter === 'nba') {
        if (m.sport !== 'basketball') return false;
      }

      // 2. Search query filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        const comp = (m.competitionName || '').toLowerCase();
        const homeName = (m.homeTeam?.name || '').toLowerCase();
        const homeAbbr = (m.homeTeam?.abbreviation || '').toLowerCase();
        const awayName = (m.awayTeam?.name || '').toLowerCase();
        const awayAbbr = (m.awayTeam?.abbreviation || '').toLowerCase();

        const matchesQuery = comp.includes(query) ||
          homeName.includes(query) ||
          homeAbbr.includes(query) ||
          awayName.includes(query) ||
          awayAbbr.includes(query);

        if (!matchesQuery) return false;
      }

      return true;
    });

    // 3. Date Scope Filter (yesterday, today, tomorrow, upcoming, this-week, all)
    const scopedMatches = sportMatches.filter(m => isMatchForDateScope(m, this.currentDateTab, now));

    // If viewing a specific league and today has 0 games, but upcoming games exist,
    // seamlessly include upcoming games so the league fixtures always pull up!
    if (scopedMatches.length === 0 && this.currentDateTab === 'today' && this.currentFilter !== 'all') {
      const upcoming = sportMatches.filter(m => isMatchForDateScope(m, 'upcoming', now));
      if (upcoming.length > 0) {
        return upcoming;
      }
    }

    return scopedMatches;
  }

  renderSpotlight() {
    if (!this.spotlightContainer) return;
    const pinnedId = appStore.getPinnedMatchId();
    let featured = this.matches.find(m => m.id === pinnedId);
    if (!featured) {
      featured = sportsService.getBestMatchToPin(this.matches);
    }

    if (!featured) {
      this.spotlightContainer.innerHTML = '';
      return;
    }

    const isPinned = appStore.isPinned(featured.id);
    const isLive = featured.statusStage === 'in_progress';
    const isFinal = featured.statusStage === 'completed';
    const matchDate = new Date(featured.scheduledStartTime);
    const timeString = matchDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    this.spotlightContainer.innerHTML = `
      <div class="spotlight-card" data-match-id="${featured.id}">
        <div class="spotlight-top">
          <div class="spotlight-badge">
            <span class="live-dot" style="${isLive ? '' : 'display:none;'}"></span>
            <span>${isPinned ? 'Desktop HUD Active' : 'Featured Match'}</span>
          </div>
          <div class="spotlight-actions">
            <button class="spotlight-btn" data-action="toggle-overlay" title="Toggle Floating HUD Overlay">
              ${isPinned ? 'Hide HUD' : 'Float on Desktop'}
            </button>
            <button class="spotlight-btn" data-action="cycle-spotlight" title="Cycle Next Match">
              Next &gt;
            </button>
            ${isPinned ? `<button class="spotlight-btn" data-action="unpin-spotlight" title="Unpin Match">&times;</button>` : ''}
          </div>
        </div>

        <div class="spotlight-body">
          <!-- Away -->
          <div class="spotlight-team away">
            ${featured.awayTeam.logoUrl 
              ? `<img class="spotlight-logo" src="${featured.awayTeam.logoUrl}" alt="" onerror="this.style.display='none';">` 
              : ''}
            <div class="spotlight-team-meta">
              <div class="spotlight-team-name">${featured.awayTeam.shortName || featured.awayTeam.name}</div>
              <div class="spotlight-team-record">${featured.awayTeam.record || (featured.awayTeam.isHome ? 'Home' : 'Away')}</div>
            </div>
          </div>

          <!-- Score / Clock -->
          <div class="spotlight-score-board">
            <div class="spotlight-scores">
              <span>${isLive || isFinal ? featured.awayTeam.score : '-'}</span>
              <span class="spotlight-score-divider">:</span>
              <span>${isLive || isFinal ? featured.homeTeam.score : '-'}</span>
            </div>
            <div class="spotlight-status">${featured.statusDisplay || (isFinal ? 'FINAL' : timeString)}</div>
          </div>

          <!-- Home -->
          <div class="spotlight-team home">
            <div class="spotlight-team-meta">
              <div class="spotlight-team-name">${featured.homeTeam.shortName || featured.homeTeam.name}</div>
              <div class="spotlight-team-record">${featured.homeTeam.record || (featured.homeTeam.isHome ? 'Home' : 'Away')}</div>
            </div>
            ${featured.homeTeam.logoUrl 
              ? `<img class="spotlight-logo" src="${featured.homeTeam.logoUrl}" alt="" onerror="this.style.display='none';">` 
              : ''}
          </div>
        </div>

        <div class="spotlight-situation">
          <span>${this.getCardSituation(featured)}</span>
          <span style="font-weight: 600; cursor: pointer; color: var(--color-accent-light);" data-action="open-details">Details &rarr;</span>
        </div>
      </div>
    `;

    // Bind spotlight card action buttons
    const cardEl = this.spotlightContainer.querySelector('.spotlight-card');
    cardEl?.querySelector('[data-action="toggle-overlay"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (appStore.isPinned(featured.id)) {
        appStore.setPinnedMatchId(null);
        await this.hideOverlayWindow();
      } else {
        appStore.setPinnedMatchId(featured.id, featured);
        await this.showOverlayWindow();
      }
      this.render();
    });

    cardEl?.querySelector('[data-action="cycle-spotlight"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      this.cyclePinnedMatch(1);
    });

    cardEl?.querySelector('[data-action="open-details"]')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openDetailsDrawer(featured);
    });

    cardEl?.querySelector('[data-action="unpin-spotlight"]')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      appStore.setPinnedMatchId(null);
      await this.hideOverlayWindow();
      this.render();
    });

    cardEl?.addEventListener('click', () => {
      this.openDetailsDrawer(featured);
    });
  }

  cyclePinnedMatch(direction = 1) {
    if (!this.matches || this.matches.length === 0) return;
    const currentPinned = appStore.getPinnedMatchId();
    const idx = this.matches.findIndex(m => m.id === currentPinned);
    let nextIdx = idx + direction;
    if (nextIdx < 0) nextIdx = this.matches.length - 1;
    if (nextIdx >= this.matches.length) nextIdx = 0;
    const nextMatch = this.matches[nextIdx];
    if (nextMatch) {
      appStore.setPinnedMatchId(nextMatch.id, nextMatch);
      this.render();
    }
  }

  render() {
    if (!this.container) return;

    // 1. Render Spotlight Hero Card
    this.renderSpotlight();

    // 2. Filter matches
    const filtered = this.getFilteredMatches();

    if (filtered.length === 0) {
      this.renderEmptyState();
      return;
    }

    // 3. Group by League/Competition
    const groups = groupMatchesByLeague(filtered);

    let html = '';
    for (const group of groups) {
      html += `
        <section class="league-section">
          <div class="league-section-header">
            <div class="league-header-left">
              <span>${group.emoji}</span>
              <span>${group.name}</span>
            </div>
            <span class="league-header-count">${group.matches.length}</span>
          </div>
          ${group.matches.map(m => this.renderMatchCard(m)).join('')}
        </section>
      `;
    }

    this.container.innerHTML = html;
    this.bindCardActions();
    this.updateKeyboardFocus();
  }

  renderEmptyState() {
    let msg = 'No fixtures found';
    let sub = 'Try adjusting your filters or search query.';

    if (this.currentFilter === 'favs') {
      msg = 'No favourite teams yet';
      sub = 'Click the ★ star on any match card to save your favourite teams.';
    } else if (this.searchQuery) {
      msg = `No matches for "${this.searchQuery}"`;
      sub = 'Check spelling or clear the search query.';
    } else if (this.currentDateTab === 'today') {
      msg = 'No matches scheduled today';
      sub = 'Check the "This Week", "Upcoming", or "All" tabs to see scheduled fixtures.';
    }

    this.container.innerHTML = `
      <div class="empty-state">
        <div style="font-size: 28px; margin-bottom: 4px;">🏆</div>
        <div style="font-weight: 700; color: var(--text-primary); font-size: 14px;">${msg}</div>
        <div style="font-size: 12px; color: var(--text-muted); max-width: 260px; line-height: 1.4;">${sub}</div>
      </div>
    `;
  }

  renderBasesDiamond(runners = {}) {
    return renderBasesDiamond(runners);
  }

  renderOutsDots(outs = 0) {
    return renderOutsDots(outs);
  }

  renderMatchCard(m) {
    const isPinned = appStore.isPinned(m.id);
    const isFav = appStore.isFavouriteTeam(m.homeTeam, m.sport) || appStore.isFavouriteTeam(m.awayTeam, m.sport);
    const isLive = m.statusStage === 'in_progress';
    const isFinal = m.statusStage === 'completed';

    const matchDate = new Date(m.scheduledStartTime);
    const timeString = matchDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Winner detection
    const awayScore = m.awayTeam?.score ?? 0;
    const homeScore = m.homeTeam?.score ?? 0;
    const isAwayWinner = isFinal && awayScore > homeScore;
    const isHomeWinner = isFinal && homeScore > awayScore;

    // In-game telemetry / situation
    const situation = this.getCardSituation(m);
    const hasTelemetry = (m.sport === 'baseball' && isLive) || (m.sport === 'football' && isLive) || (isLive && situation);

    // Status column sub-indicator
    let statusSub = '';
    if (isLive) {
      if (m.sport === 'baseball' && m.sportDetails?.inning) {
        statusSub = `${m.sportDetails.half === 'top' ? '▲' : '▼'} ${m.sportDetails.inning}`;
      } else if (m.sport === 'football' && m.sportDetails?.quarter) {
        statusSub = `Q${m.sportDetails.quarter}`;
      } else if (m.sport === 'basketball' && m.sportDetails?.quarter) {
        statusSub = `Q${m.sportDetails.quarter}`;
      }
    } else if (isFinal) {
      statusSub = 'Final';
    } else {
      const isToday = isMatchForDateScope(m, 'today', new Date());
      const isTomorrow = isMatchForDateScope(m, 'tomorrow', new Date());
      if (isTomorrow) {
        statusSub = 'Tomorrow';
      } else if (!isToday && !isNaN(matchDate.getTime())) {
        statusSub = matchDate.toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
      } else {
        statusSub = 'Scheduled';
      }
    }

    return `
      <div class="match-card ${isPinned ? 'pinned' : ''}" data-match-id="${m.id}">
        <!-- Column 1: Status / Clock -->
        <div class="match-col-status">
          ${isLive 
            ? `<div class="sofa-status-pill live"><span class="live-dot"></span><span>LIVE</span></div>`
            : (isFinal 
                ? `<div class="sofa-status-pill final"><span>FT</span></div>`
                : `<div class="sofa-status-pill"><span>${timeString}</span></div>`)}
          <span class="sofa-time-sub">${statusSub}</span>
        </div>

        <!-- Column 2: Main Matchup (Away / Home) -->
        <div class="match-col-main">
          <!-- Away Row -->
          <div class="sofa-team-row">
            <div class="sofa-team-identity">
              ${m.awayTeam?.logoUrl 
                ? `<img class="sofa-team-logo" src="${m.awayTeam.logoUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : ''}
              <div class="sofa-team-badge" style="${m.awayTeam?.logoUrl ? 'display:none;' : ''}">
                ${(m.awayTeam?.abbreviation || 'AWY').slice(0, 3)}
              </div>
              <span class="sofa-team-name ${isAwayWinner ? 'winner' : (isHomeWinner ? 'loser' : '')}">
                ${m.awayTeam?.name || m.awayTeam?.shortName || 'Away'}
              </span>
              ${m.awayTeam?.record ? `<span class="sofa-team-record">(${m.awayTeam.record})</span>` : ''}
            </div>
            <div class="sofa-team-score ${isAwayWinner ? 'winner' : (isHomeWinner ? 'loser' : '')}">
              ${(isLive || isFinal) ? awayScore : '-'}
            </div>
          </div>

          <!-- Home Row -->
          <div class="sofa-team-row">
            <div class="sofa-team-identity">
              ${m.homeTeam?.logoUrl 
                ? `<img class="sofa-team-logo" src="${m.homeTeam.logoUrl}" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                : ''}
              <div class="sofa-team-badge" style="${m.homeTeam?.logoUrl ? 'display:none;' : ''}">
                ${(m.homeTeam?.abbreviation || 'HOM').slice(0, 3)}
              </div>
              <span class="sofa-team-name ${isHomeWinner ? 'winner' : (isAwayWinner ? 'loser' : '')}">
                ${m.homeTeam?.name || m.homeTeam?.shortName || 'Home'}
              </span>
              ${m.homeTeam?.record ? `<span class="sofa-team-record">(${m.homeTeam.record})</span>` : ''}
            </div>
            <div class="sofa-team-score ${isHomeWinner ? 'winner' : (isAwayWinner ? 'loser' : '')}">
              ${(isLive || isFinal) ? homeScore : '-'}
            </div>
          </div>

          <!-- In-Game Telemetry Row (Bases diamond, outs, down/distance) -->
          ${hasTelemetry ? `
            <div class="sofa-telemetry-row">
              ${m.sport === 'baseball' && isLive && m.sportDetails?.baseRunners ? this.renderBasesDiamond(m.sportDetails.baseRunners) : ''}
              <span>${situation}</span>
              ${m.sport === 'baseball' && isLive ? this.renderOutsDots(m.sportDetails?.outs ?? 0) : ''}
            </div>
          ` : ''}
        </div>

        <!-- Column 3: Quick Pin & Favorite Actions -->
        <div class="match-col-actions">
          <button class="sofa-pin-btn ${isPinned ? 'active' : ''}" data-action="pin" title="${isPinned ? 'Unpin Desktop HUD' : 'Pin Desktop HUD'}">
            ${isPinned ? '✓' : '📌'}
          </button>
          <button class="sofa-fav-btn ${isFav ? 'active' : ''}" data-action="fav" title="Toggle Favourite">
            ★
          </button>
        </div>
      </div>
    `;
  }

  bindCardActions() {
    this.container.querySelectorAll('.match-card').forEach(card => {
      const matchId = card.dataset.matchId;
      const match = this.matches.find(m => m.id === matchId);
      if (!match) return;

      // Pin button
      card.querySelector('[data-action="pin"]')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (appStore.isPinned(matchId)) {
          appStore.setPinnedMatchId(null);
          await this.hideOverlayWindow();
        } else {
          appStore.setPinnedMatchId(matchId, match);
          await this.showOverlayWindow();
        }
        this.render();
      });

      // Fav button
      card.querySelector('[data-action="fav"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isFav = appStore.isFavouriteTeam(match.homeTeam, match.sport) || appStore.isFavouriteTeam(match.awayTeam, match.sport);
        if (isFav) {
          if (match.homeTeam) appStore.toggleFavouriteTeam(match.homeTeam, match.sport);
          if (match.awayTeam) appStore.toggleFavouriteTeam(match.awayTeam, match.sport);
        } else {
          if (match.homeTeam) appStore.toggleFavouriteTeam(match.homeTeam, match.sport);
          if (match.awayTeam) appStore.toggleFavouriteTeam(match.awayTeam, match.sport);
        }
        this.render();
        this.renderTeamsGrid();
        this.evaluateAndTriggerAutoPin();
      });

      // Clicking card body opens Details Drawer
      card.addEventListener('click', () => {
        this.openDetailsDrawer(match);
      });
    });
  }

  openDetailsDrawer(match) {
    if (!this.detailsDrawer || !match) return;
    this.selectedMatchForDrawer = match;

    if (this.drawerTitle) {
      this.drawerTitle.textContent = `${match.awayTeam.name} vs ${match.homeTeam.name}`;
    }
    if (this.drawerCompBadge) {
      this.drawerCompBadge.textContent = match.competitionName || 'Game';
    }

    const isLive = match.statusStage === 'in_progress';
    const isFinal = match.statusStage === 'completed';
    const isPinned = appStore.isPinned(match.id);
    const isFav = appStore.isFavouriteTeam(match.homeTeam, match.sport) || appStore.isFavouriteTeam(match.awayTeam, match.sport);

    let detailsHtml = `
      <div class="drawer-matchup">
        <!-- Away -->
        <div class="drawer-team">
          ${match.awayTeam.logoUrl ? `<img class="drawer-team-logo" src="${match.awayTeam.logoUrl}" alt="">` : ''}
          <div class="drawer-team-name">${match.awayTeam.name}</div>
          <div class="drawer-team-score">${isLive || isFinal ? match.awayTeam.score : '-'}</div>
        </div>

        <div class="drawer-vs">
          <span>VS</span>
          <span class="status-pill ${isLive ? 'live' : ''}">${match.statusDisplay || (isFinal ? 'FINAL' : 'Scheduled')}</span>
        </div>

        <!-- Home -->
        <div class="drawer-team">
          ${match.homeTeam.logoUrl ? `<img class="drawer-team-logo" src="${match.homeTeam.logoUrl}" alt="">` : ''}
          <div class="drawer-team-name">${match.homeTeam.name}</div>
          <div class="drawer-team-score">${isLive || isFinal ? match.homeTeam.score : '-'}</div>
        </div>
      </div>
    `;

    // Linescore table if baseball or sports with hits/stats
    if (match.sport === 'baseball' && match.sportDetails?.hits) {
      detailsHtml += `
        <div>
          <div class="drawer-section-title">LINESCORE SUMMARY</div>
          <div class="drawer-linescore">
            <table class="linescore-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Team</th>
                  <th>Runs</th>
                  <th>Hits</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="team-cell">${match.awayTeam.shortName || match.awayTeam.abbreviation}</td>
                  <td class="total-cell">${match.awayTeam.score}</td>
                  <td>${match.sportDetails.hits.away ?? 0}</td>
                  <td>${match.sportDetails.errors.away ?? 0}</td>
                </tr>
                <tr>
                  <td class="team-cell">${match.homeTeam.shortName || match.homeTeam.abbreviation}</td>
                  <td class="total-cell">${match.homeTeam.score}</td>
                  <td>${match.sportDetails.hits.home ?? 0}</td>
                  <td>${match.sportDetails.errors.home ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    // Meta grid
    const matchDate = new Date(match.scheduledStartTime);
    const dateStr = matchDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = matchDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    detailsHtml += `
      <div class="drawer-meta-grid">
        <div class="drawer-meta-card">
          <span class="drawer-meta-label">Schedule</span>
          <span class="drawer-meta-value">${dateStr} · ${timeStr}</span>
        </div>
        <div class="drawer-meta-card">
          <span class="drawer-meta-label">Status</span>
          <span class="drawer-meta-value">${match.statusDisplay || match.statusStage}</span>
        </div>
        <div class="drawer-meta-card">
          <span class="drawer-meta-label">Away Record</span>
          <span class="drawer-meta-value">${match.awayTeam.record || '—'}</span>
        </div>
        <div class="drawer-meta-card">
          <span class="drawer-meta-label">Home Record</span>
          <span class="drawer-meta-value">${match.homeTeam.record || '—'}</span>
        </div>
      </div>
    `;

    if (this.drawerBody) {
      this.drawerBody.innerHTML = detailsHtml;
    }

    if (this.drawerPinBtn) {
      this.drawerPinBtn.textContent = isPinned ? 'Pinned to HUD ✓' : 'Pin to Desktop HUD';
      this.drawerPinBtn.classList.toggle('active', isPinned);
    }

    if (this.drawerFavBtn) {
      this.drawerFavBtn.textContent = isFav ? '★ Favourited' : '☆ Add to Favourites';
      this.drawerFavBtn.classList.toggle('active', isFav);
    }

    this.detailsDrawer?.classList.add('open');
  }

  closeDetailsDrawer() {
    if (this.detailsDrawer) {
      this.detailsDrawer.classList.remove('open');
      this.selectedMatchForDrawer = null;
    }
  }

  setupKeyboardNavigation() {
    window.addEventListener('keydown', async (e) => {
      // 1. Search focus (⌘K or /)
      if (((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement !== this.searchInput)) {
        e.preventDefault();
        this.searchInput?.focus();
        this.searchInput?.select();
        return;
      }

      // 2. If typing in search input
      if (document.activeElement === this.searchInput) {
        if (e.key === 'Escape') {
          this.searchInput.value = '';
          this.searchQuery = '';
          if (this.searchClearBtn) this.searchClearBtn.style.display = 'none';
          this.searchInput.blur();
          this.render();
          return;
        }
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          this.searchInput.blur();
          this.keyboardFocusedIndex = 0;
          this.updateKeyboardFocus();
          return;
        }
        return;
      }

      // 3. Escape closes drawer or settings
      if (e.key === 'Escape') {
        if (this.detailsDrawer?.classList.contains('open')) {
          this.closeDetailsDrawer();
          return;
        }
        if (this.settingsSheet?.classList.contains('open')) {
          this.settingsSheet.classList.remove('open');
          return;
        }
      }

      // 4. Arrow keys / J / K navigation
      const cards = Array.from(this.container?.querySelectorAll('.match-card') || []);
      if (cards.length === 0) return;

      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        this.keyboardFocusedIndex = Math.min(cards.length - 1, this.keyboardFocusedIndex + 1);
        this.updateKeyboardFocus();
        return;
      }

      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.keyboardFocusedIndex = Math.max(0, this.keyboardFocusedIndex - 1);
        this.updateKeyboardFocus();
        return;
      }

      // 5. Enter key toggles pin on focused card
      if (e.key === 'Enter' && this.keyboardFocusedIndex >= 0 && this.keyboardFocusedIndex < cards.length) {
        e.preventDefault();
        const card = cards[this.keyboardFocusedIndex];
        const matchId = card.dataset.matchId;
        if (matchId) {
          if (appStore.isPinned(matchId)) {
            appStore.setPinnedMatchId(null);
            await this.hideOverlayWindow();
          } else {
            appStore.setPinnedMatchId(matchId);
            await this.showOverlayWindow();
          }
          this.render();
        }
        return;
      }

      // 6. Space or F key toggles favourite on focused card
      if ((e.key === ' ' || e.key.toLowerCase() === 'f') && this.keyboardFocusedIndex >= 0 && this.keyboardFocusedIndex < cards.length) {
        e.preventDefault();
        const card = cards[this.keyboardFocusedIndex];
        const matchId = card.dataset.matchId;
        const match = this.matches.find(m => m.id === matchId);
        if (match) {
          const isFav = appStore.isFavouriteTeam(match.homeTeam, match.sport) || appStore.isFavouriteTeam(match.awayTeam, match.sport);
          if (isFav) {
            if (match.homeTeam) appStore.toggleFavouriteTeam(match.homeTeam, match.sport);
            if (match.awayTeam) appStore.toggleFavouriteTeam(match.awayTeam, match.sport);
          } else {
            if (match.homeTeam) appStore.toggleFavouriteTeam(match.homeTeam, match.sport);
            if (match.awayTeam) appStore.toggleFavouriteTeam(match.awayTeam, match.sport);
          }
          this.render();
          this.renderTeamsGrid();
          this.evaluateAndTriggerAutoPin();
        }
        return;
      }

      // 7. 'i' key opens details drawer
      if (e.key.toLowerCase() === 'i' && this.keyboardFocusedIndex >= 0 && this.keyboardFocusedIndex < cards.length) {
        e.preventDefault();
        const card = cards[this.keyboardFocusedIndex];
        const matchId = card.dataset.matchId;
        const match = this.matches.find(m => m.id === matchId);
        if (match) this.openDetailsDrawer(match);
        return;
      }

      // 8. Number keys 1-5 switch date tabs
      if (['1', '2', '3', '4', '5'].includes(e.key) && !e.metaKey && !e.ctrlKey) {
        const tabs = ['yesterday', 'today', 'tomorrow', 'this-week', 'all'];
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          this.setDateTab(tabs[idx]);
        }
        return;
      }

      // 9. 'r' refreshes scores
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        this.fetchScores(true);
      }
    });
  }

  renderTeamsGrid() {
    if (!this.teamsPickerGrid) return;

    let pool = ALL_TEAMS;
    if (this.teamPickerSport && this.teamPickerSport !== 'all') {
      pool = pool.filter(t => t.sport === this.teamPickerSport);
    }

    if (this.teamPickerSearch) {
      const q = this.teamPickerSearch;
      pool = pool.filter(t => 
        t.name.toLowerCase().includes(q) ||
        t.shortName.toLowerCase().includes(q) ||
        t.abbrev.toLowerCase().includes(q)
      );
    }

    const favTeams = appStore.getFavouriteTeams();
    if (this.favTeamsCountBadge) {
      this.favTeamsCountBadge.textContent = `${favTeams.length} selected`;
    }

    if (pool.length === 0) {
      this.teamsPickerGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted); font-size: 11px;">
          No teams found matching "${this.teamPickerSearch}"
        </div>
      `;
      return;
    }

    this.teamsPickerGrid.innerHTML = pool.map(team => {
      const isFav = appStore.isFavouriteTeam(team);
      return `
        <div class="team-picker-chip ${isFav ? 'favourited' : ''}" data-team-id="${team.id}" data-team-sport="${team.sport}" title="${team.name}">
          <div class="team-chip-info">
            ${team.logo ? `<img class="team-chip-logo" src="${team.logo}" alt="" onerror="this.style.display='none';">` : ''}
            <span class="team-chip-name">${team.shortName || team.name}</span>
          </div>
          <span class="team-chip-star">${isFav ? '★' : '☆'}</span>
        </div>
      `;
    }).join('');

    // Bind click events on each chip
    this.teamsPickerGrid.querySelectorAll('.team-picker-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const teamId = chip.dataset.teamId;
        const sport = chip.dataset.teamSport;
        const teamObj = ALL_TEAMS.find(t => t.id === teamId && t.sport === sport);
        if (teamObj) {
          appStore.toggleFavouriteTeam(teamObj);
        } else {
          appStore.toggleFavouriteTeam(teamId, sport);
        }
        this.renderTeamsGrid();
        this.render();
        this.evaluateAndTriggerAutoPin();
      });
    });
  }

  async evaluateAndTriggerAutoPin() {
    if (!appStore.isAutoPinFavouritesEnabled()) return;
    const autoPin = evaluateAutoPinLifecycle(
      this.matches,
      appStore.data,
      (t, sp) => appStore.isFavouriteTeam(t, sp)
    );

    if (autoPin.matchToPin) {
      const currentPinned = appStore.getPinnedMatchId();
      if (currentPinned !== autoPin.matchToPin.id) {
        console.log('[Picker] Auto-pinning live favourite match:', autoPin.matchToPin.id);
        appStore.setPinnedMatchId(autoPin.matchToPin.id);
        await this.showOverlayWindow();
      }
    } else if (autoPin.shouldHideHUD && appStore.isAutoHideOnFinalEnabled()) {
      console.log('[Picker] Auto-hiding HUD as favourite match is completed.');
      const completedMatch = autoPin.isCurrentPinnedCompleted ? this.matches.find(m => m.id === appStore.getPinnedMatchId()) : null;
      appStore.setPinnedMatchId(null);
      await this.hideOverlayWindow(completedMatch);
    }
  }

  updateKeyboardFocus() {
    const cards = Array.from(this.container?.querySelectorAll('.match-card') || []);
    cards.forEach((card, idx) => {
      const isFocused = idx === this.keyboardFocusedIndex;
      card.classList.toggle('keyboard-focused', isFocused);
      if (isFocused) {
        card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  updatePinnedFooter(pinnedId) {
    if (!this.footerPinned) return;
    if (!pinnedId) {
      this.footerPinned.textContent = 'No match pinned';
      return;
    }
    const match = this.matches.find(m => m.id === pinnedId);
    if (match) {
      if (match.sport === 'motorsport') {
        this.footerPinned.textContent = `Pinned: ${match.competitionName}`;
      } else {
        this.footerPinned.textContent = `Pinned: ${match.awayTeam.shortName || match.awayTeam.abbreviation} vs ${match.homeTeam.shortName || match.homeTeam.abbreviation}`;
      }
    } else {
      this.footerPinned.textContent = '1 match pinned';
    }
  }

  getCardSituation(match) {
    return getCardSituation(match);
  }

  getSportEmoji(sport) {
    return getSportEmoji(sport);
  }
}

// Instantiate on DOM ready if running in browser
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    new MatchPickerController();
  });
}

export { MatchPickerController };
