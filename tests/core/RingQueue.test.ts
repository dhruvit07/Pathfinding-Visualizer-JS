import { describe, it, expect } from 'vitest';
import { RingQueue } from '../../src/core/data-structures/RingQueue';

describe('RingQueue (Circular Buffer Queue)', () => {
  it('should initialize empty with correct initial capacity and size', () => {
    const queue = new RingQueue<number>(8);
    expect(queue.size).toBe(0);
    expect(queue.capacity).toBe(8);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.peek()).toBeUndefined();
    expect(queue.dequeue()).toBeUndefined();
  });

  it('should maintain strict FIFO ordering across enqueue and dequeue', () => {
    const queue = new RingQueue<string>();
    const items = ['alpha', 'beta', 'gamma', 'delta'];

    for (const item of items) {
      queue.enqueue(item);
    }

    expect(queue.size).toBe(items.length);
    expect(queue.peek()).toBe('alpha');

    const dequeued: string[] = [];
    while (!queue.isEmpty()) {
      dequeued.push(queue.dequeue()!);
    }

    expect(dequeued).toEqual(items);
    expect(queue.size).toBe(0);
    expect(queue.isEmpty()).toBe(true);
  });

  it('should dynamically resize and double capacity when full without losing FIFO order', () => {
    const queue = new RingQueue<number>(4);
    expect(queue.capacity).toBe(4);

    // Enqueue 4 items (at capacity)
    for (let i = 1; i <= 4; i++) {
      queue.enqueue(i);
    }
    expect(queue.size).toBe(4);
    expect(queue.capacity).toBe(4);

    // Enqueue 5th item: triggers capacity resize to 8
    queue.enqueue(5);
    expect(queue.size).toBe(5);
    expect(queue.capacity).toBe(8);

    // Enqueue up to 100 items
    for (let i = 6; i <= 100; i++) {
      queue.enqueue(i);
    }
    expect(queue.size).toBe(100);
    expect(queue.capacity).toBeGreaterThanOrEqual(100);

    // Verify all 100 items dequeue in strict order
    for (let i = 1; i <= 100; i++) {
      expect(queue.dequeue()).toBe(i);
    }
    expect(queue.isEmpty()).toBe(true);
  });

  it('should handle wraparound correctly through repeated enqueue and dequeue cycles', () => {
    const queue = new RingQueue<number>(4);

    // Cycle 1: push 3, pop 2
    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    expect(queue.dequeue()).toBe(1);
    expect(queue.dequeue()).toBe(2);
    expect(queue.size).toBe(1);

    // Cycle 2: push 3 more (causes wraparound without resizing)
    queue.enqueue(4);
    queue.enqueue(5);
    queue.enqueue(6);
    expect(queue.size).toBe(4);

    // Verify order
    expect(queue.dequeue()).toBe(3);
    expect(queue.dequeue()).toBe(4);
    expect(queue.dequeue()).toBe(5);
    expect(queue.dequeue()).toBe(6);
    expect(queue.isEmpty()).toBe(true);
  });

  it('should clear the queue properly', () => {
    const queue = new RingQueue<number>();
    queue.enqueue(10);
    queue.enqueue(20);
    queue.clear();

    expect(queue.size).toBe(0);
    expect(queue.isEmpty()).toBe(true);
    expect(queue.peek()).toBeUndefined();
    expect(queue.dequeue()).toBeUndefined();
  });
});
