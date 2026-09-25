import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArenaManager, ARENA_PRESETS, ComparativeStats } from '../../src/ui/ArenaManager';
import { Grid } from '../../src/core/grid/Grid';
import { Coord } from '../../src/core/grid/Coordinates';
import { CanvasRenderer } from '../../src/renderer/CanvasRenderer';
import { SimulationRunner } from '../../src/engine/SimulationRunner';
import { AlgorithmGenerator, SearchSummary, StepEvent } from '../../src/core/algorithms/types';

function* createMockGenerator(steps: StepEvent[], summary: SearchSummary): AlgorithmGenerator {
  for (const step of steps) {
    yield step;
  }
  return summary;
}

describe('ArenaManager', () => {
  let grid: Grid;
  let start: Coord;
  let target: Coord;
  let mockRendererA: CanvasRenderer;
  let mockRendererB: CanvasRenderer;
  let arenaManager: ArenaManager;

  beforeEach(() => {
    grid = new Grid(20, 20);
    start = { x: 2, y: 10 };
    target = { x: 18, y: 10 };

    grid.setCellType(start, 'start');
    grid.setCellType(target, 'target');

    mockRendererA = new CanvasRenderer({ cellSize: 20 });
    mockRendererB = new CanvasRenderer({ cellSize: 20 });

    vi.spyOn(mockRendererA, 'render').mockImplementation(() => {});
    vi.spyOn(mockRendererB, 'render').mockImplementation(() => {});
    vi.spyOn(mockRendererA, 'setGrid');
    vi.spyOn(mockRendererB, 'setGrid');
    vi.spyOn(mockRendererA, 'setEndpoints');
    vi.spyOn(mockRendererB, 'setEndpoints');
    vi.spyOn(mockRendererA, 'clearVisited');
    vi.spyOn(mockRendererB, 'clearVisited');

    arenaManager = new ArenaManager({
      grid,
      start,
      target,
      rendererA: mockRendererA,
      rendererB: mockRendererB,
    });
  });

  afterEach(() => {
    arenaManager.resetRace();
    vi.restoreAllMocks();
  });

  describe('Initialization & State', () => {
    it('initializes in Single Mode (isArenaMode = false)', () => {
      expect(arenaManager.isArenaMode).toBe(false);
    });

    it('toggles Arena Mode state on and off', () => {
      expect(arenaManager.toggleArenaMode()).toBe(true);
      expect(arenaManager.isArenaMode).toBe(true);

      expect(arenaManager.toggleArenaMode()).toBe(false);
      expect(arenaManager.isArenaMode).toBe(false);

      arenaManager.setArenaMode(true);
      expect(arenaManager.isArenaMode).toBe(true);
    });

    it('initializes with shared grid and synchronized endpoints', () => {
      expect(arenaManager.grid).toBe(grid);
      expect(arenaManager.start).toEqual({ x: 2, y: 10 });
      expect(arenaManager.target).toEqual({ x: 18, y: 10 });
      expect(mockRendererA.setGrid).toHaveBeenCalledWith(grid);
      expect(mockRendererB.setGrid).toHaveBeenCalledWith(grid);
      expect(mockRendererA.setEndpoints).toHaveBeenCalledWith(start, target);
      expect(mockRendererB.setEndpoints).toHaveBeenCalledWith(start, target);
    });

    it('initializes default algorithms for Side A and Side B', () => {
      expect(arenaManager.algoA.algorithm).toBe('astar');
      expect(arenaManager.algoB.algorithm).toBe('dijkstra');
    });
  });

  describe('Matchup Presets Configuration', () => {
    it('contains all 3 classic presets', () => {
      const presets = arenaManager.getPresets();
      expect(presets).toHaveLength(3);

      const ids = presets.map((p) => p.id);
      expect(ids).toContain('astar-vs-dijkstra');
      expect(ids).toContain('jps-vs-astar');
      expect(ids).toContain('bfs-vs-bidirectional');
    });

    it('loads A* vs Dijkstra preset correctly', () => {
      const success = arenaManager.loadPreset('astar-vs-dijkstra');
      expect(success).toBe(true);
      expect(arenaManager.algoA.algorithm).toBe('astar');
      expect(arenaManager.algoA.heuristic).toBe('manhattan');
      expect(arenaManager.algoB.algorithm).toBe('dijkstra');
      expect(arenaManager.activePresetId).toBe('astar-vs-dijkstra');
    });

    it('loads Jump Point Search vs A* preset correctly', () => {
      const success = arenaManager.loadPreset('jps-vs-astar');
      expect(success).toBe(true);
      expect(arenaManager.algoA.algorithm).toBe('jps');
      expect(arenaManager.algoB.algorithm).toBe('astar');
      expect(arenaManager.activePresetId).toBe('jps-vs-astar');
    });

    it('loads BFS vs Bidirectional preset correctly', () => {
      const success = arenaManager.loadPreset('bfs-vs-bidirectional');
      expect(success).toBe(true);
      expect(arenaManager.algoA.algorithm).toBe('bfs');
      expect(arenaManager.algoB.algorithm).toBe('bidirectional');
      expect(arenaManager.activePresetId).toBe('bfs-vs-bidirectional');
    });

    it('returns false for unknown preset ID', () => {
      expect(arenaManager.loadPreset('non-existent')).toBe(false);
    });

    it('allows configuring custom algorithms for Panel A and Panel B', () => {
      arenaManager.setAlgorithmA('bfs');
      expect(arenaManager.algoA.algorithm).toBe('bfs');
      expect(arenaManager.algoA.name).toBe('BFS');
      expect(arenaManager.activePresetId).toBeNull();

      arenaManager.setAlgorithmB('astar', 'euclidean');
      expect(arenaManager.algoB.algorithm).toBe('astar');
      expect(arenaManager.algoB.heuristic).toBe('euclidean');
    });
  });

  describe('Grid Synchronization', () => {
    it('synchronizes single cell paint to shared grid and both renderers', () => {
      arenaManager.updateCell({ x: 5, y: 5 }, 'wall');
      expect(grid.getCell({ x: 5, y: 5 })?.type).toBe('wall');
      expect(mockRendererA.render).toHaveBeenCalled();
      expect(mockRendererB.render).toHaveBeenCalled();
    });

    it('synchronizes batch cell updates to shared grid and both renderers', () => {
      const coords = [{ x: 5, y: 6 }, { x: 5, y: 7 }, { x: 5, y: 8 }];
      arenaManager.batchUpdateCells(coords, 'weight', 5);

      expect(grid.getCell({ x: 5, y: 6 })?.type).toBe('weight');
      expect(grid.getCell({ x: 5, y: 6 })?.weight).toBe(5);
      expect(grid.getCell({ x: 5, y: 7 })?.type).toBe('weight');
      expect(grid.getCell({ x: 5, y: 8 })?.type).toBe('weight');
    });

    it('does not overwrite start or target during batch cell paint', () => {
      arenaManager.batchUpdateCells([start, target, { x: 6, y: 6 }], 'wall');
      expect(grid.getCell(start)?.type).toBe('start');
      expect(grid.getCell(target)?.type).toBe('target');
      expect(grid.getCell({ x: 6, y: 6 })?.type).toBe('wall');
    });

    it('synchronizes endpoint movement across both renderers', () => {
      const newStart = { x: 3, y: 3 };
      const newTarget = { x: 15, y: 15 };
      arenaManager.setEndpoints(newStart, newTarget);

      expect(arenaManager.start).toEqual(newStart);
      expect(arenaManager.target).toEqual(newTarget);
      expect(mockRendererA.setEndpoints).toHaveBeenCalledWith(newStart, newTarget);
      expect(mockRendererB.setEndpoints).toHaveBeenCalledWith(newStart, newTarget);
    });

    it('clears walls and weights while preserving endpoints on both panels', () => {
      arenaManager.updateCell({ x: 5, y: 5 }, 'wall');
      arenaManager.clearWallsAndWeights();

      expect(grid.getCell({ x: 5, y: 5 })?.type).toBe('empty');
      expect(grid.getCell(start)?.type).toBe('start');
      expect(grid.getCell(target)?.type).toBe('target');
      expect(mockRendererA.clearVisited).toHaveBeenCalled();
      expect(mockRendererB.clearVisited).toHaveBeenCalled();
    });
  });

  describe('Comparative Benchmark Calculation (compareResults)', () => {
    it('computes grid exploration percentages correctly', () => {
      // 20x20 grid = 400 cells, all walkable
      const summaryA: SearchSummary = {
        found: true,
        path: [{ x: 2, y: 10 }, { x: 18, y: 10 }],
        cost: 16,
        nodesExplored: 100,
        durationMs: 10,
      };

      const summaryB: SearchSummary = {
        found: true,
        path: [{ x: 2, y: 10 }, { x: 18, y: 10 }],
        cost: 16,
        nodesExplored: 300,
        durationMs: 25,
      };

      const stats = arenaManager.compareResults(summaryA, summaryB);

      expect(stats.totalWalkable).toBe(400);
      expect(stats.percentExploredA).toBe(25.0); // 100 / 400 * 100
      expect(stats.percentExploredB).toBe(75.0); // 300 / 400 * 100
      expect(stats.nodesExploredDelta).toBe(-200);
    });

    it('computes time delta and speed winner', () => {
      const summaryA: SearchSummary = {
        found: true,
        path: [],
        cost: 16,
        nodesExplored: 50,
        durationMs: 5.5,
      };

      const summaryB: SearchSummary = {
        found: true,
        path: [],
        cost: 16,
        nodesExplored: 200,
        durationMs: 18.2,
      };

      const stats = arenaManager.compareResults(summaryA, summaryB);

      expect(stats.timeDeltaMs).toBe(-12.7);
      expect(stats.speedWinner).toBe('A');
    });

    it('verifies path cost equivalence and optimal path assertion', () => {
      const summaryA: SearchSummary = {
        found: true,
        path: [],
        cost: 24,
        nodesExplored: 60,
        durationMs: 8,
      };

      const summaryB: SearchSummary = {
        found: true,
        path: [],
        cost: 24,
        nodesExplored: 250,
        durationMs: 22,
      };

      const stats = arenaManager.compareResults(summaryA, summaryB);

      expect(stats.isCostEqual).toBe(true);
      expect(stats.costDelta).toBe(0);
      expect(stats.efficiencyWinner).toBe('A');
      expect(stats.winner).toBe('A');
      expect(stats.message).toContain('fewer nodes');
      expect(stats.message).toContain('identical cost (24)');
    });

    it('awards winner to lower path cost when costs differ', () => {
      const summaryA: SearchSummary = {
        found: true,
        path: [],
        cost: 30, // Suboptimal path
        nodesExplored: 40,
        durationMs: 4,
      };

      const summaryB: SearchSummary = {
        found: true,
        path: [],
        cost: 20, // Optimal shorter path
        nodesExplored: 150,
        durationMs: 15,
      };

      const stats = arenaManager.compareResults(summaryA, summaryB);

      expect(stats.isCostEqual).toBe(false);
      expect(stats.costDelta).toBe(10);
      expect(stats.efficiencyWinner).toBe('A');
      expect(stats.winner).toBe('B'); // B wins because it found a lower cost path!
      expect(stats.message).toContain('found a shorter path');
    });

    it('handles one algorithm failing to find path', () => {
      const summaryA: SearchSummary = {
        found: true,
        path: [{ x: 0, y: 0 }],
        cost: 10,
        nodesExplored: 30,
        durationMs: 3,
      };

      const summaryB: SearchSummary = {
        found: false,
        path: [],
        cost: Infinity,
        nodesExplored: 390,
        durationMs: 20,
      };

      const stats = arenaManager.compareResults(summaryA, summaryB);

      expect(stats.bothFound).toBe(false);
      expect(stats.winner).toBe('A');
      expect(stats.message).toContain('found the target');
    });

    it('handles both algorithms failing to find path', () => {
      const summaryA: SearchSummary = {
        found: false,
        path: [],
        cost: Infinity,
        nodesExplored: 100,
        durationMs: 10,
      };

      const summaryB: SearchSummary = {
        found: false,
        path: [],
        cost: Infinity,
        nodesExplored: 100,
        durationMs: 10,
      };

      const stats = arenaManager.compareResults(summaryA, summaryB);

      expect(stats.bothFound).toBe(false);
      expect(stats.winner).toBe('TIE');
      expect(stats.message).toContain('Neither algorithm found a valid path');
    });
  });

  describe('Dual Simulation Execution & Race Orchestration', () => {
    it('starts both runnerA and runnerB concurrently', () => {
      const stepsA: StepEvent[] = [
        { type: 'VISIT', coord: { x: 3, y: 10 } },
        { type: 'PATH_STEP', coord: { x: 3, y: 10 } },
      ];
      const summaryA: SearchSummary = {
        found: true,
        path: [{ x: 3, y: 10 }],
        cost: 1,
        nodesExplored: 1,
        durationMs: 2,
      };

      const stepsB: StepEvent[] = [
        { type: 'VISIT', coord: { x: 2, y: 11 } },
        { type: 'PATH_STEP', coord: { x: 2, y: 11 } },
      ];
      const summaryB: SearchSummary = {
        found: true,
        path: [{ x: 2, y: 11 }],
        cost: 1,
        nodesExplored: 1,
        durationMs: 3,
      };

      arenaManager.startRace(
        createMockGenerator(stepsA, summaryA),
        createMockGenerator(stepsB, summaryB)
      );

      expect(arenaManager.runnerA.isRunning).toBe(true);
      expect(arenaManager.runnerB.isRunning).toBe(true);
    });

    it('pauses and resumes both runners', () => {
      const steps: StepEvent[] = [{ type: 'VISIT', coord: { x: 1, y: 1 } }];
      const summary: SearchSummary = {
        found: true,
        path: [],
        cost: 1,
        nodesExplored: 1,
        durationMs: 1,
      };

      arenaManager.startRace(
        createMockGenerator(steps, summary),
        createMockGenerator(steps, summary)
      );

      arenaManager.pauseRace();
      expect(arenaManager.runnerA.isPaused).toBe(true);
      expect(arenaManager.runnerB.isPaused).toBe(true);

      arenaManager.resumeRace();
      expect(arenaManager.runnerA.isRunning).toBe(true);
      expect(arenaManager.runnerB.isRunning).toBe(true);
    });

    it('resets both runners and clears both renderers', () => {
      arenaManager.resetRace();
      expect(arenaManager.runnerA.isIdle).toBe(true);
      expect(arenaManager.runnerB.isIdle).toBe(true);
      expect(mockRendererA.clearVisited).toHaveBeenCalled();
      expect(mockRendererB.clearVisited).toHaveBeenCalled();
    });

    it('updates speed on both runners', () => {
      arenaManager.setSpeed(25);
      expect(arenaManager.runnerA.stepsPerBatch).toBe(25);
      expect(arenaManager.runnerB.stepsPerBatch).toBe(25);
    });

    it('executes a complete race and emits comparative stats on race finish', () => {
      let completedStats: ComparativeStats | null = null;

      const testArena = new ArenaManager({
        grid,
        start,
        target,
        rendererA: mockRendererA,
        rendererB: mockRendererB,
        onRaceFinish: (stats) => {
          completedStats = stats;
        },
      });

      const summaryA: SearchSummary = {
        found: true,
        path: [{ x: 2, y: 10 }, { x: 18, y: 10 }],
        cost: 16,
        nodesExplored: 50,
        durationMs: 5,
      };

      const summaryB: SearchSummary = {
        found: true,
        path: [{ x: 2, y: 10 }, { x: 18, y: 10 }],
        cost: 16,
        nodesExplored: 200,
        durationMs: 15,
      };

      testArena.startRace(
        createMockGenerator([], summaryA),
        createMockGenerator([], summaryB)
      );

      // Advance both runners to completion
      testArena.runnerA.stepForward();
      testArena.runnerB.stepForward();

      expect(completedStats).not.toBeNull();
      expect(completedStats!.efficiencyWinner).toBe('A');
      expect(completedStats!.isCostEqual).toBe(true);
      expect(testArena.getLastComparison()).toBe(completedStats);
    });
  });

  describe('Real Algorithm Head-to-Head Execution', () => {
    it('runs A* vs Dijkstra on the same grid and proves A* explores fewer or equal nodes', () => {
      let finalStats: ComparativeStats | null = null;

      const raceArena = new ArenaManager({
        grid,
        start: { x: 2, y: 10 },
        target: { x: 18, y: 10 },
        rendererA: mockRendererA,
        rendererB: mockRendererB,
        algoA: { name: 'A*', algorithm: 'astar', heuristic: 'manhattan' },
        algoB: { name: 'Dijkstra', algorithm: 'dijkstra' },
        onRaceFinish: (stats) => {
          finalStats = stats;
        },
      });

      raceArena.startRace();

      // Step until both finish
      let safetyCounter = 0;
      while ((raceArena.runnerA.isRunning || raceArena.runnerB.isRunning) && safetyCounter++ < 5000) {
        if (raceArena.runnerA.isRunning) raceArena.runnerA.stepForward();
        if (raceArena.runnerB.isRunning) raceArena.runnerB.stepForward();
      }

      expect(finalStats).not.toBeNull();
      expect(finalStats!.bothFound).toBe(true);
      expect(finalStats!.isCostEqual).toBe(true); // Both find the exact optimal shortest path cost!
      expect(finalStats!.summaryA.nodesExplored).toBeLessThan(finalStats!.summaryB.nodesExplored); // A* explores fewer nodes than Dijkstra!
      expect(finalStats!.efficiencyWinner).toBe('A');
    });
  });
});
