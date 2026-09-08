import { appStore } from './store.js';
import { EventDetector } from './event_detector.js';
import { DomUpdater } from './dom_updater.js';
import { EdgeSnapper } from './edge_snapper.js';
import { sportsService } from './sports_service.js';
import { evaluateAutoPinLifecycle, updateMenuBarScore } from './auto_pin_manager.js';

class ScoreOverlayController {
  constructor() {
    this.pinnedMatchId = null;
    this.currentMatch = null;
    this.pollTimer = null;
    this.staleTimer = null;
    this.finalDismissTimer = null;
    this.countdownInterval = null;
    this.dismissCountdownSec = 0;
    this.lastSuccessfulUpdate = 0;
    
    // Core engines
    this.eventDetector = new EventDetector();
    this.domUpdater = null;
    this.edgeSnapper = null;

    this.init();
  }

  async init() {
    this.setupElements();
    this.setupEventListeners();
    this.setupPositionAndSnapping();

    // Event listener for detected live sports events
    this.eventDetector.onEvent(event => {
      console.log(`[Overlay] Event detected: ${event.eventType} - ${event.summary}`);
      this.domUpdater?.triggerVisualEvent(event);
    });

    // Subscribe to store updates (e.g. pinned match changes from Match Picker)
    appStore.subscribe(async settings => {
      if (settings.pinnedMatchId !== this.pinnedMatchId) {
        this.pinnedMatchId = settings.pinnedMatchId;
        await this.handlePinnedMatchChanged();
      }
    });

    // Initial check: render from memory snapshot immediately if available (0ms instant display)
    const cachedSnapshot = appStore.getLastPinnedMatchSnapshot();
    if (cachedSnapshot) {
      this.currentMatch = cachedSnapshot;
      this.domUpdater?.renderMatch(cachedSnapshot);
    }

    let initialPinnedId = appStore.getPinnedMatchId();
    if (!initialPinnedId) {
      const liveList = await sportsService.fetchAllLiveMatches();
      const best = sportsService.getBestMatchToPin(liveList);
      if (best) {
        initialPinnedId = best.id;
        appStore.setPinnedMatchId(initialPinnedId, best);
      }
    }
    this.pinnedMatchId = initialPinnedId;
    await this.handlePinnedMatchChanged();

    // Stale indicator check every 5 seconds
    this.staleTimer = setInterval(() => this.checkFreshness(), 5000);
  }

  setupElements() {
    const hudElements = {
      hudCard: document.getElementById('hud-card'),
      leagueName: document.getElementById('hud-league-name'),
      sportIcon: document.getElementById('hud-sport-icon'),
      clockText: document.getElementById('hud-clock-text'),
      liveDot: document.getElementById('hud-live-dot'),
      statusBadge: document.getElementById('hud-status-badge'),
      standardBody: document.getElementById('standard-hud-body'),
      f1Body: document.getElementById('f1-hud-body'),
      awayName: document.getElementById('hud-away-name'),
      awayLogo: document.getElementById('hud-away-logo'),
      awayFallback: document.getElementById('hud-away-fallback'),
      awayScore: document.getElementById('hud-away-score'),
      homeName: document.getElementById('hud-home-name'),
      homeLogo: document.getElementById('hud-home-logo'),
      homeFallback: document.getElementById('hud-home-fallback'),
      homeScore: document.getElementById('hud-home-score'),
      situationText: document.getElementById('hud-situation-text'),
      staleIndicator: document.getElementById('hud-stale-indicator'),
      staleTime: document.getElementById('hud-stale-time')
    };

    this.domUpdater = new DomUpdater(hudElements);
    this.prevBtn = document.getElementById('hud-prev-btn');
    this.nextBtn = document.getElementById('hud-next-btn');
    this.pickerBtn = document.getElementById('hud-picker-btn');
    this.unpinBtn = document.getElementById('hud-unpin-btn');
  }

