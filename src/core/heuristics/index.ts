import { Coord } from '../grid/Coordinates';

export type HeuristicFunction = (a: Coord, b: Coord) => number;

/**
 * Manhattan distance heuristic (L1 norm).
 * Appropriate for 4-directional grid movement.
 */
export function manhattanDistance(a: Coord, b: Coord): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Euclidean distance heuristic (L2 norm).
 * Straight-line distance between two coordinates.
 */
export function euclideanDistance(a: Coord, b: Coord): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Chebyshev distance heuristic (L-infinity norm).
 * Appropriate for 8-directional movement when diagonal movement cost equals orthogonal cost.
 */
export function chebyshevDistance(a: Coord, b: Coord): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Octile distance heuristic.
 * Appropriate for 8-directional movement where orthogonal cost is 1 and diagonal cost is sqrt(2).
 */
export function octileDistance(a: Coord, b: Coord): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  const min = Math.min(dx, dy);
  const max = Math.max(dx, dy);
  return max + (Math.SQRT2 - 1) * min;
}
