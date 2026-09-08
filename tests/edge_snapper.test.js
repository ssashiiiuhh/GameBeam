// tests/edge_snapper.test.js - Unit tests for EdgeSnapper and coordinate calculations
import test from 'node:test';
import assert from 'node:assert';

import { EdgeSnapper } from '../frontend/js/edge_snapper.js';

test('EdgeSnapper snaps to top-right corner with safe margin', () => {
  const snapper = new EdgeSnapper();
  const screenBounds = { x: 0, y: 0, width: 1440, height: 900 };
  const windowWidth = 320;
  const windowHeight = 92;

  // Positioned near top-right (e.g. x = 1110, y = 35)
  // Distance from right = 1440 - (1110 + 320) = 10px (<= 24px threshold)
  // Distance from top = 35 - 0 = 35px (<= 32px menuBar + 24px threshold = 56px)
  const result = snapper.calculateSnap(1110, 35, windowWidth, windowHeight, screenBounds);

  assert.strictEqual(result.isSnapped, true);
  assert.strictEqual(result.anchor, 'top-right');
  // Right snap: 1440 - 320 - 16 = 1104
  assert.strictEqual(result.x, 1104);
  // Top snap: 0 + 32 (menu bar) + 16 (margin) = 48
  assert.strictEqual(result.y, 48);
});

test('EdgeSnapper leaves coordinates untouched when outside threshold', () => {
  const snapper = new EdgeSnapper();
  const screenBounds = { x: 0, y: 0, width: 1440, height: 900 };

  // Positioned in the middle of screen (x = 500, y = 400)
  const result = snapper.calculateSnap(500, 400, 320, 92, screenBounds);

  assert.strictEqual(result.isSnapped, false);
  assert.strictEqual(result.anchor, 'custom-custom');
  assert.strictEqual(result.x, 500);
  assert.strictEqual(result.y, 400);
});

test('EdgeSnapper restores safe position on primary monitor', () => {
  const snapper = new EdgeSnapper();
  const primary = { width: 1728, height: 1117 };

  // Saved top-right position
  const pos = snapper.getSafeRestoredPosition({ anchor: 'top-right' }, primary);
  assert.strictEqual(pos.anchor, 'top-right');
  assert.strictEqual(pos.x, 1728 - 320 - 16);
  assert.strictEqual(pos.y, 32 + 16);
});
