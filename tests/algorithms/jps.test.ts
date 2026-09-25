import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { jps } from '../../src/core/algorithms/jps';
import { astar } from '../../src/core/algorithms/astar';
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

describe('Jump Point Search (JPS) Algorithm Generator', () => {
  it('should jump straight across empty open space directly to target', () => {
    const grid = new Grid(20, 20);
    const start = { x: 2, y: 5 };
    const target = { x: 18, y: 5 };

    const { summary } = runGenerator(jps({ grid, start, target }));

    expect(summary.found).toBe(true);
    expect(summary.path[0]).toEqual(start);
    expect(summary.path[summary.path.length - 1]).toEqual(target);
    expect(summary.cost).toBe(16);
    // JPS skips straight lines, exploring far fewer nodes
    expect(summary.nodesExplored).toBeLessThan(10);
  });

  it('should detect forced neighbors around wall corners', () => {
    const grid = new Grid(10, 10);
    const start = { x: 1, y: 1 };
    const target = { x: 8, y: 8 };

    // Obstacle block with corner
    grid.setCellType({ x: 4, y: 1 }, 'wall');
    grid.setCellType({ x: 4, y: 2 }, 'wall');
    grid.setCellType({ x: 4, y: 3 }, 'wall');

    const { summary } = runGenerator(jps({ grid, start, target }));

    expect(summary.found).toBe(true);
    expect(summary.path[0]).toEqual(start);
    expect(summary.path[summary.path.length - 1]).toEqual(target);
    for (const step of summary.path) {
      expect(grid.isWalkable(step)).toBe(true);
    }
  });

  it('should find optimal path length matching A* on uniform grid', () => {
    const grid = new Grid(15, 15);
    const start = { x: 1, y: 1 };
    const target = { x: 13, y: 13 };

    // Obstacle corridor
    for (let y = 3; y < 12; y++) {
      grid.setCellType({ x: 7, y }, 'wall');
    }
    // Opening at y=7
    grid.setCellType({ x: 7, y: 7 }, 'empty');

    const { summary: jpsSummary } = runGenerator(jps({ grid, start, target }));
    const { summary: astarSummary } = runGenerator(astar({ grid, start, target }));

    expect(jpsSummary.found).toBe(true);
    expect(astarSummary.found).toBe(true);
    expect(jpsSummary.cost).toBe(astarSummary.cost);
  });
});
