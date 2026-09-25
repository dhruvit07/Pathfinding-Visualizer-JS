import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { Grid } from '../grid/Grid';
import { StepEvent } from './types';

/**
 * Reconstructs the shortest path from start to target using a parent coordinate map.
 * Returns array of coordinates from start to target.
 */
export function reconstructPath(
  cameFrom: Map<string, Coord>,
  target: Coord,
  start: Coord
): Coord[] {
  const path: Coord[] = [target];
  let curr = target;

  while (!coordEquals(curr, start)) {
    const parent = cameFrom.get(coordKey(curr));
    if (!parent) {
      break;
    }
    path.push(parent);
    curr = parent;
  }

  return path.reverse();
}

/**
 * Computes the total traversal cost along a path.
 */
export function calculatePathCost(path: Coord[], grid: Grid): number {
  if (path.length <= 1) {
    return 0;
  }
  let cost = 0;
  // Starting node traversal cost is 0; each subsequent step incurs cell.weight
  for (let i = 1; i < path.length; i++) {
    const cell = grid.getCell(path[i]);
    cost += cell ? cell.weight : 1;
  }
  return cost;
}

/**
 * Helper to yield PATH_STEP events sequentially along a reconstructed path.
 */
export function* yieldPathSteps(path: Coord[]): Generator<StepEvent, void, void> {
  for (const coord of path) {
    yield {
      type: 'PATH_STEP',
      coord,
    };
  }
}
