import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CanvasRenderer } from '../../src/renderer/CanvasRenderer';
import { Grid } from '../../src/core/grid/Grid';
import { CYBERPUNK_THEME, LIGHT_THEME } from '../../src/renderer/Theme';

describe('CanvasRenderer Engine', () => {
  let renderer: CanvasRenderer;
  let mockCtx: any;
  let mockCanvas: any;

  beforeEach(() => {
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      roundRect: vi.fn(),
    };

    mockCanvas = {
      width: 800,
      height: 600,
      clientWidth: 800,
      clientHeight: 600,
      getContext: vi.fn().mockReturnValue(mockCtx),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      }),
    };

    renderer = new CanvasRenderer({
      theme: CYBERPUNK_THEME,
      cellSize: 20,
    });
  });

  it('initializes with default options', () => {
    expect(renderer.theme).toBe(CYBERPUNK_THEME);
    expect(renderer.cellSize).toBe(20);
    expect(renderer.canvas).toBeNull();
  });

  it('attaches to canvas and resizes backing buffer', () => {
    renderer.attach(mockCanvas);
    expect(renderer.canvas).toBe(mockCanvas);
    expect(renderer.ctx).toBe(mockCtx);
    expect(renderer.width).toBe(800);
    expect(renderer.height).toBe(600);
  });

  it('detaches canvas cleanly', () => {
    renderer.attach(mockCanvas);
    renderer.detach();
    expect(renderer.canvas).toBeNull();
    expect(renderer.ctx).toBeNull();
  });

  it('updates theme and triggers render', () => {
    renderer.attach(mockCanvas);
    mockCtx.fillRect.mockClear();

    renderer.setTheme(LIGHT_THEME);
    expect(renderer.theme).toBe(LIGHT_THEME);
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it('renders grid with walls, weights, visited nodes, path, and markers', () => {
    const grid = new Grid(10, 10);
    grid.setCellType({ x: 2, y: 2 }, 'wall');
    grid.setCellType({ x: 3, y: 3 }, 'weight', 5);

    renderer.attach(mockCanvas);
    renderer.setGrid(grid);
    renderer.setEndpoints({ x: 0, y: 0 }, { x: 9, y: 9 }, { x: 5, y: 5 });

    renderer.setVisited([
      { coord: { x: 1, y: 0 }, direction: 'forward' },
      { coord: { x: 8, y: 9 }, direction: 'backward' },
    ]);
    renderer.setFrontier([{ x: 2, y: 0 }]);
    renderer.setPath([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ]);

    renderer.render();

    // Verify background clear
    expect(mockCtx.fillRect).toHaveBeenCalled();
    // Verify transforms applied
    expect(mockCtx.scale).toHaveBeenCalled();
    expect(mockCtx.translate).toHaveBeenCalled();
    // Verify paths drawn
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
    // Verify weight text rendered
    expect(mockCtx.fillText).toHaveBeenCalledWith('5', expect.any(Number), expect.any(Number));
  });

  it('handles drag preview and hover coords', () => {
    const grid = new Grid(10, 10);
    renderer.attach(mockCanvas);
    renderer.setGrid(grid);

    renderer.setDragMarker({ type: 'start', coord: { x: 4, y: 4 } });
    renderer.render();
    expect(mockCtx.save).toHaveBeenCalled();

    renderer.setDragMarker(null);
    renderer.setHoverCoord({ x: 2, y: 2 });
    renderer.render();
    expect(mockCtx.strokeRect).toHaveBeenCalled();
  });

  it('fits grid within canvas viewport', () => {
    const grid = new Grid(20, 20);
    renderer.attach(mockCanvas);
    renderer.setGrid(grid);

    renderer.fitGrid();
    expect(renderer.camera.zoom).toBeGreaterThan(0);
    expect(renderer.camera.x).toBeDefined();
    expect(renderer.camera.y).toBeDefined();
  });
});
