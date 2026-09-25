import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { PriorityQueue } from '../data-structures/PriorityQueue';
import { AlgorithmGenerator, PathfindingOptions, SearchSummary, StepEvent } from './types';
import { calculatePathCost, reconstructPath, yieldPathSteps } from './utils';

interface HeapNode {
  coord: Coord;
  cost: number;
}

/**
 * Dijkstra's Shortest Path Algorithm implemented as an ES6 Generator.
 * Uses a Binary Min-Heap Priority Queue for optimal O((V + E) log V) performance.
 */
export function* dijkstra(options: PathfindingOptions): AlgorithmGenerator {
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

  // Edge case: start is already at target
  if (coordEquals(start, target)) {
    yield { type: 'VISIT', coord: start, cost: 0 };
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

  const pq = new PriorityQueue<HeapNode>((a, b) => a.cost - b.cost);
  const distances = new Map<string, number>();
  const visited = new Set<string>();
  const cameFrom = new Map<string, Coord>();

  const startKey = coordKey(start);
  distances.set(startKey, 0);
  pq.push({ coord: start, cost: 0 });

  let nodesExplored = 0;

  while (!pq.isEmpty()) {
    const current = pq.pop()!;
    const currentKey = coordKey(current.coord);

    if (visited.has(currentKey)) {
      continue;
    }

    visited.add(currentKey);
    nodesExplored++;

    yield {
      type: 'VISIT',
      coord: current.coord,
      cost: current.cost,
      parent: cameFrom.get(currentKey) ?? null,
    };

    // Reached target node!
    if (coordEquals(current.coord, target)) {
      const path = reconstructPath(cameFrom, target, start);
      yield* yieldPathSteps(path);
      yield { type: 'FINISHED', coord: target };

      return {
        found: true,
        path,
        cost: current.cost,
        nodesExplored,
        durationMs: performance.now() - startTime,
      };
    }

    const neighbors = grid.getNeighbors(current.coord, allowDiagonal);
    for (const neighbor of neighbors) {
      const neighborKey = coordKey(neighbor);
      if (visited.has(neighborKey)) {
        continue;
      }

      yield {
        type: 'CONSIDER',
        coord: neighbor,
        parent: current.coord,
      };

      const cell = grid.getCell(neighbor);
      const stepCost = cell ? cell.weight : 1;
      const tentativeCost = current.cost + stepCost;

      const previousBest = distances.get(neighborKey) ?? Infinity;
      if (tentativeCost < previousBest) {
        distances.set(neighborKey, tentativeCost);
        cameFrom.set(neighborKey, current.coord);
        pq.push({ coord: neighbor, cost: tentativeCost });

        yield {
          type: 'RELAX',
          coord: neighbor,
          cost: tentativeCost,
          parent: current.coord,
        };
      }
    }
  }

  // Exhausted frontier without reaching target
  yield { type: 'NO_PATH', coord: target };
  return {
    found: false,
    path: [],
    cost: Infinity,
    nodesExplored,
    durationMs: performance.now() - startTime,
  };
}
