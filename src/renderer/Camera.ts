import { Coord } from '../core/grid/Coordinates';

export interface CameraOptions {
  x?: number;
  y?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  gridWidth?: number;
  gridHeight?: number;
}

export interface VisibleGridRange {
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

/**
 * 2D Camera viewport managing pan, zoom, coordinate transformations,
 * and grid projection with DPI awareness.
 */
export class Camera {
  public x: number;
  public y: number;
  public zoom: number;
  public readonly minZoom: number;
  public readonly maxZoom: number;
  public gridWidth?: number;
  public gridHeight?: number;

  constructor(options?: CameraOptions) {
    this.x = options?.x ?? 0;
    this.y = options?.y ?? 0;
    this.zoom = options?.zoom ?? 1;
    this.minZoom = options?.minZoom ?? 0.25;
    this.maxZoom = options?.maxZoom ?? 5.0;
    this.gridWidth = options?.gridWidth;
    this.gridHeight = options?.gridHeight;

    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom));
  }

  /**
   * Transforms screen/pointer coordinates to world coordinates.
   * If dpr is supplied (e.g. from physical canvas coordinates), it scales appropriately.
   */
  screenToWorld(screenX: number, screenY: number, dpr = 1): { x: number; y: number } {
    const cssX = screenX / dpr;
    const cssY = screenY / dpr;
    return {
      x: (cssX - this.x) / this.zoom,
      y: (cssY - this.y) / this.zoom,
    };
  }

  /**
   * Transforms world coordinates to screen coordinates.
   */
  worldToScreen(worldX: number, worldY: number, dpr = 1): { x: number; y: number } {
    const cssX = worldX * this.zoom + this.x;
    const cssY = worldY * this.zoom + this.y;
    return {
      x: cssX * dpr,
      y: cssY * dpr,
    };
  }

  /**
   * Converts screen/pointer coordinates to grid cell coordinates.
   * Returns null if coordinates fall outside the grid bounds.
   */
  screenToGrid(
    screenX: number,
    screenY: number,
    cellSize: number,
    dpr = 1,
    gridWidth?: number,
    gridHeight?: number
  ): Coord | null {
    if (cellSize <= 0) {
      return null;
    }

    const world = this.screenToWorld(screenX, screenY, dpr);
    const gx = Math.floor(world.x / cellSize);
    const gy = Math.floor(world.y / cellSize);

    const w = gridWidth ?? this.gridWidth;
    const h = gridHeight ?? this.gridHeight;

    if (gx < 0 || gy < 0) {
      return null;
    }
    if (w !== undefined && gx >= w) {
      return null;
    }
    if (h !== undefined && gy >= h) {
      return null;
    }

    return { x: gx, y: gy };
  }

  /**
   * Converts grid coordinates to screen coordinates of the top-left cell corner.
   */
  gridToScreen(coord: Coord, cellSize: number, dpr = 1): { x: number; y: number } {
    return this.worldToScreen(coord.x * cellSize, coord.y * cellSize, dpr);
  }

  /**
   * Converts grid coordinates to screen coordinates of the cell center.
   */
  gridCenterToScreen(coord: Coord, cellSize: number, dpr = 1): { x: number; y: number } {
    return this.worldToScreen((coord.x + 0.5) * cellSize, (coord.y + 0.5) * cellSize, dpr);
  }

  /**
   * Translates camera position by delta values.
   */
  pan(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /**
   * Zooms in or out centered at the given screen coordinate.
   * Keeps the world point under the cursor unchanged.
   */
  zoomAt(screenX: number, screenY: number, factor: number, dpr = 1): void {
    if (factor <= 0 || !Number.isFinite(factor)) {
      return;
    }

    const newZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    if (newZoom === this.zoom) {
      return;
    }

    const world = this.screenToWorld(screenX, screenY, dpr);
    const cssX = screenX / dpr;
    const cssY = screenY / dpr;

    this.x = cssX - world.x * newZoom;
    this.y = cssY - world.y * newZoom;
    this.zoom = newZoom;
  }

  /**
   * Directly sets the zoom level clamped to [minZoom, maxZoom], centered at canvas center.
   */
  setZoom(targetZoom: number, centerScreenX = 0, centerScreenY = 0, dpr = 1): void {
    const factor = targetZoom / this.zoom;
    this.zoomAt(centerScreenX, centerScreenY, factor, dpr);
  }

  /**
   * Resets camera pan and zoom to initial defaults.
   */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }

  /**
   * Fits the entire grid within the given canvas viewport with optional margin padding.
   * Centers the grid inside the viewport.
   */
  fitGrid(
    gridWidth: number,
    gridHeight: number,
    canvasWidth: number,
    canvasHeight: number,
    cellSize: number,
    padding = 20
  ): void {
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;

    const totalWorldW = gridWidth * cellSize;
    const totalWorldH = gridHeight * cellSize;

    if (totalWorldW <= 0 || totalWorldH <= 0 || canvasWidth <= 0 || canvasHeight <= 0) {
      return;
    }

    const availW = Math.max(1, canvasWidth - padding * 2);
    const availH = Math.max(1, canvasHeight - padding * 2);
    const scale = Math.min(availW / totalWorldW, availH / totalWorldH);

    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, scale));
    this.x = (canvasWidth - totalWorldW * this.zoom) / 2;
    this.y = (canvasHeight - totalWorldH * this.zoom) / 2;
  }

  /**
   * Computes the visible grid column and row ranges for view frustum culling.
   */
  getVisibleRange(
    canvasWidth: number,
    canvasHeight: number,
    cellSize: number,
    gridWidth?: number,
    gridHeight?: number,
    dpr = 1
  ): VisibleGridRange {
    const topLeft = this.screenToWorld(0, 0, dpr);
    const botRight = this.screenToWorld(canvasWidth, canvasHeight, dpr);

    const w = gridWidth ?? this.gridWidth ?? Infinity;
    const h = gridHeight ?? this.gridHeight ?? Infinity;

    const minCol = Math.max(0, Math.floor(topLeft.x / cellSize));
    const maxCol = Math.min(w - 1, Math.ceil(botRight.x / cellSize));
    const minRow = Math.max(0, Math.floor(topLeft.y / cellSize));
    const maxRow = Math.min(h - 1, Math.ceil(botRight.y / cellSize));

    return { minCol, maxCol, minRow, maxRow };
  }
}
