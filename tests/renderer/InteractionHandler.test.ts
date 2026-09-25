import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InteractionHandler,
  bresenhamLine,
  BrushMode,
  EndpointType,
} from '../../src/renderer/InteractionHandler';
import { Camera } from '../../src/renderer/Camera';
import { Coord } from '../../src/core/grid/Coordinates';

describe('InteractionHandler & Bresenham Interpolation', () => {
  describe('Bresenham Line Algorithm', () => {
    it('generates a single point when start equals end', () => {
      const line = bresenhamLine(3, 4, 3, 4);
      expect(line).toEqual([{ x: 3, y: 4 }]);
    });

    it('generates straight horizontal lines forward and backward', () => {
      const forward = bresenhamLine(2, 5, 5, 5);
      expect(forward).toEqual([
        { x: 2, y: 5 },
        { x: 3, y: 5 },
        { x: 4, y: 5 },
        { x: 5, y: 5 },
      ]);

      const backward = bresenhamLine(5, 5, 2, 5);
      expect(backward).toEqual([
        { x: 5, y: 5 },
        { x: 4, y: 5 },
        { x: 3, y: 5 },
        { x: 2, y: 5 },
      ]);
    });

    it('generates straight vertical lines forward and backward', () => {
      const down = bresenhamLine(1, 1, 1, 4);
      expect(down).toEqual([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
      ]);

      const up = bresenhamLine(1, 4, 1, 1);
      expect(up).toEqual([
        { x: 1, y: 4 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
        { x: 1, y: 1 },
      ]);
    });

    it('generates diagonal lines', () => {
      const diag = bresenhamLine(0, 0, 3, 3);
      expect(diag).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
      ]);

      const negDiag = bresenhamLine(3, 3, 0, 0);
      expect(negDiag).toEqual([
        { x: 3, y: 3 },
        { x: 2, y: 2 },
        { x: 1, y: 1 },
        { x: 0, y: 0 },
      ]);
    });

    it('generates steep lines (|dy| > |dx|)', () => {
      const steep = bresenhamLine(0, 0, 1, 4);
      expect(steep[0]).toEqual({ x: 0, y: 0 });
      expect(steep[steep.length - 1]).toEqual({ x: 1, y: 4 });
      expect(steep.length).toBe(5);
    });

    it('generates shallow lines (|dx| > |dy|)', () => {
      const shallow = bresenhamLine(0, 0, 4, 1);
      expect(shallow[0]).toEqual({ x: 0, y: 0 });
      expect(shallow[shallow.length - 1]).toEqual({ x: 4, y: 1 });
      expect(shallow.length).toBe(5);
    });

    it('guarantees no gaps: every step is 8-connected', () => {
      const testCases: [number, number, number, number][] = [
        [0, 0, 12, 5],
        [5, 12, 0, 0],
        [20, 3, 2, 18],
        [0, 50, 50, 0],
      ];

      for (const [x0, y0, x1, y1] of testCases) {
        const line = bresenhamLine(x0, y0, x1, y1);
        expect(line[0]).toEqual({ x: x0, y: y0 });
        expect(line[line.length - 1]).toEqual({ x: x1, y: y1 });

        for (let i = 1; i < line.length; i++) {
          const dx = Math.abs(line[i].x - line[i - 1].x);
          const dy = Math.abs(line[i].y - line[i - 1].y);
          expect(dx).toBeLessThanOrEqual(1);
          expect(dy).toBeLessThanOrEqual(1);
          expect(dx + dy).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Interaction State Transitions & Brushes', () => {
    let camera: Camera;
    let handler: InteractionHandler;
    let paintedCells: { coords: Coord[]; brush: BrushMode }[] = [];
    let endpointMoves: { type: EndpointType; newCoord: Coord; oldCoord: Coord }[] = [];
    let dragMarkers: any[] = [];
    let cameraChanges: Camera[] = [];

    const startNode: Coord = { x: 1, y: 1 };
    const targetNode: Coord = { x: 8, y: 8 };
    const stopNode: Coord = { x: 5, y: 5 };

    beforeEach(() => {
      camera = new Camera();
      paintedCells = [];
      endpointMoves = [];
      dragMarkers = [];
      cameraChanges = [];

      handler = new InteractionHandler({
        camera,
        cellSize: 20,
        gridWidth: 20,
        gridHeight: 20,
        brush: 'wall',
        getStart: () => startNode,
        getTarget: () => targetNode,
        getStop: () => stopNode,
        onCellPaint: (coords, brush) => {
          paintedCells.push({ coords, brush });
        },
        onEndpointMove: (type, newCoord, oldCoord) => {
          endpointMoves.push({ type, newCoord, oldCoord });
        },
        onDragMarkerChange: (marker) => {
          dragMarkers.push(marker);
        },
        onCameraChange: (cam) => {
          cameraChanges.push(cam);
        },
      });
    });

    it('sets and gets brush mode', () => {
      expect(handler.getBrush()).toBe('wall');
      handler.setBrush('weight');
      expect(handler.getBrush()).toBe('weight');
      handler.setBrush('erase');
      expect(handler.getBrush()).toBe('erase');
    });

    it('paints a single cell on click', () => {
      // Cell (3, 3) -> Screen (60, 60)
      handler.handlePointerDown({ button: 0, clientX: 65, clientY: 65 });
      expect(handler.getInteractionMode()).toBe('painting');
      expect(paintedCells.length).toBe(1);
      expect(paintedCells[0].coords).toEqual([{ x: 3, y: 3 }]);
      expect(paintedCells[0].brush).toBe('wall');

      handler.handlePointerUp();
      expect(handler.getInteractionMode()).toBe('none');
    });

    it('interpolates cells with Bresenham on continuous drag', () => {
      // Start drag at cell (3, 3) -> Screen (65, 65)
      handler.handlePointerDown({ button: 0, clientX: 65, clientY: 65 });
      expect(paintedCells.length).toBe(1);

      // Fast mouse movement jumping across to cell (6, 3) -> Screen (125, 65)
      handler.handlePointerMove({ clientX: 125, clientY: 65 });
      expect(paintedCells.length).toBe(2);

      // Interpolated points from (3,3) to (6,3) should be (3,3), (4,3), (5,3), (6,3)
      expect(paintedCells[1].coords).toEqual([
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 3 },
        { x: 6, y: 3 },
      ]);

      handler.handlePointerUp();
    });

    it('does not overwrite endpoint nodes when painting', () => {
      // Start node is at (1, 1). Drag through it from (0, 1) to (2, 1)
      // Cell (0, 1) -> (10, 30), Cell (2, 1) -> (50, 30)
      handler.handlePointerDown({ button: 0, clientX: 10, clientY: 30 });
      handler.handlePointerMove({ clientX: 50, clientY: 30 });

      const allPainted = paintedCells.flatMap((p) => p.coords);
      // Start node (1, 1) should be filtered out
      expect(allPainted.some((c) => c.x === 1 && c.y === 1)).toBe(false);
    });

    it('supports weight and erase brushes', () => {
      handler.setBrush('weight');
      handler.handlePointerDown({ button: 0, clientX: 45, clientY: 45 }); // cell (2, 2)
      expect(paintedCells[0].brush).toBe('weight');
      handler.handlePointerUp();

      handler.setBrush('erase');
      handler.handlePointerDown({ button: 0, clientX: 45, clientY: 45 }); // cell (2, 2)
      expect(paintedCells[1].brush).toBe('erase');
      handler.handlePointerUp();
    });

    it('initiates dragging when clicking on start, target, or stop endpoint', () => {
      // Start is at (1, 1) -> Screen (30, 30)
      handler.handlePointerDown({ button: 0, clientX: 30, clientY: 30 });
      expect(handler.getInteractionMode()).toBe('dragging-endpoint');
      expect(dragMarkers[dragMarkers.length - 1]).toEqual({
        type: 'start',
        coord: { x: 1, y: 1 },
      });

      // Move endpoint to cell (2, 3) -> Screen (50, 70)
      handler.handlePointerMove({ clientX: 50, clientY: 70 });
      expect(dragMarkers[dragMarkers.length - 1]).toEqual({
        type: 'start',
        coord: { x: 2, y: 3 },
      });

      // Release pointer commits endpoint move
      handler.handlePointerUp();
      expect(handler.getInteractionMode()).toBe('none');
      expect(endpointMoves.length).toBe(1);
      expect(endpointMoves[0]).toEqual({
        type: 'start',
        newCoord: { x: 2, y: 3 },
        oldCoord: { x: 1, y: 1 },
      });
      expect(dragMarkers[dragMarkers.length - 1]).toBeNull();
    });

    it('does not emit endpoint move if dropped on same cell', () => {
      // Target is at (8, 8) -> Screen (170, 170)
      handler.handlePointerDown({ button: 0, clientX: 170, clientY: 170 });
      handler.handlePointerMove({ clientX: 175, clientY: 175 }); // still cell (8, 8)
      handler.handlePointerUp();

      expect(endpointMoves.length).toBe(0);
    });

    it('prevents dropping an endpoint on top of another endpoint', () => {
      // Start is at (1, 1), Target is at (8, 8). Click Start and move to Target (8, 8)
      handler.handlePointerDown({ button: 0, clientX: 30, clientY: 30 });
      handler.handlePointerMove({ clientX: 170, clientY: 170 });

      // Drag preview should NOT update to target's position
      const lastPreview = dragMarkers[dragMarkers.length - 1];
      expect(lastPreview.coord).not.toEqual({ x: 8, y: 8 });

      handler.handlePointerUp();
    });

    it('supports viewport panning with middle click', () => {
      handler.handlePointerDown({ button: 1, clientX: 100, clientY: 100 });
      expect(handler.getInteractionMode()).toBe('panning');

      handler.handlePointerMove({ clientX: 140, clientY: 120 });
      expect(camera.x).toBe(40);
      expect(camera.y).toBe(20);
      expect(cameraChanges.length).toBe(1);

      handler.handlePointerUp();
      expect(handler.getInteractionMode()).toBe('none');
    });

    it('supports viewport panning with Space + left drag', () => {
      handler.handleKeyDown({ code: 'Space' });
      handler.handlePointerDown({ button: 0, clientX: 50, clientY: 50 });
      expect(handler.getInteractionMode()).toBe('panning');

      handler.handlePointerMove({ clientX: 30, clientY: 70 });
      expect(camera.x).toBe(-20);
      expect(camera.y).toBe(20);

      handler.handlePointerUp();
      handler.handleKeyUp({ code: 'Space' });
    });

    it('handles mouse wheel zoom', () => {
      const initialZoom = camera.zoom;
      handler.handleWheel({ clientX: 100, clientY: 100, deltaY: -100 });
      expect(camera.zoom).toBeGreaterThan(initialZoom);
      expect(cameraChanges.length).toBe(1);
    });
  });
});
