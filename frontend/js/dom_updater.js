// dom_updater.js - Fine-grained DOM mutation engine for HUD overlay and picker cards

export class DomUpdater {
  constructor(hudElements) {
    this.elements = hudElements || {};
  }

  /**
   * Updates the Score Overlay HUD with a CanonicalMatch snapshot.
   */
  updateOverlay(match) {
    if (!match) return;

    const el = this.elements;
    if (!el.hudCard) return;

    // 1. Sport Icon & League Name
    if (el.leagueName) {
      el.leagueName.textContent = match.competitionName || 'LIVE MATCH';
    }
    if (el.sportIcon) {
      el.sportIcon.textContent = this.getSportEmoji(match.sport);
    }

    // 2. Status & Clock
    if (el.clockText) {
      el.clockText.textContent = match.statusDisplay || 'Live';
    }
    if (el.liveDot) {
      el.liveDot.style.display = match.statusStage === 'in_progress' ? 'inline-block' : 'none';
    }

    // 3. F1 vs Standard Layout Switch
    if (match.sport === 'motorsport') {
      if (el.standardBody) el.standardBody.style.display = 'none';
      if (el.f1Body) el.f1Body.style.display = 'flex';
      this.updateF1Telemetry(match);
    } else {
      if (el.standardBody) el.standardBody.style.display = 'flex';
      if (el.f1Body) el.f1Body.style.display = 'none';
      this.updateStandardScores(match);
    }

    // 4. Situation Text (bottom row)
    if (el.situationText) {
      el.situationText.textContent = this.getSituationText(match);
    }
  }

  updateStandardScores(match) {
    const el = this.elements;
    const away = match.awayTeam || {};
    const home = match.homeTeam || {};

    // Away Team
    if (el.awayName) el.awayName.textContent = away.abbreviation || away.shortName || 'AWY';
    if (el.awayFallback) el.awayFallback.textContent = (away.abbreviation || 'AWY').slice(0, 3);
    if (el.awayScore) {
      this.updateTextWithPop(el.awayScore, String(away.score ?? 0));
    }
    if (el.awayLogo) {
      if (away.logoUrl) {
        el.awayLogo.src = away.logoUrl;
        el.awayLogo.style.display = 'block';
        if (el.awayFallback) el.awayFallback.style.display = 'none';
      } else {
        el.awayLogo.style.display = 'none';
        if (el.awayFallback) el.awayFallback.style.display = 'flex';
      }
    }

    // Home Team
    if (el.homeName) el.homeName.textContent = home.abbreviation || home.shortName || 'HOM';
    if (el.homeFallback) el.homeFallback.textContent = (home.abbreviation || 'HOM').slice(0, 3);
    if (el.homeScore) {
      this.updateTextWithPop(el.homeScore, String(home.score ?? 0));
    }
    if (el.homeLogo) {
      if (home.logoUrl) {
        el.homeLogo.src = home.logoUrl;
        el.homeLogo.style.display = 'block';
        if (el.homeFallback) el.homeFallback.style.display = 'none';
      } else {
        el.homeLogo.style.display = 'none';
        if (el.homeFallback) el.homeFallback.style.display = 'flex';
      }
    }
  }

  updateF1Telemetry(match) {
    const details = match.sportDetails || {};
    const board = details.leaderboard || [];
    
    for (let i = 1; i <= 3; i++) {
      const driver = board[i - 1];
      const nameEl = document.getElementById(`f1-d${i}-name`);
      const gapEl = document.getElementById(`f1-d${i}-gap`);
      if (nameEl) nameEl.textContent = driver ? driver.driverShortName : '—';
      if (gapEl) gapEl.textContent = driver ? driver.gapToLeader : '—';
    }
  }

  updateTextWithPop(element, newText) {
    if (element.textContent !== newText) {
      element.textContent = newText;
      element.classList.remove('score-pop');
      // Trigger reflow to restart CSS animation cleanly
      void element.offsetWidth;
      element.classList.add('score-pop');
    }
  }

  triggerVisualEvent(event) {
    const card = this.elements.hudCard;
    if (!card) return;

    let eventClass = '';
    switch (event.eventType) {
      case 'GOAL':
        eventClass = 'event-goal';
        break;
      case 'TOUCHDOWN':
        eventClass = 'event-touchdown';
        break;
      case 'PERIOD_CHANGE':
        eventClass = 'event-period-change';
        break;
      case 'SAFETY_CAR':
      case 'VSC':
        eventClass = 'event-safety-car';
        break;
      case 'RED_FLAG':
        eventClass = 'event-red-flag';
        break;
      default:
        eventClass = 'event-goal';
    }

    card.classList.remove('event-goal', 'event-touchdown', 'event-period-change', 'event-safety-car', 'event-red-flag');
    void card.offsetWidth;
    card.classList.add(eventClass);

    // Remove animation class after 3 seconds
    setTimeout(() => {
      card.classList.remove(eventClass);
    }, 3000);
  }

  setStaleIndicator(isStale, secondsAgo = 0) {
    const indicator = this.elements.staleIndicator;
    const timeEl = this.elements.staleTime;
    if (!indicator) return;

    if (isStale) {
      indicator.classList.add('visible');
      if (timeEl) timeEl.textContent = `Updated ${secondsAgo}s ago`;
    } else {
      indicator.classList.remove('visible');
    }
  }

  getSituationText(match) {
    const details = match.sportDetails || {};
    switch (match.sport) {
      case 'football':
        return details.downDistanceText || 'NFL Football';
      case 'baseball':
        return `${details.outs ?? 0} Out${details.outs === 1 ? '' : 's'} · Count ${details.balls ?? 0}-${details.strikes ?? 0}`;
      case 'soccer':
        return details.redCards?.home || details.redCards?.away 
          ? `🔴 Red: ${details.redCards.away} - ${details.redCards.home}` 
          : (match.competitionName || 'Soccer');
      case 'motorsport':
        return details.sessionName || 'Grand Prix Session';
      case 'basketball':
      default:
        return match.competitionName || 'Live Game';
    }
  }

  getSportEmoji(sport) {
    switch (sport) {
      case 'football': return '🏈';
      case 'basketball': return '🏀';
      case 'baseball': return '⚾';
      case 'motorsport': return '🏎️';
      case 'soccer': return '⚽';
      default: return '🏆';
    }
  }
}
