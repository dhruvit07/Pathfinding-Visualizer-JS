import { Grid } from './grid/Grid';
import { Coord, isWithinBounds } from './grid/Coordinates';

export interface SerializedWeight {
  coord: Coord;
  weight: number;
}

export interface SerializedState {
  width: number;
  height: number;
  start: Coord;
  target: Coord;
  walls: Coord[];
  weights: SerializedWeight[];
  algorithm?: string;
  heuristic?: string;
}

interface CompactStatePayload {
  w: number;
  h: number;
  s: [number, number];
  t: [number, number];
  wl?: [number, number][];
  wt?: [number, number, number][];
  a?: string;
  he?: string;
}

/**
 * Encodes string to URL-safe Base64 across Browser and Node environments.
 */
function toUrlSafeBase64(str: string): string {
  const g = globalThis as { Buffer?: { from(data: string, enc: string): { toString(enc: string): string } } };
  let b64: string;

  if (g.Buffer) {
    b64 = g.Buffer.from(str, 'utf-8').toString('base64');
  } else if (typeof btoa !== 'undefined') {
    const encoded = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    b64 = btoa(encoded);
  } else {
    throw new Error('Base64 encoding is not supported in this runtime environment.');
  }

  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes URL-safe Base64 string back to UTF-8 across Browser and Node environments.
 */
function fromUrlSafeBase64(input: string): string {
  let standard = input.replace(/-/g, '+').replace(/_/g, '/');
  while (standard.length % 4 !== 0) {
    standard += '=';
  }

  const g = globalThis as { Buffer?: { from(data: string, enc: string): { toString(enc: string): string } } };
  if (g.Buffer) {
    return g.Buffer.from(standard, 'base64').toString('utf-8');
  } else if (typeof atob !== 'undefined') {
    const binary = atob(standard);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } else {
    throw new Error('Base64 decoding is not supported in this runtime environment.');
  }
}

/**
 * Serializes the current grid setup, endpoints, algorithm, and heuristic into a compact Base64 hash.
 */
export function serializeState(
  grid: Grid,
  start: Coord,
  target: Coord,
  algorithm?: string,
  heuristic?: string
): string {
  const walls: [number, number][] = [];
  const weights: [number, number, number][] = [];

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.getCell({ x, y });
      if (!cell) continue;

      if (cell.type === 'wall') {
        walls.push([x, y]);
      } else if (cell.type === 'weight' && cell.weight > 1) {
        weights.push([x, y, cell.weight]);
      }
    }
  }

  const payload: CompactStatePayload = {
    w: grid.width,
    h: grid.height,
    s: [start.x, start.y],
    t: [target.x, target.y],
    ...(walls.length > 0 ? { wl: walls } : {}),
    ...(weights.length > 0 ? { wt: weights } : {}),
    ...(algorithm ? { a: algorithm } : {}),
    ...(heuristic ? { he: heuristic } : {}),
  };

  return toUrlSafeBase64(JSON.stringify(payload));
}

/**
 * Safely parses and validates a serialized hash string or full URL.
 * Returns null if the hash is malformed, corrupt, or has invalid bounds.
 */
