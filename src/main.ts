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
import { ArenaManager, ARENA_PRESETS, AlgorithmType, LearningModal } from './ui';
import {
  serializeState,
  deserializeState,
  buildShareUrl,
  copyShareUrl,
  applySerializedState,
  loadPreset,
  CHALLENGE_PRESETS,
} from './core';

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

  const btnShare = document.getElementById('btnShare') as HTMLButtonElement | null;
  const btnHelp = document.getElementById('btnHelp') as HTMLButtonElement | null;
  const presetChallengeSelect = document.getElementById('presetChallengeSelect') as HTMLSelectElement | null;
  const toastElement = document.getElementById('toast') as HTMLElement | null;

  // --- Animated Toast Alert Helper ---
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  function showToast(message: string, durationMs = 2800): void {
    if (!toastElement) return;
    toastElement.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
    toastElement.classList.add('show');
    if (toastTimer !== null) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      toastElement.classList.remove('show');
      toastTimer = null;
    }, durationMs);
  }

  // --- Learning & Complexity Modal ---
  const learningModal = new LearningModal();
  btnHelp?.addEventListener('click', () => learningModal.open());

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

  // --- Arena Mode UI Elements ---
  const btnToggleArena = document.getElementById('btnToggleArena') as HTMLButtonElement;
  const arenaContainer = document.getElementById('arenaContainer') as HTMLElement;
  const arenaMatchupGroup = document.getElementById('arenaMatchupGroup') as HTMLElement;
  const presetMatchups = document.getElementById('presetMatchups') as HTMLSelectElement;

  const canvasA = document.getElementById('canvasA') as HTMLCanvasElement;
  const canvasB = document.getElementById('canvasB') as HTMLCanvasElement;
  const arenaAlgoA = document.getElementById('arenaAlgoA') as HTMLSelectElement;
  const arenaAlgoB = document.getElementById('arenaAlgoB') as HTMLSelectElement;

  const arenaHUDMatchup = document.getElementById('arenaHUDMatchup') as HTMLElement;
  const arenaComparisonText = document.getElementById('arenaComparisonText') as HTMLElement;
  const arenaHUDMetrics = document.getElementById('arenaHUDMetrics') as HTMLElement;
  const metricExploredDelta = document.getElementById('metricExploredDelta') as HTMLElement;
  const metricTimeDelta = document.getElementById('metricTimeDelta') as HTMLElement;
  const metricCostMatch = document.getElementById('metricCostMatch') as HTMLElement;

  const statExploredA = document.getElementById('statExploredA') as HTMLElement;
  const statCostA = document.getElementById('statCostA') as HTMLElement;
  const statTimeA = document.getElementById('statTimeA') as HTMLElement;

  const statExploredB = document.getElementById('statExploredB') as HTMLElement;
  const statCostB = document.getElementById('statCostB') as HTMLElement;
  const statTimeB = document.getElementById('statTimeB') as HTMLElement;

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
      renderer.setSimulating(state === 'RUNNING');
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

  // --- Arena Mode Orchestrator ---
  const arenaManager = new ArenaManager({
    grid,
    start: startCoord,
    target: targetCoord,
    onStateChange: (stateA, stateB) => {
      if (!arenaManager.isArenaMode) return;
      const isRunning = stateA === 'RUNNING' || stateB === 'RUNNING';
      const isPaused = (stateA === 'PAUSED' || stateB === 'PAUSED') && !isRunning;
      const isFinished =
        (stateA === 'FINISHED' || stateA === 'NO_PATH') &&
        (stateB === 'FINISHED' || stateB === 'NO_PATH');

      if (isRunning) {
        setStatus('RUNNING');
        btnVisualize.innerHTML = '<span class="btn-icon">⏸</span><span>Pause Race</span>';
        btnPause.disabled = false;
        btnPause.innerHTML = '<span class="btn-icon">⏸</span>';
      } else if (isPaused) {
        setStatus('PAUSED');
        btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Resume Race</span>';
        btnPause.disabled = false;
        btnPause.innerHTML = '<span class="btn-icon">▶</span>';
      } else if (isFinished) {
        setStatus('FINISHED');
        btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Race Again</span>';
        btnPause.disabled = true;
      } else {
        setStatus('READY');
        btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Start Race</span>';
        btnPause.disabled = true;
      }
    },
    onTelemetryA: (data) => {
      if (statExploredA) statExploredA.textContent = data.nodesExplored.toString();
      if (statCostA) statCostA.textContent = data.pathCost === Infinity ? '∞' : data.pathCost.toString();
      if (statTimeA) statTimeA.textContent = `${data.durationMs.toFixed(1)} ms`;
      if (arenaManager.isRaceActive() && arenaComparisonText) {
        const explA = data.nodesExplored;
        const explB = arenaManager.runnerB.telemetry.nodesExplored;
        arenaComparisonText.textContent = `Race in progress: ${arenaManager.algoA.name} (${explA} nodes) vs ${arenaManager.algoB.name} (${explB} nodes)...`;
      }
    },
    onTelemetryB: (data) => {
      if (statExploredB) statExploredB.textContent = data.nodesExplored.toString();
      if (statCostB) statCostB.textContent = data.pathCost === Infinity ? '∞' : data.pathCost.toString();
      if (statTimeB) statTimeB.textContent = `${data.durationMs.toFixed(1)} ms`;
      if (arenaManager.isRaceActive() && arenaComparisonText) {
        const explA = arenaManager.runnerA.telemetry.nodesExplored;
        const explB = data.nodesExplored;
        arenaComparisonText.textContent = `Race in progress: ${arenaManager.algoA.name} (${explA} nodes) vs ${arenaManager.algoB.name} (${explB} nodes)...`;
      }
    },
    onRaceStart: () => {
      if (arenaHUDMetrics) arenaHUDMetrics.style.display = 'none';
      if (arenaComparisonText) {
        arenaComparisonText.textContent = `Race started! ${arenaManager.algoA.name} vs ${arenaManager.algoB.name}...`;
      }
    },
    onRaceFinish: (stats) => {
      if (arenaComparisonText) {
        arenaComparisonText.textContent = stats.message;
      }
      if (arenaHUDMetrics) {
        arenaHUDMetrics.style.display = 'flex';
        if (metricExploredDelta) {
          const sign = stats.nodesExploredDelta > 0 ? '+' : '';
          metricExploredDelta.innerHTML = `Explored Δ: <b>${sign}${stats.nodesExploredDelta}</b>`;
        }
        if (metricTimeDelta) {
          const sign = stats.timeDeltaMs > 0 ? '+' : '';
          metricTimeDelta.innerHTML = `Time Δ: <b>${sign}${stats.timeDeltaMs} ms</b>`;
        }
        if (metricCostMatch) {
          metricCostMatch.textContent = stats.isCostEqual
            ? `Optimal Match (${stats.costA})`
            : `Cost Δ: ${stats.costDelta}`;
          metricCostMatch.style.color = stats.isCostEqual ? 'var(--accent-emerald)' : 'var(--accent-amber)';
        }
      }
    },
    onRaceReset: () => {
      if (arenaHUDMetrics) arenaHUDMetrics.style.display = 'none';
      if (arenaComparisonText) {
        arenaComparisonText.textContent = `Ready for algorithm battle! Press Start Race to begin.`;
      }
      if (statExploredA) statExploredA.textContent = '0';
      if (statCostA) statCostA.textContent = '0';
      if (statTimeA) statTimeA.textContent = '0.0 ms';
      if (statExploredB) statExploredB.textContent = '0';
      if (statCostB) statCostB.textContent = '0';
      if (statTimeB) statTimeB.textContent = '0.0 ms';
    },
    onEndpointChange: (type, newCoord) => {
      if (type === 'start') startCoord = newCoord;
      else if (type === 'target') targetCoord = newCoord;
      renderer.setEndpoints(startCoord, targetCoord);
    },
  });

  if (canvasA && canvasB) {
    arenaManager.attachCanvases(canvasA, canvasB);
  }

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
        if (brush === 'wall') {
          grid.setCellType(c, 'wall');
          renderer.triggerWallPop(c);
        } else if (brush === 'weight') {
          grid.setCellType(c, 'weight', weightVal ?? 5);
        } else if (brush === 'erase') {
          grid.setCellType(c, 'empty');
        }
      }
      renderer.render();
      if (arenaManager.isArenaMode) {
        arenaManager.synchronizeRenderers();
      }
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
      arenaManager.setEndpoints(startCoord, targetCoord);
    },
    onCameraChange: () => renderer.render(),
    onHoverChange: (coord) => renderer.setHoverCoord(coord),
    onDragMarkerChange: (marker) => renderer.setDragMarker(marker),
  });

  interactionHandler.attach(canvas);

  // --- State Restoration from URL Hash ---
  function restoreStateFromHash(): boolean {
    if (typeof window === 'undefined' || !window.location.hash) return false;
    const restored = deserializeState(window.location.hash);
    if (!restored) return false;

    if (runner.isRunning) runner.pause();
    runner.reset();

    applySerializedState(restored, grid);
    startCoord = restored.start;
    targetCoord = restored.target;

    if (restored.algorithm && algorithmSelect) {
      algorithmSelect.value = restored.algorithm;
      if (heuristicGroup) {
        heuristicGroup.style.display =
          restored.algorithm === 'astar' || restored.algorithm === 'jps' ? 'flex' : 'none';
      }
    }
    if (restored.heuristic && heuristicSelect) {
      heuristicSelect.value = restored.heuristic;
    }

    renderer.setEndpoints(startCoord, targetCoord);
    renderer.render();

    if (arenaManager.isArenaMode) {
      arenaManager.setEndpoints(startCoord, targetCoord);
      arenaManager.synchronizeRenderers();
    }

    showToast('✨ Shared pathfinding board loaded!');
    return true;
  }

  // Auto-center grid in canvas on startup and restore saved state if hash present
  setTimeout(() => {
    renderer.resize();
    renderer.fitGrid(32);
    const restored = restoreStateFromHash();
    if (!restored) {
      renderer.render();
    }
  }, 60);

  window.addEventListener('hashchange', () => {
    restoreStateFromHash();
  });

  window.addEventListener('resize', () => {
    renderer.resize();
    renderer.render();
    if (arenaManager.isArenaMode) {
      arenaManager.fitGrid(20);
    }
  });

  // Heuristic dropdown visibility
  algorithmSelect?.addEventListener('change', () => {
    const algo = algorithmSelect.value;
    if (heuristicGroup) {
      heuristicGroup.style.display = algo === 'astar' || algo === 'jps' ? 'flex' : 'none';
    }
  });

  // Brush selector & cursor styling
  function updateCanvasCursor(brush: BrushMode) {
    const cursorClass = `cursor-${brush}`;
    const allBrushes = ['cursor-wall', 'cursor-weight', 'cursor-erase'];
    for (const c of [canvas, canvasA, canvasB]) {
      if (!c) continue;
      c.classList.remove(...allBrushes);
      c.classList.add(cursorClass);
    }
  }

  function setActiveBrush(brush: BrushMode) {
    interactionHandler.brush = brush;
    arenaManager.setBrush(brush);
    updateCanvasCursor(brush);
    btnBrushWall?.classList.toggle('active', brush === 'wall');
    btnBrushWeight?.classList.toggle('active', brush === 'weight');
    btnBrushErase?.classList.toggle('active', brush === 'erase');
  }

  updateCanvasCursor('wall');

  btnBrushWall?.addEventListener('click', () => setActiveBrush('wall'));
  btnBrushWeight?.addEventListener('click', () => setActiveBrush('weight'));
  btnBrushErase?.addEventListener('click', () => setActiveBrush('erase'));

  // Speed settings listener
  speedRange?.addEventListener('input', () => {
    const batch = getStepsPerBatch();
    runner.setSpeed(batch);
    arenaManager.setSpeed(batch);
  });

  // Theme switcher
  themeSelect?.addEventListener('change', () => {
    const theme = getTheme(themeSelect.value);
    renderer.setTheme(theme);
    renderer.render();
    arenaManager.rendererA.setTheme(theme);
    arenaManager.rendererB.setTheme(theme);
    arenaManager.rendererA.render();
    arenaManager.rendererB.render();
  });

  // --- Arena Mode Toggle & Control Handlers ---
  function toggleArenaMode() {
    const willBeArena = !arenaManager.isArenaMode;
    arenaManager.toggleArenaMode(willBeArena);

    if (willBeArena) {
      if (runner.isRunning) runner.pause();
      runner.reset();

      canvas.style.display = 'none';
      if (arenaContainer) {
        arenaContainer.style.display = 'flex';
        arenaContainer.classList.add('active');
      }
      if (btnToggleArena) {
        btnToggleArena.classList.add('active');
        btnToggleArena.innerHTML = '<span>⚔️ Single Mode</span>';
      }

      if (arenaMatchupGroup) arenaMatchupGroup.style.display = 'flex';
      const algoGroup = algorithmSelect?.closest('.toolbar-group') as HTMLElement;
      if (algoGroup) algoGroup.style.display = 'none';
      if (heuristicGroup) heuristicGroup.style.display = 'none';
      const timelineGroup = timelineScrubber?.closest('.toolbar-group') as HTMLElement;
      if (timelineGroup) timelineGroup.style.display = 'none';

      btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Start Race</span>';
      btnPause.disabled = true;

      arenaManager.setEndpoints(startCoord, targetCoord);
      arenaManager.synchronizeRenderers();

      requestAnimationFrame(() => {
        arenaManager.fitGrid(20);
      });
      setStatus('READY');
    } else {
      arenaManager.resetRace();

      if (arenaContainer) {
        arenaContainer.style.display = 'none';
        arenaContainer.classList.remove('active');
      }
      canvas.style.display = 'block';
      if (btnToggleArena) {
        btnToggleArena.classList.remove('active');
        btnToggleArena.innerHTML = '<span>⚔️ Arena Mode</span>';
      }

      if (arenaMatchupGroup) arenaMatchupGroup.style.display = 'none';
      const algoGroup = algorithmSelect?.closest('.toolbar-group') as HTMLElement;
      if (algoGroup) algoGroup.style.display = 'flex';
      if (heuristicGroup) {
        heuristicGroup.style.display =
          algorithmSelect.value === 'astar' || algorithmSelect.value === 'jps' ? 'flex' : 'none';
      }
      const timelineGroup = timelineScrubber?.closest('.toolbar-group') as HTMLElement;
      if (timelineGroup) timelineGroup.style.display = 'flex';

      renderer.setGrid(grid);
      renderer.setEndpoints(startCoord, targetCoord);
      renderer.resize();
      renderer.fitGrid(32);
      renderer.render();

      btnVisualize.innerHTML = '<span class="btn-icon">▶</span><span>Visualize</span>';
      btnPause.disabled = true;
      setStatus('READY');
    }
  }

  btnToggleArena?.addEventListener('click', toggleArenaMode);

  presetMatchups?.addEventListener('change', () => {
    const presetId = presetMatchups.value;
    if (!presetId) return;

    arenaManager.loadPreset(presetId);
    if (arenaAlgoA) arenaAlgoA.value = arenaManager.algoA.algorithm;
    if (arenaAlgoB) arenaAlgoB.value = arenaManager.algoB.algorithm;
    if (arenaHUDMatchup) {
      const preset = ARENA_PRESETS.find((p) => p.id === presetId);
      arenaHUDMatchup.textContent = preset?.name ?? `${arenaManager.algoA.name} vs ${arenaManager.algoB.name}`;
    }
    if (arenaComparisonText) {
      arenaComparisonText.textContent = `Preset loaded: ${arenaManager.algoA.name} vs ${arenaManager.algoB.name}. Click Start Race!`;
    }
  });

  arenaAlgoA?.addEventListener('change', () => {
    arenaManager.setAlgorithmA(arenaAlgoA.value as AlgorithmType);
    if (presetMatchups) presetMatchups.selectedIndex = 0;
    if (arenaHUDMatchup) arenaHUDMatchup.textContent = `${arenaManager.algoA.name} vs ${arenaManager.algoB.name}`;
    if (arenaComparisonText) {
      arenaComparisonText.textContent = `Matchup updated: ${arenaManager.algoA.name} vs ${arenaManager.algoB.name}. Click Start Race!`;
    }
  });

  arenaAlgoB?.addEventListener('change', () => {
    arenaManager.setAlgorithmB(arenaAlgoB.value as AlgorithmType);
    if (presetMatchups) presetMatchups.selectedIndex = 0;
    if (arenaHUDMatchup) arenaHUDMatchup.textContent = `${arenaManager.algoA.name} vs ${arenaManager.algoB.name}`;
    if (arenaComparisonText) {
      arenaComparisonText.textContent = `Matchup updated: ${arenaManager.algoA.name} vs ${arenaManager.algoB.name}. Click Start Race!`;
    }
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
    if (arenaManager.isArenaMode) {
      if (arenaManager.isRaceActive()) {
        arenaManager.pauseRace();
        return;
      }
      if (arenaManager.runnerA.isPaused || arenaManager.runnerB.isPaused) {
        arenaManager.resumeRace();
        return;
      }
      arenaManager.startRace();
      return;
    }

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
    if (arenaManager.isArenaMode) {
      arenaManager.synchronizeRenderers();
    }

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
    if (arenaManager.isArenaMode) {
      if (arenaManager.isRaceActive()) {
        arenaManager.pauseRace();
      } else {
        arenaManager.resumeRace();
      }
      return;
    }
    runner.togglePlay();
  });
  btnStep?.addEventListener('click', stepForward);
  btnStepBack?.addEventListener('click', stepBackward);

  btnClearPath?.addEventListener('click', () => {
    if (arenaManager.isArenaMode) {
      arenaManager.resetRace();
      return;
    }
    runner.reset();
  });

  btnClearAll?.addEventListener('click', () => {
    if (arenaManager.isArenaMode) {
      arenaManager.clearWallsAndWeights();
      return;
    }
    runner.reset();
    grid.reset(false);
    grid.setCellType(startCoord, 'start');
    grid.setCellType(targetCoord, 'target');
    renderer.clearVisited();
    currentPath.length = 0;
    renderer.render();
  });

  // --- Share URL Generator & Copy ---
  btnShare?.addEventListener('click', async () => {
    try {
      const algo = algorithmSelect?.value;
      const heur = heuristicSelect?.value;
      const shareUrl = buildShareUrl(grid, startCoord, targetCoord, algo, heur);

      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const hashPart = shareUrl.split('#')[1];
        if (hashPart) {
          window.history.replaceState(null, '', `#${hashPart}`);
        }
      }

      const success = await copyShareUrl(shareUrl);
      if (success) {
        showToast('🔗 Board link copied to clipboard!');
      } else {
        showToast('📋 Link generated in address bar!');
      }
    } catch {
      showToast('❌ Failed to copy share link.');
    }
  });

  // --- Challenge Presets Selector ---
  presetChallengeSelect?.addEventListener('change', () => {
    const presetId = presetChallengeSelect.value;
    if (!presetId) return;

    if (runner.isRunning) runner.pause();
    runner.reset();

    const preset = CHALLENGE_PRESETS[presetId];
    if (preset) {
      const endpoints = loadPreset(presetId, grid);
      startCoord = endpoints.start;
      targetCoord = endpoints.target;

      if (preset.recommendedAlgo && algorithmSelect) {
        algorithmSelect.value = preset.recommendedAlgo;
        if (heuristicGroup) {
          heuristicGroup.style.display =
            preset.recommendedAlgo === 'astar' || preset.recommendedAlgo === 'jps' ? 'flex' : 'none';
        }
      }
      if (preset.recommendedHeuristic && heuristicSelect) {
        heuristicSelect.value = preset.recommendedHeuristic;
      }

      renderer.setEndpoints(startCoord, targetCoord);
      renderer.fitGrid(32);
      renderer.render();

      if (arenaManager.isArenaMode) {
        arenaManager.setEndpoints(startCoord, targetCoord);
        arenaManager.synchronizeRenderers();
      }

      showToast(`🧩 Challenge loaded: ${preset.name}!`);
    }

    presetChallengeSelect.selectedIndex = 0;
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
      case '?':
      case 'h':
        e.preventDefault();
        learningModal.toggle();
        break;
      case 'escape':
        learningModal.close();
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
