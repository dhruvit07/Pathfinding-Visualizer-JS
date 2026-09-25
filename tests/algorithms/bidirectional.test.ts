import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { bidirectional } from '../../src/core/algorithms/bidirectional';
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

describe('Bidirectional Search Algorithm Generator', () => {
  it('should find optimal path by meeting in the middle', () => {
    const grid = new Grid(15, 15);
    const start = { x: 2, y: 7 };
    const target = { x: 12, y: 7 };

    const { events, summary } = runGenerator(bidirectional({ grid, start, target }));

    expect(summary.found).toBe(true);
    expect(summary.path.length).toBe(11);
    expect(summary.cost).toBe(10);
    expect(summary.path[0]).toEqual(start);
    expect(summary.path[summary.path.length - 1]).toEqual(target);

    // Verify both forward and backward exploration events occurred
    const forwardEvents = events.filter(e => e.direction === 'forward');
    const backwardEvents = events.filter(e => e.direction === 'backward');
    expect(forwardEvents.length).toBeGreaterThan(0);
    expect(backwardEvents.length).toBeGreaterThan(0);
  });

  it('should navigate around obstacles to meet', () => {
    const grid = new Grid(10, 10);
    const start = { x: 1, y: 5 };
    const target = { x: 8, y: 5 };

    // Wall in the middle
    grid.setCellType({ x: 5, y: 4 }, 'wall');
    grid.setCellType({ x: 5, y: 5 }, 'wall');
    grid.setCellType({ x: 5, y: 6 }, 'wall');

    const { summary } = runGenerator(bidirectional({ grid, start, target }));

    expect(summary.found).toBe(true);
    for (const step of summary.path) {
      expect(grid.isWalkable(step)).toBe(true);
    }
  });

  it('should handle unreachable target cleanly', () => {
    const grid = new Grid(5, 5);
    const start = { x: 0, y: 0 };
    const target = { x: 4, y: 4 };

    // Complete wall dividing grid
    for (let y = 0; y < 5; y++) {
      grid.setCellType({ x: 2, y }, 'wall');
    }

    const { summary } = runGenerator(bidirectional({ grid, start, target }));
    expect(summary.found).toBe(false);
    expect(summary.path).toEqual([]);
  });
});
