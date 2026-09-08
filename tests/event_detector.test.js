// tests/event_detector.test.js - Unit tests for snapshot reconciliation and event detection
import test from 'node:test';
import assert from 'node:assert';

import { EventDetector } from '../frontend/js/event_detector.js';

test('EventDetector detects Soccer GOAL on home score increment', () => {
  const detector = new EventDetector();
  const now = Date.now();

  const snapshot1 = {
    id: 'match_1',
    sport: 'soccer',
    statusStage: 'in_progress',
    homeTeam: { id: 'arsenal', name: 'Arsenal', score: 1 },
    awayTeam: { id: 'chelsea', name: 'Chelsea', score: 1 },
    sportDetails: { half: '2H', redCards: { home: 0, away: 0 } },
    lastUpdated: now - 15000
  };

  // Initial baseline
  const events0 = detector.processSnapshot(snapshot1);
  assert.strictEqual(events0.length, 0);

  // Home scores a goal
  const snapshot2 = {
    ...snapshot1,
    homeTeam: { ...snapshot1.homeTeam, score: 2 },
    lastUpdated: now
  };

  const events1 = detector.processSnapshot(snapshot2);
  assert.strictEqual(events1.length, 1);
  assert.strictEqual(events1[0].eventType, 'GOAL');
  assert.strictEqual(events1[0].participantId, 'arsenal');
  assert.ok(events1[0].summary.includes('GOAL! Arsenal'));
});

test('EventDetector emits CORRECTION when score decreases (e.g. VAR disallowed)', () => {
  const detector = new EventDetector();
  const now = Date.now();

  const snapshot1 = {
    id: 'match_var',
    sport: 'soccer',
    statusStage: 'in_progress',
    homeTeam: { id: 'ars', name: 'Arsenal', score: 2 },
    awayTeam: { id: 'che', name: 'Chelsea', score: 1 },
    sportDetails: { half: '2H' },
    lastUpdated: now - 15000
  };
  detector.processSnapshot(snapshot1);

  // Goal disallowed
  const snapshot2 = {
    ...snapshot1,
    homeTeam: { ...snapshot1.homeTeam, score: 1 },
    lastUpdated: now
  };

  const events = detector.processSnapshot(snapshot2);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].eventType, 'CORRECTION');
  assert.ok(events[0].summary.includes('Disallowed'));
});

test('EventDetector classifies NFL TOUCHDOWN (+6) vs FIELD_GOAL (+3)', () => {
  const detector = new EventDetector();
  const now = Date.now();

  const baseline = {
    id: 'nfl_game',
    sport: 'football',
    statusStage: 'in_progress',
    homeTeam: { id: 'kc', name: 'Chiefs', shortName: 'Chiefs', score: 14 },
    awayTeam: { id: 'sf', name: '49ers', shortName: '49ers', score: 10 },
    sportDetails: { quarter: 2 },
    lastUpdated: now - 30000
  };
  detector.processSnapshot(baseline);

  // Chiefs score a Touchdown (+7 points with extra point)
  const tdSnapshot = {
    ...baseline,
    homeTeam: { ...baseline.homeTeam, score: 21 },
    lastUpdated: now - 15000
  };
  const tdEvents = detector.processSnapshot(tdSnapshot);
  assert.strictEqual(tdEvents.length, 1);
  assert.strictEqual(tdEvents[0].eventType, 'TOUCHDOWN');

  // 49ers score a Field Goal (+3 points)
  const fgSnapshot = {
    ...tdSnapshot,
    awayTeam: { ...baseline.awayTeam, score: 13 },
    lastUpdated: now
  };
  const fgEvents = detector.processSnapshot(fgSnapshot);
  assert.strictEqual(fgEvents.length, 1);
  assert.strictEqual(fgEvents[0].eventType, 'FIELD_GOAL');
});

test('EventDetector detects F1 SAFETY_CAR deployment', () => {
  const detector = new EventDetector();
  const now = Date.now();

  const baseline = {
    id: 'f1_monza',
    sport: 'motorsport',
    statusStage: 'in_progress',
    homeTeam: { abbreviation: 'VER', score: 1 },
    awayTeam: { abbreviation: 'NOR', score: 2 },
    sportDetails: { flagStatus: 'green', currentLap: 25 },
    lastUpdated: now - 10000
  };
  detector.processSnapshot(baseline);

  const scSnapshot = {
    ...baseline,
    sportDetails: { flagStatus: 'safety_car', currentLap: 26 },
    lastUpdated: now
  };

  const events = detector.processSnapshot(scSnapshot);
  const scEvent = events.find(e => e.eventType === 'SAFETY_CAR');
  assert.ok(scEvent, 'Should emit SAFETY_CAR event');
});

test('EventDetector drops out-of-order / stale snapshots', () => {
  const detector = new EventDetector();
  const now = Date.now();

  const baseline = {
    id: 'order_test',
    sport: 'soccer',
    statusStage: 'in_progress',
    homeTeam: { id: 'a', score: 1 },
    awayTeam: { id: 'b', score: 0 },
    lastUpdated: now
  };
  detector.processSnapshot(baseline);

  // Stale packet arrives from older cache timestamp
  const stale = {
    ...baseline,
    homeTeam: { id: 'a', score: 2 },
    lastUpdated: now - 5000
  };

  const events = detector.processSnapshot(stale);
  assert.strictEqual(events.length, 0, 'Should drop out-of-order snapshot');
});
