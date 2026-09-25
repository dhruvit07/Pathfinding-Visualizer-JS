export type Comparator<T> = (a: T, b: T) => number;

/**
 * Generic Binary Min-Heap Priority Queue.
 * Elements with lowest comparator value have highest priority (popped first).
 */
export class PriorityQueue<T> {
  private heap: T[] = [];
  private readonly comparator: Comparator<T>;

  constructor(comparator?: Comparator<T>) {
    this.comparator = comparator ?? ((a: T, b: T) => (a as unknown as number) - (b as unknown as number));
  }

  /**
   * Number of elements currently in the priority queue.
   */
  get size(): number {
    return this.heap.length;
  }

  /**
   * Checks whether the priority queue is empty.
   */
  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Returns the minimum item without removing it, or undefined if empty.
   */
  peek(): T | undefined {
    return this.heap.length > 0 ? this.heap[0] : undefined;
  }

  /**
   * Inserts an item into the priority queue in O(log N) time.
   */
  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Removes and returns the minimum item in O(log N) time, or undefined if empty.
   */
  pop(): T | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const top = this.heap[0];
    const bottom = this.heap.pop()!;

    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }

    return top;
  }

  /**
   * Empties the priority queue.
   */
  clear(): void {
    this.heap = [];
  }

  /**
   * Returns a shallow copy of the internal heap array.
   */
  toArray(): T[] {
    return [...this.heap];
  }

  private bubbleUp(index: number): void {
    const item = this.heap[index];

    while (index > 0) {
      const parentIndex = (index - 1) >> 1;
      const parent = this.heap[parentIndex];

      if (this.comparator(item, parent) < 0) {
        this.heap[index] = parent;
        index = parentIndex;
      } else {
        break;
      }
    }

    this.heap[index] = item;
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    const item = this.heap[index];

    while (true) {
      const leftChildIndex = (index << 1) + 1;
      const rightChildIndex = leftChildIndex + 1;
      let swapIndex: number | null = null;

      if (leftChildIndex < length) {
        if (this.comparator(this.heap[leftChildIndex], item) < 0) {
          swapIndex = leftChildIndex;
        }
      }

      if (rightChildIndex < length) {
        const compareTarget = swapIndex === null ? item : this.heap[leftChildIndex];
        if (this.comparator(this.heap[rightChildIndex], compareTarget) < 0) {
          swapIndex = rightChildIndex;
        }
      }

      if (swapIndex === null) {
        break;
      }

      this.heap[index] = this.heap[swapIndex];
      index = swapIndex;
    }

    this.heap[index] = item;
  }
}
