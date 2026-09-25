import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import {
  serializeState,
  deserializeState,
  buildShareUrl,
  copyShareUrl,
  applySerializedState,
} from '../../src/core/StateSerializer';

const Buffer = (globalThis as any).Buffer;

describe('StateSerializer', () => {
  let grid: Grid;
  const start = { x: 2, y: 3 };
  const target = { x: 18, y: 12 };

  beforeEach(() => {
    grid = new Grid(25, 20);
    grid.setCellType(start, 'start');
    grid.setCellType(target, 'target');
  });

  describe('serializeState & deserializeState roundtrip', () => {
    it('serializes and deserializes basic state without obstacles', () => {
      const hash = serializeState(grid, start, target, 'astar', 'manhattan');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);

      const deserialized = deserializeState(hash);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.width).toBe(25);
      expect(deserialized!.height).toBe(20);
      expect(deserialized!.start).toEqual(start);
      expect(deserialized!.target).toEqual(target);
      expect(deserialized!.algorithm).toBe('astar');
      expect(deserialized!.heuristic).toBe('manhattan');
      expect(deserialized!.walls).toEqual([]);
      expect(deserialized!.weights).toEqual([]);
    });

    it('preserves walls and weights accurately across serialization roundtrip', () => {
      // Add walls
      grid.setCellType({ x: 5, y: 5 }, 'wall');
      grid.setCellType({ x: 5, y: 6 }, 'wall');
      grid.setCellType({ x: 5, y: 7 }, 'wall');

      // Add weights
      grid.setCellType({ x: 10, y: 10 }, 'weight', 5);
      grid.setCellType({ x: 11, y: 10 }, 'weight', 8);

      const hash = serializeState(grid, start, target, 'dijkstra');
      const deserialized = deserializeState(hash);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.walls).toHaveLength(3);
      expect(deserialized!.walls).toContainEqual({ x: 5, y: 5 });
      expect(deserialized!.walls).toContainEqual({ x: 5, y: 6 });
      expect(deserialized!.walls).toContainEqual({ x: 5, y: 7 });

      expect(deserialized!.weights).toHaveLength(2);
      expect(deserialized!.weights).toContainEqual({ coord: { x: 10, y: 10 }, weight: 5 });
      expect(deserialized!.weights).toContainEqual({ coord: { x: 11, y: 10 }, weight: 8 });
      expect(deserialized!.algorithm).toBe('dijkstra');
      expect(deserialized!.heuristic).toBeUndefined();
    });

    it('produces URL-safe base64 strings (no +, /, or =)', () => {
      grid.setCellType({ x: 1, y: 1 }, 'wall');
      grid.setCellType({ x: 2, y: 2 }, 'weight', 5);

      const hash = serializeState(grid, start, target);
      expect(hash).not.toMatch(/[+/=]/);
    });
  });

  describe('Hash parsing and format flexibility', () => {
    it('parses hash prefixed with #state=', () => {
      const hash = serializeState(grid, start, target, 'bfs');
      const deserialized = deserializeState(`#state=${hash}`);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.algorithm).toBe('bfs');
    });

    it('parses hash in a full URL with #state=', () => {
      const hash = serializeState(grid, start, target);
      const url = `https://example.com/pathfinder/index.html#state=${hash}`;
      const deserialized = deserializeState(url);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.start).toEqual(start);
    });

    it('parses hash with extra query parameters in fragment', () => {
      const hash = serializeState(grid, start, target);
      const fragment = `#debug=true&state=${hash}&theme=cyberpunk`;
      const deserialized = deserializeState(fragment);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.target).toEqual(target);
    });
  });

  describe('Corrupt hash and bounds resilience', () => {
    it('returns null on null, undefined, or empty string input', () => {
      expect(deserializeState('')).toBeNull();
      expect(deserializeState(null as any)).toBeNull();
      expect(deserializeState(undefined as any)).toBeNull();
      expect(deserializeState('#state=')).toBeNull();
    });

    it('returns null on garbage non-base64 characters', () => {
      expect(deserializeState('!@#$%^&*()_+')).toBeNull();
      expect(deserializeState('#state=invalid-base64-random-nonsense-%%%')).toBeNull();
    });

    it('returns null on valid base64 that is invalid JSON', () => {
      // Base64 for "this is not json"
      const invalidJsonB64 = Buffer.from('this is not json').toString('base64');
      expect(deserializeState(invalidJsonB64)).toBeNull();
    });

    it('returns null on invalid or non-integer dimensions', () => {
      const payload1 = Buffer.from(JSON.stringify({ w: -5, h: 20, s: [0, 0], t: [1, 1] })).toString('base64');
      expect(deserializeState(payload1)).toBeNull();

      const payload2 = Buffer.from(JSON.stringify({ w: 20, h: 0, s: [0, 0], t: [1, 1] })).toString('base64');
      expect(deserializeState(payload2)).toBeNull();

      const payload3 = Buffer.from(JSON.stringify({ w: 20.5, h: 20, s: [0, 0], t: [1, 1] })).toString('base64');
      expect(deserializeState(payload3)).toBeNull();
    });

    it('returns null when start or target is outside grid bounds', () => {
      // Start is at x=30 on a 25-wide grid
      const payload = Buffer.from(
        JSON.stringify({ w: 25, h: 20, s: [30, 5], t: [10, 10] })
      ).toString('base64');
      expect(deserializeState(payload)).toBeNull();

      // Target is at y=-1
      const payload2 = Buffer.from(
        JSON.stringify({ w: 25, h: 20, s: [5, 5], t: [10, -1] })
      ).toString('base64');
      expect(deserializeState(payload2)).toBeNull();
    });

    it('sanitizes walls and weights that fall out of bounds or overlap with start/target', () => {
      const payload = Buffer.from(
        JSON.stringify({
          w: 25,
          h: 20,
          s: [2, 3],
          t: [18, 12],
          wl: [
            [2, 3],   // overlaps start (should be excluded)
            [18, 12], // overlaps target (should be excluded)
            [99, 99], // out of bounds (should be excluded)
            [5, 5],   // valid
          ],
          wt: [
            [2, 3, 5],   // overlaps start (should be excluded)
            [100, 5, 5], // out of bounds (should be excluded)
            [8, 8, 4],   // valid
          ],
        })
      ).toString('base64');

      const deserialized = deserializeState(payload);
      expect(deserialized).not.toBeNull();
      expect(deserialized!.walls).toEqual([{ x: 5, y: 5 }]);
      expect(deserialized!.weights).toEqual([{ coord: { x: 8, y: 8 }, weight: 4 }]);
    });
  });

  describe('buildShareUrl and copyShareUrl', () => {
    it('builds a complete share URL with #state=', () => {
      const url = buildShareUrl(grid, start, target, 'jps', 'octile', 'https://pathfinder.io/');
      expect(url).toContain('https://pathfinder.io/#state=');
      const hashPart = url.split('#state=')[1];
      expect(hashPart).toBeDefined();

      const parsed = deserializeState(hashPart);
      expect(parsed?.algorithm).toBe('jps');
      expect(parsed?.heuristic).toBe('octile');
    });

    it('copies URL to clipboard via fallback or API without throwing', async () => {
      const result = await copyShareUrl('https://pathfinder.io/#state=test');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('applySerializedState', () => {
    it('applies restored state onto an existing Grid instance', () => {
      const testGrid = new Grid(25, 20);
      const state = {
        width: 25,
        height: 20,
        start: { x: 1, y: 1 },
        target: { x: 20, y: 15 },
        walls: [{ x: 3, y: 3 }, { x: 3, y: 4 }],
        weights: [{ coord: { x: 7, y: 7 }, weight: 6 }],
      };

      const endpoints = applySerializedState(state, testGrid);
      expect(endpoints.start).toEqual({ x: 1, y: 1 });
      expect(endpoints.target).toEqual({ x: 20, y: 15 });

      expect(testGrid.getCell({ x: 1, y: 1 })?.type).toBe('start');
      expect(testGrid.getCell({ x: 20, y: 15 })?.type).toBe('target');
      expect(testGrid.getCell({ x: 3, y: 3 })?.type).toBe('wall');
      expect(testGrid.getCell({ x: 3, y: 4 })?.type).toBe('wall');
      expect(testGrid.getCell({ x: 7, y: 7 })?.type).toBe('weight');
      expect(testGrid.getCell({ x: 7, y: 7 })?.weight).toBe(6);
    });
  });
});
