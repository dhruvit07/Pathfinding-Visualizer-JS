import { Grid } from '../core/grid/Grid';
import { Coord, coordEquals } from '../core/grid/Coordinates';
import { CellType } from '../core/grid/Cell';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InteractionHandler, BrushMode, EndpointType } from '../renderer/InteractionHandler';
import { SimulationRunner, SimulationState } from '../engine/SimulationRunner';
import { TelemetryData } from '../engine/Telemetry';
import {
  AlgorithmGenerator,
  PathfindingOptions,
  SearchSummary,
  StepEvent,
} from '../core/algorithms/types';
import { dijkstra, astar, bfs, dfs, bidirectional, jps } from '../core/algorithms';
import {
  manhattanDistance,
  euclideanDistance,
  chebyshevDistance,
  octileDistance,
  HeuristicFunction,
} from '../core/heuristics';

export type AlgorithmType =
  | 'astar'
  | 'dijkstra'
  | 'jps'
  | 'bidirectional'
  | 'bfs'
  | 'dfs';

export type HeuristicType = 'manhattan' | 'euclidean' | 'chebyshev' | 'octile';

export interface ArenaAlgorithmConfig {
  name: string;
  algorithm: AlgorithmType;
  heuristic?: HeuristicType;
  allowDiagonal?: boolean;
}

export interface MatchupPreset {
  id: string;
  name: string;
  algoA: ArenaAlgorithmConfig;
  algoB: ArenaAlgorithmConfig;
}

export const ARENA_PRESETS: readonly MatchupPreset[] = [
  {
    id: 'astar-vs-dijkstra',
    name: 'A* (Manhattan) vs Dijkstra',
    algoA: { name: 'A* (Manhattan)', algorithm: 'astar', heuristic: 'manhattan' },
    algoB: { name: "Dijkstra's Algorithm", algorithm: 'dijkstra' },
  },
  {
    id: 'jps-vs-astar',
    name: 'Jump Point Search (JPS) vs A*',
    algoA: { name: 'Jump Point Search (JPS)', algorithm: 'jps', heuristic: 'manhattan' },
    algoB: { name: 'A* (Manhattan)', algorithm: 'astar', heuristic: 'manhattan' },
  },
  {
    id: 'bfs-vs-bidirectional',
    name: 'BFS vs Bidirectional Search',
    algoA: { name: 'Breadth-First Search (BFS)', algorithm: 'bfs' },
    algoB: { name: 'Bidirectional Search', algorithm: 'bidirectional' },
  },
] as const;

export interface ComparativeStats {
  summaryA: SearchSummary;
  summaryB: SearchSummary;
  totalWalkable: number;
  percentExploredA: number;
  percentExploredB: number;
  nodesExploredDelta: number; // A - B
  timeDeltaMs: number; // A - B
  costA: number;
  costB: number;
  costDelta: number; // A - B
  isCostEqual: boolean;
  bothFound: boolean;
  efficiencyWinner: 'A' | 'B' | 'TIE';
  speedWinner: 'A' | 'B' | 'TIE';
  winner: 'A' | 'B' | 'TIE';
  message: string;
}

export interface ArenaManagerOptions {
  grid: Grid;
  start: Coord;
  target: Coord;
  rendererA?: CanvasRenderer;
  rendererB?: CanvasRenderer;
  runnerA?: SimulationRunner;
  runnerB?: SimulationRunner;
  algoA?: ArenaAlgorithmConfig;
  algoB?: ArenaAlgorithmConfig;
  onComparisonUpdate?: (stats: ComparativeStats) => void;
  onRaceStart?: () => void;
  onRaceFinish?: (stats: ComparativeStats) => void;
  onRaceReset?: () => void;
  onStateChange?: (stateA: SimulationState, stateB: SimulationState) => void;
  onTelemetryA?: (data: TelemetryData) => void;
  onTelemetryB?: (data: TelemetryData) => void;
  onEndpointChange?: (type: EndpointType, newCoord: Coord) => void;
}

