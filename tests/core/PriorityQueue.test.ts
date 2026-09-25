import { describe, it, expect } from 'vitest';
import { PriorityQueue } from '../../src/core/data-structures/PriorityQueue';

describe('PriorityQueue', () => {
  it('should initialize empty with size 0 and return undefined on empty peek/pop', () => {
    const pq = new PriorityQueue<number>();

    expect(pq.size).toBe(0);
    expect(pq.isEmpty()).toBe(true);
    expect(pq.peek()).toBeUndefined();
    expect(pq.pop()).toBeUndefined();
    expect(pq.toArray()).toEqual([]);
  });

  it('should maintain min-heap ordering with default numeric comparator', () => {
    const pq = new PriorityQueue<number>();
    const numbers = [42, 17, 99, 3, 55, 1, 23, 8];

    for (const num of numbers) {
      pq.push(num);
    }

    expect(pq.size).toBe(numbers.length);
    expect(pq.isEmpty()).toBe(false);
    expect(pq.peek()).toBe(1);

    const extracted: number[] = [];
    while (!pq.isEmpty()) {
      extracted.push(pq.pop()!);
    }

    expect(extracted).toEqual([1, 3, 8, 17, 23, 42, 55, 99]);
    expect(pq.size).toBe(0);
    expect(pq.isEmpty()).toBe(true);
  });

  it('should support custom object comparator (min-heap and max-heap)', () => {
    interface Node {
      id: string;
      fCost: number;
    }

    const minPq = new PriorityQueue<Node>((a, b) => a.fCost - b.fCost);
    minPq.push({ id: 'A', fCost: 10 });
    minPq.push({ id: 'B', fCost: 4 });
    minPq.push({ id: 'C', fCost: 15 });
    minPq.push({ id: 'D', fCost: 1 });

    expect(minPq.peek()).toEqual({ id: 'D', fCost: 1 });
    expect(minPq.pop()?.id).toBe('D');
    expect(minPq.pop()?.id).toBe('B');
    expect(minPq.pop()?.id).toBe('A');
    expect(minPq.pop()?.id).toBe('C');

    // Max heap comparator
    const maxPq = new PriorityQueue<Node>((a, b) => b.fCost - a.fCost);
    maxPq.push({ id: 'A', fCost: 10 });
    maxPq.push({ id: 'B', fCost: 4 });
    maxPq.push({ id: 'C', fCost: 15 });

    expect(maxPq.peek()).toEqual({ id: 'C', fCost: 15 });
    expect(maxPq.pop()?.id).toBe('C');
    expect(maxPq.pop()?.id).toBe('A');
    expect(maxPq.pop()?.id).toBe('B');
  });

  it('should sort a randomized array of 1,000 numbers matching Array.prototype.sort', () => {
    const pq = new PriorityQueue<number>();
    const count = 1000;
    const original: number[] = [];

    for (let i = 0; i < count; i++) {
      const val = Math.floor(Math.random() * 100000) - 50000;
      original.push(val);
      pq.push(val);
    }

    expect(pq.size).toBe(count);

    const sortedFromPq: number[] = [];
    while (!pq.isEmpty()) {
      sortedFromPq.push(pq.pop()!);
    }

    const expected = [...original].sort((a, b) => a - b);
    expect(sortedFromPq).toEqual(expected);
  });

  it('should properly handle duplicate values and negative numbers', () => {
    const pq = new PriorityQueue<number>();
    const values = [-5, 10, -5, 0, 10, -20, 0];

    for (const val of values) {
      pq.push(val);
    }

    const result: number[] = [];
    while (!pq.isEmpty()) {
      result.push(pq.pop()!);
    }

    expect(result).toEqual([-20, -5, -5, 0, 0, 10, 10]);
  });

  it('should clear the priority queue and reset size to 0', () => {
    const pq = new PriorityQueue<number>();
    pq.push(10);
    pq.push(20);
    pq.push(5);

    expect(pq.size).toBe(3);
    pq.clear();
    expect(pq.size).toBe(0);
    expect(pq.isEmpty()).toBe(true);
    expect(pq.peek()).toBeUndefined();
    expect(pq.pop()).toBeUndefined();
  });

  it('should provide an isolated snapshot via toArray()', () => {
    const pq = new PriorityQueue<number>();
    pq.push(10);
    pq.push(20);

    const array = pq.toArray();
    expect(array.length).toBe(2);
    array.push(999);
    expect(pq.size).toBe(2);
  });
});
