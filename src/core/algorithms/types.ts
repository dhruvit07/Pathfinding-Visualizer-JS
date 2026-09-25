import { Coord } from '../grid/Coordinates';
import { HeuristicFunction } from '../heuristics';
import { Grid } from '../grid/Grid';

export type StepType =
  | 'VISIT'      // Node is finalized (popped from frontier / closed)
  | 'CONSIDER'   // Neighbor is being inspected
  | 'RELAX'      // Better tentative path/cost discovered for neighbor
  | 'PATH_STEP'  // Shortest path backtracked from target to start
  | 'FINISHED'   // Search completed successfully
  | 'NO_PATH';   // Graph exhausted, target unreachable

export interface StepEvent {
  type: StepType;
  coord: Coord;
  cost?: number;
  heuristic?: number;
  totalCost?: number; // f = g + h
  parent?: Coord | null;
  direction?: 'forward' | 'backward'; // For bidirectional algorithms
}

export interface SearchSummary {
  found: boolean;
  path: Coord[];
  cost: number;
  nodesExplored: number;
  durationMs: number;
}

export interface PathfindingOptions {
  grid: Grid;
  start: Coord;
  target: Coord;
  heuristic?: HeuristicFunction;
  allowDiagonal?: boolean;
}

export type AlgorithmGenerator = Generator<StepEvent, SearchSummary, void>;
