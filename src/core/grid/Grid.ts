import { Coord, isWithinBounds } from './Coordinates';
import { Cell, CellType, getDefaultWeight } from './Cell';

const ORTHOGONAL_OFFSETS: readonly [number, number][] = [
  [0, -1], // North
  [1, 0],  // East
  [0, 1],  // South
  [-1, 0], // West
];

const DIAGONAL_OFFSETS: readonly [number, number][] = [
  [1, -1],  // North-East
  [1, 1],   // South-East
  [-1, 1],  // South-West
  [-1, -1], // North-West
];

/**
 * 2D Grid representing the pathfinding search space.
 */
export class Grid {
  private cells: Cell[][];

  constructor(public readonly width: number, public readonly height: number) {
    if (width <= 0 || height <= 0 || !Number.isInteger(width) || !Number.isInteger(height)) {
      throw new Error(
        `Invalid grid dimensions: width=${width}, height=${height}. Dimensions must be positive integers.`
      );
    }
    this.cells = this.initializeCells();
  }

  private initializeCells(): Cell[][] {
    const matrix: Cell[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          coord: { x, y },
          type: 'empty',
          weight: 1,
        });
      }
      matrix.push(row);
    }
    return matrix;
  }

  /**
   * Verifies if a coordinate falls within the grid boundaries.
   */
  isValid(coord: Coord): boolean {
    return isWithinBounds(coord, this.width, this.height) && Number.isInteger(coord.x) && Number.isInteger(coord.y);
  }

  /**
   * Retrieves the Cell at the specified coordinate, or undefined if out of bounds.
   */
  getCell(coord: Coord): Cell | undefined {
    if (!this.isValid(coord)) {
      return undefined;
    }
    return this.cells[coord.y][coord.x];
  }

  /**
   * Updates the cell type and traversal weight at the specified coordinate.
   */
  setCellType(coord: Coord, type: CellType, weight?: number): void {
    const cell = this.getCell(coord);
    if (!cell) {
      return;
    }
    cell.type = type;
    cell.weight = getDefaultWeight(type, weight);
  }

  /**
   * Checks if a coordinate is within bounds and not a wall.
   */
  isWalkable(coord: Coord): boolean {
    const cell = this.getCell(coord);
    return cell !== undefined && cell.type !== 'wall';
  }

  /**
   * Returns valid walkable neighbor coordinates (orthogonally, and optionally diagonally).
   */
  getNeighbors(coord: Coord, allowDiagonal = false): Coord[] {
    return this.resolveNeighbors(coord, allowDiagonal, true);
  }

  /**
   * Returns all adjacent coordinates within grid bounds, regardless of wall or walkability status.
   */
  getAllNeighbors(coord: Coord, allowDiagonal = false): Coord[] {
    return this.resolveNeighbors(coord, allowDiagonal, false);
  }

  private resolveNeighbors(coord: Coord, allowDiagonal: boolean, walkableOnly: boolean): Coord[] {
    if (!this.isValid(coord)) {
      return [];
    }

    const neighbors: Coord[] = [];
    const offsets = allowDiagonal
      ? [...ORTHOGONAL_OFFSETS, ...DIAGONAL_OFFSETS]
      : ORTHOGONAL_OFFSETS;

    for (const [dx, dy] of offsets) {
      const neighborCoord: Coord = { x: coord.x + dx, y: coord.y + dy };
      if (!this.isValid(neighborCoord)) {
        continue;
      }
      if (walkableOnly && !this.isWalkable(neighborCoord)) {
        continue;
      }
      neighbors.push(neighborCoord);
    }

    return neighbors;
  }

  /**
   * Resets the grid cells.
   * If keepWallsAndWeights is true, existing wall and weight cells are preserved.
   */
  reset(keepWallsAndWeights = false): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[y][x];
        if (keepWallsAndWeights) {
          if (cell.type !== 'wall' && cell.type !== 'weight') {
            cell.type = 'empty';
            cell.weight = 1;
          }
        } else {
          cell.type = 'empty';
          cell.weight = 1;
        }
      }
    }
  }

  /**
   * Creates a deep copy of the Grid instance.
   */
  clone(): Grid {
    const cloned = new Grid(this.width, this.height);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const original = this.cells[y][x];
        cloned.cells[y][x] = {
          coord: { x: original.coord.x, y: original.coord.y },
          type: original.type,
          weight: original.weight,
        };
      }
    }
    return cloned;
  }
}
