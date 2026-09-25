import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { PriorityQueue } from '../data-structures/PriorityQueue';
import { AlgorithmGenerator, PathfindingOptions, SearchSummary } from './types';
import { calculatePathCost, yieldPathSteps } from './utils';

interface SearchNode {
  coord: Coord;
  cost: number;
}

/**
 * Bidirectional Dijkstra Search implemented as an ES6 Generator.
 * Expands two search frontiers concurrently (one from Start, one from Target).
 * Detects the intersection point to construct the full optimal path.
 */
export function* bidirectional(options: PathfindingOptions): AlgorithmGenerator {
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
    yield { type: 'VISIT', coord: start, direction: 'forward' };
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

  // Forward search state
  const forwardPq = new PriorityQueue<SearchNode>((a, b) => a.cost - b.cost);
  const forwardDist = new Map<string, number>();
  const forwardVisited = new Set<string>();
  const forwardCameFrom = new Map<string, Coord>();

  // Backward search state
  const backwardPq = new PriorityQueue<SearchNode>((a, b) => a.cost - b.cost);
  const backwardDist = new Map<string, number>();
  const backwardVisited = new Set<string>();
  const backwardCameFrom = new Map<string, Coord>();

  forwardDist.set(coordKey(start), 0);
  forwardPq.push({ coord: start, cost: 0 });

  backwardDist.set(coordKey(target), 0);
  backwardPq.push({ coord: target, cost: 0 });

  let nodesExplored = 0;
  let meetingNode: Coord | null = null;

  while (!forwardPq.isEmpty() && !backwardPq.isEmpty()) {
    // 1. Step Forward Frontier
    const fCurrent = forwardPq.pop()!;
    const fKey = coordKey(fCurrent.coord);

    if (!forwardVisited.has(fKey)) {
      forwardVisited.add(fKey);
      nodesExplored++;

      yield {
        type: 'VISIT',
        coord: fCurrent.coord,
        cost: fCurrent.cost,
        direction: 'forward',
      };

      // Check for collision with backward visited set
      if (backwardVisited.has(fKey)) {
        meetingNode = fCurrent.coord;
        break;
      }

      for (const neighbor of grid.getNeighbors(fCurrent.coord, allowDiagonal)) {
        const nKey = coordKey(neighbor);
        if (forwardVisited.has(nKey)) continue;

        const cell = grid.getCell(neighbor);
        const tentativeCost = fCurrent.cost + (cell ? cell.weight : 1);
        if (tentativeCost < (forwardDist.get(nKey) ?? Infinity)) {
          forwardDist.set(nKey, tentativeCost);
          forwardCameFrom.set(nKey, fCurrent.coord);
          forwardPq.push({ coord: neighbor, cost: tentativeCost });

          yield {
            type: 'CONSIDER',
            coord: neighbor,
            direction: 'forward',
          };
        }
      }
    }

    // 2. Step Backward Frontier
    const bCurrent = backwardPq.pop()!;
    const bKey = coordKey(bCurrent.coord);

    if (!backwardVisited.has(bKey)) {
      backwardVisited.add(bKey);
      nodesExplored++;

      yield {
        type: 'VISIT',
        coord: bCurrent.coord,
        cost: bCurrent.cost,
        direction: 'backward',
      };

      // Check for collision with forward visited set
      if (forwardVisited.has(bKey)) {
        meetingNode = bCurrent.coord;
        break;
      }

      for (const neighbor of grid.getNeighbors(bCurrent.coord, allowDiagonal)) {
        const nKey = coordKey(neighbor);
        if (backwardVisited.has(nKey)) continue;

        const cell = grid.getCell(neighbor);
        const tentativeCost = bCurrent.cost + (cell ? cell.weight : 1);
        if (tentativeCost < (backwardDist.get(nKey) ?? Infinity)) {
          backwardDist.set(nKey, tentativeCost);
          backwardCameFrom.set(nKey, bCurrent.coord);
          backwardPq.push({ coord: neighbor, cost: tentativeCost });

          yield {
            type: 'CONSIDER',
            coord: neighbor,
            direction: 'backward',
          };
        }
      }
    }
  }

  if (meetingNode) {
    // Reconstruct forward segment (start -> meetingNode)
    const forwardPath: Coord[] = [meetingNode];
    let curr = meetingNode;
    while (!coordEquals(curr, start)) {
      const parent = forwardCameFrom.get(coordKey(curr));
      if (!parent) break;
      forwardPath.push(parent);
      curr = parent;
    }
    forwardPath.reverse();

    // Reconstruct backward segment (meetingNode -> target)
    const backwardPath: Coord[] = [];
    curr = meetingNode;
    while (!coordEquals(curr, target)) {
      const parent = backwardCameFrom.get(coordKey(curr));
      if (!parent) break;
      backwardPath.push(parent);
      curr = parent;
    }

    const fullPath = [...forwardPath, ...backwardPath];
    yield* yieldPathSteps(fullPath);
    yield { type: 'FINISHED', coord: target };

    return {
      found: true,
      path: fullPath,
      cost: calculatePathCost(fullPath, grid),
      nodesExplored,
      durationMs: performance.now() - startTime,
    };
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
