/**
 * Disjoint-Set (Union-Find) data structure with:
 * - Union by rank
 * - Path compression
 * - Set count tracking
 */
export class DisjointSet<T = number | string> {
  private parent: Map<T, T> = new Map();
  private rank: Map<T, number> = new Map();
  private _setCount: number = 0;

  constructor(items?: Iterable<T>) {
    if (items) {
      for (const item of items) {
        this.makeSet(item);
      }
    }
  }

  /**
   * Total number of disjoint sets.
   */
  get setCount(): number {
    return this._setCount;
  }

  /**
   * Checks whether an item has been registered in the disjoint set.
   */
  has(item: T): boolean {
    return this.parent.has(item);
  }

  /**
   * Creates a new set containing the single specified item.
   * If the item is already registered, this is a no-op.
   */
  makeSet(item: T): void {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
      this._setCount++;
    }
  }

  /**
   * Finds the representative root of the set containing `item`,
   * applying two-pass path compression along the search path.
   * If `item` is not yet registered, it is automatically initialized as a new set.
   */
  find(item: T): T {
    if (!this.parent.has(item)) {
      this.makeSet(item);
      return item;
    }

    // Find the root
    let root = item;
    while (root !== this.parent.get(root)) {
      root = this.parent.get(root)!;
    }

    // Path compression: flatten the path to point directly to root
    let curr = item;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }

    return root;
  }

  /**
   * Merges the sets containing `a` and `b` using union by rank.
   * Returns true if two disjoint sets were merged, false if they were already in the same set.
   */
  union(a: T, b: T): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);

    if (rootA === rootB) {
      return false;
    }

    const rankA = this.rank.get(rootA)!;
    const rankB = this.rank.get(rootB)!;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }

    this._setCount--;
    return true;
  }

  /**
   * Determines if items `a` and `b` belong to the same set.
   * Returns false if either item is not yet registered in the disjoint set.
   */
  connected(a: T, b: T): boolean {
    if (!this.parent.has(a) || !this.parent.has(b)) {
      return false;
    }
    return this.find(a) === this.find(b);
  }
}
