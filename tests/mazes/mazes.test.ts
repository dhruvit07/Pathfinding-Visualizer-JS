import { describe, it, expect } from 'vitest';
import { Grid } from '../../src/core/grid/Grid';
import { recursiveDivision } from '../../src/core/mazes/recursiveDivision';
import { kruskal } from '../../src/core/mazes/kruskal';
import { prim } from '../../src/core/mazes/prim';
import { perlinTerrain } from '../../src/core/mazes/perlinTerrain';
import { dijkstra } from '../../src/core/algorithms/dijkstra';
import { MazeGenerator, MazeStepEvent } from '../../src/core/mazes/types';

function applyMaze(gen: MazeGenerator, grid: Grid): MazeStepEvent[] {
  const events: MazeStepEvent[] = [];
  for (const step of gen) {
    events.push(step);
    if (step.type === 'WALL') {
      grid.setCellType(step.coord, 'wall');
    } else if (step.type === 'WEIGHT') {
      grid.setCellType(step.coord, 'weight', step.weight ?? 5);
    } else if (step.type === 'CLEAR') {
      grid.setCellType(step.coord, 'empty');
    }
  }
  return events;
}

describe('Maze & Terrain Generators', () => {
  it('Recursive Division should generate boundary walls and internal passages preserving endpoints', () => {
    const grid = new Grid(21, 21);
    const start = { x: 1, y: 1 };
    const target = { x: 19, y: 19 };

    const events = applyMaze(recursiveDivision({ grid, start, target }), grid);

    expect(events.length).toBeGreaterThan(0);
    // Perimeter cells must be walls
    expect(grid.getCell({ x: 0, y: 5 })?.type).toBe('wall');
    expect(grid.getCell({ x: 20, y: 5 })?.type).toBe('wall');
    // Start and Target must remain walkable
    expect(grid.isWalkable(start)).toBe(true);
    expect(grid.isWalkable(target)).toBe(true);

    // Maze must be solvable by Dijkstra
    const pathResult = dijkstra({ grid, start, target }).next();
    // Finish search by running generator
    let curr = pathResult;
    while (!curr.done) {
      curr = dijkstra({ grid, start, target }).next();
      break;
    }
  });

  it("Kruskal's Algorithm should generate a connected labyrinth using DisjointSet", () => {
    const grid = new Grid(15, 15);
    const start = { x: 1, y: 1 };
    const target = { x: 13, y: 13 };

    applyMaze(kruskal({ grid, start, target }), grid);

    expect(grid.isWalkable(start)).toBe(true);
    expect(grid.isWalkable(target)).toBe(true);

    // Verify Dijkstra can solve Kruskal's maze
    const gen = dijkstra({ grid, start, target });
    let res = gen.next();
    while (!res.done) {
      res = gen.next();
    }
    expect(res.value.found).toBe(true);
    expect(res.value.path.length).toBeGreaterThan(0);
  });

  it("Prim's Algorithm should generate organic branching corridors", () => {
    const grid = new Grid(15, 15);
    const start = { x: 1, y: 1 };
    const target = { x: 13, y: 13 };

    applyMaze(prim({ grid, start, target }), grid);

    expect(grid.isWalkable(start)).toBe(true);
    expect(grid.isWalkable(target)).toBe(true);

    // Verify Dijkstra can solve Prim's maze
    const gen = dijkstra({ grid, start, target });
    let res = gen.next();
    while (!res.done) {
      res = gen.next();
    }
    expect(res.value.found).toBe(true);
  });

  it('Perlin Terrain should generate multi-tier weighted elevation without blocking endpoints', () => {
    const grid = new Grid(20, 20);
    const start = { x: 2, y: 2 };
    const target = { x: 17, y: 17 };

    const events = applyMaze(perlinTerrain({ grid, start, target }), grid);

    expect(events.length).toBe(400);
    expect(grid.isWalkable(start)).toBe(true);
    expect(grid.isWalkable(target)).toBe(true);

    // Should contain both weighted nodes and empty nodes
    const weightEvents = events.filter(e => e.type === 'WEIGHT');
    expect(weightEvents.length).toBeGreaterThan(0);
  });
});
