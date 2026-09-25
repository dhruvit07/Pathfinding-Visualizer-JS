import { Coord, coordEquals } from '../core/grid/Coordinates';
import { Camera } from './Camera';
import { DragMarkerPreview } from './CanvasRenderer';

export type BrushMode = 'wall' | 'weight' | 'erase';
export type EndpointType = 'start' | 'target' | 'stop';


export interface InteractionHandlerOptions {
  element?: HTMLElement | HTMLCanvasElement;
  camera: Camera;
  cellSize: number;
  gridWidth: number;
  gridHeight: number;
  brush?: BrushMode;
  weightValue?: number;
  getStart?: () => Coord | null;
  getTarget?: () => Coord | null;
  getStop?: () => Coord | null;
  onCellPaint?: (coords: Coord[], brush: BrushMode, weightValue?: number) => void;
  onEndpointMove?: (type: EndpointType, newCoord: Coord, oldCoord: Coord) => void;
  onCameraChange?: (camera: Camera) => void;
  onHoverChange?: (coord: Coord | null) => void;
  onDragMarkerChange?: (marker: DragMarkerPreview | null) => void;
}

/**
 * Bresenham's line algorithm between two grid coordinates.
 * Ensures continuous painting without gaps during fast pointer movement.
 */
export function bresenhamLine(x0: number, y0: number, x1: number, y1: number): Coord[] {
  const points: Coord[] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ x, y });
    if (x === x1 && y === y1) {
      break;
    }
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }

  return points;
}

export type InteractionMode = 'none' | 'painting' | 'dragging-endpoint' | 'panning';

/**
 * Handles pointer events, drawing interpolation, endpoint dragging, and viewport panning/zooming.
 */
export class InteractionHandler {
  public element: HTMLElement | HTMLCanvasElement | null = null;
  public camera: Camera;
  public cellSize: number;
  public gridWidth: number;
  public gridHeight: number;
  public brush: BrushMode;
  public weightValue: number;

  private interactionMode: InteractionMode = 'none';
  private spacePressed = false;
  private lastPan = { x: 0, y: 0 };

  private draggedEndpoint: EndpointType | null = null;
  private endpointOriginalCoord: Coord | null = null;
  private currentEndpointCoord: Coord | null = null;
  private lastPaintCoord: Coord | null = null;

  public options: InteractionHandlerOptions;

  // Bound event handlers for clean removal
  private boundPointerDown: (e: Event) => void;
  private boundPointerMove: (e: Event) => void;
  private boundPointerUp: (e: Event) => void;
  private boundPointerCancel: (e: Event) => void;
  private boundWheel: (e: Event) => void;
  private boundKeyDown: (e: Event) => void;
  private boundKeyUp: (e: Event) => void;
  private boundContextMenu: (e: Event) => void;

  constructor(options: InteractionHandlerOptions) {
    this.options = options;
    this.camera = options.camera;
    this.cellSize = options.cellSize;
    this.gridWidth = options.gridWidth;
    this.gridHeight = options.gridHeight;
    this.brush = options.brush ?? 'wall';
    this.weightValue = options.weightValue ?? 5;

    this.boundPointerDown = (e) => this.handlePointerDown(e as PointerEvent);
    this.boundPointerMove = (e) => this.handlePointerMove(e as PointerEvent);
    this.boundPointerUp = (e) => this.handlePointerUp(e as PointerEvent);
    this.boundPointerCancel = (e) => this.handlePointerUp(e as PointerEvent);
    this.boundWheel = (e) => this.handleWheel(e as WheelEvent);
    this.boundKeyDown = (e) => this.handleKeyDown(e as KeyboardEvent);
    this.boundKeyUp = (e) => this.handleKeyUp(e as KeyboardEvent);
    this.boundContextMenu = (e) => e.preventDefault();

    if (options.element) {
      this.attach(options.element);
    }
  }

