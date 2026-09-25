import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { RingQueue } from '../data-structures/RingQueue';
import { AlgorithmGenerator, PathfindingOptions, SearchSummary } from './types';
import { calculatePathCost, reconstructPath, yieldPathSteps } from './utils';

/**
 * Breadth-First Search (BFS) Algorithm implemented as an ES6 Generator.
 * Uses a circular buffer RingQueue for O(1) queue operations, avoiding Array.shift() overhead.
 */
export function* bfs(options: PathfindingOptions): AlgorithmGenerator {
  const { grid, start, target, allowDiagonal = false } = options;
  const startTime = performance.now();

  if (!grid.isValid(start) || !grid.isValid(target) || !grid.isWalkable(start) || !grid.isWalkable(target)) {
    yield { type: 'NO_PATH', coord: start };
    return {
      found: false,
      path: [],
      cost: Infinity,
      nodesExplored: 0,
      durationMs: performance.now() - startTime,
    };
  }

  if (coordEquals(start, target)) {
    yield { type: 'VISIT', coord: start };
    yield { type: 'PATH_STEP', coord: start };
    yield { type: 'FINISHED', coord: start };
    return {
      found: true,
      path: [start],
      cost: 0,
      nodesExplored: 1,
      durationMs: performance.now() - startTime,
    };
  }

  const queue = new RingQueue<Coord>(64);
  const visited = new Set<string>();
  const cameFrom = new Map<string, Coord>();

  const startKey = coordKey(start);
  visited.add(startKey);
  queue.enqueue(start);

  let nodesExplored = 0;

  while (!queue.isEmpty()) {
    const current = queue.dequeue()!;
    nodesExplored++;

    yield {
      type: 'VISIT',
      coord: current,
      parent: cameFrom.get(coordKey(current)) ?? null,
    };

    if (coordEquals(current, target)) {
      const path = reconstructPath(cameFrom, target, start);
      yield* yieldPathSteps(path);
      yield { type: 'FINISHED', coord: target };

      return {
        found: true,
        path,
        cost: calculatePathCost(path, grid),
        nodesExplored,
        durationMs: performance.now() - startTime,
      };
    }

    const neighbors = grid.getNeighbors(current, allowDiagonal);
    for (const neighbor of neighbors) {
      const neighborKey = coordKey(neighbor);

      if (!visited.has(neighborKey)) {
        visited.add(neighborKey);
        cameFrom.set(neighborKey, current);
        queue.enqueue(neighbor);

        yield {
          type: 'CONSIDER',
          coord: neighbor,
          parent: current,
        };
      }
    }
  }

  yield { type: 'NO_PATH', coord: target };
  return {
    found: false,
    path: [],
    cost: Infinity,
    nodesExplored,
    durationMs: performance.now() - startTime,
  };
}
