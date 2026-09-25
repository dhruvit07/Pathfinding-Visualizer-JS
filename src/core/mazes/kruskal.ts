import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { DisjointSet } from '../data-structures/DisjointSet';
import { MazeGenerator, MazeOptions } from './types';

interface WallEdge {
  wall: Coord;
  cellA: Coord;
  cellB: Coord;
}

/**
 * Randomized Kruskal's Maze Algorithm implemented as an ES6 Generator.
 * Uses DisjointSet (Union-Find) to carve passages between distinct sets,
 * producing a guaranteed spanning tree labyrinth without disconnected regions.
 */
export function* kruskal(options: MazeOptions): MazeGenerator {
  const { grid, start, target } = options;
  const width = grid.width;
  const height = grid.height;

  // 1. Fill entire grid with walls (yielding WALL events)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yield { type: 'WALL', coord: { x, y } };
    }
  }

  const ds = new DisjointSet<string>();
  const edges: WallEdge[] = [];

  // 2. Identify passages (odd coordinates) and internal dividing walls
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const cell: Coord = { x, y };
      const cellKey = coordKey(cell);
      ds.makeSet(cellKey);

      // Initially carve passage rooms
      yield { type: 'CLEAR', coord: cell };

      // Horizontal edge (wall between cell and right neighbor)
      if (x + 2 < width - 1) {
        edges.push({
          wall: { x: x + 1, y },
          cellA: cell,
          cellB: { x: x + 2, y },
        });
      }

      // Vertical edge (wall between cell and bottom neighbor)
      if (y + 2 < height - 1) {
        edges.push({
          wall: { x, y: y + 1 },
          cellA: cell,
          cellB: { x, y: y + 2 },
        });
      }
    }
  }

  // 3. Fisher-Yates shuffle edges
  for (let i = edges.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [edges[i], edges[j]] = [edges[j], edges[i]];
  }

  // 4. Carve passages between disjoint sets
  for (const edge of edges) {
    const keyA = coordKey(edge.cellA);
    const keyB = coordKey(edge.cellB);

    if (ds.union(keyA, keyB)) {
      yield { type: 'CLEAR', coord: edge.wall };
    }
  }

  // 5. Ensure start and target are cleared and connected to adjacent paths
  if (start) {
    yield { type: 'CLEAR', coord: start };
    yield* ensureOpenAdjacent(start, grid);
  }
  if (target) {
    yield { type: 'CLEAR', coord: target };
    yield* ensureOpenAdjacent(target, grid);
  }
}

function* ensureOpenAdjacent(coord: Coord, grid: MazeOptions['grid']): MazeGenerator {
  const neighbors = [
    { x: coord.x + 1, y: coord.y },
    { x: coord.x - 1, y: coord.y },
    { x: coord.x, y: coord.y + 1 },
    { x: coord.x, y: coord.y - 1 },
  ].filter(c => grid.isValid(c));

  if (neighbors.length > 0) {
    yield { type: 'CLEAR', coord: neighbors[0] };
  }
}
