import { Coord, coordEquals, coordKey } from '../grid/Coordinates';
import { MazeGenerator, MazeOptions } from './types';

interface FrontierWall {
  wall: Coord;
  visitedRoom: Coord;
  unvisitedRoom: Coord;
}

/**
 * Randomized Prim's Maze Algorithm implemented as an ES6 Generator.
 * Grows organic branching corridors outward from a seed room.
 */
export function* prim(options: MazeOptions): MazeGenerator {
  const { grid, start, target } = options;
  const width = grid.width;
  const height = grid.height;

  // 1. Fill entire grid with walls
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      yield { type: 'WALL', coord: { x, y } };
    }
  }

  const visitedRooms = new Set<string>();
  const frontier: FrontierWall[] = [];

  // Seed room (1, 1)
  const seedRoom: Coord = { x: 1, y: 1 };
  if (!grid.isValid(seedRoom)) return;

  visitedRooms.add(coordKey(seedRoom));
  yield { type: 'CLEAR', coord: seedRoom };

  addFrontierWalls(seedRoom, grid, visitedRooms, frontier);

  while (frontier.length > 0) {
    // Pick random wall from frontier
    const randIndex = Math.floor(Math.random() * frontier.length);
    const item = frontier[randIndex];
    frontier.splice(randIndex, 1);

    const targetKey = coordKey(item.unvisitedRoom);
    if (!visitedRooms.has(targetKey)) {
      visitedRooms.add(targetKey);

      // Carve wall and the new room
      yield { type: 'CLEAR', coord: item.wall };
      yield { type: 'CLEAR', coord: item.unvisitedRoom };

      addFrontierWalls(item.unvisitedRoom, grid, visitedRooms, frontier);
    }
  }

  // Ensure start and target remain clear
  if (start) {
    yield { type: 'CLEAR', coord: start };
    yield* ensureConnected(start, grid);
  }
  if (target) {
    yield { type: 'CLEAR', coord: target };
    yield* ensureConnected(target, grid);
  }
}

function addFrontierWalls(
  room: Coord,
  grid: MazeOptions['grid'],
  visited: Set<string>,
  frontier: FrontierWall[]
): void {
  const directions: [number, number][] = [
    [0, -2], // North room
    [2, 0],  // East room
    [0, 2],  // South room
    [-2, 0], // West room
  ];

  for (const [dx, dy] of directions) {
    const nextRoom: Coord = { x: room.x + dx, y: room.y + dy };
    const wall: Coord = { x: room.x + dx / 2, y: room.y + dy / 2 };

    if (grid.isValid(nextRoom) && !visited.has(coordKey(nextRoom))) {
      frontier.push({
        wall,
        visitedRoom: room,
        unvisitedRoom: nextRoom,
      });
    }
  }
}

function* ensureConnected(coord: Coord, grid: MazeOptions['grid']): MazeGenerator {
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