export function resolveHeuristicFunction(type?: HeuristicType): HeuristicFunction {
  switch (type) {
    case 'euclidean':
      return euclideanDistance;
    case 'chebyshev':
      return chebyshevDistance;
    case 'octile':
      return octileDistance;
    case 'manhattan':
    default:
      return manhattanDistance;
  }
}

export function createAlgorithmForConfig(
  config: ArenaAlgorithmConfig,
  grid: Grid,
  start: Coord,
  target: Coord
): AlgorithmGenerator {
  const heuristicFn = resolveHeuristicFunction(config.heuristic);
  const options: PathfindingOptions = {
    grid,
    start,
    target,
    heuristic: heuristicFn,
    allowDiagonal: config.allowDiagonal ?? false,
  };

  switch (config.algorithm) {
    case 'dijkstra':
      return dijkstra(options);
    case 'astar':
      return astar(options);
    case 'jps':
      return jps(options);
    case 'bidirectional':
      return bidirectional(options);
    case 'bfs':
      return bfs(options);
    case 'dfs':
      return dfs(options);
    default:
      return astar(options);
  }
}

/**
 * Manages Arena Mode: coordinates dual simulation runners and renderers
 * on a single synchronized grid, orchestrates head-to-head races, and
 * calculates comparative performance analytics.
 */
export class ArenaManager {
  public isArenaMode = false;
  public grid: Grid;
  public start: Coord;
  public target: Coord;

  public rendererA: CanvasRenderer;
  public rendererB: CanvasRenderer;
  public runnerA: SimulationRunner;
  public runnerB: SimulationRunner;

  public algoA: ArenaAlgorithmConfig;
  public algoB: ArenaAlgorithmConfig;
  public activePresetId: string | null = null;

  public handlerA: InteractionHandler | null = null;
  public handlerB: InteractionHandler | null = null;

  private pathA: Coord[] = [];
  private pathB: Coord[] = [];
  private lastSummaryA: SearchSummary | null = null;
  private lastSummaryB: SearchSummary | null = null;
  private lastComparison: ComparativeStats | null = null;

  private options: ArenaManagerOptions;

  constructor(options: ArenaManagerOptions) {
    this.options = options;
    this.grid = options.grid;
    this.start = { ...options.start };
    this.target = { ...options.target };

    this.algoA = options.algoA ? { ...options.algoA } : {
      name: 'A* (Manhattan)',
      algorithm: 'astar',
      heuristic: 'manhattan',
    };
    this.algoB = options.algoB ? { ...options.algoB } : {
      name: "Dijkstra's Algorithm",
      algorithm: 'dijkstra',
    };

    // Instantiate or reuse renderers
    this.rendererA = options.rendererA ?? new CanvasRenderer({ cellSize: 24 });
    this.rendererB = options.rendererB ?? new CanvasRenderer({ cellSize: 24 });

    this.rendererA.setGrid(this.grid);
    this.rendererB.setGrid(this.grid);
    this.rendererA.setEndpoints(this.start, this.target);
    this.rendererB.setEndpoints(this.start, this.target);

    // Instantiate or reuse runners
    this.runnerA = options.runnerA ?? this.createRunnerForSide('A');
    this.runnerB = options.runnerB ?? this.createRunnerForSide('B');
  }

  // --- Runner Factory for Side A & B ---

