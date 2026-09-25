import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { bfs } from '../../src/core/algorithms/bfs';
import { dfs } from '../../src/core/algorithms/dfs';
import { AlgorithmGenerator, SearchSummary, StepEvent } from '../../src/core/algorithms/types';

function runGenerator(gen: AlgorithmGenerator): { events: StepEvent[]; summary: SearchSummary } {
  const events: StepEvent[] = [];
  let result = gen.next();
  while (!result.done) {
    events.push(result.value);
    result = gen.next();
  }
  return { events, summary: result.value };
}

describe('Unweighted Algorithms: BFS and DFS', () => {
  describe('BFS', () => {
    it('should find the shortest path in terms of hop count', () => {
      const grid = new Grid(8, 8);
      const start = { x: 1, y: 1 };
      const target = { x: 6, y: 1 };

      const { summary } = runGenerator(bfs({ grid, start, target }));

      expect(summary.found).toBe(true);
      expect(summary.path.length).toBe(6);
      expect(summary.cost).toBe(5);
    });

    it('should navigate around obstacles using RingQueue without Array.shift', () => {
      const grid = new Grid(6, 6);
      const start = { x: 1, y: 2 };
      const target = { x: 4, y: 2 };

      grid.setCellType({ x: 2, y: 1 }, 'wall');
      grid.setCellType({ x: 2, y: 2 }, 'wall');
      grid.setCellType({ x: 2, y: 3 }, 'wall');

      const { summary } = runGenerator(bfs({ grid, start, target }));

      expect(summary.found).toBe(true);
      expect(summary.path[0]).toEqual(start);
      expect(summary.path[summary.path.length - 1]).toEqual(target);
      for (const step of summary.path) {
        expect(grid.isWalkable(step)).toBe(true);
      }
    });

    it('should return no path found when target is surrounded by walls', () => {
      const grid = new Grid(4, 4);
      const start = { x: 0, y: 0 };
      const target = { x: 3, y: 3 };

      grid.setCellType({ x: 2, y: 3 }, 'wall');
      grid.setCellType({ x: 3, y: 2 }, 'wall');

      const { summary } = runGenerator(bfs({ grid, start, target }));
      expect(summary.found).toBe(false);
    });
  });

  describe('DFS', () => {
    it('should find a valid path without infinite loops or cycles', () => {
      const grid = new Grid(8, 8);
      const start = { x: 1, y: 1 };
      const target = { x: 6, y: 6 };

      const { summary } = runGenerator(dfs({ grid, start, target }));

      expect(summary.found).toBe(true);
      expect(summary.path[0]).toEqual(start);
      expect(summary.path[summary.path.length - 1]).toEqual(target);

      // Verify each consecutive step in DFS path is adjacent
      for (let i = 1; i < summary.path.length; i++) {
        const prev = summary.path[i - 1];
        const curr = summary.path[i];
        const distance = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
        expect(distance).toBe(1);
      }
    });

    it('should return no path found when target is unreachable', () => {
      const grid = new Grid(5, 5);
      const start = { x: 0, y: 0 };
      const target = { x: 4, y: 4 };

      // Diagonal wall blocking grid
      grid.setCellType({ x: 0, y: 4 }, 'wall');
      grid.setCellType({ x: 1, y: 3 }, 'wall');
      grid.setCellType({ x: 2, y: 2 }, 'wall');
      grid.setCellType({ x: 3, y: 1 }, 'wall');
      grid.setCellType({ x: 4, y: 0 }, 'wall');

      const { summary } = runGenerator(dfs({ grid, start, target }));
      expect(summary.found).toBe(false);
    });
  });
});
