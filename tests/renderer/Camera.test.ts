import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '../../src/renderer/Camera';

describe('Camera 2D Viewport & Transforms', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera();
  });

  describe('Initialization and Defaults', () => {
    it('initializes with default values', () => {
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.zoom).toBe(1);
      expect(camera.minZoom).toBe(0.25);
      expect(camera.maxZoom).toBe(5.0);
    });

    it('clamps initial zoom to [minZoom, maxZoom]', () => {
      const lowCam = new Camera({ zoom: 0.05, minZoom: 0.25, maxZoom: 5.0 });
      expect(lowCam.zoom).toBe(0.25);

      const highCam = new Camera({ zoom: 10.0, minZoom: 0.25, maxZoom: 5.0 });
      expect(highCam.zoom).toBe(5.0);
    });
  });

  describe('Pan', () => {
    it('translates coordinates with pan', () => {
      camera.pan(50, -30);
      expect(camera.x).toBe(50);
      expect(camera.y).toBe(-30);

      camera.pan(25, 10);
      expect(camera.x).toBe(75);
      expect(camera.y).toBe(-20);
    });
  });

  describe('Zoom Clamping and zoomAt', () => {
    it('clamps zoom within bounds', () => {
      camera.zoomAt(100, 100, 10);
      expect(camera.zoom).toBe(5.0);

      camera.zoomAt(100, 100, 0.01);
      expect(camera.zoom).toBe(0.25);
    });

    it('ignores non-positive or infinite zoom factors', () => {
      const initialZoom = camera.zoom;
      camera.zoomAt(100, 100, 0);
      expect(camera.zoom).toBe(initialZoom);

      camera.zoomAt(100, 100, -1.5);
      expect(camera.zoom).toBe(initialZoom);

      camera.zoomAt(100, 100, Infinity);
      expect(camera.zoom).toBe(initialZoom);
    });

    it('pins the world coordinate under the cursor when zooming', () => {
      const screenX = 300;
      const screenY = 200;

      // World point before zoom
      const worldBefore = camera.screenToWorld(screenX, screenY);

      // Zoom in 2x centered at (screenX, screenY)
      camera.zoomAt(screenX, screenY, 2.0);
      expect(camera.zoom).toBe(2.0);

      // World point under the same screen position should remain identical
      const worldAfter = camera.screenToWorld(screenX, screenY);
      expect(worldAfter.x).toBeCloseTo(worldBefore.x, 5);
      expect(worldAfter.y).toBeCloseTo(worldBefore.y, 5);

      // Screen position of that world point should still be (screenX, screenY)
      const screenAfter = camera.worldToScreen(worldBefore.x, worldBefore.y);
      expect(screenAfter.x).toBeCloseTo(screenX, 5);
      expect(screenAfter.y).toBeCloseTo(screenY, 5);
    });
  });

  describe('screenToWorld and worldToScreen', () => {
    it('converts identity screen coordinates at zoom 1 and pan 0', () => {
      const world = camera.screenToWorld(100, 150);
      expect(world).toEqual({ x: 100, y: 150 });

      const screen = camera.worldToScreen(100, 150);
      expect(screen).toEqual({ x: 100, y: 150 });
    });

    it('converts with pan and zoom applied', () => {
      camera.pan(50, 100);
      camera.zoom = 2;

      // World to screen: world * 2 + pan
      const screen = camera.worldToScreen(10, 20);
      expect(screen.x).toBe(10 * 2 + 50); // 70
      expect(screen.y).toBe(20 * 2 + 100); // 140

      // Screen to world: (screen - pan) / 2
      const world = camera.screenToWorld(screen.x, screen.y);
      expect(world.x).toBe(10);
      expect(world.y).toBe(20);
    });

    it('respects DPI scaling factor', () => {
      const dpr = 2;
      // In DPR=2, physical screen coordinate 200 corresponds to CSS 100
      const world = camera.screenToWorld(200, 300, dpr);
      expect(world).toEqual({ x: 100, y: 150 });

      const screen = camera.worldToScreen(100, 150, dpr);
      expect(screen).toEqual({ x: 200, y: 300 });
    });
  });

  describe('screenToGrid and gridToScreen', () => {
    const cellSize = 30;

    it('accurately resolves grid cell at default camera', () => {
      camera.gridWidth = 20;
      camera.gridHeight = 20;

      expect(camera.screenToGrid(0, 0, cellSize)).toEqual({ x: 0, y: 0 });
      expect(camera.screenToGrid(45, 75, cellSize)).toEqual({ x: 1, y: 2 });
      expect(camera.screenToGrid(59.9, 89.9, cellSize)).toEqual({ x: 1, y: 2 });
    });

    it('returns null if coordinates are out of bounds', () => {
      camera.gridWidth = 10;
      camera.gridHeight = 10;

      // Negative world coordinates
      expect(camera.screenToGrid(-5, 10, cellSize)).toBeNull();
      expect(camera.screenToGrid(10, -5, cellSize)).toBeNull();

      // Outside configured grid dimensions (width=10 -> 0..9 cells -> max px 300)
      expect(camera.screenToGrid(300, 150, cellSize)).toBeNull(); // cell x = 10 -> out of bounds
      expect(camera.screenToGrid(150, 300, cellSize)).toBeNull(); // cell y = 10 -> out of bounds
      expect(camera.screenToGrid(299, 299, cellSize)).toEqual({ x: 9, y: 9 });
    });

    it('handles explicit grid dimensions in screenToGrid arguments', () => {
      expect(camera.screenToGrid(150, 150, cellSize, 1, 4, 4)).toBeNull(); // x=5, y=5 >= 4
      expect(camera.screenToGrid(90, 90, cellSize, 1, 4, 4)).toEqual({ x: 3, y: 3 });
    });

    it('returns null for non-positive cellSize', () => {
      expect(camera.screenToGrid(50, 50, 0)).toBeNull();
      expect(camera.screenToGrid(50, 50, -10)).toBeNull();
    });

    it('maps gridToScreen and gridCenterToScreen correctly', () => {
      const coord = { x: 3, y: 4 };
      const topLeft = camera.gridToScreen(coord, cellSize);
      expect(topLeft).toEqual({ x: 3 * cellSize, y: 4 * cellSize });

      const center = camera.gridCenterToScreen(coord, cellSize);
      expect(center).toEqual({ x: 3.5 * cellSize, y: 4.5 * cellSize });
    });

    it('maintains round-trip mapping between gridToScreen and screenToGrid', () => {
      camera.pan(20, -15);
      camera.zoom = 1.5;
      camera.gridWidth = 30;
      camera.gridHeight = 30;

      for (let x = 0; x < 5; x++) {
        for (let y = 0; y < 5; y++) {
          const center = camera.gridCenterToScreen({ x, y }, cellSize);
          const resolved = camera.screenToGrid(center.x, center.y, cellSize);
          expect(resolved).toEqual({ x, y });
        }
      }
    });
  });

  describe('reset and fitGrid', () => {
    it('resets camera to origin and zoom 1', () => {
      camera.pan(120, 240);
      camera.zoom = 2.5;

      camera.reset();
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
      expect(camera.zoom).toBe(1);
    });

    it('fits and centers grid within viewport', () => {
      const gridW = 50;
      const gridH = 25;
      const cellSize = 20;
      const canvasW = 1000;
      const canvasH = 600;
      const padding = 20;

      camera.fitGrid(gridW, gridH, canvasW, canvasH, cellSize, padding);

      // Total grid size = 1000 x 500
      // Available size = (1000 - 40) x (600 - 40) = 960 x 560
      // Scale: min(960/1000, 560/500) = min(0.96, 1.12) = 0.96
      expect(camera.zoom).toBeCloseTo(0.96, 4);

      // Grid center should be at canvas center (500, 300)
      const gridCenterWorld = { x: (gridW * cellSize) / 2, y: (gridH * cellSize) / 2 };
      const centerScreen = camera.worldToScreen(gridCenterWorld.x, gridCenterWorld.y);
      expect(centerScreen.x).toBeCloseTo(canvasW / 2, 4);
      expect(centerScreen.y).toBeCloseTo(canvasH / 2, 4);
    });
  });
});
