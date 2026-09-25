/**
 * High-performance circular array queue (Ring Buffer) for BFS/FIFO queues.
 * Provides O(1) amortized push and pop operations without calling Array.prototype.shift().
 * Automatically doubles internal buffer capacity when full.
 */
export class RingQueue<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private tail: number = 0;
  private count: number = 0;

  constructor(initialCapacity = 16) {
    const capacity = Math.max(1, Math.floor(initialCapacity));
    this.buffer = new Array<T | undefined>(capacity);
  }

  /**
   * Number of items currently stored in the queue.
   */
  get size(): number {
    return this.count;
  }

  /**
   * Current capacity of the underlying circular buffer.
   */
  get capacity(): number {
    return this.buffer.length;
  }

  /**
   * Returns true if the queue contains no elements.
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Returns the item at the front of the queue without removing it, or undefined if empty.
   */
  peek(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    return this.buffer[this.head];
  }

  /**
   * Adds an item to the end of the queue in O(1) amortized time.
   */
  enqueue(item: T): void {
    if (this.count === this.buffer.length) {
      this.resize(this.buffer.length * 2);
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) % this.buffer.length;
    this.count++;
  }

  /**
   * Removes and returns the item at the front of the queue in O(1) time, or undefined if empty.
   */
  dequeue(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Clear reference to allow GC
    this.head = (this.head + 1) % this.buffer.length;
    this.count--;

    return item;
  }

  /**
   * Clears all items from the queue.
   */
  clear(): void {
    this.buffer = new Array<T | undefined>(this.buffer.length);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  /**
   * Resizes the internal ring buffer and unrolls elements sequentially.
   */
  private resize(newCapacity: number): void {
    const newBuffer = new Array<T | undefined>(newCapacity);
    const oldLength = this.buffer.length;

    for (let i = 0; i < this.count; i++) {
      newBuffer[i] = this.buffer[(this.head + i) % oldLength];
    }

    this.buffer = newBuffer;
    this.head = 0;
    this.tail = this.count;
  }
}
