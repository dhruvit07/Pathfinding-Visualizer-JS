import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { dijkstra } from '../../src/core/algorithms/dijkstra';
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

describe('Dijkstra Algorithm Generator', () => {
  it('should find a direct straight-line path on an empty grid', () => {
    const grid = new Grid(10, 10);
    const start = { x: 1, y: 1 };
    const target = { x: 5, y: 1 };

    const { events, summary } = runGenerator(dijkstra({ grid, start, target }));

    expect(summary.found).toBe(true);
    expect(summary.path.length).toBe(5);
    expect(summary.path[0]).toEqual(start);
    expect(summary.path[summary.path.length - 1]).toEqual(target);
    expect(summary.cost).toBe(4); // 4 steps * weight 1

    // Events should include VISIT, RELAX, PATH_STEP, FINISHED
    expect(events.some(e => e.type === 'VISIT')).toBe(true);
    expect(events.some(e => e.type === 'PATH_STEP')).toBe(true);
    expect(events.some(e => e.type === 'FINISHED')).toBe(true);
  });

  it('should navigate around a wall obstacle', () => {
    const grid = new Grid(5, 5);
    const start = { x: 1, y: 2 };
    const target = { x: 3, y: 2 };

    // Place vertical wall between start and target
    grid.setCellType({ x: 2, y: 1 }, 'wall');
    grid.setCellType({ x: 2, y: 2 }, 'wall');
    grid.setCellType({ x: 2, y: 3 }, 'wall');

    const { summary } = runGenerator(dijkstra({ grid, start, target }));

    expect(summary.found).toBe(true);
    // Path must detour through row 0 or row 4
    for (const step of summary.path) {
      expect(grid.isWalkable(step)).toBe(true);
    }
    expect(summary.path[0]).toEqual(start);
    expect(summary.path[summary.path.length - 1]).toEqual(target);
  });

  it('should choose a longer unweighted path over a shorter weighted path', () => {
    // 3x3 grid:
    // S  W  T   (W has weight 20)
    // .  .  .   (bottom row has standard weight 1)
    const grid = new Grid(3, 2);
    const start = { x: 0, y: 0 };
    const target = { x: 2, y: 0 };

    grid.setCellType({ x: 1, y: 0 }, 'weight', 20);

    const { summary } = runGenerator(dijkstra({ grid, start, target }));

    expect(summary.found).toBe(true);
    // Direct path cost would be 20 + 1 = 21.
    // Detour path: (0,0) -> (0,1) -> (1,1) -> (2,1) -> (2,0) cost is 1 + 1 + 1 + 1 = 4.
    expect(summary.cost).toBe(4);
    expect(summary.path).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 0 },
    ]);
  });

  it('should report no path found when target is fully blocked', () => {
    const grid = new Grid(5, 5);
    const start = { x: 0, y: 0 };
    const target = { x: 4, y: 4 };

    // Wall off the target completely
    grid.setCellType({ x: 3, y: 4 }, 'wall');
    grid.setCellType({ x: 4, y: 3 }, 'wall');
    grid.setCellType({ x: 3, y: 3 }, 'wall');

    const { events, summary } = runGenerator(dijkstra({ grid, start, target }));

    expect(summary.found).toBe(false);
    expect(summary.path).toEqual([]);
    expect(summary.cost).toBe(Infinity);
    expect(events[events.length - 1].type).toBe('NO_PATH');
  });

  it('should handle start and target being at the exact same location', () => {
    const grid = new Grid(5, 5);
    const start = { x: 2, y: 2 };

    const { summary } = runGenerator(dijkstra({ grid, start, target: start }));

    expect(summary.found).toBe(true);
    expect(summary.path).toEqual([start]);
    expect(summary.cost).toBe(0);
    expect(summary.nodesExplored).toBe(1);
  });
});
