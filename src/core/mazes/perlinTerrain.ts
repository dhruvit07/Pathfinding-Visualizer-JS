import { Coord, coordEquals } from '../grid/Coordinates';
import { MazeGenerator, MazeOptions } from './types';

/**
 * Organic Elevation / Perlin Terrain Generator implemented as an ES6 Generator.
 * Uses octave value noise to simulate realistic topographical friction
 * (Water/Chasm walls, Mud, Plains, Hills, and Mountain peaks).
 */
export function* perlinTerrain(options: MazeOptions): MazeGenerator {
  const { grid, start, target } = options;
  const width = grid.width;
  const height = grid.height;

  const seed = Math.random() * 1000;
  const scale = 0.12;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const coord: Coord = { x, y };

      if (start && coordEquals(coord, start)) continue;
      if (target && coordEquals(coord, target)) continue;

      const elevation = sampleOctaveNoise(x * scale, y * scale, seed, 3, 0.5);

      if (elevation < 0.2) {
        // Water / Chasm (unwalkable wall)
        yield { type: 'WALL', coord };
      } else if (elevation < 0.45) {
        // Plain (standard weight 1)
        yield { type: 'CLEAR', coord };
      } else if (elevation < 0.65) {
        // Forest / Rolling Hills (weight 3)
        yield { type: 'WEIGHT', coord, weight: 3 };
      } else if (elevation < 0.82) {
        // Swamp / Mud (weight 7)
        yield { type: 'WEIGHT', coord, weight: 7 };
      } else {
        // Mountain Ridge (heavy weight 15)
        yield { type: 'WEIGHT', coord, weight: 15 };
      }
    }
  }

  // Guarantee start and target are cleared
  if (start) yield { type: 'CLEAR', coord: start };
  if (target) yield { type: 'CLEAR', coord: target };
}

/**
 * Smooth 2D value noise with cubic interpolation.
 */
function sampleValueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Smoothstep s-curve
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const n00 = pseudoRandom(xi, yi, seed);
  const n10 = pseudoRandom(xi + 1, yi, seed);
  const n01 = pseudoRandom(xi, yi + 1, seed);
  const n11 = pseudoRandom(xi + 1, yi + 1, seed);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;

  return nx0 * (1 - v) + nx1 * v;
}

function sampleOctaveNoise(
  x: number,
  y: number,
  seed: number,
  octaves: number,
  persistence: number
): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += sampleValueNoise(x * frequency, y * frequency, seed + i * 31.7) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}

function pseudoRandom(x: number, y: number, seed: number): number {
  const dot = x * 12.9898 + y * 78.233 + seed * 43.123;
  const sin = Math.sin(dot) * 43758.5453123;
  return sin - Math.floor(sin);
}
