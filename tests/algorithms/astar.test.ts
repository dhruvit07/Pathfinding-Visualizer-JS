import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { astar } from '../../src/core/algorithms/astar';
import { dijkstra } from '../../src/core/algorithms/dijkstra';
import { euclideanDistance, manhattanDistance } from '../../src/core/heuristics';
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

describe('A* Algorithm Generator', () => {
  it('should find optimal path with Manhattan heuristic', () => {
    const grid = new Grid(10, 10);
    const start = { x: 1, y: 1 };
    const target = { x: 8, y: 8 };

    const { summary } = runGenerator(astar({ grid, start, target, heuristic: manhattanDistance }));

    expect(summary.found).toBe(true);
    expect(summary.cost).toBe(14); // 7 horizontal + 7 vertical = 14 steps
    expect(summary.path[0]).toEqual(start);
    expect(summary.path[summary.path.length - 1]).toEqual(target);
  });

  it('should find identical optimal cost as Dijkstra while exploring fewer or equal nodes', () => {
    const grid = new Grid(25, 25);
    const start = { x: 2, y: 2 };
    const target = { x: 22, y: 22 };

    // Add some random walls
    for (let i = 5; i < 20; i++) {
      grid.setCellType({ x: 12, y: i }, 'wall');
    }

    const { summary: dSummary } = runGenerator(dijkstra({ grid, start, target }));
    const { summary: aSummary } = runGenerator(astar({ grid, start, target, heuristic: manhattanDistance }));

    expect(dSummary.found).toBe(true);
    expect(aSummary.found).toBe(true);
    // Both algorithms MUST find the identical minimum cost path
    expect(aSummary.cost).toBe(dSummary.cost);
    // A* directed heuristic must explore significantly fewer nodes than blind Dijkstra
    expect(aSummary.nodesExplored).toBeLessThanOrEqual(dSummary.nodesExplored);
  });

  it('should support Euclidean heuristic', () => {
    const grid = new Grid(10, 10);
    const start = { x: 0, y: 0 };
    const target = { x: 9, y: 9 };

    const { summary } = runGenerator(astar({ grid, start, target, heuristic: euclideanDistance }));

    expect(summary.found).toBe(true);
    expect(summary.cost).toBe(18);
  });

  it('should return no path found when target is isolated', () => {
    const grid = new Grid(5, 5);
    const start = { x: 0, y: 0 };
    const target = { x: 4, y: 4 };

    grid.setCellType({ x: 4, y: 3 }, 'wall');
    grid.setCellType({ x: 3, y: 4 }, 'wall');
    grid.setCellType({ x: 3, y: 3 }, 'wall');

    const { summary } = runGenerator(astar({ grid, start, target }));
    expect(summary.found).toBe(false);
  });
});
