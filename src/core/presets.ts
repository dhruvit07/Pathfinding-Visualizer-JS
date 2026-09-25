import { Grid } from './grid/Grid';
import { Coord, coordEquals } from './grid/Coordinates';

export interface ChallengePreset {
  id: string;
  name: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Extreme';
  description: string;
  recommendedAlgo: string;
  recommendedHeuristic?: string;
  create: (grid: Grid) => { start: Coord; target: Coord };
}

/**
 * Procedural generation for "The Bottleneck" challenge.
 * A solid barrier blocks direct passage, forcing search through a high narrow choke point.
 * Heuristics (Manhattan/Euclidean) greedily pull towards the bottom wall, stalling search.
 */
function createBottleneck(grid: Grid): { start: Coord; target: Coord } {
  const w = grid.width;
  const h = grid.height;

  const midX = Math.floor(w / 2);
  const chokeY = Math.max(1, Math.floor(h * 0.15));

  // Endpoints placed near bottom
  const start: Coord = {
    x: Math.max(1, Math.floor(w * 0.15)),
    y: Math.min(h - 2, Math.floor(h * 0.8)),
  };
  const target: Coord = {
    x: Math.min(w - 2, Math.floor(w * 0.85)),
    y: Math.min(h - 2, Math.floor(h * 0.8)),
  };

  // Center vertical wall with single choke gap
  for (let y = 0; y < h; y++) {
    if (y !== chokeY && y !== chokeY + 1) {
      grid.setCellType({ x: midX, y }, 'wall');
    }
  }

  // Funnel walls to direct and challenge search focus
  const funnelSpan = Math.min(Math.floor(w * 0.2), Math.floor(h * 0.35));
  for (let i = 1; i <= funnelSpan; i++) {
    const wy = chokeY + i + 1;
    if (wy < h - 1) {
      if (midX - i > start.x + 1) {
        grid.setCellType({ x: midX - i, y: wy }, 'wall');
      }
      if (midX + i < target.x - 1) {
        grid.setCellType({ x: midX + i, y: wy }, 'wall');
      }
    }
  }

  // Extra deceptive dead-end pockets
  const pocketY = Math.min(h - 3, Math.floor(h * 0.7));
  for (let x = Math.max(2, midX - 6); x <= Math.min(w - 3, midX + 6); x++) {
    if (x !== midX) {
      grid.setCellType({ x, y: pocketY }, 'wall');
    }
  }

  // Ensure endpoints and choke point are walkable
  grid.setCellType(start, 'start');
  grid.setCellType(target, 'target');
  grid.setCellType({ x: midX, y: chokeY }, 'empty');
  if (chokeY + 1 < h) {
    grid.setCellType({ x: midX, y: chokeY + 1 }, 'empty');
  }

  return { start, target };
}

/**
 * Procedural generation for "Spiral Trap" challenge.
 * Concentric spiral walls curl inward towards a center target.
 * Heavily penalizes greedy heuristics that blindly march towards the center.
 */
function createSpiral(grid: Grid): { start: Coord; target: Coord } {
  const w = grid.width;
  const h = grid.height;

  const start: Coord = { x: 1, y: 1 };
  const target: Coord = { x: Math.floor(w / 2), y: Math.floor(h / 2) };

  const maxLayers = Math.floor(Math.min(w, h) / 4);
  let side = 0; // 0: East gap, 1: South gap, 2: West gap, 3: North gap

  for (let layer = 1; layer <= maxLayers; layer++) {
    const left = layer * 2;
    const right = w - 1 - layer * 2;
    const top = layer * 2;
    const bottom = h - 1 - layer * 2;

    if (right - left < 3 || bottom - top < 3) {
      break;
    }

    // Top wall
    for (let x = left; x <= right; x++) {
      if (!(side === 3 && x === left + 1)) {
        grid.setCellType({ x, y: top }, 'wall');
      }
    }

    // Right wall
    for (let y = top; y <= bottom; y++) {
      if (!(side === 0 && y === bottom - 1)) {
        grid.setCellType({ x: right, y }, 'wall');
      }
    }

    // Bottom wall
    for (let x = right; x >= left; x--) {
      if (!(side === 1 && x === right - 1)) {
        grid.setCellType({ x, y: bottom }, 'wall');
      }
    }

    // Left wall
    for (let y = bottom; y >= top; y--) {
      if (!(side === 2 && y === top + 1)) {
        grid.setCellType({ x: left, y }, 'wall');
      }
    }

    side = (side + 1) % 4;
  }

  // Clear start, target, and adjacent approach cells
  grid.setCellType(start, 'start');
  grid.setCellType(target, 'target');
  grid.setCellType({ x: target.x - 1, y: target.y }, 'empty');
  grid.setCellType({ x: target.x + 1, y: target.y }, 'empty');
  grid.setCellType({ x: target.x, y: target.y - 1 }, 'empty');
  grid.setCellType({ x: target.x, y: target.y + 1 }, 'empty');
  grid.setCellType({ x: start.x + 1, y: start.y }, 'empty');
  grid.setCellType({ x: start.x, y: start.y + 1 }, 'empty');

  return { start, target };
}

