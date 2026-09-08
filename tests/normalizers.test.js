// tests/normalizers.test.js - Unit tests for all 6 sport normalizers
import test from 'node:test';
import assert from 'node:assert';

import { normalizeNflEvent } from '../frontend/js/normalizers/nfl.js';
import { normalizeNbaEvent } from '../frontend/js/normalizers/nba.js';
import { normalizeMlbEvent } from '../frontend/js/normalizers/mlb.js';
import { normalizeF1Event } from '../frontend/js/normalizers/f1.js';
import { normalizeSoccerEvent } from '../frontend/js/normalizers/soccer.js';

test('NFL Normalizer parses quarter, clock, scores, and possession', () => {
  const mockNfl = {
    id: '401547653',
    date: '2024-09-08T17:00Z',
    status: {
      period: 4,
      displayClock: '02:14',
      type: { state: 'in', completed: false, detail: 'Q4 02:14' }
    },
    competitions: [{
      competitors: [
        {
          homeAway: 'home',
          score: '24',
          team: { id: '12', name: 'Chiefs', displayName: 'Kansas City Chiefs', abbreviation: 'KC' }
        },
        {
          homeAway: 'away',
          score: '20',
          team: { id: '33', name: 'Ravens', displayName: 'Baltimore Ravens', abbreviation: 'BAL' }
        }
      ],
      situation: {
        possession: '12',
        downDistanceText: '3rd & 4 at BAL 32',
        isRedZone: true
      }
    }]
  };

  const normalized = normalizeNflEvent(mockNfl);
  assert.strictEqual(normalized.sport, 'football');
  assert.strictEqual(normalized.competitionId, 'nfl');
  assert.strictEqual(normalized.statusStage, 'in_progress');
  assert.strictEqual(normalized.homeTeam.score, 24);
  assert.strictEqual(normalized.awayTeam.score, 20);
  assert.strictEqual(normalized.homeTeam.abbreviation, 'KC');
  assert.strictEqual(normalized.awayTeam.abbreviation, 'BAL');
  assert.strictEqual(normalized.sportDetails.quarter, 4);
  assert.strictEqual(normalized.sportDetails.clockDisplay, '02:14');
  assert.strictEqual(normalized.sportDetails.isRedZone, true);
  assert.strictEqual(normalized.sportDetails.downDistanceText, '3rd & 4 at BAL 32');
});

test('NBA Normalizer parses overtime and clock under 1 minute', () => {
  const mockNba = {
    id: '401585621',
    date: '2024-10-25T02:30Z',
    status: {
      period: 5, // OT
      displayClock: '0:42.1',
      type: { state: 'in', completed: false }
    },
    competitions: [{
      competitors: [
        {
          homeAway: 'home',
          score: '112',
          team: { id: '13', displayName: 'Los Angeles Lakers', abbreviation: 'LAL' }
        },
        {
          homeAway: 'away',
          score: '110',
          team: { id: '2', displayName: 'Boston Celtics', abbreviation: 'BOS' }
        }
      ]
    }]
  };

  const normalized = normalizeNbaEvent(mockNba);
  assert.strictEqual(normalized.sport, 'basketball');
  assert.strictEqual(normalized.sportDetails.isOvertime, true);
  assert.strictEqual(normalized.sportDetails.quarter, 5);
  assert.strictEqual(normalized.statusDisplay, 'OT 0:42.1');
  assert.strictEqual(normalized.homeTeam.score, 112);
  assert.strictEqual(normalized.awayTeam.score, 110);
});