  private createRunnerForSide(side: 'A' | 'B'): SimulationRunner {
    const isSideA = side === 'A';
    const renderer = isSideA ? this.rendererA : this.rendererB;
    const currentPath = isSideA ? this.pathA : this.pathB;

    return new SimulationRunner({
      stepsPerBatch: 10,
      onStep: (event: StepEvent) => {
        if (event.type === 'VISIT') {
          renderer.addVisited({ coord: event.coord, direction: event.direction });
        } else if (event.type === 'PATH_STEP') {
          currentPath.push(event.coord);
          renderer.setPath(currentPath);
        }
        renderer.requestRender();
      },
      onStateChange: () => {
        this.options.onStateChange?.(this.runnerA.state, this.runnerB.state);
      },
      onTelemetry: (data: TelemetryData) => {
        if (isSideA) {
          this.options.onTelemetryA?.(data);
        } else {
          this.options.onTelemetryB?.(data);
        }
      },
      onFinish: (summary: SearchSummary) => {
        if (summary.found) {
          renderer.setPath(summary.path);
        }
        renderer.render();

        if (isSideA) {
          this.lastSummaryA = summary;
        } else {
          this.lastSummaryB = summary;
        }

        this.checkRaceCompletion();
      },
      onReset: () => {
        renderer.clearVisited();
        currentPath.length = 0;
        renderer.render();
      },
    });
  }

  // --- Mode Toggling ---

  public toggleArenaMode(enable?: boolean): boolean {
    const targetState = enable !== undefined ? enable : !this.isArenaMode;
    this.isArenaMode = targetState;

    if (!this.isArenaMode) {
      this.pauseRace();
    } else {
      this.synchronizeRenderers();
    }
    return this.isArenaMode;
  }

  public setArenaMode(enable: boolean): void {
    this.toggleArenaMode(enable);
  }

  // --- Grid and Endpoint Synchronization ---

  public synchronizeRenderers(): void {
    this.rendererA.setGrid(this.grid);
    this.rendererB.setGrid(this.grid);
    this.rendererA.setEndpoints(this.start, this.target);
    this.rendererB.setEndpoints(this.start, this.target);
    this.rendererA.render();
    this.rendererB.render();
  }

  public setGrid(grid: Grid): void {
    this.grid = grid;
    this.rendererA.setGrid(this.grid);
    this.rendererB.setGrid(this.grid);
    if (this.handlerA) {
      this.handlerA.gridWidth = grid.width;
      this.handlerA.gridHeight = grid.height;
    }
    if (this.handlerB) {
      this.handlerB.gridWidth = grid.width;
      this.handlerB.gridHeight = grid.height;
    }
    this.synchronizeRenderers();
  }

  public setEndpoints(start: Coord, target: Coord): void {
    this.start = { ...start };
    this.target = { ...target };
    this.rendererA.setEndpoints(this.start, this.target);
    this.rendererB.setEndpoints(this.start, this.target);
    this.rendererA.render();
    this.rendererB.render();
  }

  public updateCell(coord: Coord, type: CellType, weight?: number): void {
    if (this.isRaceActive()) {
      this.pauseRace();
    }
    this.grid.setCellType(coord, type, weight);
    this.rendererA.render();
    this.rendererB.render();
  }

  public batchUpdateCells(coords: Coord[], type: CellType, weight?: number): void {
    if (this.isRaceActive()) {
      this.pauseRace();
    }
    for (const c of coords) {
      if (coordEquals(c, this.start) || coordEquals(c, this.target)) continue;
      this.grid.setCellType(c, type, weight);
    }
    this.rendererA.render();
    this.rendererB.render();
  }

  public clearWallsAndWeights(): void {
    this.resetRace();
    this.grid.reset(false);
    this.grid.setCellType(this.start, 'start');
    this.grid.setCellType(this.target, 'target');
    this.synchronizeRenderers();
  }

  // --- Interaction Attachment for Dual Panels ---

