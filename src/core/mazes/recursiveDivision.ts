import { Coord, coordEquals } from '../grid/Coordinates';
import { MazeGenerator, MazeOptions } from './types';

/**
 * Recursive Division Maze Algorithm implemented as an ES6 Generator.
 * Fixes v1 bugs by operating strictly on coordinate bounds instead of iterating
 * through every node on every recursive call.
 */
export function* recursiveDivision(options: MazeOptions): MazeGenerator {
  const { grid, start, target, skew = 'none' } = options;
  const width = grid.width;
  const height = grid.height;

  // 1. Build surrounding boundary walls
  for (let x = 0; x < width; x++) {
    yield* tryWall({ x, y: 0 }, start, target);
    yield* tryWall({ x, y: height - 1 }, start, target);
  }
  for (let y = 0; y < height; y++) {
    yield* tryWall({ x: 0, y }, start, target);
    yield* tryWall({ x: width - 1, y }, start, target);
  }

  // 2. Recursively divide internal chamber
  yield* divideChamber(1, width - 2, 1, height - 2, skew, start, target);
}

function* divideChamber(
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  skew: 'horizontal' | 'vertical' | 'none',
  start?: Coord,
  target?: Coord
): MazeGenerator {
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (width < 2 || height < 2) {
    return;
  }

  // Determine orientation
  let isHorizontal: boolean;
  if (skew === 'horizontal') {
    isHorizontal = height >= 2;
  } else if (skew === 'vertical') {
    isHorizontal = width < 2;
  } else {
    isHorizontal = height > width ? true : width > height ? false : Math.random() < 0.5;
  }

  if (isHorizontal) {
    // Pick horizontal wall row and a single passage column
    const wallY = Math.floor(Math.random() * (maxY - minY)) + minY;
    const passageX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;

    for (let x = minX; x <= maxX; x++) {
      if (x !== passageX) {
        yield* tryWall({ x, y: wallY }, start, target);
      }
    }

    yield* divideChamber(minX, maxX, minY, wallY - 1, skew, start, target);
    yield* divideChamber(minX, maxX, wallY + 1, maxY, skew, start, target);
  } else {
    // Pick vertical wall column and a single passage row
    const wallX = Math.floor(Math.random() * (maxX - minX)) + minX;
    const passageY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;

    for (let y = minY; y <= maxY; y++) {
      if (y !== passageY) {
        yield* tryWall({ x: wallX, y }, start, target);
      }
    }

    yield* divideChamber(minX, wallX - 1, minY, maxY, skew, start, target);
    yield* divideChamber(wallX + 1, maxX, minY, maxY, skew, start, target);
  }
}

function* tryWall(coord: Coord, start?: Coord, target?: Coord): MazeGenerator {
  if (start && coordEquals(coord, start)) return;
  if (target && coordEquals(coord, target)) return;

  yield {
    type: 'WALL',
    coord,
  };
}
