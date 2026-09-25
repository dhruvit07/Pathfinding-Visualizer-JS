import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SimulationRunner, SimulationState } from '../../src/engine/SimulationRunner';
import { AlgorithmGenerator, SearchSummary, StepEvent } from '../../src/core/algorithms/types';

function* createMockGenerator(
  steps: StepEvent[],
  summary: SearchSummary
): AlgorithmGenerator {
  for (const step of steps) {
    yield step;
  }
  return summary;
}

describe('SimulationRunner', () => {
  let runner: SimulationRunner;
  let sampleSteps: StepEvent[];
  let successSummary: SearchSummary;
  let failureSummary: SearchSummary;

  beforeEach(() => {
    vi.useFakeTimers();

    sampleSteps = [
      { type: 'VISIT', coord: { x: 0, y: 0 }, cost: 0 },
      { type: 'CONSIDER', coord: { x: 1, y: 0 }, cost: 1 },
      { type: 'VISIT', coord: { x: 1, y: 0 }, cost: 1 },
      { type: 'PATH_STEP', coord: { x: 0, y: 0 }, cost: 1 },
      { type: 'PATH_STEP', coord: { x: 1, y: 0 }, cost: 1 },
    ];

    successSummary = {
      found: true,
      path: [{ x: 0, y: 0 }, { x: 1, y: 0 }],
      cost: 1,
      nodesExplored: 2,
      durationMs: 5,
    };

    failureSummary = {
      found: false,
      path: [],
      cost: Infinity,
      nodesExplored: 2,
      durationMs: 4,
    };

    runner = new SimulationRunner();
  });

  afterEach(() => {
    runner.reset();
    vi.useRealTimers();
  });

  describe('State Machine & Transitions', () => {
    it('should initialize with IDLE state', () => {
      expect(runner.state).toBe('IDLE');
      expect(runner.isIdle).toBe(true);
      expect(runner.isRunning).toBe(false);
      expect(runner.isPaused).toBe(false);
      expect(runner.isFinished).toBe(false);
      expect(runner.currentStep).toBe(-1);
      expect(runner.totalSteps).toBe(0);
    });

    it('should transition through states on play, pause, and reset', () => {
      const stateChanges: SimulationState[] = [];
      runner.setOptions({
        onStateChange: (s) => stateChanges.push(s),
      });

      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);
      expect(runner.state).toBe('IDLE');

      runner.play();
      expect(runner.state).toBe('RUNNING');
      expect(runner.isRunning).toBe(true);
      expect(stateChanges).toContain('RUNNING');

      runner.pause();
      expect(runner.state).toBe('PAUSED');
      expect(runner.isPaused).toBe(true);
      expect(stateChanges).toContain('PAUSED');

      runner.reset();
      expect(runner.state).toBe('IDLE');
      expect(runner.isIdle).toBe(true);
    });

    it('should toggle play and pause', () => {
      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);

      runner.togglePlay();
      expect(runner.state).toBe('RUNNING');

      runner.togglePlay();
      expect(runner.state).toBe('PAUSED');

      runner.togglePlay();
      expect(runner.state).toBe('RUNNING');
    });
  });

  describe('Step Forward and Step Backward (Time Travel)', () => {
    it('should advance step-by-step from generator and record into history', () => {
      const steppedEvents: StepEvent[] = [];
      runner.setOptions({
        onStep: (e) => steppedEvents.push(e),
      });

      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);

      // Step 1
      const res1 = runner.stepForward();
      expect(res1).toBe(true);
      expect(runner.currentStep).toBe(0);
      expect(runner.totalSteps).toBe(1);
      expect(steppedEvents.length).toBe(1);
      expect(steppedEvents[0]).toEqual(sampleSteps[0]);

      // Step 2
      const res2 = runner.stepForward();
      expect(res2).toBe(true);
      expect(runner.currentStep).toBe(1);
      expect(runner.totalSteps).toBe(2);
      expect(steppedEvents.length).toBe(2);
    });

    it('should rewind step-by-step using stepBackward', () => {
      const rewoundEvents: StepEvent[] = [];
      runner.setOptions({
        onRewindStep: (e) => rewoundEvents.push(e),
      });

      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);

      runner.stepForward(); // step 0
      runner.stepForward(); // step 1
      runner.stepForward(); // step 2
      expect(runner.currentStep).toBe(2);

      const bwd1 = runner.stepBackward();
      expect(bwd1).toBe(true);
      expect(runner.currentStep).toBe(1);
      expect(rewoundEvents[0]).toEqual(sampleSteps[2]);

      const bwd2 = runner.stepBackward();
      expect(bwd2).toBe(true);
      expect(runner.currentStep).toBe(0);
      expect(rewoundEvents[1]).toEqual(sampleSteps[1]);

      const bwd3 = runner.stepBackward();
      expect(bwd3).toBe(true);
      expect(runner.currentStep).toBe(-1);
      expect(rewoundEvents[2]).toEqual(sampleSteps[0]);

      // Stepping backward beyond start returns false
      const bwd4 = runner.stepBackward();
      expect(bwd4).toBe(false);
      expect(runner.currentStep).toBe(-1);
    });

    it('should step forward through already-buffered steps after rewinding', () => {
      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);

      runner.stepForward(); // step 0
      runner.stepForward(); // step 1
      expect(runner.totalSteps).toBe(2);

      runner.stepBackward(); // back to 0
      expect(runner.currentStep).toBe(0);

      // Advance again - should replay from buffer rather than pulling from generator
      const replay = runner.stepForward();
      expect(replay).toBe(true);
      expect(runner.currentStep).toBe(1);
      expect(runner.totalSteps).toBe(2); // totalSteps did not increase
    });
  });

  describe('Seeking and Scrubbing', () => {
    it('should seek to specific step indices and trigger onSeek callback', () => {
      let seekIndex = -999;
      runner.setOptions({
        onSeek: (idx) => {
          seekIndex = idx;
        },
      });

      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);

      // Advance 4 steps
      runner.stepForward();
      runner.stepForward();
      runner.stepForward();
      runner.stepForward();
      expect(runner.currentStep).toBe(3);

      // Seek back to step 1
      runner.seek(1);
      expect(runner.currentStep).toBe(1);
      expect(seekIndex).toBe(1);

      // Seek back to -1 (start)
      runner.seek(-1);
      expect(runner.currentStep).toBe(-1);
      expect(seekIndex).toBe(-1);
    });

    it('should pre-fetch steps from generator if seek target exceeds buffer', () => {
      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);

      expect(runner.totalSteps).toBe(0);
      runner.seek(3);

      expect(runner.currentStep).toBe(3);
      expect(runner.totalSteps).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Speed & Continuous Execution Loop', () => {
    it('should clamp speed between 1 and 500', () => {
      runner.setSpeed(0);
      expect(runner.stepsPerBatch).toBe(1);

      runner.setSpeed(999);
      expect(runner.stepsPerBatch).toBe(500);

      runner.setSpeed(50);
      expect(runner.stepsPerBatch).toBe(50);
    });

    it('should run to completion and transition to FINISHED on found path', () => {
      let finishedSummary: SearchSummary | null = null;
      runner.setOptions({
        stepsPerBatch: 10,
        onFinish: (s) => {
          finishedSummary = s;
        },
      });

      const gen = createMockGenerator(sampleSteps, successSummary);
      runner.load(gen);
      runner.play();

      // Trigger timer frame
      vi.advanceTimersByTime(20);

      expect(runner.state).toBe('FINISHED');
      expect(runner.isFinished).toBe(true);
      expect(finishedSummary).toEqual(successSummary);
    });

    it('should transition to NO_PATH when target is unreachable', () => {
      let finishedSummary: SearchSummary | null = null;
      runner.setOptions({
        stepsPerBatch: 10,
        onFinish: (s) => {
          finishedSummary = s;
        },
      });

      const gen = createMockGenerator(sampleSteps, failureSummary);
      runner.load(gen);
      runner.play();

      vi.advanceTimersByTime(20);

      expect(runner.state).toBe('NO_PATH');
      expect(runner.isFinished).toBe(true);
      expect(finishedSummary).toEqual(failureSummary);
    });
  });
});