  public attachCanvases(canvasA: HTMLCanvasElement, canvasB: HTMLCanvasElement): void {
    this.rendererA.attach(canvasA);
    this.rendererB.attach(canvasB);

    const cellSize = this.rendererA.cellSize || 24;

    this.handlerA = new InteractionHandler({
      element: canvasA,
      camera: this.rendererA.camera,
      cellSize,
      gridWidth: this.grid.width,
      gridHeight: this.grid.height,
      brush: 'wall',
      getStart: () => this.start,
      getTarget: () => this.target,
      onCellPaint: (coords, brush, weightVal) => {
        const type: CellType = brush === 'wall' ? 'wall' : brush === 'weight' ? 'weight' : 'empty';
        this.batchUpdateCells(coords, type, weightVal);
      },
      onEndpointMove: (type: EndpointType, newCoord: Coord, oldCoord: Coord) => {
        this.handleEndpointMove(type, newCoord, oldCoord);
      },
      onCameraChange: () => this.rendererA.render(),
      onHoverChange: (c) => this.rendererA.setHoverCoord(c),
      onDragMarkerChange: (m) => this.rendererA.setDragMarker(m),
    });

    this.handlerB = new InteractionHandler({
      element: canvasB,
      camera: this.rendererB.camera,
      cellSize,
      gridWidth: this.grid.width,
      gridHeight: this.grid.height,
      brush: 'wall',
      getStart: () => this.start,
      getTarget: () => this.target,
      onCellPaint: (coords, brush, weightVal) => {
        const type: CellType = brush === 'wall' ? 'wall' : brush === 'weight' ? 'weight' : 'empty';
        this.batchUpdateCells(coords, type, weightVal);
      },
      onEndpointMove: (type: EndpointType, newCoord: Coord, oldCoord: Coord) => {
        this.handleEndpointMove(type, newCoord, oldCoord);
      },
      onCameraChange: () => this.rendererB.render(),
      onHoverChange: (c) => this.rendererB.setHoverCoord(c),
      onDragMarkerChange: (m) => this.rendererB.setDragMarker(m),
    });

    this.fitGrid();
  }

  private handleEndpointMove(type: EndpointType, newCoord: Coord, oldCoord: Coord): void {
    if (this.isRaceActive()) {
      this.pauseRace();
    }
    this.grid.setCellType(oldCoord, 'empty');
    this.grid.setCellType(newCoord, type);
    if (type === 'start') {
      this.start = { ...newCoord };
    } else if (type === 'target') {
      this.target = { ...newCoord };
    }
    this.rendererA.setEndpoints(this.start, this.target);
    this.rendererB.setEndpoints(this.start, this.target);
    this.rendererA.render();
    this.rendererB.render();
    this.options.onEndpointChange?.(type, newCoord);
  }

  public setBrush(brush: BrushMode, weightValue = 5): void {
    if (this.handlerA) {
      this.handlerA.brush = brush;
      this.handlerA.weightValue = weightValue;
    }
    if (this.handlerB) {
      this.handlerB.brush = brush;
      this.handlerB.weightValue = weightValue;
    }
  }

  public fitGrid(padding = 24): void {
    this.rendererA.resize();
    this.rendererA.fitGrid(padding);
    this.rendererA.render();

    this.rendererB.resize();
    this.rendererB.fitGrid(padding);
    this.rendererB.render();
  }

  // --- Presets and Algorithm Configuration ---

  public getPresets(): readonly MatchupPreset[] {
    return ARENA_PRESETS;
  }

  public loadPreset(presetId: string): boolean {
    const preset = ARENA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return false;

    this.algoA = { ...preset.algoA };
    this.algoB = { ...preset.algoB };
    this.activePresetId = presetId;
    this.resetRace();
    return true;
  }

  public setAlgorithmA(algo: ArenaAlgorithmConfig | AlgorithmType, heuristic?: HeuristicType): void {
    if (typeof algo === 'string') {
      this.algoA = {
        name: this.formatAlgorithmName(algo, heuristic),
        algorithm: algo,
        heuristic: heuristic ?? 'manhattan',
      };
    } else {
      this.algoA = { ...algo };
    }
    this.activePresetId = null;
    this.resetRace();
  }

  public setAlgorithmB(algo: ArenaAlgorithmConfig | AlgorithmType, heuristic?: HeuristicType): void {
    if (typeof algo === 'string') {
      this.algoB = {
        name: this.formatAlgorithmName(algo, heuristic),
        algorithm: algo,
        heuristic: heuristic ?? 'manhattan',
      };
    } else {
      this.algoB = { ...algo };
    }
    this.activePresetId = null;
    this.resetRace();
  }

