import { Coord } from '../grid/Coordinates';
import { Grid } from '../grid/Grid';

export type MazeStepType = 'WALL' | 'WEIGHT' | 'CLEAR';

export interface MazeStepEvent {
  type: MazeStepType;
  coord: Coord;
  weight?: number;
}

export interface MazeOptions {
  grid: Grid;
  start?: Coord;
  target?: Coord;
  skew?: 'horizontal' | 'vertical' | 'none';
}

export type MazeGenerator = Generator<MazeStepEvent, void, void>;