/**
 * Procedural generation for "Island Bridges" challenge.
 * Three archipelago islands separated by wide chasms connected only by narrow offset bridges.
 */
function createIslandBridges(grid: Grid): { start: Coord; target: Coord } {
  const w = grid.width;
  const h = grid.height;

  const start: Coord = {
    x: Math.max(1, Math.floor(w * 0.1)),
    y: Math.floor(h * 0.5),
  };
  const target: Coord = {
    x: Math.min(w - 2, Math.floor(w * 0.9)),
    y: Math.floor(h * 0.5),
  };

  const chasm1 = Math.floor(w * 0.35);
  const chasm2 = Math.floor(w * 0.65);

  const bridge1Y = Math.max(1, Math.floor(h * 0.2));
  const bridge2Y = Math.min(h - 2, Math.floor(h * 0.8));

  // Chasm 1 (West chasm with North bridge)
  for (let y = 0; y < h; y++) {
    if (y !== bridge1Y && y !== bridge1Y + 1) {
      grid.setCellType({ x: chasm1, y }, 'wall');
      if (chasm1 + 1 < w) {
        grid.setCellType({ x: chasm1 + 1, y }, 'wall');
      }
    }
  }

  // Chasm 2 (East chasm with South bridge)
  for (let y = 0; y < h; y++) {
    if (y !== bridge2Y && y !== bridge2Y - 1) {
      grid.setCellType({ x: chasm2, y }, 'wall');
      if (chasm2 - 1 >= 0) {
        grid.setCellType({ x: chasm2 - 1, y }, 'wall');
      }
    }
  }

  // Shallow waters (weight nodes) surrounding islands
  for (let y = 1; y < h - 1; y++) {
    if (chasm1 - 1 >= 0 && grid.getCell({ x: chasm1 - 1, y })?.type === 'empty') {
      if (Math.abs(y - bridge1Y) > 2) {
        grid.setCellType({ x: chasm1 - 1, y }, 'weight', 4);
      }
    }
    if (chasm1 + 2 < w && grid.getCell({ x: chasm1 + 2, y })?.type === 'empty') {
      if (Math.abs(y - bridge1Y) > 2) {
        grid.setCellType({ x: chasm1 + 2, y }, 'weight', 4);
      }
    }
    if (chasm2 - 2 >= 0 && grid.getCell({ x: chasm2 - 2, y })?.type === 'empty') {
      if (Math.abs(y - bridge2Y) > 2) {
        grid.setCellType({ x: chasm2 - 2, y }, 'weight', 4);
      }
    }
    if (chasm2 + 1 < w && grid.getCell({ x: chasm2 + 1, y })?.type === 'empty') {
      if (Math.abs(y - bridge2Y) > 2) {
        grid.setCellType({ x: chasm2 + 1, y }, 'weight', 4);
      }
    }
  }

  // Ensure bridges and endpoints are walkable
  grid.setCellType({ x: chasm1, y: bridge1Y }, 'empty');
  if (chasm1 + 1 < w) grid.setCellType({ x: chasm1 + 1, y: bridge1Y }, 'empty');
  grid.setCellType({ x: chasm2, y: bridge2Y }, 'empty');
  if (chasm2 - 1 >= 0) grid.setCellType({ x: chasm2 - 1, y: bridge2Y }, 'empty');

  grid.setCellType(start, 'start');
  grid.setCellType(target, 'target');

  return { start, target };
}

/**
 * Procedural generation for "Mountain Pass" challenge.
 * Heavy elevation ridges (weights 5 & 8) with rocky peaks and a winding valley corridor.
 * Dramatically illustrates the difference between unweighted BFS (ignoring weights) and A* / Dijkstra.
 */
