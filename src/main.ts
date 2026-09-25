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
  StepEvent,
  SearchSummary,
} from './core/algorithms';
import {
  manhattanDistance,
  euclideanDistance,
  chebyshevDistance,
  octileDistance,
} from './core/heuristics';
import { recursiveDivision, kruskal, prim, perlinTerrain, MazeGenerator } from './core/mazes';
import { CanvasRenderer, InteractionHandler, BrushMode, getTheme } from './renderer';

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

  // Initialize InteractionHandler
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
      for (const c of coords) {
        if (coordEquals(c, startCoord) || coordEquals(c, targetCoord)) continue;
        if (brush === 'wall') grid.setCellType(c, 'wall');
        else if (brush === 'weight') grid.setCellType(c, 'weight', weightVal ?? 5);
        else if (brush === 'erase') grid.setCellType(c, 'empty');
      }
      renderer.render();
    },
    onEndpointMove: (type, newCoord, oldCoord) => {
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
  const btnClearPath = document.getElementById('btnClearPath') as HTMLButtonElement;
  const btnClearAll = document.getElementById('btnClearAll') as HTMLButtonElement;

  const hudStatus = document.getElementById('hudStatus') as HTMLElement;
  const statusText = document.getElementById('statusText') as HTMLElement;
  const hudExplored = document.getElementById('hudExplored') as HTMLElement;
  const hudCost = document.getElementById('hudCost') as HTMLElement;
  const hudTime = document.getElementById('hudTime') as HTMLElement;

  // --- Simulation State ---
  let currentAlgorithmGenerator: AlgorithmGenerator | null = null;
  let currentMazeGenerator: MazeGenerator | null = null;
  let isRunning = false;
  let isPaused = false;
  let animFrameId: number | null = null;

  let exploredCount = 0;
  let algorithmStartTime = 0;
  const currentPath: Coord[] = [];

  // Heuristic dropdown visibility
  algorithmSelect.addEventListener('change', () => {
    const algo = algorithmSelect.value;
    heuristicGroup.style.display = (algo === 'astar' || algo === 'jps') ? 'flex' : 'none';
  });

  // Brush selector
  function setActiveBrush(brush: BrushMode) {
    interactionHandler.brush = brush;
    btnBrushWall.classList.toggle('active', brush === 'wall');
    btnBrushWeight.classList.toggle('active', brush === 'weight');
    btnBrushErase.classList.toggle('active', brush === 'erase');
  }

  btnBrushWall.addEventListener('click', () => setActiveBrush('wall'));
  btnBrushWeight.addEventListener('click', () => setActiveBrush('weight'));
  btnBrushErase.addEventListener('click', () => setActiveBrush('erase'));

  // Speed settings
  function getStepsPerBatch(): number {
    const val = parseInt(speedRange.value, 10);
    switch (val) {
      case 1: speedValueLabel.textContent = 'Slow'; return 1;
      case 2: speedValueLabel.textContent = 'Normal'; return 3;
      case 3: speedValueLabel.textContent = 'Fast'; return 10;
      case 4: speedValueLabel.textContent = 'Instant'; return 500;
      default: return 5;
    }
  }
  speedRange.addEventListener('input', getStepsPerBatch);

  // Theme switcher
  themeSelect.addEventListener('change', () => {
    renderer.setTheme(getTheme(themeSelect.value));
    renderer.render();
  });

  // HUD updates
  function setStatus(status: 'READY' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'NO PATH') {
    statusText.textContent = status;
    hudStatus.className = 'hud-item status-badge';
    if (status === 'RUNNING') hudStatus.classList.add('running');
    else if (status === 'PAUSED') hudStatus.classList.add('paused');
    else if (status === 'NO PATH') hudStatus.classList.add('failed');
  }

  function updateHUD(explored: number, cost: number, timeMs: number) {
    hudExplored.textContent = explored.toString();
    hudCost.textContent = cost === Infinity ? '∞' : cost.toString();
    hudTime.textContent = `${timeMs.toFixed(1)} ms`;
  }

  function getHeuristic() {
    switch (heuristicSelect.value) {
      case 'euclidean': return euclideanDistance;
      case 'chebyshev': return chebyshevDistance;
      case 'octile': return octileDistance;
      default: return manhattanDistance;
    }
  }

  // --- Algorithm Execution ---
  function startVisualization() {
    if (isRunning && !isPaused) {
      pauseVisualization();
      return;
    }
    if (isPaused) {
      resumeVisualization();
      return;
    }

    // Clear previous search
    renderer.clearVisited();
    currentPath.length = 0;
    exploredCount = 0;
    updateHUD(0, 0, 0);

    const algoName = algorithmSelect.value;
    const options = {
      grid,
      start: startCoord,
      target: targetCoord,
      heuristic: getHeuristic(),
      allowDiagonal: false,
    };

    switch (algoName) {
      case 'dijkstra': currentAlgorithmGenerator = dijkstra(options); break;
      case 'astar': currentAlgorithmGenerator = astar(options); break;
      case 'jps': currentAlgorithmGenerator = jps(options); break;
      case 'bidirectional': currentAlgorithmGenerator = bidirectional(options); break;
      case 'bfs': currentAlgorithmGenerator = bfs(options); break;
      case 'dfs': currentAlgorithmGenerator = dfs(options); break;
    }

    isRunning = true;
    isPaused = false;
    setStatus('RUNNING');
    btnVisualize.innerHTML = '<span class="btn-icon">⏸</span><span>Pause</span>';
    btnPause.disabled = false;
    btnStep.disabled = true;

    algorithmStartTime = performance.now();
    runAnimationLoop();
  }

  function pauseVisualization() {
    isPaused = true;
    setStatus('PAUSED');
    btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Resume</span>';
    btnStep.disabled = false;
  }

  function resumeVisualization() {
    isPaused = false;
    setStatus('RUNNING');
    btnVisualize.innerHTML = '<span class="btn-icon">⏸</span><span>Pause</span>';
    btnStep.disabled = true;
    runAnimationLoop();
  }

  function stopVisualization() {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    isRunning = false;
    isPaused = false;
    currentAlgorithmGenerator = null;
    currentMazeGenerator = null;
    btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Visualize</span>';
    btnPause.disabled = true;
    btnStep.disabled = true;
  }

  function runAnimationLoop() {
    if (!isRunning || isPaused || !currentAlgorithmGenerator) return;

    const stepsPerFrame = getStepsPerBatch();
    let done = false;
    let summary: SearchSummary | undefined;

    for (let i = 0; i < stepsPerFrame; i++) {
      const next = currentAlgorithmGenerator.next();
      if (next.done) {
        done = true;
        summary = next.value;
        break;
      }

      const event: StepEvent = next.value;
      if (event.type === 'VISIT') {
        exploredCount++;
        renderer.addVisited({ coord: event.coord, direction: event.direction });
      } else if (event.type === 'PATH_STEP') {
        currentPath.push(event.coord);
        renderer.setPath(currentPath);
      }
    }

    const elapsed = performance.now() - algorithmStartTime;
    updateHUD(exploredCount, summary?.cost ?? 0, elapsed);
    renderer.render();

    if (done && summary) {
      stopVisualization();
      setStatus(summary.found ? 'FINISHED' : 'NO PATH');
      updateHUD(summary.nodesExplored, summary.cost, summary.durationMs);
      renderer.render();
      return;
    }

    animFrameId = requestAnimationFrame(runAnimationLoop);
  }

  function stepForward() {
    if (!currentAlgorithmGenerator) return;

    const next = currentAlgorithmGenerator.next();
    if (next.done) {
      stopVisualization();
      setStatus(next.value.found ? 'FINISHED' : 'NO PATH');
      updateHUD(next.value.nodesExplored, next.value.cost, next.value.durationMs);
      renderer.render();
      return;
    }

    const event: StepEvent = next.value;
    if (event.type === 'VISIT') {
      exploredCount++;
      renderer.addVisited({ coord: event.coord, direction: event.direction });
    } else if (event.type === 'PATH_STEP') {
      currentPath.push(event.coord);
      renderer.setPath(currentPath);
    }

    updateHUD(exploredCount, event.cost ?? 0, performance.now() - algorithmStartTime);
    renderer.render();
  }

  // --- Maze Generation ---
  mazeSelect.addEventListener('change', () => {
    const mazeType = mazeSelect.value;
    if (!mazeType) return;

    stopVisualization();
    grid.reset(false);
    renderer.clearVisited();
    currentPath.length = 0;
    grid.setCellType(startCoord, 'start');
    grid.setCellType(targetCoord, 'target');
    renderer.setEndpoints(startCoord, targetCoord);
    renderer.render();

    const options = { grid, start: startCoord, target: targetCoord };

    switch (mazeType) {
      case 'recursiveDivision': currentMazeGenerator = recursiveDivision(options); break;
      case 'kruskal': currentMazeGenerator = kruskal(options); break;
      case 'prim': currentMazeGenerator = prim(options); break;
      case 'perlin': currentMazeGenerator = perlinTerrain(options); break;
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
  btnVisualize.addEventListener('click', startVisualization);
  btnPause.addEventListener('click', () => {
    if (isPaused) resumeVisualization();
    else pauseVisualization();
  });
  btnStep.addEventListener('click', stepForward);

  btnClearPath.addEventListener('click', () => {
    stopVisualization();
    renderer.clearVisited();
    currentPath.length = 0;
    setStatus('READY');
    updateHUD(0, 0, 0);
    renderer.render();
  });

  btnClearAll.addEventListener('click', () => {
    stopVisualization();
    grid.reset(false);
    grid.setCellType(startCoord, 'start');
    grid.setCellType(targetCoord, 'target');
    renderer.clearVisited();
    currentPath.length = 0;
    setStatus('READY');
    updateHUD(0, 0, 0);
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
        if (isPaused) stepForward();
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
        btnClearAll.click();
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