  private formatAlgorithmName(algo: AlgorithmType, heuristic?: HeuristicType): string {
    switch (algo) {
      case 'astar':
        return `A* (${heuristic ?? 'Manhattan'})`;
      case 'dijkstra':
        return "Dijkstra's";
      case 'jps':
        return 'Jump Point Search (JPS)';
      case 'bidirectional':
        return 'Bidirectional Search';
      case 'bfs':
        return 'BFS';
      case 'dfs':
        return 'DFS';
      default:
        return algo;
    }
  }

  // --- Race Control: Start, Pause, Resume, Reset ---

  public isRaceActive(): boolean {
    return this.runnerA.isRunning || this.runnerB.isRunning;
  }

  public isRaceFinished(): boolean {
    return this.runnerA.isFinished && this.runnerB.isFinished;
  }

  public setSpeed(speed: number): void {
    this.runnerA.setSpeed(speed);
    this.runnerB.setSpeed(speed);
  }

  public startRace(customGenA?: AlgorithmGenerator, customGenB?: AlgorithmGenerator): void {
    this.resetRace();

    const genA = customGenA ?? createAlgorithmForConfig(this.algoA, this.grid, this.start, this.target);
    const genB = customGenB ?? createAlgorithmForConfig(this.algoB, this.grid, this.start, this.target);

    this.options.onRaceStart?.();

    this.runnerA.load(genA);
    this.runnerB.load(genB);

    this.runnerA.play();
    this.runnerB.play();
  }

  public pauseRace(): void {
    this.runnerA.pause();
    this.runnerB.pause();
  }

  public resumeRace(): void {
    this.runnerA.resume();
    this.runnerB.resume();
  }

  public resetRace(): void {
    this.runnerA.reset();
    this.runnerB.reset();
    this.pathA.length = 0;
    this.pathB.length = 0;
    this.lastSummaryA = null;
    this.lastSummaryB = null;
    this.lastComparison = null;
    this.rendererA.clearVisited();
    this.rendererB.clearVisited();
    this.rendererA.render();
    this.rendererB.render();
    this.options.onRaceReset?.();
  }

  // --- Completion Check & Comparative Analytics ---

  private checkRaceCompletion(): void {
    if (this.lastSummaryA && this.lastSummaryB) {
      const stats = this.compareResults(this.lastSummaryA, this.lastSummaryB);
      this.lastComparison = stats;
      this.options.onRaceFinish?.(stats);
      this.options.onComparisonUpdate?.(stats);
    }
  }

