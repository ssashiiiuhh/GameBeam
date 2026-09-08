// event_detector.js - Snapshot reconciliation and semantic event detection engine

export class EventDetector {
  constructor() {
    this.previousSnapshots = new Map(); // matchId -> CanonicalMatch
    this.listeners = new Set();
  }

  onEvent(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[EventDetector] Listener callback failed:', err);
      }
    }
  }

  /**
   * Reconciles a new snapshot with the previous known state.
   * Returns an array of detected MatchEvent objects.
   */
  processSnapshot(current) {
    if (!current || !current.id) return [];

    const previous = this.previousSnapshots.get(current.id);
    const events = [];

    // If first time seeing this match, store baseline and return
    if (!previous) {
      this.previousSnapshots.set(current.id, current);
      return events;
    }

    // 1. Guard against stale out-of-order snapshots
    if (current.lastUpdated && previous.lastUpdated && current.lastUpdated < previous.lastUpdated) {
      console.warn(`[EventDetector] Dropping out-of-order snapshot for match ${current.id}`);
      return events;
    }

    // 2. Check for long idle / sleep (more than 5 minutes elapsed)
    const elapsed = Date.now() - (previous.lastUpdated || Date.now());
    if (elapsed > 5 * 60 * 1000) {
      console.info(`[EventDetector] App woke from sleep (${Math.round(elapsed / 1000)}s), resetting baseline without event flood.`);
      this.previousSnapshots.set(current.id, current);
      return events;
    }

    // 3. Status stage change (e.g. scheduled -> in_progress, in_progress -> completed)
    if (previous.statusStage !== current.statusStage) {
      if (current.statusStage === 'completed') {
        events.push(this.createEvent(current, 'FULLTIME', 'Match Finished', 'important'));
      } else if (current.statusStage === 'in_progress' && previous.statusStage === 'scheduled') {
        events.push(this.createEvent(current, 'SESSION_START', 'Match Started', 'info'));
      }
    }

    // 4. Sport-Specific Event Detection
    switch (current.sport) {
      case 'soccer':
        this.detectSoccerEvents(previous, current, events);
        break;
      case 'football':
        this.detectNflEvents(previous, current, events);
        break;
      case 'baseball':
        this.detectMlbEvents(previous, current, events);
        break;
      case 'basketball':
        this.detectNbaEvents(previous, current, events);
        break;
      case 'motorsport':
        this.detectF1Events(previous, current, events);
        break;
    }

    // Update stored snapshot
    this.previousSnapshots.set(current.id, current);

    // Emit all detected events
    for (const ev of events) {
      this.emit(ev);
    }

    return events;
  }

  detectSoccerEvents(prev, curr, events) {
    const prevHome = prev.homeTeam?.score || 0;
    const currHome = curr.homeTeam?.score || 0;
    const prevAway = prev.awayTeam?.score || 0;
    const currAway = curr.awayTeam?.score || 0;

    // Goal scored or VAR correction
    if (currHome > prevHome) {
      events.push(this.createEvent(curr, 'GOAL', `GOAL! ${curr.homeTeam.name}`, 'critical', curr.homeTeam.id));
    } else if (currHome < prevHome) {
      events.push(this.createEvent(curr, 'CORRECTION', `Goal Disallowed (${curr.homeTeam.name})`, 'important', curr.homeTeam.id));
    }

    if (currAway > prevAway) {
      events.push(this.createEvent(curr, 'GOAL', `GOAL! ${curr.awayTeam.name}`, 'critical', curr.awayTeam.id));
    } else if (currAway < prevAway) {
      events.push(this.createEvent(curr, 'CORRECTION', `Goal Disallowed (${curr.awayTeam.name})`, 'important', curr.awayTeam.id));
    }

    // Half / Period Change
    if (prev.sportDetails?.half !== curr.sportDetails?.half) {
      const half = curr.sportDetails?.half;
      if (half === 'HT') {
        events.push(this.createEvent(curr, 'HALFTIME', 'Half-Time', 'info'));
      } else if (half === '2H' || half === 'ET') {
        events.push(this.createEvent(curr, 'PERIOD_CHANGE', `Period: ${half}`, 'info'));
      }
    }

    // Red Cards
    const currHomeRed = curr.sportDetails?.redCards?.home || 0;
    const prevHomeRed = prev.sportDetails?.redCards?.home || 0;
    if (currHomeRed > prevHomeRed) {
      events.push(this.createEvent(curr, 'RED_CARD', `RED CARD! ${curr.homeTeam.name}`, 'critical', curr.homeTeam.id));
    }

    const currAwayRed = curr.sportDetails?.redCards?.away || 0;
    const prevAwayRed = prev.sportDetails?.redCards?.away || 0;
    if (currAwayRed > prevAwayRed) {
      events.push(this.createEvent(curr, 'RED_CARD', `RED CARD! ${curr.awayTeam.name}`, 'critical', curr.awayTeam.id));
    }
  }

  detectNflEvents(prev, curr, events) {
    const deltaHome = (curr.homeTeam?.score || 0) - (prev.homeTeam?.score || 0);
    const deltaAway = (curr.awayTeam?.score || 0) - (prev.awayTeam?.score || 0);

    if (deltaHome > 0) {
      this.classifyNflScoreDelta(curr, curr.homeTeam, deltaHome, events);
    } else if (deltaHome < 0) {
      events.push(this.createEvent(curr, 'CORRECTION', `Score Corrected (${curr.homeTeam.shortName})`, 'important', curr.homeTeam.id));
    }

    if (deltaAway > 0) {
      this.classifyNflScoreDelta(curr, curr.awayTeam, deltaAway, events);
    } else if (deltaAway < 0) {
      events.push(this.createEvent(curr, 'CORRECTION', `Score Corrected (${curr.awayTeam.shortName})`, 'important', curr.awayTeam.id));
    }

    // Quarter change
    if (prev.sportDetails?.quarter !== curr.sportDetails?.quarter) {
      const q = curr.sportDetails?.quarter;
      events.push(this.createEvent(curr, 'PERIOD_CHANGE', `Start of Q${q}`, 'info'));
    }
  }

  classifyNflScoreDelta(match, team, delta, events) {
    if (delta >= 6) {
      events.push(this.createEvent(match, 'TOUCHDOWN', `TOUCHDOWN! ${team.name}`, 'critical', team.id));
    } else if (delta === 3) {
      events.push(this.createEvent(match, 'FIELD_GOAL', `Field Goal (${team.name})`, 'important', team.id));
    } else if (delta === 2) {
      events.push(this.createEvent(match, 'SAFETY', `Safety (${team.name})`, 'important', team.id));
    } else {
      events.push(this.createEvent(match, 'SCORE_CHANGE', `Extra Point (${team.name})`, 'info', team.id));
    }
  }

  detectMlbEvents(prev, curr, events) {
    const deltaHome = (curr.homeTeam?.score || 0) - (prev.homeTeam?.score || 0);
    const deltaAway = (curr.awayTeam?.score || 0) - (prev.awayTeam?.score || 0);

    if (deltaHome > 0) {
      events.push(this.createEvent(curr, 'RUN_SCORED', `Run Scored! ${curr.homeTeam.shortName} (+${deltaHome})`, 'important', curr.homeTeam.id));
    }
    if (deltaAway > 0) {
      events.push(this.createEvent(curr, 'RUN_SCORED', `Run Scored! ${curr.awayTeam.shortName} (+${deltaAway})`, 'important', curr.awayTeam.id));
    }

    // Inning or half change
    const prevHalf = `${prev.sportDetails?.half}-${prev.sportDetails?.inning}`;
    const currHalf = `${curr.sportDetails?.half}-${curr.sportDetails?.inning}`;
    if (prevHalf !== currHalf) {
      events.push(this.createEvent(curr, 'PERIOD_CHANGE', `${curr.sportDetails?.half === 'top' ? 'Top' : 'Bot'} of ${curr.sportDetails?.inning}`, 'info'));
    }
  }

  detectNbaEvents(prev, curr, events) {
    const deltaHome = (curr.homeTeam?.score || 0) - (prev.homeTeam?.score || 0);
    const deltaAway = (curr.awayTeam?.score || 0) - (prev.awayTeam?.score || 0);

    if (deltaHome > 0) {
      events.push(this.createEvent(curr, 'SCORE_CHANGE', `${curr.homeTeam.abbreviation} +${deltaHome}`, 'info', curr.homeTeam.id));
    }
    if (deltaAway > 0) {
      events.push(this.createEvent(curr, 'SCORE_CHANGE', `${curr.awayTeam.abbreviation} +${deltaAway}`, 'info', curr.awayTeam.id));
    }

    if (prev.sportDetails?.quarter !== curr.sportDetails?.quarter) {
      events.push(this.createEvent(curr, 'PERIOD_CHANGE', `End of Q${prev.sportDetails?.quarter}`, 'info'));
    }
  }

  detectF1Events(prev, curr, events) {
    const prevFlag = prev.sportDetails?.flagStatus;
    const currFlag = curr.sportDetails?.flagStatus;

    if (prevFlag !== currFlag) {
      if (currFlag === 'safety_car') {
        events.push(this.createEvent(curr, 'SAFETY_CAR', 'SAFETY CAR DEPLOYED', 'critical'));
      } else if (currFlag === 'vsc') {
        events.push(this.createEvent(curr, 'VSC', 'VIRTUAL SAFETY CAR', 'important'));
      } else if (currFlag === 'red') {
        events.push(this.createEvent(curr, 'RED_FLAG', 'RED FLAG - SESSION STOPPED', 'critical'));
      }
    }

    // Lap progression
    const prevLap = prev.sportDetails?.currentLap || 0;
    const currLap = curr.sportDetails?.currentLap || 0;
    if (currLap > prevLap) {
      events.push(this.createEvent(curr, 'LAP_MILESTONE', `Lap ${currLap}`, 'info'));
    }
  }

  createEvent(match, eventType, summary, severity = 'info', participantId) {
    return {
      id: `${match.id}:${eventType}:${Date.now()}`,
      matchId: match.id,
      timestamp: Date.now(),
      eventType,
      summary,
      severity,
      participantId
    };
  }
}