test('MLB Normalizer parses innings, outs, and base runners', () => {
  const mockMlb = {
    gamePk: 746812,
    gameDate: '2024-09-08T20:10Z',
    status: {
      abstractGameState: 'Live',
      detailedState: 'In Progress'
    },
    teams: {
      home: { team: { id: 119, name: 'Los Angeles Dodgers', abbreviation: 'LAD' }, score: 4 },
      away: { team: { id: 147, name: 'New York Yankees', abbreviation: 'NYY' }, score: 3 }
    },
    linescore: {
      currentInning: 7,
      isTopInning: false,
      inningState: 'Bottom',
      outs: 2,
      balls: 3,
      strikes: 2,
      offense: { first: true, second: false, third: true },
      teams: {
        home: { runs: 4, hits: 8, errors: 0 },
        away: { runs: 3, hits: 6, errors: 1 }
      }
    }
  };

  const normalized = normalizeMlbEvent(mockMlb);
  assert.strictEqual(normalized.sport, 'baseball');
  assert.strictEqual(normalized.statusStage, 'in_progress');
  assert.strictEqual(normalized.homeTeam.score, 4);
  assert.strictEqual(normalized.awayTeam.score, 3);
  assert.strictEqual(normalized.sportDetails.inning, 7);
  assert.strictEqual(normalized.sportDetails.half, 'bottom');
  assert.strictEqual(normalized.sportDetails.outs, 2);
  assert.strictEqual(normalized.sportDetails.baseRunners.first, true);
  assert.strictEqual(normalized.sportDetails.baseRunners.second, false);
  assert.strictEqual(normalized.sportDetails.baseRunners.third, true);
});

test('F1 Normalizer parses Grand Prix and driver leaderboard', () => {
  const mockF1 = {
    id: '2024_monza',
    name: 'Italian Grand Prix',
    date: '2024-09-01T13:00Z',
    status: {
      period: 42,
      type: { state: 'in', completed: false }
    },
    competitions: [{
      name: 'Race',
      competitors: [
        { order: 1, athlete: { displayName: 'Max Verstappen', shortName: 'M. Verstappen' } },
        { order: 2, athlete: { displayName: 'Lando Norris', shortName: 'L. Norris' }, statusText: '+3.142s' },
        { order: 3, athlete: { displayName: 'Charles Leclerc', shortName: 'C. Leclerc' }, statusText: '+6.280s' }
      ]
    }]
  };

  const normalized = normalizeF1Event(mockF1);
  assert.strictEqual(normalized.sport, 'motorsport');
  assert.strictEqual(normalized.homeTeam.abbreviation, 'VER');
  assert.strictEqual(normalized.awayTeam.abbreviation, 'NOR');
  assert.strictEqual(normalized.sportDetails.currentLap, 42);
  assert.strictEqual(normalized.sportDetails.leaderboard.length, 3);
  assert.strictEqual(normalized.sportDetails.leaderboard[0].driverShortName, 'VER');
  assert.strictEqual(normalized.sportDetails.leaderboard[1].gapToLeader, '+3.142s');
});

test('Soccer Normalizer parses Premier League clock and red cards', () => {
  const mockSoccer = {
    id: '700123',
    date: '2024-09-15T15:30Z',
    status: {
      clock: 78,
      displayClock: "78'",
      period: 2,
      type: { state: 'in', completed: false }
    },
    competitions: [{
      competitors: [
        {
          homeAway: 'home',
          score: '2',
          redCards: 1,
          team: { id: '359', displayName: 'Arsenal', abbreviation: 'ARS' }
        },
        {
          homeAway: 'away',
          score: '1',
          redCards: 0,
          team: { id: '364', displayName: 'Liverpool', abbreviation: 'LIV' }
        }
      ]
    }]
  };

  const normalized = normalizeSoccerEvent(mockSoccer, 'epl');
  assert.strictEqual(normalized.sport, 'soccer');
  assert.strictEqual(normalized.competitionId, 'epl');
  assert.strictEqual(normalized.homeTeam.score, 2);
  assert.strictEqual(normalized.awayTeam.score, 1);
  assert.strictEqual(normalized.sportDetails.matchMinute, 78);
  assert.strictEqual(normalized.sportDetails.half, '2H');
  assert.strictEqual(normalized.sportDetails.redCards.home, 1);
  assert.strictEqual(normalized.sportDetails.redCards.away, 0);
});
