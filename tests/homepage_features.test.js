// tests/homepage_features.test.js - Unit tests for Homepage League Grouping, dynamic badge counts, and situation indicators
import test from 'node:test';
import assert from 'node:assert/strict';

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
} from '../frontend/js/homepage_helpers.js';

test('Homepage Grouping: groups matches strictly according to MLB, NFL, NBA priority order', () => {
  const matches = [
    { id: '1', sport: 'basketball', competitionName: 'NBA' },
    { id: '2', sport: 'baseball', competitionName: 'MLB' },
    { id: '3', sport: 'football', competitionName: 'NFL' }
  ];

  const groups = groupMatchesByLeague(matches);

  // Should group into MLB, NFL, NBA
  const groupIds = groups.map(g => g.id);
  assert.deepEqual(groupIds, ['mlb', 'nfl', 'nba']);

  assert.equal(groups.find(g => g.id === 'mlb').matches.length, 1);
  assert.equal(groups.find(g => g.id === 'nfl').matches.length, 1);
  assert.equal(groups.find(g => g.id === 'nba').matches.length, 1);
});

test('Homepage Grouping: excludes leagues with no matches and catches other sports', () => {
  const matches = [
    { id: '1', sport: 'baseball', competitionName: 'MLB' },
    { id: '2', sport: 'tennis', competitionName: 'US Open' }
  ];

  const groups = groupMatchesByLeague(matches);
  const groupIds = groups.map(g => g.id);

  assert.deepEqual(groupIds, ['mlb', 'other']);
  assert.equal(groups[0].matches[0].id, '1');
  assert.equal(groups[1].matches[0].id, '2');
});

test('Dynamic Badge Counts: correctly tallies counts across MLB, NFL, NBA and favourites', () => {
  const matches = [
    { id: 'm1', sport: 'baseball', homeTeam: { id: 'nyy' } },
    { id: 'm2', sport: 'baseball', homeTeam: { id: 'bos' } },
    { id: 'm3', sport: 'football', homeTeam: { id: 'kc' } },
    { id: 'm4', sport: 'basketball', homeTeam: { id: 'lal' } }
  ];

  const isFavFn = (m) => m.id === 'm1' || m.homeTeam?.id === 'kc';
  const counts = calculateSportCounts(matches, isFavFn);

  assert.equal(counts.all, 4);
  assert.equal(counts.mlb, 2);
  assert.equal(counts.nfl, 1);
  assert.equal(counts.nba, 1);
  assert.equal(counts.favs, 2); // m1 and m3
});

test('Situation Formatter: generates rich telemetry strings for all supported sports', () => {
  // NFL
  const nflMatch = {
    sport: 'football',
    sportDetails: { downDistanceText: '3rd & Goal at BAL 2', possession: 'KC' }
  };
  assert.equal(getCardSituation(nflMatch), '3rd & Goal at BAL 2');

  // MLB
  const mlbMatch = {
    sport: 'baseball',
    sportDetails: { outs: 2, half: 'top', inning: 7 }
  };
  assert.equal(getCardSituation(mlbMatch), '2 Outs · Top 7');

  // NBA
  const nbaMatch = {
    sport: 'basketball',
    sportDetails: { quarter: 4 }
  };
  assert.equal(getCardSituation(nbaMatch), 'Quarter 4');
});

test('Bases Diamond: generates SVG markup reflecting occupied bases correctly', () => {
  const emptyDiamond = renderBasesDiamond({});
  assert.ok(emptyDiamond.includes('class="bases-diamond"'));
  assert.ok(!emptyDiamond.includes('occupied'));

  const loadedDiamond = renderBasesDiamond({ first: true, second: true, third: true });
  // All three bases should have occupied class
  const occupiedCount = (loadedDiamond.match(/occupied/g) || []).length;
  assert.equal(occupiedCount, 3);

  const runnerOnSecond = renderBasesDiamond({ second: true });
  const runnerOnSecondCount = (runnerOnSecond.match(/occupied/g) || []).length;
  assert.equal(runnerOnSecondCount, 1);
});

test('Outs Dots: renders correct number of filled pips', () => {
  const zeroOuts = renderOutsDots(0);
  assert.equal((zeroOuts.match(/filled/g) || []).length, 0);

  const oneOut = renderOutsDots(1);
  assert.equal((oneOut.match(/filled/g) || []).length, 1);

  const twoOuts = renderOutsDots(2);
  assert.equal((twoOuts.match(/filled/g) || []).length, 2);

  const threeOuts = renderOutsDots(3);
  assert.equal((threeOuts.match(/filled/g) || []).length, 3);
});

test('Date Scope Filter: accurately identifies yesterday, today, tomorrow, this-week, all', () => {
  const now = new Date('2026-09-07T12:00:00Z');

  // Today live match
  const liveMatch = { statusStage: 'in_progress' };
  assert.equal(isMatchForDateScope(liveMatch, 'today', now), true);

  // Today scheduled match
  const todayMatch = {
    statusStage: 'scheduled',
    scheduledStartTime: '2026-09-07T18:00:00Z'
  };
  assert.equal(isMatchForDateScope(todayMatch, 'today', now), true);
  assert.equal(isMatchForDateScope(todayMatch, 'yesterday', now), false);

  // Yesterday completed match (24h ago)
  const yesterdayMatch = {
    statusStage: 'completed',
    scheduledStartTime: '2026-09-06T12:00:00Z'
  };
  assert.equal(isMatchForDateScope(yesterdayMatch, 'yesterday', now), true);
  assert.equal(isMatchForDateScope(yesterdayMatch, 'today', now), false);

  // Tomorrow scheduled match (24h in future)
  const tomorrowMatch = {
    statusStage: 'scheduled',
    scheduledStartTime: '2026-09-08T12:00:00Z'
  };
  assert.equal(isMatchForDateScope(tomorrowMatch, 'tomorrow', now), true);
  assert.equal(isMatchForDateScope(tomorrowMatch, 'today', now), false);

  // Match in 4 days (this-week = true, today = false, upcoming = true)
  const futureMatch = {
    statusStage: 'scheduled',
    scheduledStartTime: '2026-09-11T12:00:00Z'
  };
  assert.equal(isMatchForDateScope(futureMatch, 'this-week', now), true);
  assert.equal(isMatchForDateScope(futureMatch, 'today', now), false);
  assert.equal(isMatchForDateScope(futureMatch, 'upcoming', now), true);
  assert.equal(isMatchForDateScope(futureMatch, 'all', now), true);
  assert.equal(isMatchForDateScope(todayMatch, 'upcoming', now), true);
  assert.equal(isMatchForDateScope(yesterdayMatch, 'upcoming', now), false);
});

test('Sport Emoji: maps known sports to respective emojis', () => {
  assert.equal(getSportEmoji('baseball'), '⚾');
  assert.equal(getSportEmoji('football'), '🏈');
  assert.equal(getSportEmoji('basketball'), '🏀');
  assert.equal(getSportEmoji('unknown'), '🏆');
});
