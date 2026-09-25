import { describe, it, expect, beforeEach } from 'vitest';
import { TelemetryTracker } from '../../src/engine/Telemetry';
import { StepEvent } from '../../src/core/algorithms/types';

describe('TelemetryTracker', () => {
  let tracker: TelemetryTracker;

  beforeEach(() => {
    tracker = new TelemetryTracker();
  });

  describe('Initial State', () => {
    it('should initialize with all zeroes and empty frontier', () => {
      const snap = tracker.snapshot();
      expect(snap.nodesExplored).toBe(0);
      expect(snap.pathCost).toBe(0);
      expect(snap.pathLength).toBe(0);
      expect(snap.durationMs).toBe(0);
      expect(snap.frontierSize).toBe(0);
      expect(snap.opsPerSec).toBe(0);
      expect(tracker.formatCost()).toBe('0');
      expect(tracker.formatDuration()).toBe('0.0 ms');
      expect(tracker.formatOpsPerSec()).toBe('0 ops/s');
    });
  });

  describe('Step Recording & Frontier Tracking', () => {
    it('should track VISIT and CONSIDER events on frontier', () => {
      tracker.start();

      const consider1: StepEvent = { type: 'CONSIDER', coord: { x: 1, y: 0 } };
      const consider2: StepEvent = { type: 'CONSIDER', coord: { x: 0, y: 1 } };
      tracker.recordStep(consider1);
      tracker.recordStep(consider2);

      expect(tracker.frontierSize).toBe(2);
      expect(tracker.nodesExplored).toBe(0);

      // Visiting consider1 should pop from frontier and increment nodesExplored
      const visit1: StepEvent = { type: 'VISIT', coord: { x: 1, y: 0 } };
      tracker.recordStep(visit1);

      expect(tracker.frontierSize).toBe(1);
      expect(tracker.nodesExplored).toBe(1);
    });

    it('should track PATH_STEP and accumulate path metrics', () => {
      tracker.recordStep({ type: 'PATH_STEP', coord: { x: 0, y: 0 }, cost: 1 });
      tracker.recordStep({ type: 'PATH_STEP', coord: { x: 1, y: 0 }, cost: 2 });
      tracker.recordStep({ type: 'PATH_STEP', coord: { x: 2, y: 0 }, cost: 3 });

      expect(tracker.pathLength).toBe(3);
      expect(tracker.pathCost).toBe(3);
    });

    it('should handle NO_PATH step by setting cost to Infinity', () => {
      tracker.recordStep({ type: 'NO_PATH', coord: { x: 5, y: 5 } });
      expect(tracker.pathCost).toBe(Infinity);
      expect(tracker.formatCost()).toBe('∞');
    });
  });

  describe('Timing and Completion', () => {
    it('should record finished state with found path', () => {
      tracker.start();
      tracker.recordStep({ type: 'VISIT', coord: { x: 0, y: 0 } });
      tracker.recordStep({ type: 'VISIT', coord: { x: 1, y: 0 } });

      tracker.finish(true, 14.5, 8);

      const snap = tracker.snapshot();
      expect(snap.nodesExplored).toBe(2);
      expect(snap.pathCost).toBe(14.5);
      expect(snap.pathLength).toBe(8);
      expect(snap.durationMs).toBeGreaterThanOrEqual(0);
      expect(tracker.formatCost()).toBe('14.5');
    });

    it('should record finished state with NO_PATH', () => {
      tracker.start();
      tracker.finish(false, 0, 0);

      expect(tracker.pathCost).toBe(Infinity);
      expect(tracker.pathLength).toBe(0);
      expect(tracker.formatCost()).toBe('∞');
    });
  });

  describe('Recomputing From Events (Scrubbing)', () => {
    it('should accurately rebuild telemetry state from a list of past events', () => {
      const events: StepEvent[] = [
        { type: 'CONSIDER', coord: { x: 1, y: 0 } },
        { type: 'CONSIDER', coord: { x: 2, y: 0 } },
        { type: 'VISIT', coord: { x: 1, y: 0 } },
        { type: 'CONSIDER', coord: { x: 3, y: 0 } },
        { type: 'VISIT', coord: { x: 2, y: 0 } },
        { type: 'PATH_STEP', coord: { x: 1, y: 0 }, cost: 1 },
        { type: 'PATH_STEP', coord: { x: 2, y: 0 }, cost: 2 },
      ];

      tracker.recomputeFromEvents(events);

      expect(tracker.nodesExplored).toBe(2);
      expect(tracker.pathLength).toBe(2);
      expect(tracker.pathCost).toBe(2);
      expect(tracker.frontierSize).toBe(1); // (3, 0) was considered but not visited
    });
  });

  describe('Reset', () => {
    it('should clear all recorded metrics on reset', () => {
      tracker.start();
      tracker.recordStep({ type: 'VISIT', coord: { x: 0, y: 0 } });
      tracker.finish(true, 10, 5);

      tracker.reset();

      const snap = tracker.snapshot();
      expect(snap.nodesExplored).toBe(0);
      expect(snap.pathCost).toBe(0);
      expect(snap.pathLength).toBe(0);
      expect(snap.frontierSize).toBe(0);
      expect(snap.durationMs).toBe(0);
    });
  });
});
