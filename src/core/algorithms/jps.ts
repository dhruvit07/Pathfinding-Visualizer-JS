import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { PriorityQueue } from '../data-structures/PriorityQueue';
import { manhattanDistance } from '../heuristics';
import { AlgorithmGenerator, PathfindingOptions, SearchSummary } from './types';
import { reconstructPath, yieldPathSteps } from './utils';

interface JPSNode {
  coord: Coord;
  gCost: number;
  hCost: number;
  fCost: number;
}

/**
 * Jump Point Search (JPS) Algorithm implemented as an ES6 Generator.
 * Prunes uniform grid symmetry by jumping along straight corridors and only
 * considering "jump points" with forced neighbors or perpendicular line-of-sight.
 */
export function* jps(options: PathfindingOptions): AlgorithmGenerator {
  const { grid, start, target, heuristic = manhattanDistance } = options;
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

  const pq = new PriorityQueue<JPSNode>((a, b) => a.fCost - b.fCost);
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

    if (visited.has(currentKey)) continue;
    visited.add(currentKey);
    nodesExplored++;

    yield {
      type: 'VISIT',
      coord: current.coord,
      cost: current.gCost,
      heuristic: current.hCost,
      totalCost: current.fCost,
    };

    if (coordEquals(current.coord, target)) {
      const jumpPointsPath = reconstructPath(cameFrom, target, start);
      const fullPath = interpolatePath(jumpPointsPath);
      yield* yieldPathSteps(fullPath);
      yield { type: 'FINISHED', coord: target };

      return {
        found: true,
        path: fullPath,
        cost: fullPath.length - 1,
        nodesExplored,
        durationMs: performance.now() - startTime,
      };
    }

    const directions = getSearchDirections(current.coord, cameFrom.get(currentKey));

    for (const [dx, dy] of directions) {
      const jumpPoint = jump(grid, current.coord, dx, dy, target);

      if (jumpPoint) {
        const jumpKey = coordKey(jumpPoint);
        if (visited.has(jumpKey)) continue;

        yield {
          type: 'CONSIDER',
          coord: jumpPoint,
          parent: current.coord,
        };

        const distance = Math.abs(jumpPoint.x - current.coord.x) + Math.abs(jumpPoint.y - current.coord.y);
        const tentativeG = current.gCost + distance;

        if (tentativeG < (gScores.get(jumpKey) ?? Infinity)) {
          gScores.set(jumpKey, tentativeG);
          cameFrom.set(jumpKey, current.coord);

          const hCost = heuristic(jumpPoint, target);
          pq.push({
            coord: jumpPoint,
            gCost: tentativeG,
            hCost,
            fCost: tentativeG + hCost,
          });

          yield {
            type: 'RELAX',
            coord: jumpPoint,
            cost: tentativeG,
            heuristic: hCost,
            totalCost: tentativeG + hCost,
            parent: current.coord,
          };
        }
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

function hasForcedNeighbor(
  grid: PathfindingOptions['grid'],
  coord: Coord,
  dx: number,
  dy: number
): boolean {
  if (dx !== 0 && dy === 0) {
    return (
      (!grid.isWalkable({ x: coord.x, y: coord.y - 1 }) && grid.isWalkable({ x: coord.x + dx, y: coord.y - 1 })) ||
      (!grid.isWalkable({ x: coord.x, y: coord.y + 1 }) && grid.isWalkable({ x: coord.x + dx, y: coord.y + 1 }))
    );
  }
  if (dx === 0 && dy !== 0) {
    return (
      (!grid.isWalkable({ x: coord.x - 1, y: coord.y }) && grid.isWalkable({ x: coord.x - 1, y: coord.y + dy })) ||
      (!grid.isWalkable({ x: coord.x + 1, y: coord.y }) && grid.isWalkable({ x: coord.x + 1, y: coord.y + dy }))
    );
  }
  return false;
}

function straightJump(
  grid: PathfindingOptions['grid'],
  from: Coord,
  dx: number,
  dy: number,
  target: Coord
): Coord | null {
  let curr: Coord = { x: from.x + dx, y: from.y + dy };
  while (grid.isValid(curr) && grid.isWalkable(curr)) {
    if (coordEquals(curr, target)) {
      return curr;
    }
    if (hasForcedNeighbor(grid, curr, dx, dy)) {
      return curr;
    }
    curr = { x: curr.x + dx, y: curr.y + dy };
  }
  return null;
}

function jump(
  grid: PathfindingOptions['grid'],
  from: Coord,
  dx: number,
  dy: number,
  target: Coord
): Coord | null {
  let curr: Coord = { x: from.x + dx, y: from.y + dy };

  while (grid.isValid(curr) && grid.isWalkable(curr)) {
    if (coordEquals(curr, target)) {
      return curr;
    }

    if (hasForcedNeighbor(grid, curr, dx, dy)) {
      return curr;
    }

    if (dx !== 0 && dy === 0) {
      if (
        straightJump(grid, curr, 0, -1, target) !== null ||
        straightJump(grid, curr, 0, 1, target) !== null
      ) {
        return curr;
      }
    } else if (dx === 0 && dy !== 0) {
      if (
        straightJump(grid, curr, -1, 0, target) !== null ||
        straightJump(grid, curr, 1, 0, target) !== null
      ) {
        return curr;
      }
    }

    curr = { x: curr.x + dx, y: curr.y + dy };
  }

  return null;
}

function getSearchDirections(curr: Coord, parent?: Coord): [number, number][] {
  if (!parent) {
    return [[0, -1], [1, 0], [0, 1], [-1, 0]];
  }

  const dx = Math.sign(curr.x - parent.x);
  const dy = Math.sign(curr.y - parent.y);

  if (dx !== 0 && dy === 0) {
    return [[dx, 0], [0, -1], [0, 1]];
  }
  if (dx === 0 && dy !== 0) {
    return [[0, dy], [-1, 0], [1, 0]];
  }

  return [[0, -1], [1, 0], [0, 1], [-1, 0]];
}

function interpolatePath(jumpPoints: Coord[]): Coord[] {
  if (jumpPoints.length <= 1) return jumpPoints;
  const path: Coord[] = [jumpPoints[0]];

  for (let i = 1; i < jumpPoints.length; i++) {
    const p1 = jumpPoints[i - 1];
    const p2 = jumpPoints[i];
    const dx = Math.sign(p2.x - p1.x);
    const dy = Math.sign(p2.y - p1.y);

    let curX = p1.x + dx;
    let curY = p1.y + dy;

    while (curX !== p2.x || curY !== p2.y) {
      path.push({ x: curX, y: curY });
      curX += dx;
      curY += dy;
    }
    path.push(p2);
  }

  return path;
}
