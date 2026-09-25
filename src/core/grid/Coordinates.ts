/**
 * 2D Grid Coordinate representation.
 */
export interface Coord {
  x: number;
  y: number;
}

/**
 * Serializes a coordinate to a string key in the format "x,y".
 */
export function coordKey(c: Coord): string {
  return `${c.x},${c.y}`;
}

/**
 * Parses a serialized "x,y" string key back into a Coord object.
 * Throws an Error if the format or numbers are invalid.
 */
export function parseKey(key: string): Coord {
  const parts = key.split(',');
  if (parts.length !== 2) {
    throw new Error(`Invalid coordinate key format: "${key}". Expected "x,y".`);
  }

  const x = Number(parts[0].trim());
  const y = Number(parts[1].trim());

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid numeric coordinates in key: "${key}".`);
  }

  return { x, y };
}

/**
 * Compares two coordinates for structural equality.
 */
export function coordEquals(a: Coord, b: Coord): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Checks whether a coordinate lies within [0, width) and [0, height).
 */
export function isWithinBounds(c: Coord, width: number, height: number): boolean {
  return c.x >= 0 && c.x < width && c.y >= 0 && c.y < height;
}