  attach(element: HTMLElement | HTMLCanvasElement): void {
    if (this.element === element) {
      return;
    }
    if (this.element) {
      this.detach();
    }

    this.element = element;
    element.addEventListener('pointerdown', this.boundPointerDown);
    element.addEventListener('pointermove', this.boundPointerMove);
    element.addEventListener('pointerup', this.boundPointerUp);
    element.addEventListener('pointercancel', this.boundPointerCancel);
    element.addEventListener('wheel', this.boundWheel, { passive: false });
    element.addEventListener('contextmenu', this.boundContextMenu);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.boundKeyDown);
      window.addEventListener('keyup', this.boundKeyUp);
    }
  }

  detach(): void {
    if (this.element) {
      this.element.removeEventListener('pointerdown', this.boundPointerDown);
      this.element.removeEventListener('pointermove', this.boundPointerMove);
      this.element.removeEventListener('pointerup', this.boundPointerUp);
      this.element.removeEventListener('pointercancel', this.boundPointerCancel);
      this.element.removeEventListener('wheel', this.boundWheel);
      this.element.removeEventListener('contextmenu', this.boundContextMenu);
      this.element = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
    }

    this.interactionMode = 'none';
    this.draggedEndpoint = null;
    this.endpointOriginalCoord = null;
    this.currentEndpointCoord = null;
    this.lastPaintCoord = null;
  }

  getInteractionMode(): InteractionMode {
    return this.interactionMode;
  }

  getBrush(): BrushMode {
    return this.brush;
  }

  setBrush(brush: BrushMode): void {
    this.brush = brush;
  }

  setCellSize(size: number): void {
    if (size > 0) {
      this.cellSize = size;
    }
  }

  setGridBounds(width: number, height: number): void {
    this.gridWidth = width;
    this.gridHeight = height;
  }

  // --- Pointer & Keyboard Handlers ---

  handlePointerDown(event: Partial<PointerEvent>): void {
    const button = event.button ?? 0;
    const clientX = event.clientX ?? 0;
    const clientY = event.clientY ?? 0;

    // Middle-click or Space + left click initiates panning
    if (button === 1 || (button === 0 && this.spacePressed)) {
      this.interactionMode = 'panning';
      this.lastPan = { x: clientX, y: clientY };
      this.setCursor('grabbing');
      return;
    }

    // Left click
    if (button === 0) {
      const screenPos = this.getScreenCoords(clientX, clientY);
      const coord = this.camera.screenToGrid(
        screenPos.x,
        screenPos.y,
        this.cellSize,
        1,
        this.gridWidth,
        this.gridHeight
      );

      if (!coord) {
        return;
      }

      // Check if clicked on start, target, or stop endpoint
      const start = this.options.getStart?.();
      const target = this.options.getTarget?.();
      const stop = this.options.getStop?.();

      if (start && coordEquals(coord, start)) {
        this.interactionMode = 'dragging-endpoint';
        this.draggedEndpoint = 'start';
        this.endpointOriginalCoord = { ...coord };
        this.currentEndpointCoord = { ...coord };
        this.options.onDragMarkerChange?.({ type: 'start', coord });
        this.capturePointer(event.pointerId);
        return;
      }

      if (target && coordEquals(coord, target)) {
        this.interactionMode = 'dragging-endpoint';
        this.draggedEndpoint = 'target';
        this.endpointOriginalCoord = { ...coord };
        this.currentEndpointCoord = { ...coord };
        this.options.onDragMarkerChange?.({ type: 'target', coord });
        this.capturePointer(event.pointerId);
        return;
      }

      if (stop && coordEquals(coord, stop)) {
        this.interactionMode = 'dragging-endpoint';
        this.draggedEndpoint = 'stop';
        this.endpointOriginalCoord = { ...coord };
        this.currentEndpointCoord = { ...coord };
        this.options.onDragMarkerChange?.({ type: 'stop', coord });
        this.capturePointer(event.pointerId);
        return;
      }

      // Normal painting stroke
      this.interactionMode = 'painting';
      this.lastPaintCoord = { ...coord };
      this.options.onCellPaint?.([coord], this.brush, this.weightValue);
      this.capturePointer(event.pointerId);
    }
  }

  handlePointerMove(event: Partial<PointerEvent>): void {
    const clientX = event.clientX ?? 0;
    const clientY = event.clientY ?? 0;

    // Viewport panning
    if (this.interactionMode === 'panning') {
      const dx = clientX - this.lastPan.x;
      const dy = clientY - this.lastPan.y;
      this.lastPan = { x: clientX, y: clientY };
      this.camera.pan(dx, dy);
      this.options.onCameraChange?.(this.camera);
      return;
    }

    const screenPos = this.getScreenCoords(clientX, clientY);
    const coord = this.camera.screenToGrid(
      screenPos.x,
      screenPos.y,
      this.cellSize,
      1,
      this.gridWidth,
      this.gridHeight
    );

    // Dragging Start / Target / Stop marker
    if (this.interactionMode === 'dragging-endpoint') {
      if (coord && this.draggedEndpoint) {
        const start = this.options.getStart?.();
        const target = this.options.getTarget?.();
        const stop = this.options.getStop?.();

        const collidesWithOther =
          (this.draggedEndpoint !== 'start' && start && coordEquals(coord, start)) ||
          (this.draggedEndpoint !== 'target' && target && coordEquals(coord, target)) ||
          (this.draggedEndpoint !== 'stop' && stop && coordEquals(coord, stop));

        if (!collidesWithOther) {
          if (!this.currentEndpointCoord || !coordEquals(coord, this.currentEndpointCoord)) {
            this.currentEndpointCoord = { ...coord };
            this.options.onDragMarkerChange?.({
              type: this.draggedEndpoint,
              coord: { ...coord },
            });
          }
        }
      }
      return;
    }

    // Brush painting with Bresenham line interpolation
    if (this.interactionMode === 'painting') {
      if (coord && this.lastPaintCoord && !coordEquals(coord, this.lastPaintCoord)) {
        const line = bresenhamLine(this.lastPaintCoord.x, this.lastPaintCoord.y, coord.x, coord.y);
        const start = this.options.getStart?.();
        const target = this.options.getTarget?.();
        const stop = this.options.getStop?.();

        // Prevent overwriting endpoint markers
        const filtered = line.filter((c) => {
          if (start && coordEquals(c, start)) return false;
          if (target && coordEquals(c, target)) return false;
          if (stop && coordEquals(c, stop)) return false;
          return true;
        });

        this.lastPaintCoord = { ...coord };
        if (filtered.length > 0) {
          this.options.onCellPaint?.(filtered, this.brush, this.weightValue);
        }
      }
      return;
    }

    // Idle hover
    if (this.interactionMode === 'none') {
      this.options.onHoverChange?.(coord);
    }
  }

  handlePointerUp(event?: Partial<PointerEvent>): void {
    if (this.interactionMode === 'dragging-endpoint') {
      if (this.draggedEndpoint && this.currentEndpointCoord && this.endpointOriginalCoord) {
        if (!coordEquals(this.currentEndpointCoord, this.endpointOriginalCoord)) {
          this.options.onEndpointMove?.(
            this.draggedEndpoint,
            this.currentEndpointCoord,
            this.endpointOriginalCoord
          );
        }
      }
      this.options.onDragMarkerChange?.(null);
    }

    if (event?.pointerId !== undefined) {
      this.releasePointer(event.pointerId);
    }

    this.interactionMode = 'none';
    this.draggedEndpoint = null;
    this.endpointOriginalCoord = null;
    this.currentEndpointCoord = null;
    this.lastPaintCoord = null;

    this.updateCursor();
  }

  handleWheel(event: Partial<WheelEvent>): void {
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    const clientX = event.clientX ?? 0;
    const clientY = event.clientY ?? 0;
    const deltaY = event.deltaY ?? 0;

    const screenPos = this.getScreenCoords(clientX, clientY);
    const zoomFactor = deltaY < 0 ? 1.15 : 0.87;

    this.camera.zoomAt(screenPos.x, screenPos.y, zoomFactor, 1);
    this.options.onCameraChange?.(this.camera);
  }

  handleKeyDown(event: Partial<KeyboardEvent>): void {
    if (event.code === 'Space' && !this.spacePressed) {
      this.spacePressed = true;
      if (this.interactionMode === 'none') {
        this.setCursor('grab');
      }
    }
  }

  handleKeyUp(event: Partial<KeyboardEvent>): void {
    if (event.code === 'Space') {
      this.spacePressed = false;
      if (this.interactionMode === 'none') {
        this.updateCursor();
      }
    }
  }

  // --- Internal Helpers ---

  private getScreenCoords(clientX: number, clientY: number): { x: number; y: number } {
    if (this.element && typeof this.element.getBoundingClientRect === 'function') {
      const rect = this.element.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    }
    return { x: clientX, y: clientY };
  }

  private setCursor(cursor: string): void {
    if (this.element && 'style' in this.element) {
      this.element.style.cursor = cursor;
    }
  }

  private updateCursor(): void {
    if (this.spacePressed) {
      this.setCursor('grab');
    } else {
      this.setCursor('default');
    }
  }

  private capturePointer(pointerId?: number): void {
    if (
      pointerId !== undefined &&
      this.element &&
      typeof (this.element as HTMLElement).setPointerCapture === 'function'
    ) {
      try {
        (this.element as HTMLElement).setPointerCapture(pointerId);
      } catch {
        // Ignore in tests or unsupported environments
      }
    }
  }

  private releasePointer(pointerId?: number): void {
    if (
      pointerId !== undefined &&
      this.element &&
      typeof (this.element as HTMLElement).releasePointerCapture === 'function'
    ) {
      try {
        (this.element as HTMLElement).releasePointerCapture(pointerId);
      } catch {
        // Ignore in tests or unsupported environments
      }
    }
  }
}