  public countWalkableCells(): number {
    let count = 0;
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        if (this.grid.isWalkable({ x, y })) {
          count++;
        }
      }
    }
    return Math.max(1, count);
  }

  /**
   * Computes comparative benchmarking statistics between side A and side B.
   */
  public compareResults(summaryA: SearchSummary, summaryB: SearchSummary): ComparativeStats {
    const totalWalkable = this.countWalkableCells();
    const percentExploredA = Number(((summaryA.nodesExplored / totalWalkable) * 100).toFixed(1));
    const percentExploredB = Number(((summaryB.nodesExplored / totalWalkable) * 100).toFixed(1));

    const nodesExploredDelta = summaryA.nodesExplored - summaryB.nodesExplored;
    const timeDeltaMs = Number((summaryA.durationMs - summaryB.durationMs).toFixed(1));

    const costA = summaryA.cost;
    const costB = summaryB.cost;
    const costDelta =
      costA === Infinity || costB === Infinity
        ? Infinity
        : Number((costA - costB).toFixed(2));

    const bothFound = summaryA.found && summaryB.found;
    const isCostEqual = bothFound
      ? Math.abs(costA - costB) < 1e-4
      : summaryA.found === summaryB.found;

    // Efficiency winner (who explored fewer nodes)
    let efficiencyWinner: 'A' | 'B' | 'TIE' = 'TIE';
    if (summaryA.nodesExplored < summaryB.nodesExplored) {
      efficiencyWinner = 'A';
    } else if (summaryB.nodesExplored < summaryA.nodesExplored) {
      efficiencyWinner = 'B';
    }

    // Speed winner (who ran in less time)
    let speedWinner: 'A' | 'B' | 'TIE' = 'TIE';
    if (summaryA.durationMs < summaryB.durationMs) {
      speedWinner = 'A';
    } else if (summaryB.durationMs < summaryA.durationMs) {
      speedWinner = 'B';
    }

    // Overall winner determination
    let winner: 'A' | 'B' | 'TIE' = 'TIE';
    if (summaryA.found && !summaryB.found) {
      winner = 'A';
    } else if (!summaryA.found && summaryB.found) {
      winner = 'B';
    } else if (!summaryA.found && !summaryB.found) {
      winner = 'TIE';
    } else if (bothFound) {
      if (!isCostEqual) {
        winner = costA < costB ? 'A' : 'B';
      } else {
        winner = efficiencyWinner !== 'TIE' ? efficiencyWinner : speedWinner;
      }
    }

    // Construct comparative headline narrative
    const message = this.buildComparisonMessage({
      summaryA,
      summaryB,
      efficiencyWinner,
      isCostEqual,
      bothFound,
      costA,
      costB,
      winner,
    });

    return {
      summaryA,
      summaryB,
      totalWalkable,
      percentExploredA,
      percentExploredB,
      nodesExploredDelta,
      timeDeltaMs,
      costA,
      costB,
      costDelta,
      isCostEqual,
      bothFound,
      efficiencyWinner,
      speedWinner,
      winner,
      message,
    };
  }

  private buildComparisonMessage(params: {
    summaryA: SearchSummary;
    summaryB: SearchSummary;
    efficiencyWinner: 'A' | 'B' | 'TIE';
    isCostEqual: boolean;
    bothFound: boolean;
    costA: number;
    costB: number;
    winner: 'A' | 'B' | 'TIE';
  }): string {
    const { summaryA, summaryB, efficiencyWinner, isCostEqual, bothFound, costA, costB } = params;

    if (!summaryA.found && !summaryB.found) {
      return 'Neither algorithm found a valid path to the target.';
    }
    if (summaryA.found && !summaryB.found) {
      return `${this.algoA.name} found the target! ${this.algoB.name} failed to find a path.`;
    }
    if (!summaryA.found && summaryB.found) {
      return `${this.algoB.name} found the target! ${this.algoA.name} failed to find a path.`;
    }

    // Both found a path
    let effPart = '';
    if (efficiencyWinner === 'A') {
      const fewerPercent =
        summaryB.nodesExplored > 0
          ? (((summaryB.nodesExplored - summaryA.nodesExplored) / summaryB.nodesExplored) * 100).toFixed(0)
          : '0';
      effPart = `${this.algoA.name} explored ${fewerPercent}% fewer nodes than ${this.algoB.name}! (${summaryA.nodesExplored} vs ${summaryB.nodesExplored})`;
    } else if (efficiencyWinner === 'B') {
      const fewerPercent =
        summaryA.nodesExplored > 0
          ? (((summaryA.nodesExplored - summaryB.nodesExplored) / summaryA.nodesExplored) * 100).toFixed(0)
          : '0';
      effPart = `${this.algoB.name} explored ${fewerPercent}% fewer nodes than ${this.algoA.name}! (${summaryB.nodesExplored} vs ${summaryA.nodesExplored})`;
    } else {
      effPart = `Both algorithms explored identical nodes (${summaryA.nodesExplored}).`;
    }

    let costPart = '';
    if (isCostEqual) {
      costPart = ` Both found optimal paths with identical cost (${costA}).`;
    } else {
      const lowerSide = costA < costB ? this.algoA.name : this.algoB.name;
      const lowerCost = Math.min(costA, costB);
      const higherCost = Math.max(costA, costB);
      costPart = ` ${lowerSide} found a shorter path (${lowerCost} vs ${higherCost}).`;
    }

    return `${effPart}${costPart}`;
  }

  public getLastComparison(): ComparativeStats | null {
    return this.lastComparison;
  }
}
