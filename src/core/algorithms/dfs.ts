import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { AlgorithmGenerator, PathfindingOptions, SearchSummary } from './types';
import { calculatePathCost, reconstructPath, yieldPathSteps } from './utils';

/**
 * Depth-First Search (DFS) Algorithm implemented as an ES6 Generator.
 * Uses an explicit LIFO stack with cycle prevention.
 */
export function* dfs(options: PathfindingOptions): AlgorithmGenerator {
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

  const stack: Coord[] = [start];
  const visited = new Set<string>();
  const cameFrom = new Map<string, Coord>();

  let nodesExplored = 0;

  while (stack.length > 0) {
    const current = stack.pop()!;
    const currentKey = coordKey(current);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);
    nodesExplored++;

    yield {
      type: 'VISIT',
      coord: current,
      parent: cameFrom.get(currentKey) ?? null,
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
    // Reverse neighbors so natural traversal explores North/East first
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i];
      const neighborKey = coordKey(neighbor);

      if (!visited.has(neighborKey)) {
        cameFrom.set(neighborKey, current);
        stack.push(neighbor);

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
