import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { coordKey, coordEquals, parseKey } from '../../src/core/grid/Coordinates';

describe('Grid & Coordinates', () => {
  describe('Coordinates helpers', () => {
    it('should format and parse coordinate keys correctly', () => {
      const coord = { x: 12, y: 34 };
      const key = coordKey(coord);
      expect(key).toBe('12,34');
      expect(parseKey(key)).toEqual(coord);
    });

    it('should compare coordinates correctly', () => {
      expect(coordEquals({ x: 5, y: 7 }, { x: 5, y: 7 })).toBe(true);
      expect(coordEquals({ x: 5, y: 7 }, { x: 5, y: 8 })).toBe(false);
      expect(coordEquals({ x: 5, y: 7 }, { x: 6, y: 7 })).toBe(false);
    });
  });

  describe('Grid class', () => {
    it('should throw an error for invalid dimensions', () => {
      expect(() => new Grid(0, 10)).toThrow();
      expect(() => new Grid(10, -5)).toThrow();
      expect(() => new Grid(3.5, 10)).toThrow();
    });

    it('should initialize all cells as empty with weight 1', () => {
      const grid = new Grid(5, 5);
      expect(grid.width).toBe(5);
      expect(grid.height).toBe(5);

      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          const cell = grid.getCell({ x, y });
          expect(cell).toBeDefined();
          expect(cell?.type).toBe('empty');
          expect(cell?.weight).toBe(1);
          expect(grid.isWalkable({ x, y })).toBe(true);
        }
      }
    });

    it('should validate boundary checks correctly', () => {
      const grid = new Grid(10, 8);
      expect(grid.isValid({ x: 0, y: 0 })).toBe(true);
      expect(grid.isValid({ x: 9, y: 7 })).toBe(true);
      expect(grid.isValid({ x: 10, y: 7 })).toBe(false);
      expect(grid.isValid({ x: 5, y: 8 })).toBe(false);
      expect(grid.isValid({ x: -1, y: 0 })).toBe(false);
      expect(grid.isValid({ x: 0, y: -1 })).toBe(false);
    });

    it('should update cell types and weights', () => {
      const grid = new Grid(10, 10);
      const coord = { x: 3, y: 4 };

      grid.setCellType(coord, 'wall');
      expect(grid.getCell(coord)?.type).toBe('wall');
      expect(grid.isWalkable(coord)).toBe(false);

      grid.setCellType(coord, 'weight', 15);
      expect(grid.getCell(coord)?.type).toBe('weight');
      expect(grid.getCell(coord)?.weight).toBe(15);
      expect(grid.isWalkable(coord)).toBe(true);

      grid.setCellType(coord, 'start');
      expect(grid.getCell(coord)?.type).toBe('start');
      expect(grid.isWalkable(coord)).toBe(true);
    });

    it('should resolve 4-way orthogonal neighbors correctly', () => {
      const grid = new Grid(5, 5);

      // Center cell: 4 neighbors
      const centerNeighbors = grid.getNeighbors({ x: 2, y: 2 });
      expect(centerNeighbors.length).toBe(4);
      expect(centerNeighbors).toContainEqual({ x: 2, y: 1 }); // North
      expect(centerNeighbors).toContainEqual({ x: 3, y: 2 }); // East
      expect(centerNeighbors).toContainEqual({ x: 2, y: 3 }); // South
      expect(centerNeighbors).toContainEqual({ x: 1, y: 2 }); // West

      // Corner cell: 2 neighbors
      const cornerNeighbors = grid.getNeighbors({ x: 0, y: 0 });
      expect(cornerNeighbors.length).toBe(2);
      expect(cornerNeighbors).toContainEqual({ x: 1, y: 0 });
      expect(cornerNeighbors).toContainEqual({ x: 0, y: 1 });

      // Edge cell: 3 neighbors
      const edgeNeighbors = grid.getNeighbors({ x: 2, y: 0 });
      expect(edgeNeighbors.length).toBe(3);
    });

    it('should resolve 8-way diagonal neighbors when enabled', () => {
      const grid = new Grid(5, 5);

      const centerNeighbors = grid.getNeighbors({ x: 2, y: 2 }, true);
      expect(centerNeighbors.length).toBe(8);

      const cornerNeighbors = grid.getNeighbors({ x: 0, y: 0 }, true);
      expect(cornerNeighbors.length).toBe(3);
      expect(cornerNeighbors).toContainEqual({ x: 1, y: 1 });
    });

    it('should exclude walls in getNeighbors but include them in getAllNeighbors', () => {
      const grid = new Grid(5, 5);
      grid.setCellType({ x: 2, y: 1 }, 'wall'); // North is wall

      const walkable = grid.getNeighbors({ x: 2, y: 2 });
      expect(walkable.length).toBe(3);
      expect(walkable).not.toContainEqual({ x: 2, y: 1 });

      const all = grid.getAllNeighbors({ x: 2, y: 2 });
      expect(all.length).toBe(4);
      expect(all).toContainEqual({ x: 2, y: 1 });
    });

    it('should reset grid state while optionally preserving walls and weights', () => {
      const grid = new Grid(5, 5);
      grid.setCellType({ x: 1, y: 1 }, 'wall');
      grid.setCellType({ x: 2, y: 2 }, 'weight', 5);
      grid.setCellType({ x: 0, y: 0 }, 'start');
      grid.setCellType({ x: 4, y: 4 }, 'target');

      // Reset preserving walls and weights
      grid.reset(true);
      expect(grid.getCell({ x: 1, y: 1 })?.type).toBe('wall');
      expect(grid.getCell({ x: 2, y: 2 })?.type).toBe('weight');
      expect(grid.getCell({ x: 0, y: 0 })?.type).toBe('empty');
      expect(grid.getCell({ x: 4, y: 4 })?.type).toBe('empty');

      // Full reset
      grid.reset(false);
      expect(grid.getCell({ x: 1, y: 1 })?.type).toBe('empty');
      expect(grid.getCell({ x: 2, y: 2 })?.type).toBe('empty');
    });

    it('should clone grid as an independent deep copy', () => {
      const grid = new Grid(3, 3);
      grid.setCellType({ x: 1, y: 1 }, 'wall');

      const clone = grid.clone();
      expect(clone.width).toBe(3);
      expect(clone.height).toBe(3);
      expect(clone.getCell({ x: 1, y: 1 })?.type).toBe('wall');

      // Mutating clone does not affect original
      clone.setCellType({ x: 1, y: 1 }, 'empty');
      expect(clone.getCell({ x: 1, y: 1 })?.type).toBe('empty');
      expect(grid.getCell({ x: 1, y: 1 })?.type).toBe('wall');
    });
  });
});
