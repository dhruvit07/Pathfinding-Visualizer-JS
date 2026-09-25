import { Grid } from '../core/grid/Grid';
import { Coord, coordKey } from '../core/grid/Coordinates';
import { Theme, CYBERPUNK_THEME, getThemeGradients } from './Theme';
import { Camera } from './Camera';
import { clamp, lerp, easeOutBack, easeOutCubic, lerpColor } from './Easing';

export interface VisitedNodeInfo {
  coord: Coord;
  direction?: 'forward' | 'backward';
}

export interface AnimatingCell {
  coord: Coord;
  startTime: number;
  duration: number;
  direction?: 'forward' | 'backward';
}

export interface DragMarkerPreview {
  type: 'start' | 'target' | 'stop';
  coord: Coord;
}

export interface CanvasRendererOptions {
  theme?: Theme;
  camera?: Camera;
  cellSize?: number;
}

interface Ripple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  startTime: number;
  duration: number;
}

interface AmbientParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface PathFlowParticle {
  progress: number;
  speed: number;
  size: number;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

/**
 * High-performance HTML5 Canvas 2D Pathfinding Renderer.
 * Supports DPI scaling, frustum culling, batched draw passes, organic cell expansion
 * animations, wavefront ripple pulses, laser-charge shortest path, and ambient particles.
 */
export class CanvasRenderer {
  public canvas: HTMLCanvasElement | null = null;
  public ctx: CanvasRenderingContext2D | null = null;
  public theme: Theme;
  public camera: Camera;
  public cellSize: number;

  private grid: Grid | null = null;
  private start: Coord | null = null;
  private target: Coord | null = null;
  private stop: Coord | null = null;
  private visited: Map<string, VisitedNodeInfo> = new Map();
  private frontier: Set<string> = new Set();
  private path: Coord[] = [];
  private hoverCoord: Coord | null = null;
  private dragMarker: DragMarkerPreview | null = null;

  public width = 0;
  public height = 0;

  // Animation System States
  private animatingCells: Map<string, AnimatingCell> = new Map();
  private wallAnims: Map<string, { startTime: number; duration: number }> = new Map();
  private ripples: Ripple[] = [];
  private sparks: Spark[] = [];
  private ambientParticles: AmbientParticle[] = [];
  private pathFlowParticles: PathFlowParticle[] = [];
  private rippleCounter = 0;

  // Path Laser Charge Animation
  private pathAnimActive = false;
  private pathAnimStart = 0;

  // Render Loop
  private animationFrameId: number | null = null;
  private renderPending = false;
  private resizeObserver: ResizeObserver | null = null;
  private isSimulating = false;

  constructor(options?: CanvasRendererOptions) {
    this.theme = options?.theme ?? CYBERPUNK_THEME;
    this.camera = options?.camera ?? new Camera();
    this.cellSize = options?.cellSize ?? 28;
    this.initAmbientParticles();
  }

  private initAmbientParticles(): void {
    this.ambientParticles = [];
    for (let i = 0; i < 40; i++) {
      this.ambientParticles.push({
        x: Math.random() * 1200,
        y: Math.random() * 800,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        size: Math.random() * 1.6 + 0.8,
        alpha: Math.random() * 0.35 + 0.15,
      });
    }
  }

  private initPathFlowParticles(): void {
    this.pathFlowParticles = [];
    if (this.path.length < 2) return;
    const count = Math.min(8, Math.max(3, Math.floor(this.path.length / 5)));
    for (let i = 0; i < count; i++) {
      this.pathFlowParticles.push({
        progress: (i / count),
        speed: 0.003 + Math.random() * 0.003,
        size: Math.random() * 1.5 + 2.5,
      });
    }
  }

  /**
   * Returns current window devicePixelRatio with fallback to 1.
   */
  public getDpr(): number {
    if (typeof window !== 'undefined' && window.devicePixelRatio) {
      return window.devicePixelRatio;
    }
    return 1;
  }

  /**
   * Attaches the renderer to an HTML5 canvas element and initializes context & resizing.
   */
  attach(canvas: HTMLCanvasElement): void {
    if (this.canvas === canvas) {
      return;
    }
    if (this.canvas) {
      this.detach();
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.resize();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
        this.requestRender();
      });
      this.resizeObserver.observe(canvas);
    }

