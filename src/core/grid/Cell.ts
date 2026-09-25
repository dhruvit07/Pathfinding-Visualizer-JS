import { Coord } from './Coordinates';

export type CellType = 'empty' | 'wall' | 'weight' | 'start' | 'target' | 'stop';

export interface Cell {
  coord: Coord;
  type: CellType;
  weight: number;
}

export const DEFAULT_CELL_WEIGHT = 1;
export const DEFAULT_WEIGHT_NODE_WEIGHT = 5;

/**
 * Returns the default traversal weight for a given cell type.
 */
export function getDefaultWeight(type: CellType, customWeight?: number): number {
  if (customWeight !== undefined) {
    return customWeight;
  }
  switch (type) {
    case 'weight':
      return DEFAULT_WEIGHT_NODE_WEIGHT;
    case 'wall':
      return Infinity;
    default:
      return DEFAULT_CELL_WEIGHT;
  }
}

/**
 * Factory helper to construct a Cell object.
 */
export function createCell(coord: Coord, type: CellType = 'empty', weight?: number): Cell {
  return {
    coord: { ...coord },
    type,
    weight: getDefaultWeight(type, weight),
  };
}