export function deserializeState(hashOrUrl: string): SerializedState | null {
  if (!hashOrUrl || typeof hashOrUrl !== 'string') {
    return null;
  }

  try {
    let raw = hashOrUrl.trim();

    // Extract hash part if a full URL was passed
    const hashIndex = raw.indexOf('#');
    if (hashIndex !== -1) {
      raw = raw.substring(hashIndex + 1);
    }

    // Extract state parameter if present in format state=... or key=val params
    if (raw.includes('state=')) {
      const parts = raw.split('&');
      const statePart = parts.find((p) => p.startsWith('state=') || p.includes('state='));
      if (statePart) {
        raw = statePart.split('state=')[1];
      }
    }

    if (!raw) {
      return null;
    }

    const jsonStr = fromUrlSafeBase64(raw);
    const parsed = JSON.parse(jsonStr) as Partial<CompactStatePayload>;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const { w, h, s, t, wl, wt, a, he } = parsed;

    // Validate dimensions
    if (
      typeof w !== 'number' ||
      typeof h !== 'number' ||
      !Number.isInteger(w) ||
      !Number.isInteger(h) ||
      w <= 0 ||
      h <= 0
    ) {
      return null;
    }

    // Validate endpoints
    if (
      !Array.isArray(s) ||
      s.length !== 2 ||
      !Array.isArray(t) ||
      t.length !== 2 ||
      !Number.isInteger(s[0]) ||
      !Number.isInteger(s[1]) ||
      !Number.isInteger(t[0]) ||
      !Number.isInteger(t[1])
    ) {
      return null;
    }

    const startCoord: Coord = { x: s[0], y: s[1] };
    const targetCoord: Coord = { x: t[0], y: t[1] };

    if (!isWithinBounds(startCoord, w, h) || !isWithinBounds(targetCoord, w, h)) {
      return null;
    }

    // Validate and sanitize walls
    const sanitizedWalls: Coord[] = [];
    if (Array.isArray(wl)) {
      for (const item of wl) {
        if (
          Array.isArray(item) &&
          item.length === 2 &&
          Number.isInteger(item[0]) &&
          Number.isInteger(item[1])
        ) {
          const c: Coord = { x: item[0], y: item[1] };
          if (
            isWithinBounds(c, w, h) &&
            !(c.x === startCoord.x && c.y === startCoord.y) &&
            !(c.x === targetCoord.x && c.y === targetCoord.y)
          ) {
            sanitizedWalls.push(c);
          }
        }
      }
    }

    // Validate and sanitize weights
    const sanitizedWeights: SerializedWeight[] = [];
    if (Array.isArray(wt)) {
      for (const item of wt) {
        if (
          Array.isArray(item) &&
          item.length >= 2 &&
          Number.isInteger(item[0]) &&
          Number.isInteger(item[1])
        ) {
          const c: Coord = { x: item[0], y: item[1] };
          const weightVal = typeof item[2] === 'number' && item[2] > 0 ? item[2] : 5;
          if (
            isWithinBounds(c, w, h) &&
            !(c.x === startCoord.x && c.y === startCoord.y) &&
            !(c.x === targetCoord.x && c.y === targetCoord.y)
          ) {
            sanitizedWeights.push({ coord: c, weight: weightVal });
          }
        }
      }
    }

    return {
      width: w,
      height: h,
      start: startCoord,
      target: targetCoord,
      walls: sanitizedWalls,
      weights: sanitizedWeights,
      algorithm: typeof a === 'string' ? a : undefined,
      heuristic: typeof he === 'string' ? he : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a full shareable URL containing the current state encoded in the hash fragment.
 */
export function buildShareUrl(
  grid: Grid,
  start: Coord,
  target: Coord,
  algorithm?: string,
  heuristic?: string,
  baseUrl?: string
): string {
  const hash = serializeState(grid, start, target, algorithm, heuristic);
  let base = baseUrl;

  if (!base && typeof window !== 'undefined' && window.location) {
    base = window.location.origin + window.location.pathname;
  }
  if (!base) {
    base = 'http://localhost:5173/';
  }

  // Remove existing hash if present in base
  const cleanBase = base.split('#')[0];
  return `${cleanBase}#state=${hash}`;
}

/**
 * Copies the given share URL to the system clipboard.
 * Returns true on success, false on failure.
 */
export async function copyShareUrl(url: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }

    if (typeof document !== 'undefined') {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Applies a SerializedState onto a Grid instance, clearing old obstacles and setting endpoints.
 */
export function applySerializedState(
  state: SerializedState,
  grid: Grid
): { start: Coord; target: Coord } {
  grid.reset(false);

  for (const wall of state.walls) {
    if (grid.isValid(wall)) {
      grid.setCellType(wall, 'wall');
    }
  }

  for (const wt of state.weights) {
    if (grid.isValid(wt.coord)) {
      grid.setCellType(wt.coord, 'weight', wt.weight);
    }
  }

  grid.setCellType(state.start, 'start');
  grid.setCellType(state.target, 'target');

  return { start: state.start, target: state.target };
}
