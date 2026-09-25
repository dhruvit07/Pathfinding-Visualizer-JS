import { describe, it, expect } from 'vitest';
import {
  manhattanDistance,
  euclideanDistance,
  chebyshevDistance,
  octileDistance,
} from '../../src/core/heuristics';

describe('Heuristics', () => {
  const p1 = { x: 2, y: 3 };
  const p2 = { x: 7, y: 9 }; // dx = 5, dy = 6

  it('should calculate Manhattan distance correctly (dx + dy)', () => {
    // |2 - 7| + |3 - 9| = 5 + 6 = 11
    expect(manhattanDistance(p1, p2)).toBe(11);
    expect(manhattanDistance(p1, p1)).toBe(0);
  });

  it('should calculate Euclidean distance correctly sqrt(dx^2 + dy^2)', () => {
    // sqrt(5^2 + 6^2) = sqrt(25 + 36) = sqrt(61) ≈ 7.8102
    expect(euclideanDistance(p1, p2)).toBeCloseTo(Math.sqrt(61), 4);
    expect(euclideanDistance(p1, p1)).toBe(0);
  });

  it('should calculate Chebyshev distance correctly max(dx, dy)', () => {
    // max(5, 6) = 6
    expect(chebyshevDistance(p1, p2)).toBe(6);
    expect(chebyshevDistance(p1, p1)).toBe(0);
  });

  it('should calculate Octile distance correctly', () => {
    // (D * (dx + dy)) + ((D2 - 2 * D) * min(dx, dy)) where D=1, D2=sqrt(2)
    // = (5 + 6) + (sqrt(2) - 2) * 5 = 11 + 5 * (1.4142 - 2) = 11 - 2.9289 ≈ 8.071
    const expected = (5 + 6) + (Math.SQRT2 - 2) * 5;
    expect(octileDistance(p1, p2)).toBeCloseTo(expected, 4);
    expect(octileDistance(p1, p1)).toBe(0);
  });

  it('should satisfy symmetry: distance(A, B) === distance(B, A)', () => {
    const a = { x: 14, y: 22 };
    const b = { x: 3, y: 8 };

    expect(manhattanDistance(a, b)).toBe(manhattanDistance(b, a));
    expect(euclideanDistance(a, b)).toBe(euclideanDistance(b, a));
    expect(chebyshevDistance(a, b)).toBe(chebyshevDistance(b, a));
    expect(octileDistance(a, b)).toBe(octileDistance(b, a));
  });

  it('should satisfy triangle inequality for admissible heuristics', () => {
    const a = { x: 0, y: 0 };
    const b = { x: 4, y: 4 };
    const c = { x: 8, y: 0 };

    expect(euclideanDistance(a, c)).toBeLessThanOrEqual(
      euclideanDistance(a, b) + euclideanDistance(b, c) + 0.0001
    );
    expect(manhattanDistance(a, c)).toBeLessThanOrEqual(
      manhattanDistance(a, b) + manhattanDistance(b, c)
    );
  });
});
