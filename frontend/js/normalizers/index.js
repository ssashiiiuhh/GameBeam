// normalizers/index.js - Unified dispatcher for sport normalization

import { normalizeNflEvent } from './nfl.js';
import { normalizeNbaEvent } from './nba.js';
import { normalizeMlbEvent } from './mlb.js';
import { normalizeF1Event } from './f1.js';
import { normalizeSoccerEvent } from './soccer.js';

export function normalizeScoreboard(rawPayload, competitionKey) {
  if (!rawPayload) return [];

  // 1. Official MLB Stats API response structure: { dates: [ { games: [...] } ] }
  if (rawPayload.dates && Array.isArray(rawPayload.dates)) {
    const matches = [];
    for (const d of rawPayload.dates) {
      if (Array.isArray(d.games)) {
        for (const g of d.games) {
          matches.push(normalizeMlbEvent(g));
        }
      }
    }
    return matches;
  }

  // 2. ESPN Scoreboard structure: { events: [...] }
  const events = rawPayload.events || [];
  const normalized = [];

  for (const ev of events) {
    try {
      switch (competitionKey) {
        case 'nfl':
          normalized.push(normalizeNflEvent(ev));
          break;
        case 'nba':
          normalized.push(normalizeNbaEvent(ev));
          break;
        case 'mlb':
          normalized.push(normalizeMlbEvent(ev));
          break;
        case 'f1':
          normalized.push(normalizeF1Event(ev));
          break;
        case 'epl':
          normalized.push(normalizeSoccerEvent(ev, 'epl'));
          break;
        case 'ucl':
          normalized.push(normalizeSoccerEvent(ev, 'ucl'));
          break;
        default:
          console.warn(`[Normalizer] Unknown competition key: ${competitionKey}`);
      }
    } catch (err) {
      console.error(`[Normalizer] Error normalizing event ${ev.id}:`, err);
    }
  }

  return normalized;
}

export {
  normalizeNflEvent,
  normalizeNbaEvent,
  normalizeMlbEvent,
  normalizeF1Event,
  normalizeSoccerEvent
};
