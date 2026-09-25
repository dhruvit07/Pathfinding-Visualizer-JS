import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryBuffer } from '../../src/engine/HistoryBuffer';
import { StepEvent } from '../../src/core/algorithms/types';

describe('HistoryBuffer', () => {
  let buffer: HistoryBuffer;

  const mockEvents: StepEvent[] = [
    { type: 'VISIT', coord: { x: 0, y: 0 }, cost: 0 },
    { type: 'CONSIDER', coord: { x: 1, y: 0 }, cost: 1 },
    { type: 'VISIT', coord: { x: 1, y: 0 }, cost: 1 },
    { type: 'PATH_STEP', coord: { x: 1, y: 0 }, cost: 1 },
    { type: 'FINISHED', coord: { x: 1, y: 0 }, cost: 1 },
  ];

  beforeEach(() => {
    buffer = new HistoryBuffer();
  });

  describe('Empty Buffer State', () => {
    it('should initialize with cursor at -1 and zero total steps', () => {
      expect(buffer.totalSteps).toBe(0);
      expect(buffer.currentStepIndex).toBe(-1);
      expect(buffer.isAtStart).toBe(true);
      expect(buffer.isAtEnd).toBe(true);
    });

    it('should return null when stepping forward or backward on empty buffer', () => {
      expect(buffer.stepForward()).toBeNull();
      expect(buffer.stepBackward()).toBeNull();
    });

    it('should return empty result when seeking on empty buffer', () => {
      const res = buffer.seek(0);
      expect(res.applied).toEqual([]);
      expect(res.unapplied).toEqual([]);
      expect(buffer.currentStepIndex).toBe(-1);
    });

    it('should return empty array for getEventsUpTo and getAllEvents', () => {
      expect(buffer.getEventsUpTo(0)).toEqual([]);
      expect(buffer.getEventsUpTo(-1)).toEqual([]);
      expect(buffer.getAllEvents()).toEqual([]);
    });
  });

  describe('Push and Stepping Forward', () => {
    it('should append events and allow forward iteration', () => {
      mockEvents.forEach((ev) => buffer.push(ev));

      expect(buffer.totalSteps).toBe(mockEvents.length);
      expect(buffer.currentStepIndex).toBe(-1);
      expect(buffer.isAtStart).toBe(true);
      expect(buffer.isAtEnd).toBe(false);

      const step1 = buffer.stepForward();
      expect(step1).toEqual(mockEvents[0]);
      expect(buffer.currentStepIndex).toBe(0);
      expect(buffer.isAtStart).toBe(false);

      const step2 = buffer.stepForward();
      expect(step2).toEqual(mockEvents[1]);
      expect(buffer.currentStepIndex).toBe(1);

      // Step through remaining
      buffer.stepForward(); // index 2
      buffer.stepForward(); // index 3
      const step5 = buffer.stepForward(); // index 4 (last)
      expect(step5).toEqual(mockEvents[4]);
      expect(buffer.currentStepIndex).toBe(4);
      expect(buffer.isAtEnd).toBe(true);

      // Stepping forward beyond end should return null and maintain cursor
      expect(buffer.stepForward()).toBeNull();
      expect(buffer.currentStepIndex).toBe(4);
    });
  });

  describe('Stepping Backward (Reversibility)', () => {
    it('should step backward and decrement cursor correctly', () => {
      mockEvents.forEach((ev) => buffer.push(ev));

      // Advance to index 2
      buffer.stepForward();
      buffer.stepForward();
      buffer.stepForward();
      expect(buffer.currentStepIndex).toBe(2);

      // Step backward
      const rewound1 = buffer.stepBackward();
      expect(rewound1).toEqual(mockEvents[2]);
      expect(buffer.currentStepIndex).toBe(1);

      const rewound2 = buffer.stepBackward();
      expect(rewound2).toEqual(mockEvents[1]);
      expect(buffer.currentStepIndex).toBe(0);

      const rewound3 = buffer.stepBackward();
      expect(rewound3).toEqual(mockEvents[0]);
      expect(buffer.currentStepIndex).toBe(-1);
      expect(buffer.isAtStart).toBe(true);

      // Stepping backward past start should return null
      expect(buffer.stepBackward()).toBeNull();
      expect(buffer.currentStepIndex).toBe(-1);
    });
  });

  describe('Arbitrary Seeking', () => {
    beforeEach(() => {
      mockEvents.forEach((ev) => buffer.push(ev));
    });

    it('should seek forward from -1 to index 2 returning applied events', () => {
      const result = buffer.seek(2);
      expect(buffer.currentStepIndex).toBe(2);
      expect(result.applied).toEqual([mockEvents[0], mockEvents[1], mockEvents[2]]);
      expect(result.unapplied).toEqual([]);
    });

    it('should seek backward returning unapplied events in reverse order', () => {
      buffer.seek(4);
      expect(buffer.currentStepIndex).toBe(4);

      const result = buffer.seek(1);
      expect(buffer.currentStepIndex).toBe(1);
      expect(result.applied).toEqual([]);
      // Unapplied from 4 down to 2
      expect(result.unapplied).toEqual([mockEvents[4], mockEvents[3], mockEvents[2]]);
    });

    it('should return empty diff when seeking to current position', () => {
      buffer.seek(2);
      const result = buffer.seek(2);
      expect(result.applied).toEqual([]);
      expect(result.unapplied).toEqual([]);
      expect(buffer.currentStepIndex).toBe(2);
    });

    it('should clamp out-of-bounds target indices', () => {
      // Seek beyond end
      const fwd = buffer.seek(999);
      expect(buffer.currentStepIndex).toBe(mockEvents.length - 1);
      expect(fwd.applied.length).toBe(mockEvents.length);

      // Seek before start
      const bwd = buffer.seek(-100);
      expect(buffer.currentStepIndex).toBe(-1);
      expect(buffer.isAtStart).toBe(true);
      expect(bwd.unapplied.length).toBe(mockEvents.length);
    });
  });

  describe('History Retrieval & Clear', () => {
    beforeEach(() => {
      mockEvents.forEach((ev) => buffer.push(ev));
    });

    it('should get slice of events up to target index', () => {
      expect(buffer.getEventsUpTo(-1)).toEqual([]);
      expect(buffer.getEventsUpTo(0)).toEqual([mockEvents[0]]);
      expect(buffer.getEventsUpTo(2)).toEqual([mockEvents[0], mockEvents[1], mockEvents[2]]);
      expect(buffer.getEventsUpTo(99)).toEqual(mockEvents);
    });

    it('should return all events', () => {
      expect(buffer.getAllEvents()).toEqual(mockEvents);
    });

    it('should clear buffer back to initial state', () => {
      buffer.seek(3);
      buffer.clear();

      expect(buffer.totalSteps).toBe(0);
      expect(buffer.currentStepIndex).toBe(-1);
      expect(buffer.isAtStart).toBe(true);
      expect(buffer.isAtEnd).toBe(true);
      expect(buffer.getAllEvents()).toEqual([]);
    });
  });
});
