import { describe, it, expect, beforeEach } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { coordEquals } from '../../src/core/grid/Coordinates';
import { CHALLENGE_PRESETS, loadPreset } from '../../src/core/presets';

describe('Curated Challenge Presets', () => {
  let grid: Grid;

  beforeEach(() => {
    grid = new Grid(45, 25);
  });

  it('defines all 4 required challenge presets with complete metadata', () => {
    const requiredKeys = ['bottleneck', 'spiral', 'islandBridges', 'mountainPass'];

    for (const key of requiredKeys) {
      const preset = CHALLENGE_PRESETS[key];
      expect(preset, `Preset ${key} should exist`).toBeDefined();
      expect(preset.id).toBe(key);
      expect(typeof preset.name).toBe('string');
      expect(preset.name.length).toBeGreaterThan(0);
      expect(typeof preset.description).toBe('string');
      expect(preset.description.length).toBeGreaterThan(0);
      expect(typeof preset.recommendedAlgo).toBe('string');
      expect(typeof preset.difficulty).toBe('string');
      expect(typeof preset.create).toBe('function');
    }
  });

  it('throws an error when loading an unknown preset ID', () => {
    expect(() => loadPreset('non-existent-preset', grid)).toThrow(
      /Unknown challenge preset ID/
    );
  });

  describe('The Bottleneck preset', () => {
    it('loads valid walkable endpoints and creates choke point', () => {
      const { start, target } = loadPreset('bottleneck', grid);

      expect(grid.isValid(start)).toBe(true);
      expect(grid.isValid(target)).toBe(true);
      expect(coordEquals(start, target)).toBe(false);

      expect(grid.isWalkable(start)).toBe(true);
      expect(grid.isWalkable(target)).toBe(true);
      expect(grid.getCell(start)?.type).toBe('start');
      expect(grid.getCell(target)?.type).toBe('target');

      // Verify walls were generated
      let wallCount = 0;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.getCell({ x, y })?.type === 'wall') {
            wallCount++;
          }
        }
      }
      expect(wallCount).toBeGreaterThan(15);
    });
  });

  describe('Spiral Trap preset', () => {
    it('loads valid walkable endpoints with target at center', () => {
      const { start, target } = loadPreset('spiral', grid);

      expect(grid.isValid(start)).toBe(true);
      expect(grid.isValid(target)).toBe(true);
      expect(coordEquals(start, target)).toBe(false);

      expect(grid.isWalkable(start)).toBe(true);
      expect(grid.isWalkable(target)).toBe(true);
      expect(grid.getCell(start)?.type).toBe('start');
      expect(grid.getCell(target)?.type).toBe('target');

      // Target should be centered
      const expectedCenterX = Math.floor(grid.width / 2);
      const expectedCenterY = Math.floor(grid.height / 2);
      expect(target.x).toBe(expectedCenterX);
      expect(target.y).toBe(expectedCenterY);

      // Verify substantial spiral walls
      let wallCount = 0;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.getCell({ x, y })?.type === 'wall') {
            wallCount++;
          }
        }
      }
      expect(wallCount).toBeGreaterThan(30);
    });
  });

  describe('Island Bridges preset', () => {
    it('loads archipelago with water chasms and narrow bridge connections', () => {
      const { start, target } = loadPreset('islandBridges', grid);

      expect(grid.isValid(start)).toBe(true);
      expect(grid.isValid(target)).toBe(true);
      expect(coordEquals(start, target)).toBe(false);

      expect(grid.isWalkable(start)).toBe(true);
      expect(grid.isWalkable(target)).toBe(true);
      expect(grid.getCell(start)?.type).toBe('start');
      expect(grid.getCell(target)?.type).toBe('target');

      let wallCount = 0;
      let weightCount = 0;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const type = grid.getCell({ x, y })?.type;
          if (type === 'wall') wallCount++;
          else if (type === 'weight') weightCount++;
        }
      }

      expect(wallCount).toBeGreaterThan(20);
      expect(weightCount).toBeGreaterThan(10);
    });
  });

  describe('Mountain Pass preset', () => {
    it('loads heavy elevation ridges with a low-cost valley corridor', () => {
      const { start, target } = loadPreset('mountainPass', grid);

      expect(grid.isValid(start)).toBe(true);
      expect(grid.isValid(target)).toBe(true);
      expect(coordEquals(start, target)).toBe(false);

      expect(grid.isWalkable(start)).toBe(true);
      expect(grid.isWalkable(target)).toBe(true);
      expect(grid.getCell(start)?.type).toBe('start');
      expect(grid.getCell(target)?.type).toBe('target');

      let weightCount = 0;
      let wallCount = 0;
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const cell = grid.getCell({ x, y });
          if (cell?.type === 'weight') {
            weightCount++;
            expect(cell.weight).toBeGreaterThanOrEqual(5);
          } else if (cell?.type === 'wall') {
            wallCount++;
          }
        }
      }

      expect(weightCount).toBeGreaterThan(50);
      expect(wallCount).toBeGreaterThan(5);
    });
  });

  describe('Responsive grid dimensions compatibility', () => {
    const testDimensions = [
      { w: 15, h: 15 },
      { w: 30, h: 20 },
      { w: 60, h: 35 },
    ];

    for (const dims of testDimensions) {
      it(`successfully loads all presets on a ${dims.w}x${dims.h} grid`, () => {
        const testGrid = new Grid(dims.w, dims.h);

        for (const presetKey of Object.keys(CHALLENGE_PRESETS)) {
          const { start, target } = loadPreset(presetKey, testGrid);
          expect(testGrid.isValid(start)).toBe(true);
          expect(testGrid.isValid(target)).toBe(true);
          expect(coordEquals(start, target)).toBe(false);
          expect(testGrid.isWalkable(start)).toBe(true);
          expect(testGrid.isWalkable(target)).toBe(true);
        }
      });
    }
  });
});
