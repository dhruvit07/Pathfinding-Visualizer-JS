import { Grid } from './core/grid/Grid';
import { Coord, coordEquals } from './core/grid/Coordinates';
import {
  dijkstra,
  astar,
  bfs,
  dfs,
  bidirectional,
  jps,
  AlgorithmGenerator,
} from './core/algorithms';
import {
  manhattanDistance,
  euclideanDistance,
  chebyshevDistance,
  octileDistance,
} from './core/heuristics';
import { recursiveDivision, kruskal, prim, perlinTerrain, MazeGenerator } from './core/mazes';
import { CanvasRenderer, InteractionHandler, BrushMode, getTheme } from './renderer';
import { SimulationRunner, SimulationState, HistoryBuffer, TelemetryData } from './engine';

export const APP_INFO = {
  name: 'Pathfinding Visualizer',
  version: '2.0.0',
  status: 'initialized',
} as const;

export function bootstrapApp() {
  if (typeof document === 'undefined') return;

  // --- State & Initialization ---
  const canvas = document.getElementById('gridCanvas') as HTMLCanvasElement;
  const viewport = document.getElementById('canvasViewport') as HTMLElement;
  if (!canvas || !viewport) return;

  const CELL_SIZE = 26;
  const gridCols = Math.max(25, Math.floor((viewport.clientWidth || window.innerWidth) / CELL_SIZE) || 45);
  const gridRows = Math.max(15, Math.floor((viewport.clientHeight || window.innerHeight - 120) / CELL_SIZE) || 25);

  const grid = new Grid(gridCols, gridRows);
  let startCoord: Coord = { x: Math.floor(gridCols * 0.15), y: Math.floor(gridRows / 2) };
  let targetCoord: Coord = { x: Math.floor(gridCols * 0.85), y: Math.floor(gridRows / 2) };

  grid.setCellType(startCoord, 'start');
  grid.setCellType(targetCoord, 'target');

  // Initialize CanvasRenderer
  const renderer = new CanvasRenderer({ cellSize: CELL_SIZE });
  renderer.attach(canvas);
  renderer.setGrid(grid);
  renderer.setEndpoints(startCoord, targetCoord);

  // --- UI Elements ---
  const algorithmSelect = document.getElementById('algorithmSelect') as HTMLSelectElement;
  const heuristicSelect = document.getElementById('heuristicSelect') as HTMLSelectElement;
  const heuristicGroup = document.getElementById('heuristicGroup') as HTMLElement;
  const mazeSelect = document.getElementById('mazeSelect') as HTMLSelectElement;
  const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;

  const btnBrushWall = document.getElementById('btnBrushWall') as HTMLButtonElement;
  const btnBrushWeight = document.getElementById('btnBrushWeight') as HTMLButtonElement;
  const btnBrushErase = document.getElementById('btnBrushErase') as HTMLButtonElement;

  const speedRange = document.getElementById('speedRange') as HTMLInputElement;
  const speedValueLabel = document.getElementById('speedValue') as HTMLElement;

  const btnVisualize = document.getElementById('btnVisualize') as HTMLButtonElement;
  const btnPause = document.getElementById('btnPause') as HTMLButtonElement;
  const btnStep = document.getElementById('btnStep') as HTMLButtonElement;
  const btnStepBack = document.getElementById('btnStepBack') as HTMLButtonElement;
  const timelineScrubber = document.getElementById('timelineScrubber') as HTMLInputElement;
  const scrubberStep = document.getElementById('scrubberStep') as HTMLElement;

  const btnClearPath = document.getElementById('btnClearPath') as HTMLButtonElement;
  const btnClearAll = document.getElementById('btnClearAll') as HTMLButtonElement;

  const hudStatus = document.getElementById('hudStatus') as HTMLElement;
  const statusText = document.getElementById('statusText') as HTMLElement;
  const hudExplored = document.getElementById('hudExplored') as HTMLElement;
  const hudCost = document.getElementById('hudCost') as HTMLElement;
  const hudTime = document.getElementById('hudTime') as HTMLElement;

  // --- Speed Settings Helper ---
  function getStepsPerBatch(): number {
    const val = parseInt(speedRange?.value ?? '3', 10);
    switch (val) {
      case 1:
        if (speedValueLabel) speedValueLabel.textContent = 'Slow';
        return 1;
      case 2:
        if (speedValueLabel) speedValueLabel.textContent = 'Normal';
        return 3;
      case 3:
        if (speedValueLabel) speedValueLabel.textContent = 'Fast';
        return 10;
      case 4:
        if (speedValueLabel) speedValueLabel.textContent = 'Instant';
        return 500;
      default:
        return 5;
    }
  }

  // --- HUD Updates ---
  function setStatus(status: 'READY' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'NO PATH') {
    if (!statusText || !hudStatus) return;
    statusText.textContent = status;
    hudStatus.className = 'hud-item status-badge';
    if (status === 'RUNNING') hudStatus.classList.add('running');
    else if (status === 'PAUSED') hudStatus.classList.add('paused');
    else if (status === 'NO PATH') hudStatus.classList.add('failed');
  }

  function updateHUD(explored: number, cost: number, timeMs: number) {
    if (hudExplored) hudExplored.textContent = explored.toString();
    if (hudCost) hudCost.textContent = cost === Infinity ? '∞' : cost.toString();
    if (hudTime) hudTime.textContent = `${timeMs.toFixed(1)} ms`;
  }

  function getHeuristic() {
    switch (heuristicSelect?.value) {
      case 'euclidean':
        return euclideanDistance;
      case 'chebyshev':
        return chebyshevDistance;
      case 'octile':
        return octileDistance;
      default:
        return manhattanDistance;
    }
  }

  // --- Path & Renderer Reconstruction from History ---
  const currentPath: Coord[] = [];

  function rebuildRendererFromBuffer(index: number, buffer: HistoryBuffer): void {
    renderer.clearVisited();
    currentPath.length = 0;
    if (index < 0) {
      renderer.setPath([]);
      renderer.render();
      return;
    }

    const events = buffer.getEventsUpTo(index);
    for (const ev of events) {
      if (ev.type === 'VISIT') {
        renderer.addVisited({ coord: ev.coord, direction: ev.direction });
      } else if (ev.type === 'PATH_STEP') {
        currentPath.push(ev.coord);
      }
    }
    renderer.setPath(currentPath);
    renderer.render();
  }

  function updateScrubber(index: number, total: number): void {
    if (!timelineScrubber || !scrubberStep) return;
    timelineScrubber.max = total.toString();
    const displayVal = Math.max(0, index + 1);
    timelineScrubber.value = displayVal.toString();
    timelineScrubber.disabled = total === 0;
    scrubberStep.textContent = `${displayVal} / ${total}`;

    if (btnStepBack) {
      btnStepBack.disabled = runner.buffer.isAtStart || runner.isRunning;
    }
    if (btnStep) {
      btnStep.disabled = runner.isRunning || (runner.isFinished && runner.buffer.isAtEnd);
    }
  }

  // --- Simulation Runner Engine ---
  const runner = new SimulationRunner({
    stepsPerBatch: getStepsPerBatch(),
    onStep: (event, index, buffer) => {
      if (event.type === 'VISIT') {
        renderer.addVisited({ coord: event.coord, direction: event.direction });
      } else if (event.type === 'PATH_STEP') {
        currentPath.push(event.coord);
        renderer.setPath(currentPath);
      }
      renderer.requestRender();
      updateScrubber(index, buffer.totalSteps);
    },
    onRewindStep: (_event, index, buffer) => {
      rebuildRendererFromBuffer(index, buffer);
      updateScrubber(index, buffer.totalSteps);
    },
    onSeek: (targetIndex, buffer) => {
      rebuildRendererFromBuffer(targetIndex, buffer);
      updateScrubber(targetIndex, buffer.totalSteps);
    },
    onStateChange: (state: SimulationState) => {
      switch (state) {
        case 'RUNNING':
          setStatus('RUNNING');
          btnVisualize.innerHTML = '<span class="btn-icon">⏸</span><span>Pause</span>';
          btnPause.disabled = false;
          btnPause.innerHTML = '<span class="btn-icon">⏸</span>';
          btnStep.disabled = true;
          btnStepBack.disabled = true;
          timelineScrubber.disabled = false;
          break;
        case 'PAUSED':
          setStatus('PAUSED');
          btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Resume</span>';
          btnPause.disabled = false;
          btnPause.innerHTML = '<span class="btn-icon">▶</span>';
          btnStep.disabled = runner.isFinished && runner.buffer.isAtEnd;
          btnStepBack.disabled = runner.buffer.isAtStart;
          timelineScrubber.disabled = runner.totalSteps === 0;
          break;
        case 'FINISHED':
          setStatus('FINISHED');
          btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Visualize</span>';
          btnPause.disabled = true;
          btnStep.disabled = true;
          btnStepBack.disabled = runner.buffer.isAtStart;
          timelineScrubber.disabled = false;
          break;
        case 'NO_PATH':
          setStatus('NO PATH');
          btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Visualize</span>';
          btnPause.disabled = true;
          btnStep.disabled = true;
          btnStepBack.disabled = runner.buffer.isAtStart;
          timelineScrubber.disabled = false;
          break;
        case 'IDLE':
          setStatus('READY');
          btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Visualize</span>';
          btnPause.disabled = true;
          btnStep.disabled = false;
          btnStepBack.disabled = true;
          timelineScrubber.disabled = true;
          break;
      }
    },
    onTelemetry: (data: TelemetryData) => {
      updateHUD(data.nodesExplored, data.pathCost, data.durationMs);
    },
    onFinish: (summary) => {
      if (summary.found) {
        renderer.setPath(summary.path);
      }
      renderer.render();
      updateScrubber(runner.currentStep, runner.totalSteps);
    },
    onReset: () => {
      renderer.clearVisited();
      currentPath.length = 0;
      renderer.render();
      updateScrubber(-1, 0);
      updateHUD(0, 0, 0);
      setStatus('READY');
    },
  });

  // --- InteractionHandler ---
  const interactionHandler = new InteractionHandler({
    camera: renderer.camera,
    cellSize: CELL_SIZE,
    gridWidth: grid.width,
    gridHeight: grid.height,
    brush: 'wall',
    weightValue: 5,
    getStart: () => startCoord,
    getTarget: () => targetCoord,
    onCellPaint: (coords, brush, weightVal) => {
      if (runner.isRunning) {
        runner.pause();
      }
      runner.reset();
      for (const c of coords) {
        if (coordEquals(c, startCoord) || coordEquals(c, targetCoord)) continue;
        if (brush === 'wall') grid.setCellType(c, 'wall');
        else if (brush === 'weight') grid.setCellType(c, 'weight', weightVal ?? 5);
        else if (brush === 'erase') grid.setCellType(c, 'empty');
      }
      renderer.render();
    },
    onEndpointMove: (type, newCoord, oldCoord) => {
      if (runner.isRunning) {
        runner.pause();
      }
      runner.reset();
      grid.setCellType(oldCoord, 'empty');
      grid.setCellType(newCoord, type);
      if (type === 'start') {
        startCoord = newCoord;
      } else if (type === 'target') {
        targetCoord = newCoord;
      }
      renderer.setEndpoints(startCoord, targetCoord);
      renderer.render();
    },
    onCameraChange: () => renderer.render(),
    onHoverChange: (coord) => renderer.setHoverCoord(coord),
    onDragMarkerChange: (marker) => renderer.setDragMarker(marker),
  });

  interactionHandler.attach(canvas);

  // Auto-center grid in canvas on startup
  setTimeout(() => {
    renderer.resize();
    renderer.fitGrid(32);
    renderer.render();
  }, 60);

  window.addEventListener('resize', () => {
    renderer.resize();
    renderer.render();
  });

  // Heuristic dropdown visibility
  algorithmSelect?.addEventListener('change', () => {
    const algo = algorithmSelect.value;
    if (heuristicGroup) {
      heuristicGroup.style.display = algo === 'astar' || algo === 'jps' ? 'flex' : 'none';
    }
  });

  // Brush selector
  function setActiveBrush(brush: BrushMode) {
    interactionHandler.brush = brush;
    btnBrushWall?.classList.toggle('active', brush === 'wall');
    btnBrushWeight?.classList.toggle('active', brush === 'weight');
    btnBrushErase?.classList.toggle('active', brush === 'erase');
  }

  btnBrushWall?.addEventListener('click', () => setActiveBrush('wall'));
  btnBrushWeight?.addEventListener('click', () => setActiveBrush('weight'));
  btnBrushErase?.addEventListener('click', () => setActiveBrush('erase'));

  // Speed settings listener
  speedRange?.addEventListener('input', () => {
    const batch = getStepsPerBatch();
    runner.setSpeed(batch);
  });

  // Theme switcher
  themeSelect?.addEventListener('change', () => {
    renderer.setTheme(getTheme(themeSelect.value));
    renderer.render();
  });

  // --- Algorithm Generator Creation ---
  function createAlgorithmGenerator(): AlgorithmGenerator {
    const algoName = algorithmSelect?.value ?? 'astar';
    const options = {
      grid,
      start: startCoord,
      target: targetCoord,
      heuristic: getHeuristic(),
      allowDiagonal: false,
    };

    switch (algoName) {
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

  // --- Algorithm Execution Actions ---
  function startVisualization() {
    if (runner.isRunning) {
      runner.pause();
      return;
    }
    if (runner.isPaused) {
      runner.resume();
      return;
    }

    renderer.clearVisited();
    currentPath.length = 0;
    renderer.render();

    const gen = createAlgorithmGenerator();
    runner.load(gen);
    runner.play();
  }

  function stepForward() {
    if (runner.isIdle) {
      renderer.clearVisited();
      currentPath.length = 0;
      renderer.render();
      const gen = createAlgorithmGenerator();
      runner.load(gen);
    }
    runner.stepForward();
  }

  function stepBackward() {
    runner.stepBackward();
  }

  // --- Timeline Scrubber Listener ---
  timelineScrubber?.addEventListener('input', () => {
    const targetStep = parseInt(timelineScrubber.value, 10);
    runner.seek(targetStep - 1);
  });

  // --- Maze Generation ---
  let currentMazeGenerator: MazeGenerator | null = null;

  mazeSelect?.addEventListener('change', () => {
    const mazeType = mazeSelect.value;
    if (!mazeType) return;

    runner.reset();
    grid.reset(false);
    renderer.clearVisited();
    currentPath.length = 0;
    grid.setCellType(startCoord, 'start');
    grid.setCellType(targetCoord, 'target');
    renderer.setEndpoints(startCoord, targetCoord);
    renderer.render();

    const options = { grid, start: startCoord, target: targetCoord };

    switch (mazeType) {
      case 'recursiveDivision':
        currentMazeGenerator = recursiveDivision(options);
        break;
      case 'kruskal':
        currentMazeGenerator = kruskal(options);
        break;
      case 'prim':
        currentMazeGenerator = prim(options);
        break;
      case 'perlin':
        currentMazeGenerator = perlinTerrain(options);
        break;
    }

    setStatus('RUNNING');
    animateMaze();
    mazeSelect.selectedIndex = 0;
  });

  function animateMaze() {
    if (!currentMazeGenerator) return;

    const stepsPerFrame = 20;
    let done = false;

    for (let i = 0; i < stepsPerFrame; i++) {
      const next = currentMazeGenerator.next();
      if (next.done) {
        done = true;
        break;
      }

      const step = next.value;
      if (step.type === 'WALL') {
        grid.setCellType(step.coord, 'wall');
      } else if (step.type === 'WEIGHT') {
        grid.setCellType(step.coord, 'weight', step.weight ?? 5);
      } else if (step.type === 'CLEAR') {
        grid.setCellType(step.coord, 'empty');
      }
    }

    grid.setCellType(startCoord, 'start');
    grid.setCellType(targetCoord, 'target');
    renderer.render();

    if (done) {
      currentMazeGenerator = null;
      setStatus('READY');
      return;
    }

    requestAnimationFrame(animateMaze);
  }

  // --- Action Listeners ---
  btnVisualize?.addEventListener('click', startVisualization);
  btnPause?.addEventListener('click', () => {
    runner.togglePlay();
  });
  btnStep?.addEventListener('click', stepForward);
  btnStepBack?.addEventListener('click', stepBackward);

  btnClearPath?.addEventListener('click', () => {
    runner.reset();
  });

  btnClearAll?.addEventListener('click', () => {
    runner.reset();
    grid.reset(false);
    grid.setCellType(startCoord, 'start');
    grid.setCellType(targetCoord, 'target');
    renderer.clearVisited();
    currentPath.length = 0;
    renderer.render();
  });

  // --- Keyboard Shortcuts ---
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        startVisualization();
        break;
      case 's':
        stepForward();
        break;
      case 'a':
        stepBackward();
        break;
      case 'arrowright':
        stepForward();
        break;
      case 'arrowleft':
        stepBackward();
        break;
      case 'w':
        setActiveBrush('wall');
        break;
      case 'e':
        setActiveBrush('weight');
        break;
      case 'x':
        setActiveBrush('erase');
        break;
      case 'c':
        btnClearAll?.click();
        break;
    }
  });
}

// Bootstrap automatically in browser
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
  } else {
    bootstrapApp();
  }
}