function createMountainPass(grid: Grid): { start: Coord; target: Coord } {
  const w = grid.width;
  const h = grid.height;

  const start: Coord = {
    x: Math.max(1, Math.floor(w * 0.08)),
    y: Math.floor(h * 0.5),
  };
  const target: Coord = {
    x: Math.min(w - 2, Math.floor(w * 0.92)),
    y: Math.floor(h * 0.5),
  };

  const startRidgeX = Math.floor(w * 0.22);
  const endRidgeX = Math.floor(w * 0.78);

  // Fill mountain territory with elevation weights
  for (let x = startRidgeX; x <= endRidgeX; x++) {
    for (let y = 0; y < h; y++) {
      const isHighPeak = (x + y) % 5 === 0;
      if (isHighPeak) {
        grid.setCellType({ x, y }, 'weight', 8);
      } else {
        grid.setCellType({ x, y }, 'weight', 5);
      }
    }
  }

  // Carve S-curve valley pass through the mountain range
  const valleyPoints: Coord[] = [];
  for (let x = startRidgeX - 1; x <= endRidgeX + 1; x++) {
    const progress = (x - startRidgeX) / Math.max(1, endRidgeX - startRidgeX);
    // S-curve sinusoidal valley
    const sineFactor = Math.sin(progress * Math.PI * 2);
    const amplitude = (h * 0.32);
    const valleyY = Math.round(h * 0.5 + sineFactor * amplitude);
    const clampedY = Math.max(1, Math.min(h - 2, valleyY));

    valleyPoints.push({ x, y: clampedY });
  }

  // Clear 2-3 cell wide valley corridor
  for (const pt of valleyPoints) {
    for (let dy = -1; dy <= 1; dy++) {
      const cy = pt.y + dy;
      if (cy >= 0 && cy < h) {
        grid.setCellType({ x: pt.x, y: cy }, 'empty');
      }
    }
  }

  // Add craggy mountain peaks (walls) outside the valley
  for (let x = startRidgeX + 2; x <= endRidgeX - 2; x += 3) {
    for (let y = 1; y < h - 1; y += 3) {
      const cell = grid.getCell({ x, y });
      if (cell && cell.type === 'weight') {
        grid.setCellType({ x, y }, 'wall');
      }
    }
  }

  grid.setCellType(start, 'start');
  grid.setCellType(target, 'target');

  return { start, target };
}

export const CHALLENGE_PRESETS: Record<string, ChallengePreset> = {
  bottleneck: {
    id: 'bottleneck',
    name: 'The Bottleneck',
    difficulty: 'Medium',
    description: 'A massive barrier forcing search through a high narrow choke point, trapping greedy heuristics.',
    recommendedAlgo: 'astar',
    recommendedHeuristic: 'manhattan',
    create: createBottleneck,
  },
  spiral: {
    id: 'spiral',
    name: 'Spiral Trap',
    difficulty: 'Hard',
    description: 'A winding spiral labyrinth with the target in the center, severely penalizing direct heuristics.',
    recommendedAlgo: 'dijkstra',
    recommendedHeuristic: 'manhattan',
    create: createSpiral,
  },
  islandBridges: {
    id: 'islandBridges',
    name: 'Island Bridges',
    difficulty: 'Medium',
    description: 'Archipelago islands separated by water chasms and shallows, connected only by narrow bridges.',
    recommendedAlgo: 'bidirectional',
    recommendedHeuristic: 'euclidean',
    create: createIslandBridges,
  },
  mountainPass: {
    id: 'mountainPass',
    name: 'Mountain Pass',
    difficulty: 'Extreme',
    description: 'Heavy 5x and 8x elevation terrain where Dijkstra & A* navigate the valley while unweighted BFS wastes energy.',
    recommendedAlgo: 'astar',
    recommendedHeuristic: 'manhattan',
    create: createMountainPass,
  },
};

/**
 * Loads a challenge preset onto the given grid and returns the validated start and target coordinates.
 */
export function loadPreset(presetId: string, grid: Grid): { start: Coord; target: Coord } {
  const preset = CHALLENGE_PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown challenge preset ID: "${presetId}". Available presets: ${Object.keys(CHALLENGE_PRESETS).join(', ')}`);
  }

  grid.reset(false);
  const endpoints = preset.create(grid);

  // Guarantee that start and target are not walls and are validly placed
  grid.setCellType(endpoints.start, 'start');
  grid.setCellType(endpoints.target, 'target');

  return endpoints;
}
