import { Grid } from '../core/grid/Grid';
import { Coord, coordKey } from '../core/grid/Coordinates';
import { Theme, CYBERPUNK_THEME } from './Theme';
import { Camera } from './Camera';

export interface VisitedNodeInfo {
  coord: Coord;
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
 * Supports DPI scaling, frustum culling, batched draw passes, glowing vectors,
 * and high refresh-rate animation loops.
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

  private animationFrameId: number | null = null;
  private renderPending = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(options?: CanvasRendererOptions) {
    this.theme = options?.theme ?? CYBERPUNK_THEME;
    this.camera = options?.camera ?? new Camera();
    this.cellSize = options?.cellSize ?? 28;
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

  setVisited(nodes: Iterable<Coord | VisitedNodeInfo>): void {
    this.visited.clear();
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
    this.visited.set(coordKey(coord), { coord, direction });
    this.requestRender();
  }

  clearVisited(): void {
    this.visited.clear();
    this.frontier.clear();
    this.path = [];
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

  /**
   * Schedules a render frame via requestAnimationFrame.
   */
  requestRender(): void {
    if (this.renderPending) {
      return;
    }
    this.renderPending = true;

    if (typeof requestAnimationFrame !== 'undefined') {
      this.animationFrameId = requestAnimationFrame(() => {
        this.renderPending = false;
        this.render();
      });
    } else {
      // Direct render in non-browser/test environments
      this.renderPending = false;
      this.render();
    }
  }

  /**
   * Immediate synchronous render pass.
   */
  render(): void {
    if (!this.canvas || !this.ctx) {
      return;
    }

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

    // 2. Camera transform
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
      // 3. Grid background & cells pass
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

      // Walls & Weights Pass
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

      // Batch render walls
      if (walls.length > 0) {
        ctx.fillStyle = theme.wall;
        ctx.beginPath();
        for (const w of walls) {
          drawRoundedRect(
            ctx,
            w.x * cellSize + 0.5,
            w.y * cellSize + 0.5,
            cellSize - 1,
            cellSize - 1,
            Math.max(1, cellSize * 0.12)
          );
        }
        ctx.fill();
      }

      // Batch render weights
      for (const wt of weights) {
        ctx.fillStyle = theme.weight;
        ctx.beginPath();
        drawRoundedRect(
          ctx,
          wt.coord.x * cellSize + 1.5,
          wt.coord.y * cellSize + 1.5,
          cellSize - 3,
          cellSize - 3,
          Math.max(2, cellSize * 0.18)
        );
        ctx.fill();

        // Render weight text
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

      // 4. Visited cells pass
      const forwardVisited: Coord[] = [];
      const backwardVisited: Coord[] = [];

      for (const info of this.visited.values()) {
        const c = info.coord;
        if (c.x < minCol || c.x > maxCol || c.y < minRow || c.y > maxRow) {
          continue;
        }
        // Don't cover walls
        const cell = grid.getCell(c);
        if (cell?.type === 'wall') {
          continue;
        }

        if (info.direction === 'backward') {
          backwardVisited.push(c);
        } else {
          forwardVisited.push(c);
        }
      }

      if (forwardVisited.length > 0) {
        ctx.fillStyle = theme.visitedForward || theme.visited;
        ctx.beginPath();
        for (const v of forwardVisited) {
          drawRoundedRect(
            ctx,
            v.x * cellSize + 1,
            v.y * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
            Math.max(1, cellSize * 0.1)
          );
        }
        ctx.fill();
      }

      if (backwardVisited.length > 0) {
        ctx.fillStyle = theme.visitedBackward;
        ctx.beginPath();
        for (const v of backwardVisited) {
          drawRoundedRect(
            ctx,
            v.x * cellSize + 1,
            v.y * cellSize + 1,
            cellSize - 2,
            cellSize - 2,
            Math.max(1, cellSize * 0.1)
          );
        }
        ctx.fill();
      }

      // Frontier nodes pass
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

      // Grid mesh lines (single batched stroke call)
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

      // 5. Shortest path pass
      if (this.path.length > 0) {
        // Path tile highlight
        ctx.fillStyle = theme.pathGlow;
        ctx.beginPath();
        for (const p of this.path) {
          if (p.x >= minCol && p.x <= maxCol && p.y >= minRow && p.y <= maxRow) {
            drawRoundedRect(
              ctx,
              p.x * cellSize + 2,
              p.y * cellSize + 2,
              cellSize - 4,
              cellSize - 4,
              Math.max(2, cellSize * 0.15)
            );
          }
        }
        ctx.fill();

        // Connected glowing vector line
        ctx.save();
        ctx.beginPath();
        const p0 = this.path[0];
        ctx.moveTo((p0.x + 0.5) * cellSize, (p0.y + 0.5) * cellSize);
        for (let i = 1; i < this.path.length; i++) {
          const pt = this.path[i];
          ctx.lineTo((pt.x + 0.5) * cellSize, (pt.y + 0.5) * cellSize);
        }

        // Outer glow
        ctx.strokeStyle = theme.pathGlow;
        ctx.lineWidth = Math.max(3, cellSize * 0.5);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Inner core line
        ctx.strokeStyle = theme.path;
        ctx.lineWidth = Math.max(2, cellSize * 0.24);
        ctx.stroke();
        ctx.restore();
      }

      // 6. Special Nodes: Start, Target, Stop
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
          theme.start
        );
      }

      if (this.target) {
        this.drawTargetMarker(
          ctx,
          (this.target.x + 0.5) * cellSize,
          (this.target.y + 0.5) * cellSize,
          cellSize,
          theme.target,
          theme.empty
        );
      }

      // 7. Hover & Drag ghost preview pass
      if (this.dragMarker) {
        ctx.save();
        ctx.globalAlpha = 0.75;
        const mcx = (this.dragMarker.coord.x + 0.5) * cellSize;
        const mcy = (this.dragMarker.coord.y + 0.5) * cellSize;

        if (this.dragMarker.type === 'start') {
          this.drawStartMarker(ctx, mcx, mcy, cellSize, theme.start);
        } else if (this.dragMarker.type === 'target') {
          this.drawTargetMarker(ctx, mcx, mcy, cellSize, theme.target, theme.empty);
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

  // --- Vector Iconography Draw Helpers ---

  private drawStartMarker(
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
    ctx.moveTo(cx + r, cy);
    ctx.lineTo(cx - r * 0.7, cy - r * 0.85);
    ctx.lineTo(cx - r * 0.7, cy + r * 0.85);
    ctx.closePath();
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = Math.max(1, cellSize * 0.05);
    ctx.stroke();
    ctx.restore();
  }

  private drawTargetMarker(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cellSize: number,
    color: string,
    bgColor: string
  ): void {
    const r1 = cellSize * 0.38;
    const r2 = cellSize * 0.25;
    const r3 = cellSize * 0.12;

    ctx.save();
    // Outer circle
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