    this.requestRender();
  }

  /**
   * Detaches renderer and cleans up observers and scheduled animation frames.
   */
  detach(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.renderPending = false;
    this.canvas = null;
    this.ctx = null;
  }

  /**
   * Updates canvas dimensions based on CSS display size and devicePixelRatio.
   */
  resize(width?: number, height?: number): void {
    if (!this.canvas) {
      return;
    }

    const dpr = this.getDpr();
    let cssW = width;
    let cssH = height;

    if (cssW === undefined || cssH === undefined) {
      if (typeof this.canvas.getBoundingClientRect === 'function') {
        const rect = this.canvas.getBoundingClientRect();
        cssW = rect.width || this.canvas.clientWidth || 800;
        cssH = rect.height || this.canvas.clientHeight || 600;
      } else {
        cssW = this.canvas.width || 800;
        cssH = this.canvas.height || 600;
      }
    }

    this.width = cssW;
    this.height = cssH;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
  }

  // --- State setters ---

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.requestRender();
  }

  setGrid(grid: Grid | null): void {
    this.grid = grid;
    if (grid) {
      this.camera.gridWidth = grid.width;
      this.camera.gridHeight = grid.height;
    }
    this.requestRender();
  }

  setEndpoints(start: Coord | null, target: Coord | null, stop: Coord | null = null): void {
    this.start = start ? { ...start } : null;
    this.target = target ? { ...target } : null;
    this.stop = stop ? { ...stop } : null;
    this.requestRender();
  }

  setCellSize(cellSize: number): void {
    if (cellSize > 0) {
      this.cellSize = cellSize;
      this.requestRender();
    }
  }

  setSimulating(simulating: boolean): void {
    this.isSimulating = simulating;
    if (simulating) {
      this.requestRender();
    }
  }

  setVisited(nodes: Iterable<Coord | VisitedNodeInfo>): void {
    this.visited.clear();
    this.animatingCells.clear();
    for (const item of nodes) {
      const coord = 'coord' in item ? item.coord : item;
      const direction = 'direction' in item ? item.direction : undefined;
      this.visited.set(coordKey(coord), { coord, direction });
    }
    this.requestRender();
  }

  addVisited(node: Coord | VisitedNodeInfo): void {
    const coord = 'coord' in node ? node.coord : node;
    const direction = 'direction' in node ? node.direction : undefined;
    const key = coordKey(coord);

    if (!this.visited.has(key)) {
      this.visited.set(key, { coord, direction });
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.animatingCells.set(key, {
        coord,
        startTime: now,
        duration: 320,
        direction,
      });

      // Wavefront ripple pulse on every 7th visited cell
      this.rippleCounter++;
      if (this.rippleCounter % 7 === 0) {
        this.spawnRipple(coord, now);
      }
    }
    this.requestRender();
  }

  triggerWallPop(coord: Coord): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.wallAnims.set(coordKey(coord), { startTime: now, duration: 200 });
    this.requestRender();
  }

  private spawnRipple(coord: Coord, now: number): void {
    if (this.ripples.length >= 25) {
      this.ripples.shift();
    }
    this.ripples.push({
      x: (coord.x + 0.5) * this.cellSize,
      y: (coord.y + 0.5) * this.cellSize,
      startTime: now,
      duration: 480,
    });
  }

  public spawnVictoryBurst(coord: Coord): void {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cx = (coord.x + 0.5) * this.cellSize;
    const cy = (coord.y + 0.5) * this.cellSize;
    const colors = [this.theme.path, '#ffffff', '#38bdf8', '#34d399', '#fde047'];

    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1.5;
      this.sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 2.5 + 1.5,
        startTime: now,
        duration: Math.random() * 350 + 550,
      });
    }
    this.requestRender();
  }

  clearVisited(): void {
    this.visited.clear();
    this.animatingCells.clear();
    this.frontier.clear();
    this.path = [];
    this.pathFlowParticles = [];
    this.pathAnimActive = false;
    this.ripples = [];
    this.sparks = [];
    this.requestRender();
  }

  setFrontier(nodes: Iterable<Coord>): void {
    this.frontier.clear();
    for (const node of nodes) {
      this.frontier.add(coordKey(node));
    }
    this.requestRender();
  }

  setPath(path: Coord[]): void {
    this.path = path.map((c) => ({ ...c }));
    if (this.path.length > 1) {
      this.pathAnimActive = true;
      this.pathAnimStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.initPathFlowParticles();
    } else {
      this.pathAnimActive = false;
      this.pathFlowParticles = [];
    }
    this.requestRender();
  }

  setHoverCoord(coord: Coord | null): void {
    if (
      (this.hoverCoord === null && coord === null) ||
      (this.hoverCoord && coord && this.hoverCoord.x === coord.x && this.hoverCoord.y === coord.y)
    ) {
      return;
    }
    this.hoverCoord = coord ? { ...coord } : null;
    this.requestRender();
  }

  setDragMarker(marker: DragMarkerPreview | null): void {
    this.dragMarker = marker ? { type: marker.type, coord: { ...marker.coord } } : null;
    this.requestRender();
  }

  /**
   * Fits the grid within the viewport canvas.
   */
  fitGrid(padding = 24): void {
    if (!this.grid || this.width <= 0 || this.height <= 0) {
      return;
    }
    this.camera.fitGrid(this.grid.width, this.grid.height, this.width, this.height, this.cellSize, padding);
    this.requestRender();
  }

  private hasActiveAnimations(): boolean {
    return (
      this.animatingCells.size > 0 ||
      this.wallAnims.size > 0 ||
      this.ripples.length > 0 ||
      this.sparks.length > 0 ||
      this.pathAnimActive ||
      this.path.length > 0 ||
      this.isSimulating ||
      this.dragMarker !== null
    );
  }

  /**
   * Schedules a render frame via requestAnimationFrame.
   */
  requestRender(): void {
    if (this.renderPending) {
      return;
    }
    this.renderPending = true;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame((timestamp) => {
        this.renderPending = false;
        this.render(timestamp);

        // Continue the animation loop as long as dynamic elements are active
        if (this.hasActiveAnimations() && !this.renderPending) {
          this.requestRender();
        }
      });
    } else {
      // Direct render in non-browser/test environments
      this.renderPending = false;
      this.render();
    }
  }

  /**
   * Immediate synchronous render pass with high-impact visual effects.
   */
  render(timestamp?: number): void {
    if (!this.canvas || !this.ctx) {
      return;
    }

    const now = timestamp ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const ctx = this.ctx;
    const dpr = this.getDpr();
    const cellSize = this.cellSize;
    const theme = this.theme;
    const camera = this.camera;

    // 1. Clear background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Ambient Nebula Background Pass (Subtle drifting atmospheric clouds)
    this.drawNebulaBackground(ctx, now);

    // 3. Camera transform
    ctx.scale(dpr, dpr);
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    if (!this.grid) {
      ctx.restore();
      return;
    }

    const grid = this.grid;

    // View frustum culling
    const visibleRange = camera.getVisibleRange(
      this.width,
      this.height,
      cellSize,
      grid.width,
      grid.height,
      1
    );

    const minCol = Math.max(0, visibleRange.minCol);
    const maxCol = Math.min(grid.width - 1, visibleRange.maxCol);
    const minRow = Math.max(0, visibleRange.minRow);
    const maxRow = Math.min(grid.height - 1, visibleRange.maxRow);

    if (minCol <= maxCol && minRow <= maxRow) {
      // 4. Ambient Micro-Particles (Drifting starlight)
      this.drawAmbientParticles(ctx, minCol, maxCol, minRow, maxRow);

      // Empty cell backgrounds (if different from canvas background)
      if (theme.empty !== theme.background) {
        ctx.fillStyle = theme.empty;
        ctx.fillRect(
          minCol * cellSize,
          minRow * cellSize,
          (maxCol - minCol + 1) * cellSize,
          (maxRow - minRow + 1) * cellSize
        );
      }

      // 5. Walls & Weights Pass with Wall Placement Pop Micro-Animation
      this.drawWallsAndWeights(ctx, grid, minCol, maxCol, minRow, maxRow, cellSize, theme, now);

      // 6. Wavefront Ripple Pulses Pass
      this.drawRipples(ctx, now);

      // 7. Visited cells pass (Static Batched + Living Expanding Cells)
      this.drawVisitedCells(ctx, grid, minCol, maxCol, minRow, maxRow, cellSize, theme, now);

      // 8. Frontier nodes pass
      if (this.frontier.size > 0) {
        ctx.fillStyle = theme.frontier;
        ctx.beginPath();
        for (const fKey of this.frontier) {
          const parts = fKey.split(',');
          const fx = Number(parts[0]);
          const fy = Number(parts[1]);
          if (fx >= minCol && fx <= maxCol && fy >= minRow && fy <= maxRow) {
            drawRoundedRect(
              ctx,
              fx * cellSize + 2,
              fy * cellSize + 2,
              cellSize - 4,
              cellSize - 4,
              Math.max(1, cellSize * 0.1)
            );
          }
        }
        ctx.fill();
      }

      // 9. Grid mesh lines (single batched stroke call)
      ctx.beginPath();
      ctx.strokeStyle = theme.gridLines;
      ctx.lineWidth = 1;

      const leftX = minCol * cellSize;
      const rightX = (maxCol + 1) * cellSize;
      const topY = minRow * cellSize;
      const botY = (maxRow + 1) * cellSize;

      for (let r = minRow; r <= maxRow + 1; r++) {
        const y = r * cellSize;
        ctx.moveTo(leftX, y);
        ctx.lineTo(rightX, y);
      }
      for (let c = minCol; c <= maxCol + 1; c++) {
        const x = c * cellSize;
        ctx.moveTo(x, topY);
        ctx.lineTo(x, botY);
      }
      ctx.stroke();

      // 10. Shortest path pass - Radiant Multi-Stage Laser Beam + Laser Charge
      this.drawShortestPath(ctx, minCol, maxCol, minRow, maxRow, cellSize, theme, now);

      // 11. Sparks / Victory Burst Pass
      this.drawSparks(ctx, now);

      // 12. Special Nodes: Start, Target, Stop with Breathing Glow Pulses
      if (this.stop) {
        this.drawStopMarker(
          ctx,
          (this.stop.x + 0.5) * cellSize,
          (this.stop.y + 0.5) * cellSize,
          cellSize,
          theme.stop
        );
      }

      if (this.start) {
        this.drawStartMarker(
          ctx,
          (this.start.x + 0.5) * cellSize,
          (this.start.y + 0.5) * cellSize,
          cellSize,
          theme.start,
          now
        );
      }

      if (this.target) {
        this.drawTargetMarker(
          ctx,
          (this.target.x + 0.5) * cellSize,
          (this.target.y + 0.5) * cellSize,
          cellSize,
          theme.target,
          theme.empty,
          now
        );
      }

      // 13. Hover & Drag ghost preview pass
      if (this.dragMarker) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        const mcx = (this.dragMarker.coord.x + 0.5) * cellSize;
        const mcy = (this.dragMarker.coord.y + 0.5) * cellSize;

        if (this.dragMarker.type === 'start') {
          this.drawStartMarker(ctx, mcx, mcy, cellSize, theme.start, now);
        } else if (this.dragMarker.type === 'target') {
          this.drawTargetMarker(ctx, mcx, mcy, cellSize, theme.target, theme.empty, now);
        } else if (this.dragMarker.type === 'stop') {
          this.drawStopMarker(ctx, mcx, mcy, cellSize, theme.stop);
        }
        ctx.restore();
      } else if (this.hoverCoord && grid.isValid(this.hoverCoord)) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          this.hoverCoord.x * cellSize + 1,
          this.hoverCoord.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2
        );
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // --- Sub-system Draw Passes ---

  private drawNebulaBackground(ctx: CanvasRenderingContext2D, now: number): void {
    if (!this.canvas || typeof ctx.createRadialGradient !== 'function') return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const nebulaColors = this.theme.nebulaColors;
    if (!nebulaColors || nebulaColors.length === 0) return;

    ctx.save();
    // Nebula 1: top left drift
    const x1 = w * 0.25 + Math.sin(now * 0.00015) * 60;
    const y1 = h * 0.28 + Math.cos(now * 0.00012) * 50;
    const r1 = Math.min(w, h) * 0.45;
    const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
    grad1.addColorStop(0, nebulaColors[0]);
    grad1.addColorStop(1, 'transparent');
    ctx.fillStyle = grad1;
    ctx.fillRect(0, 0, w, h);

    // Nebula 2: bottom right drift
    if (nebulaColors.length > 1) {
      const x2 = w * 0.75 + Math.cos(now * 0.00013) * 70;
      const y2 = h * 0.72 + Math.sin(now * 0.00014) * 60;
      const r2 = Math.min(w, h) * 0.5;
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      grad2.addColorStop(0, nebulaColors[1]);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  private drawAmbientParticles(
    ctx: CanvasRenderingContext2D,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number
  ): void {
    const maxX = (maxCol + 1) * this.cellSize;
    const maxY = (maxRow + 1) * this.cellSize;
    const minX = minCol * this.cellSize;
    const minY = minRow * this.cellSize;
    const particleColor = this.theme.particleColor || 'rgba(34, 211, 238, 0.3)';

    ctx.save();
    ctx.fillStyle = particleColor;
    for (const p of this.ambientParticles) {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < minX) p.x = maxX;
      if (p.x > maxX) p.x = minX;
      if (p.y < minY) p.y = maxY;
      if (p.y > maxY) p.y = minY;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawWallsAndWeights(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number,
    cellSize: number,
    theme: Theme,
    now: number
  ): void {
    const walls: Coord[] = [];
    const weights: Array<{ coord: Coord; weight: number }> = [];

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const cell = grid.getCell({ x: c, y: r });
        if (!cell) continue;
        if (cell.type === 'wall') {
          walls.push(cell.coord);
        } else if (cell.type === 'weight') {
          weights.push({ coord: cell.coord, weight: cell.weight });
        }
      }
    }

    // Render walls with placement pop animation
    if (walls.length > 0) {
      ctx.fillStyle = theme.wall;
      for (const w of walls) {
        const key = coordKey(w);
        const anim = this.wallAnims.get(key);

        if (anim) {
          const t = clamp((now - anim.startTime) / anim.duration, 0, 1);
          if (t >= 1) {
            this.wallAnims.delete(key);
            ctx.beginPath();
            drawRoundedRect(
              ctx,
              w.x * cellSize + 0.5,
              w.y * cellSize + 0.5,
              cellSize - 1,
              cellSize - 1,
              Math.max(1.5, cellSize * 0.16)
            );
            ctx.fill();
          } else {
            const scale = easeOutBack(t);
            const clamped = clamp(scale, 0.4, 1.25);
            const size = (cellSize - 1) * clamped;
            const cx = (w.x + 0.5) * cellSize;
            const cy = (w.y + 0.5) * cellSize;

            ctx.save();
            ctx.fillStyle = theme.wall;
            ctx.beginPath();
            drawRoundedRect(
              ctx,
              cx - size / 2,
              cy - size / 2,
              size,
              size,
              Math.max(1.5, size * 0.16)
            );
            ctx.fill();

            // Glow border during pop
            ctx.strokeStyle = theme.wallBorder || 'rgba(148, 163, 184, 0.4)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
          }
        } else {
          ctx.beginPath();
          drawRoundedRect(
            ctx,
            w.x * cellSize + 0.5,
            w.y * cellSize + 0.5,
            cellSize - 1,
            cellSize - 1,
            Math.max(1.5, cellSize * 0.16)
          );
          ctx.fill();
        }
      }
    }

    // Render weights
    for (const wt of weights) {
      ctx.fillStyle = theme.weightBorder || 'rgba(139, 92, 246, 0.35)';
      ctx.beginPath();
      drawRoundedRect(
        ctx,
        wt.coord.x * cellSize + 1,
        wt.coord.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
        Math.max(2, cellSize * 0.22)
      );
      ctx.fill();

      ctx.fillStyle = theme.weight;
      ctx.beginPath();
      drawRoundedRect(
        ctx,
        wt.coord.x * cellSize + 2.5,
        wt.coord.y * cellSize + 2.5,
        cellSize - 5,
        cellSize - 5,
        Math.max(2, cellSize * 0.15)
      );
      ctx.fill();

      if (cellSize >= 14) {
        ctx.fillStyle = theme.weightText;
        ctx.font = `bold ${Math.max(9, Math.round(cellSize * 0.42))}px monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(wt.weight),
          (wt.coord.x + 0.5) * cellSize,
          (wt.coord.y + 0.5) * cellSize
        );
      }
    }
  }

  private drawRipples(ctx: CanvasRenderingContext2D, now: number): void {
    if (this.ripples.length === 0) return;
    const rippleColor = this.theme.rippleColor || this.theme.visited;

    ctx.save();
    const activeRipples: Ripple[] = [];

    for (const rip of this.ripples) {
      const t = (now - rip.startTime) / rip.duration;
      if (t >= 1) continue;

      activeRipples.push(rip);
      const radius = lerp(this.cellSize * 0.2, this.cellSize * 2.2, easeOutCubic(t));
      const alpha = lerp(0.55, 0, t);

      ctx.strokeStyle = rippleColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = Math.max(1, this.cellSize * 0.08);
      ctx.beginPath();
      ctx.arc(rip.x, rip.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    this.ripples = activeRipples;
    ctx.restore();
  }

  private drawVisitedCells(
    ctx: CanvasRenderingContext2D,
    grid: Grid,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number,
    cellSize: number,
    theme: Theme,
    now: number
  ): void {
    const staticForward: Coord[] = [];
    const staticBackward: Coord[] = [];
    const animatingToDraw: AnimatingCell[] = [];

    for (const [key, info] of this.visited.entries()) {
      const c = info.coord;
      if (c.x < minCol || c.x > maxCol || c.y < minRow || c.y > maxRow) {
        continue;
      }
      const cell = grid.getCell(c);
      if (cell?.type === 'wall') continue;

      const anim = this.animatingCells.get(key);
      if (anim) {
        animatingToDraw.push(anim);
      } else {
        if (info.direction === 'backward') {
          staticBackward.push(c);
        } else {
          staticForward.push(c);
        }
      }
    }

    const themeGradients = getThemeGradients(theme);

    // 1. Static Forward visited nodes with radiant gradient cohorts
    if (staticForward.length > 0) {
      const gradient = themeGradients.forward;
      if (gradient && gradient.length > 1 && staticForward.length > 1) {
        const cohortCount = gradient.length;
        const cohortSize = Math.ceil(staticForward.length / cohortCount);
        for (let g = 0; g < cohortCount; g++) {
          const startIdx = g * cohortSize;
          const endIdx = Math.min(staticForward.length, (g + 1) * cohortSize);
          if (startIdx >= endIdx) break;

          ctx.fillStyle = gradient[g];
          ctx.beginPath();
          for (let i = startIdx; i < endIdx; i++) {
            const v = staticForward[i];
            drawRoundedRect(
              ctx,
              v.x * cellSize + 1,
              v.y * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
              Math.max(1, cellSize * 0.12)
            );
          }
          ctx.fill();
        }
      } else {
        ctx.fillStyle = theme.visitedForward || theme.visited;
        ctx.beginPath();
        for (const v of staticForward) {
          drawRoundedRect(
            ctx,
            v.x * cellSize + 1,
            v.y * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
            Math.max(1, cellSize * 0.12)
          );
        }
        ctx.fill();
      }
    }

    // 2. Static Backward visited nodes with radiant gradient cohorts
    if (staticBackward.length > 0) {
      const bgGradient = themeGradients.backward;
      if (bgGradient && bgGradient.length > 1 && staticBackward.length > 1) {
        const cohortCount = bgGradient.length;
        const cohortSize = Math.ceil(staticBackward.length / cohortCount);
        for (let g = 0; g < cohortCount; g++) {
          const startIdx = g * cohortSize;
          const endIdx = Math.min(staticBackward.length, (g + 1) * cohortSize);
          if (startIdx >= endIdx) break;

          ctx.fillStyle = bgGradient[g];
          ctx.beginPath();
          for (let i = startIdx; i < endIdx; i++) {
            const v = staticBackward[i];
            drawRoundedRect(
              ctx,
              v.x * cellSize + 1,
              v.y * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
              Math.max(1, cellSize * 0.12)
            );
          }
          ctx.fill();
        }
      } else {
        ctx.fillStyle = theme.visitedBackward;
        ctx.beginPath();
        for (const v of staticBackward) {
          drawRoundedRect(
            ctx,
            v.x * cellSize + 1,
            v.y * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
            Math.max(1, cellSize * 0.12)
          );
        }
        ctx.fill();
      }
    }

    // 3. Living Animating Cells: Circle -> Rounded Square Morphing with Color Transition!
    for (const anim of animatingToDraw) {
      const key = coordKey(anim.coord);
      const t = clamp((now - anim.startTime) / anim.duration, 0, 1);

      if (t >= 1) {
        this.animatingCells.delete(key);
        // Draw one final static state
        const targetColor = anim.direction === 'backward' ? theme.visitedBackward : (theme.visitedForward || theme.visited);
        ctx.fillStyle = targetColor;
        ctx.beginPath();
        drawRoundedRect(
          ctx,
          anim.coord.x * cellSize + 1,
          anim.coord.y * cellSize + 1,
          cellSize - 2,
          cellSize - 2,
          Math.max(1, cellSize * 0.12)
        );
        ctx.fill();
      } else {
        const scale = easeOutBack(t);
        const clampedScale = clamp(scale, 0.25, 1.22);
        const cx = (anim.coord.x + 0.5) * cellSize;
        const cy = (anim.coord.y + 0.5) * cellSize;
        const size = (cellSize - 2) * clampedScale;
        const radius = lerp(size / 2, Math.max(1, cellSize * 0.12), easeOutCubic(t));

        // Color morphing: Start glow -> Mid glow -> Final theme visited color
        const isBack = anim.direction === 'backward';
        const startColor = isBack ? 'rgba(134, 25, 143, 0.9)' : 'rgba(3, 105, 161, 0.9)';
        const midColor = isBack ? 'rgba(236, 72, 153, 0.95)' : 'rgba(34, 211, 238, 0.95)';
        const finalColor = isBack ? theme.visitedBackward : (theme.visitedForward || theme.visited);

        const currentColor = t < 0.5
          ? lerpColor(startColor, midColor, t * 2)
          : lerpColor(midColor, finalColor, (t - 0.5) * 2);

        ctx.save();
        ctx.fillStyle = currentColor;
        ctx.beginPath();
        drawRoundedRect(
          ctx,
          cx - size / 2,
          cy - size / 2,
          size,
          size,
          radius
        );
        ctx.fill();

        // Brief overshoot flash
        if (clampedScale > 1.05) {
          ctx.strokeStyle = isBack ? 'rgba(255, 114, 182, 0.6)' : 'rgba(255, 255, 255, 0.6)';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  private drawShortestPath(
    ctx: CanvasRenderingContext2D,
    minCol: number,
    maxCol: number,
    minRow: number,
    maxRow: number,
    cellSize: number,
    theme: Theme,
    now: number
  ): void {
    if (this.path.length === 0) return;

    // Laser Charge Progression Calculation
    let activePath = this.path;
    let headCoord: Coord | null = null;

    if (this.pathAnimActive && this.path.length > 1) {
      const elapsed = now - this.pathAnimStart;
      const msPerNode = Math.max(10, Math.min(28, 800 / this.path.length));
      const visibleCount = Math.min(this.path.length, Math.floor(elapsed / msPerNode) + 1);

      activePath = this.path.slice(0, visibleCount);
      headCoord = activePath[activePath.length - 1];

      if (visibleCount >= this.path.length) {
        this.pathAnimActive = false;
        if (this.target) {
          this.spawnVictoryBurst(this.target);
        }
      }
    }

    if (activePath.length === 0) return;

    // 1. Path Tile Highlighting
    ctx.fillStyle = theme.pathGlow;
    ctx.beginPath();
    for (const p of activePath) {
      if (p.x >= minCol && p.x <= maxCol && p.y >= minRow && p.y <= maxRow) {
        drawRoundedRect(
          ctx,
          p.x * cellSize + 2,
          p.y * cellSize + 2,
          cellSize - 4,
          cellSize - 4,
          Math.max(2, cellSize * 0.18)
        );
      }
    }
    ctx.fill();

    // 2. Multi-Stage Radiant Laser Beam
    if (activePath.length > 1) {
      ctx.save();
      ctx.beginPath();
      const p0 = activePath[0];
      ctx.moveTo((p0.x + 0.5) * cellSize, (p0.y + 0.5) * cellSize);
      for (let i = 1; i < activePath.length; i++) {
        const pt = activePath[i];
        ctx.lineTo((pt.x + 0.5) * cellSize, (pt.y + 0.5) * cellSize);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Stage 1: Ambient outer bloom aura
      ctx.strokeStyle = theme.pathBloom || theme.pathGlow;
      ctx.lineWidth = Math.max(4, cellSize * 0.65);
      ctx.stroke();

      // Stage 2: Radiant laser aura
      ctx.strokeStyle = theme.pathGlow;
      ctx.lineWidth = Math.max(3, cellSize * 0.4);
      ctx.stroke();

      // Stage 3: Vibrant core laser beam
      ctx.strokeStyle = theme.path;
      ctx.lineWidth = Math.max(2, cellSize * 0.22);
      ctx.stroke();

      // Stage 4: Laser-bright white-hot center
      ctx.strokeStyle = theme.pathCore || '#ffffff';
      ctx.lineWidth = Math.max(1, cellSize * 0.08);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Laser Charge Head Particle
    if (headCoord && this.pathAnimActive) {
      const hx = (headCoord.x + 0.5) * cellSize;
      const hy = (headCoord.y + 0.5) * cellSize;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(3, cellSize * 0.24), 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = theme.path;
      ctx.lineWidth = Math.max(2, cellSize * 0.12);
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(5, cellSize * 0.42), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Continuous Path Flow Particles ("Electricity through wire")
    if (!this.pathAnimActive && activePath.length > 2 && this.pathFlowParticles.length > 0) {
      ctx.save();
      for (const fp of this.pathFlowParticles) {
        fp.progress = (fp.progress + fp.speed) % 1;
        const totalSegments = activePath.length - 1;
        const exactIndex = fp.progress * totalSegments;
        const segIdx = Math.floor(exactIndex);
        const segT = exactIndex - segIdx;

        const pA = activePath[segIdx];
        const pB = activePath[Math.min(activePath.length - 1, segIdx + 1)];
        if (!pA || !pB) continue;

        const px = lerp((pA.x + 0.5) * cellSize, (pB.x + 0.5) * cellSize, segT);
        const py = lerp((pA.y + 0.5) * cellSize, (pB.y + 0.5) * cellSize, segT);

        // Core electric spark
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, fp.size, 0, Math.PI * 2);
        ctx.fill();

        // Outer glow
        ctx.fillStyle = theme.path;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(px, py, fp.size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawSparks(ctx: CanvasRenderingContext2D, now: number): void {
    if (this.sparks.length === 0) return;
    const remainingSparks: Spark[] = [];

    ctx.save();
    for (const sp of this.sparks) {
      const t = (now - sp.startTime) / sp.duration;
      if (t >= 1) continue;

      remainingSparks.push(sp);
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.08; // subtle gravity

      const alpha = lerp(1, 0, t);
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }

    this.sparks = remainingSparks;
    ctx.restore();
  }

  // --- Vector Iconography Draw Helpers with Breathing Pulses ---

  private drawStartMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cellSize: number,
    color: string,
    now: number
  ): void {
    const pulse = Math.sin(now * 0.0035) * 0.06;
    const r = cellSize * (0.36 + pulse);

    ctx.save();
    // Ambient Outer Pulse Halo
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35 + Math.sin(now * 0.0035) * 0.2;
    ctx.lineWidth = Math.max(1, cellSize * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * (0.45 + pulse), 0, Math.PI * 2);
    ctx.stroke();

    // Vibrant vector arrow
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx + r, cy);
    ctx.lineTo(cx - r * 0.7, cy - r * 0.85);
    ctx.lineTo(cx - r * 0.7, cy + r * 0.85);
    ctx.closePath();
    ctx.fill();

    // Edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = Math.max(1, cellSize * 0.06);
    ctx.stroke();
    ctx.restore();
  }

  private drawTargetMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cellSize: number,
    color: string,
    bgColor: string,
    now: number
  ): void {
    const pulse = Math.sin(now * 0.0035) * 0.06;
    const r1 = cellSize * (0.38 + pulse);
    const r2 = cellSize * 0.25;
    const r3 = cellSize * (0.12 + pulse * 0.5);

    ctx.save();
    // Outer Target Pulse Ring
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35 + Math.sin(now * 0.0035) * 0.2;
    ctx.lineWidth = Math.max(1, cellSize * 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, cellSize * (0.46 + pulse), 0, Math.PI * 2);
    ctx.stroke();

    // Outer circle
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, Math.PI * 2);
    ctx.fill();

    // Middle ring
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r2, 0, Math.PI * 2);
    ctx.fill();

    // Center bullseye dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawStopMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cellSize: number,
    color: string
  ): void {
    const r = cellSize * 0.36;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = Math.max(1, cellSize * 0.05);
    ctx.stroke();
    ctx.restore();
  }
}
