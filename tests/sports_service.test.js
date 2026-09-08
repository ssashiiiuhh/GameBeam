import test from 'node:test';
import assert from 'node:assert/strict';
import { sportsService, SPORT_ENDPOINTS } from '../frontend/js/sports_service.js';

test('SportsService: Has 6 real endpoints configured', () => {
  assert.equal(SPORT_ENDPOINTS.length, 6);
  const keys = SPORT_ENDPOINTS.map(e => e.key);
  assert.deepEqual(keys, ['nfl', 'nba', 'mlb', 'f1', 'epl', 'ucl']);
});

test('SportsService: getBestMatchToPin prioritizes in_progress > completed > scheduled', () => {
  const scheduled = { id: 'espn:nfl:1', statusStage: 'scheduled', homeTeam: { name: 'Hawks' } };
  const completed = { id: 'mlb:123', statusStage: 'completed', homeTeam: { name: 'Reds' } };
  const inProgress = { id: 'espn:epl:456', statusStage: 'in_progress', homeTeam: { name: 'Arsenal' } };

  // When only scheduled and completed exist
  assert.equal(sportsService.getBestMatchToPin([scheduled, completed]).id, 'mlb:123');

  // When in_progress exists
  assert.equal(sportsService.getBestMatchToPin([scheduled, completed, inProgress]).id, 'espn:epl:456');
});

test('SportsService: formatTrayTitle generates clean macOS menu bar scores', () => {
  const baseball = {
    sport: 'baseball',
    statusStage: 'completed',
    awayTeam: { abbreviation: 'MIL', score: 8 },
    homeTeam: { abbreviation: 'CIN', score: 12 }
  };
  assert.equal(sportsService.formatTrayTitle(baseball), '⚾ MIL 8 - 12 CIN (Final)');

  const liveSoccer = {
    sport: 'soccer',
    statusStage: 'in_progress',
    statusDisplay: "64'",
    awayTeam: { abbreviation: 'EVE', score: 1 },
    homeTeam: { abbreviation: 'MUN', score: 2 }
  };
  assert.equal(sportsService.formatTrayTitle(liveSoccer), "⚽ EVE 1 - 2 MUN (64')");

  const f1 = {
    sport: 'motorsport',
    sportDetails: { sessionName: 'Italian GP' }
  };
  assert.equal(sportsService.formatTrayTitle(f1), '🏎️ F1: Italian GP');
});

test('SportsService: getEndpointForMatch routes correctly', () => {
  assert.equal(sportsService.getEndpointForMatch('mlb:824469').key, 'mlb');
  assert.equal(sportsService.getEndpointForMatch('espn:nfl:401872656').key, 'nfl');
  assert.equal(sportsService.getEndpointForMatch('espn:epl:401879291').key, 'epl');
  assert.equal(sportsService.getEndpointForMatch('espn:f1:600057442').key, 'f1');
});