  setupEventListeners() {
    this.prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleMatch(-1);
    });

    this.nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleMatch(1);
    });

    this.pickerBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.__TAURI__?.core?.invoke) {
        window.__TAURI__.core.invoke('show_picker_window').catch(() => {});
      }
    });

    // Double-click anywhere on HUD to reveal Match Picker
    document.getElementById('hud-card')?.addEventListener('dblclick', () => {
      if (window.__TAURI__?.core?.invoke) {
        window.__TAURI__.core.invoke('show_picker_window').catch(() => {});
      }
    });

    this.unpinBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const lastMatch = this.currentMatch;
      appStore.setPinnedMatchId(null);
      this.clearFinalDismissTimer();

      await updateMenuBarScore({
        matches: sportsService.getCachedMatches(),
        isOverlayVisible: false,
        isFavouriteTeamFn: (t, sp) => appStore.isFavouriteTeam(t, sp),
        specificMatch: lastMatch
      });

      if (window.__TAURI__?.core?.invoke) {
        try {
          await window.__TAURI__.core.invoke('hide_overlay_window');
          return;
        } catch (err) {
          console.warn('[Overlay] Hide window IPC error:', err);
        }
      }
      if (window.__TAURI__?.window?.getCurrentWindow) {
        try {
          await window.__TAURI__.window.getCurrentWindow().hide();
        } catch (err) {
          console.warn('[Overlay] Hide window error:', err);
        }
      }
    });

    // Multi-window synchronization listener
    window.addEventListener('livescore-settings-changed', (e) => {
      const settings = e.detail;
      if (settings && settings.pinnedMatchId !== this.pinnedMatchId) {
        this.pinnedMatchId = settings.pinnedMatchId;
        this.handlePinnedMatchChanged();
      }
    });
  }

  async cycleMatch(direction = 1) {
    let list = sportsService.getCachedMatches();
    if (!list || list.length === 0) {
      list = await sportsService.fetchAllLiveMatches();
    }
    if (!list || list.length === 0) return;
    const currentIdx = list.findIndex(m => m.id === this.pinnedMatchId);
    let nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = list.length - 1;
    if (nextIdx >= list.length) nextIdx = 0;
    const nextMatch = list[nextIdx];
    if (nextMatch) {
      appStore.setPinnedMatchId(nextMatch.id);
    }
  }

  async setupPositionAndSnapping() {
    this.edgeSnapper = new EdgeSnapper(document.getElementById('hud-card'));

    // If running in Tauri, listen for window movement to snap to screen edges
    if (window.__TAURI__?.window?.getCurrentWindow) {
      try {
        const win = window.__TAURI__.window.getCurrentWindow();
        
        win.onMoved?.(async ({ payload: position }) => {
          const snapped = this.edgeSnapper.calculateSnap(
            position.x,
            position.y,
            320,
            84,
            { x: 0, y: 0, width: window.screen.availWidth, height: window.screen.availHeight }
          );

          if (snapped.isSnapped) {
            try {
              await win.setPosition({ type: 'Logical', x: snapped.x, y: snapped.y });
            } catch (posErr) {
              // fallback if position format differs
            }
            appStore.setOverlayPosition({
              anchor: snapped.anchor,
              lastX: snapped.x,
              lastY: snapped.y
            });
          }
        });
      } catch (err) {
        console.warn('[Overlay] Tauri window snapping setup error:', err);
      }
    }
  }

  clearFinalDismissTimer() {
    if (this.finalDismissTimer) {
      clearTimeout(this.finalDismissTimer);
      this.finalDismissTimer = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.dismissCountdownSec = 0;
  }

  updateDismissNotice() {
    const sitEl = document.getElementById('hud-situation-text');
    if (sitEl && this.dismissCountdownSec > 0) {
      sitEl.textContent = `FINAL · Closing in ${this.dismissCountdownSec}s`;
    }
  }

  async handlePinnedMatchChanged() {
    this.clearFinalDismissTimer();
    if (!this.pinnedMatchId) {
      this.clearPolling();
      return;
    }
    // Fast render: Check cached matches for instantaneous HUD update
    const cached = sportsService.getCachedMatches().find(m => m.id === this.pinnedMatchId);
    if (cached) {
      this.currentMatch = cached;
      this.domUpdater?.updateOverlay(cached);
    }

    // Fetch immediately and kick off adaptive poller
    await this.pollPinnedMatch();
    this.scheduleNextAdaptivePoll();
  }

  async pollPinnedMatch() {
    if (!this.pinnedMatchId) return;

    try {
      const matched = await sportsService.fetchMatchById(this.pinnedMatchId);

      if (matched) {
        this.currentMatch = matched;
        this.lastSuccessfulUpdate = Date.now();
        this.domUpdater?.setStaleIndicator(false);
        this.domUpdater?.updateOverlay(matched);
        this.eventDetector.processSnapshot(matched);

        // Check if game is completed and auto-dismiss is enabled
        if (matched.statusStage === 'completed' && appStore.isAutoHideOnFinalEnabled()) {
          const cached = sportsService.getCachedMatches();
          const autoPin = evaluateAutoPinLifecycle(cached, appStore.data, (t, sp) => appStore.isFavouriteTeam(t, sp));

          // If another favourite game is live, transition automatically to it!
          if (autoPin.matchToPin && autoPin.matchToPin.id !== this.pinnedMatchId) {
            console.log('[Overlay] Game ended, switching to next live favourite:', autoPin.matchToPin.id);
            this.clearFinalDismissTimer();
            appStore.setPinnedMatchId(autoPin.matchToPin.id);
            return;
          }

          // Otherwise schedule auto-dismiss grace period (15s)
          if (!this.finalDismissTimer) {
            this.dismissCountdownSec = 15;
            this.updateDismissNotice();

            this.countdownInterval = setInterval(() => {
              this.dismissCountdownSec--;
              this.updateDismissNotice();
              if (this.dismissCountdownSec <= 0) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
              }
            }, 1000);

            this.finalDismissTimer = setTimeout(async () => {
              console.log('[Overlay] Auto-dismissing HUD as match is FINAL and autoHideOnFinal is enabled.');
              const finishedMatch = this.currentMatch;
              appStore.setPinnedMatchId(null);
              this.clearFinalDismissTimer();

              // Update menubar score: only favourite teams scores show up in the menubar once the game is over and the floating disappears
              await updateMenuBarScore({
                matches: sportsService.getCachedMatches(),
                isOverlayVisible: false,
                isFavouriteTeamFn: (t, sp) => appStore.isFavouriteTeam(t, sp),
                specificMatch: finishedMatch
              });

              if (window.__TAURI__?.core?.invoke) {
                try {
                  await window.__TAURI__.core.invoke('hide_overlay_window');
                  return;
                } catch (e) {}
              }
              if (window.__TAURI__?.window?.getCurrentWindow) {
                try {
                  await window.__TAURI__.window.getCurrentWindow().hide();
                } catch (e) {}
              }
            }, 15000);
          }
        } else if (matched.statusStage === 'in_progress') {
          this.clearFinalDismissTimer();
        }
      }
    } catch (err) {
      console.warn('[Overlay] Error polling pinned match:', err);
    }
  }

  scheduleNextAdaptivePoll() {
    this.clearPolling();
    if (!this.pinnedMatchId) return;

    let intervalMs = 15000; // Default 15s

    if (this.currentMatch) {
      const stage = this.currentMatch.statusStage;
      if (stage === 'in_progress') {
        // Red zone or stoppage time: poll faster (10s)
        const isCritical = this.currentMatch.sportDetails?.isRedZone;
        intervalMs = isCritical ? 10000 : 15000;
      } else if (stage === 'intermission') {
        intervalMs = 45000; // Halftime: 45s
      } else if (stage === 'scheduled') {
        intervalMs = 60000; // Scheduled: 1m
      } else if (stage === 'completed') {
        intervalMs = 60000; // Final: 1m
      }
    }

    // Add ±1.5s jitter
    const jitter = (Math.random() * 3000) - 1500;
    const finalInterval = Math.max(8000, intervalMs + jitter);

    this.pollTimer = setTimeout(async () => {
      await this.pollPinnedMatch();
      this.scheduleNextAdaptivePoll();
    }, finalInterval);
  }

  clearPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  checkFreshness() {
    if (!this.pinnedMatchId || !this.lastSuccessfulUpdate) return;
    const elapsedSeconds = Math.round((Date.now() - this.lastSuccessfulUpdate) / 1000);
    if (elapsedSeconds >= 35) {
      this.domUpdater?.setStaleIndicator(true, elapsedSeconds);
    } else {
      this.domUpdater?.setStaleIndicator(false);
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  new ScoreOverlayController();
});
