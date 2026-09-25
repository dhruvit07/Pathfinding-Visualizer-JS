import { describe, it, expect } from 'vitest';
import { DisjointSet } from '../../src/core/data-structures/DisjointSet';

describe('DisjointSet (Union-Find)', () => {
  it('should initialize empty or with provided items', () => {
    const ds1 = new DisjointSet<number>();
    expect(ds1.setCount).toBe(0);

    const ds2 = new DisjointSet<string>(['A', 'B', 'C']);
    expect(ds2.setCount).toBe(3);
    expect(ds2.has('A')).toBe(true);
    expect(ds2.has('D')).toBe(false);
  });

  it('should create individual sets via makeSet', () => {
    const ds = new DisjointSet<number>();
    ds.makeSet(1);
    ds.makeSet(2);
    expect(ds.setCount).toBe(2);

    // Duplicate makeSet should be a no-op
    ds.makeSet(1);
    expect(ds.setCount).toBe(2);
  });

  it('should find elements and automatically initialize unregistered elements', () => {
    const ds = new DisjointSet<string>();
    expect(ds.find('X')).toBe('X');
    expect(ds.has('X')).toBe(true);
    expect(ds.setCount).toBe(1);
  });

  it('should union sets correctly and update setCount', () => {
    const ds = new DisjointSet<number>([1, 2, 3, 4]);
    expect(ds.setCount).toBe(4);

    expect(ds.union(1, 2)).toBe(true);
    expect(ds.setCount).toBe(3);
    expect(ds.connected(1, 2)).toBe(true);
    expect(ds.connected(1, 3)).toBe(false);

    // Redundant union should return false
    expect(ds.union(1, 2)).toBe(false);
    expect(ds.setCount).toBe(3);

    expect(ds.union(3, 4)).toBe(true);
    expect(ds.setCount).toBe(2);

    // Union the two larger sets
    expect(ds.union(2, 4)).toBe(true);
    expect(ds.setCount).toBe(1);
    expect(ds.connected(1, 4)).toBe(true);
  });

  it('should apply path compression so all elements point to root', () => {
    const ds = new DisjointSet<number>();
    // Create chain: 1-2, 2-3, 3-4, 4-5
    ds.union(1, 2);
    ds.union(2, 3);
    ds.union(3, 4);
    ds.union(4, 5);

    const root = ds.find(1);
    for (let i = 1; i <= 5; i++) {
      expect(ds.find(i)).toBe(root);
      expect(ds.connected(i, root)).toBe(true);
    }
  });

  it('should detect cycles in a graph', () => {
    const edges: [string, string][] = [
      ['A', 'B'],
      ['B', 'C'],
      ['C', 'D'],
      ['D', 'A'], // creates a cycle
    ];

    const ds = new DisjointSet<string>();
    let cycleDetected = false;

    for (const [u, v] of edges) {
      if (!ds.union(u, v)) {
        cycleDetected = true;
        break;
      }
    }

    expect(cycleDetected).toBe(true);
  });
});
