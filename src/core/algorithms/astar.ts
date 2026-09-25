import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { PriorityQueue } from '../data-structures/PriorityQueue';
import { manhattanDistance } from '../heuristics';
import { AlgorithmGenerator, PathfindingOptions, SearchSummary } from './types';
import { reconstructPath, yieldPathSteps } from './utils';

interface AStarNode {
  coord: Coord;
  gCost: number;
  hCost: number;
  fCost: number;
}

/**
 * A* Search Algorithm implemented as an ES6 Generator.
 * Employs a Min-Heap Priority Queue ordered by f-cost (f = g + h) with h-cost tie-breaking.
 */
export function* astar(options: PathfindingOptions): AlgorithmGenerator {
  const { grid, start, target, heuristic = manhattanDistance, allowDiagonal = false } = options;
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
    yield { type: 'VISIT', coord: start, cost: 0, heuristic: 0, totalCost: 0 };
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

  // Priority queue comparing f-cost, breaking ties with lowest h-cost
  const pq = new PriorityQueue<AStarNode>((a, b) => {
    if (a.fCost !== b.fCost) {
      return a.fCost - b.fCost;
    }
    return a.hCost - b.hCost;
  });

  const gScores = new Map<string, number>();
  const visited = new Set<string>();
  const cameFrom = new Map<string, Coord>();

  const startKey = coordKey(start);
  const initialH = heuristic(start, target);
  gScores.set(startKey, 0);
  pq.push({ coord: start, gCost: 0, hCost: initialH, fCost: initialH });

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
      cost: current.gCost,
      heuristic: current.hCost,
      totalCost: current.fCost,
      parent: cameFrom.get(currentKey) ?? null,
    };

    if (coordEquals(current.coord, target)) {
      const path = reconstructPath(cameFrom, target, start);
      yield* yieldPathSteps(path);
      yield { type: 'FINISHED', coord: target };

      return {
        found: true,
        path,
        cost: current.gCost,
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
      const tentativeG = current.gCost + stepCost;

      const previousBestG = gScores.get(neighborKey) ?? Infinity;
      if (tentativeG < previousBestG) {
        gScores.set(neighborKey, tentativeG);
        cameFrom.set(neighborKey, current.coord);

        const hCost = heuristic(neighbor, target);
        const fCost = tentativeG + hCost;

        pq.push({
          coord: neighbor,
          gCost: tentativeG,
          hCost,
          fCost,
        });

        yield {
          type: 'RELAX',
          coord: neighbor,
          cost: tentativeG,
          heuristic: hCost,
          totalCost: fCost,
          parent: current.coord,
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
