import { AlgorithmGenerator, StepEvent, SearchSummary } from '../core/algorithms/types';
import { HistoryBuffer } from './HistoryBuffer';
import { TelemetryTracker, TelemetryData } from './Telemetry';

export type SimulationState =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'STEPPING'
  | 'FINISHED'
  | 'NO_PATH';

export interface SimulationRunnerOptions {
  stepsPerBatch?: number;
  onStep?: (event: StepEvent, index: number, buffer: HistoryBuffer) => void;
  onRewindStep?: (event: StepEvent, index: number, buffer: HistoryBuffer) => void;
  onSeek?: (targetIndex: number, buffer: HistoryBuffer) => void;
  onStateChange?: (state: SimulationState) => void;
  onTelemetry?: (data: TelemetryData) => void;
  onFinish?: (summary: SearchSummary) => void;
  onReset?: () => void;
}

/**
 * Finite State Machine orchestrator for pathfinding simulations.
 * Coordinates AlgorithmGenerator, HistoryBuffer, TelemetryTracker, and CanvasRenderer.
 */
export class SimulationRunner {
  public readonly buffer: HistoryBuffer;
  public readonly telemetry: TelemetryTracker;

  private _state: SimulationState = 'IDLE';
  private _stepsPerBatch = 5;
  private options: SimulationRunnerOptions;

  private generator: AlgorithmGenerator | null = null;
  private generatorFinished = false;
  private finalSummary: SearchSummary | null = null;
  private animFrameId: number | null = null;

  constructor(options?: SimulationRunnerOptions) {
    this.options = options ?? {};
    this._stepsPerBatch = Math.max(1, Math.min(500, options?.stepsPerBatch ?? 5));
    this.buffer = new HistoryBuffer();
    this.telemetry = new TelemetryTracker();
  }

  get state(): SimulationState {
    return this._state;
  }

  get currentStep(): number {
    return this.buffer.currentStepIndex;
  }

  get totalSteps(): number {
    return this.buffer.totalSteps;
  }

  get stepsPerBatch(): number {
    return this._stepsPerBatch;
  }

  get isRunning(): boolean {
    return this._state === 'RUNNING';
  }

  get isPaused(): boolean {
    return this._state === 'PAUSED';
  }

  get isFinished(): boolean {
    return this._state === 'FINISHED' || this._state === 'NO_PATH';
  }

  get isIdle(): boolean {
    return this._state === 'IDLE';
  }

  /**
   * Updates runner event listeners or batch configuration.
   */
  setOptions(options: Partial<SimulationRunnerOptions>): void {
    this.options = { ...this.options, ...options };
    if (options.stepsPerBatch !== undefined) {
      this.setSpeed(options.stepsPerBatch);
    }
  }

  /**
   * Sets simulation speed (steps executed per animation frame, 1 to 500).
   */
  setSpeed(speed: number): void {
    this._stepsPerBatch = Math.max(1, Math.min(500, Math.round(speed)));
  }

  /**
   * Loads an algorithm generator and resets internal state and history.
   */
  load(generator: AlgorithmGenerator): void {
    this.stopAnimation();
    this.generator = generator;
    this.generatorFinished = false;
    this.finalSummary = null;
    this.buffer.clear();
    this.telemetry.reset();
    this.setState('IDLE');
    this.options.onTelemetry?.(this.telemetry.snapshot());
  }

  /**
   * Starts or resumes playback. If generator is provided, it is loaded first.
   */
  start(generator?: AlgorithmGenerator): void {
    if (generator) {
      this.load(generator);
    }
    this.play();
  }

  /**
   * Begins or resumes continuous execution.
   */
  play(): void {
    if (this._state === 'RUNNING') {
      return;
    }

    if (this.isFinished && this.buffer.isAtEnd) {
      return;
    }

    if (this._state === 'IDLE') {
      this.telemetry.start();
    }

    this.setState('RUNNING');
    this.startAnimation();
  }

  /**
   * Pauses continuous execution.
   */
  pause(): void {
    if (this._state !== 'RUNNING') {
      return;
    }

    this.stopAnimation();
    this.setState('PAUSED');
  }

  /**
   * Resumes execution from paused state.
   */
  resume(): void {
    this.play();
  }

  /**
   * Toggles between play and pause.
   */
  togglePlay(): void {
    if (this._state === 'RUNNING') {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Advances simulation by one step.
   * Pulls from HistoryBuffer if rewound, otherwise consumes generator.
   */
  stepForward(): boolean {
    if (this._state === 'RUNNING' && this.animFrameId === null) {
      // In case called outside animation loop while in running state
    } else if (this._state === 'IDLE') {
      this.telemetry.start();
      this.setState('PAUSED');
    }

    // 1. Advance through buffered history if available
    if (!this.buffer.isAtEnd) {
      const event = this.buffer.stepForward();
      if (event) {
        this.telemetry.recordStep(event);
        this.options.onStep?.(event, this.buffer.currentStepIndex, this.buffer);
        this.options.onTelemetry?.(this.telemetry.snapshot());

        if (this.buffer.isAtEnd && this.generatorFinished) {
          const finalState = this.finalSummary?.found ? 'FINISHED' : 'NO_PATH';
          this.setState(finalState);
          if (this.finalSummary) {
            this.options.onFinish?.(this.finalSummary);
          }
        }
        return true;
      }
    }

    // 2. Otherwise pull from generator if not finished
    if (this.generator && !this.generatorFinished) {
      const next = this.generator.next();
      if (next.done) {
        this.generatorFinished = true;
        this.finalSummary = next.value;
        this.telemetry.finish(next.value.found, next.value.cost, next.value.path.length);
        const finalState = next.value.found ? 'FINISHED' : 'NO_PATH';
        this.setState(finalState);
        this.options.onTelemetry?.(this.telemetry.snapshot());
        this.options.onFinish?.(next.value);
        return false;
      } else {
        const event = next.value;
        this.buffer.push(event);
        this.buffer.stepForward();
        this.telemetry.recordStep(event);
        this.options.onStep?.(event, this.buffer.currentStepIndex, this.buffer);
        this.options.onTelemetry?.(this.telemetry.snapshot());
        return true;
      }
    }

    return false;
  }

  /**
   * Rewinds simulation by one step.
   */
  stepBackward(): boolean {
    if (this._state === 'RUNNING') {
      this.pause();
    }

    if (this.buffer.isAtStart) {
      return false;
    }

    const event = this.buffer.stepBackward();
    if (event) {
      this.telemetry.recomputeFromEvents(this.buffer.getEventsUpTo(this.buffer.currentStepIndex));
      this.options.onRewindStep?.(event, this.buffer.currentStepIndex, this.buffer);
      this.options.onTelemetry?.(this.telemetry.snapshot());
      this.setState('PAUSED');
      return true;
    }

    return false;
  }

  /**
   * Seeks to a specific step index (-1 to totalSteps - 1).
   * Automatically ingests from generator if targetIndex exceeds current buffer.
   */
  seek(targetIndex: number): void {
    if (this._state === 'RUNNING') {
      this.pause();
    }

    // Advance generator if seeking ahead of buffered steps
    while (
      targetIndex > this.buffer.totalSteps - 1 &&
      !this.generatorFinished &&
      this.generator
    ) {
      const next = this.generator.next();
      if (next.done) {
        this.generatorFinished = true;
        this.finalSummary = next.value;
        this.telemetry.finish(next.value.found, next.value.cost, next.value.path.length);
        break;
      }
      this.buffer.push(next.value);
    }

    this.buffer.seek(targetIndex);
    this.telemetry.recomputeFromEvents(this.buffer.getEventsUpTo(this.buffer.currentStepIndex));
    this.options.onSeek?.(this.buffer.currentStepIndex, this.buffer);
    this.options.onTelemetry?.(this.telemetry.snapshot());

    if (this.buffer.isAtEnd && this.generatorFinished && this.finalSummary) {
      this.setState(this.finalSummary.found ? 'FINISHED' : 'NO_PATH');
    } else if (this._state !== 'IDLE') {
      this.setState('PAUSED');
    }
  }

  /**
   * Resets the simulation to IDLE state, clearing history, telemetry, and generator.
   */
  reset(): void {
    this.stopAnimation();
    this.generator = null;
    this.generatorFinished = false;
    this.finalSummary = null;
    this.buffer.clear();
    this.telemetry.reset();
    this.setState('IDLE');
    this.options.onReset?.();
    this.options.onTelemetry?.(this.telemetry.snapshot());
  }

  private setState(newState: SimulationState): void {
    if (this._state === newState) return;
    this._state = newState;
    this.options.onStateChange?.(newState);
  }

  private startAnimation(): void {
    if (this.animFrameId !== null) return;

    const loop = () => {
      if (this._state !== 'RUNNING') {
        this.animFrameId = null;
        return;
      }

      let hasMore = true;
      for (let i = 0; i < this._stepsPerBatch; i++) {
        hasMore = this.stepForward();
        if (!hasMore) {
          break;
        }
      }

      this.options.onTelemetry?.(this.telemetry.snapshot());

      if (hasMore && this._state === 'RUNNING') {
        this.animFrameId = this.scheduleFrame(loop);
      } else {
        this.animFrameId = null;
      }
    };

    this.animFrameId = this.scheduleFrame(loop);
  }

  private stopAnimation(): void {
    if (this.animFrameId !== null) {
      this.cancelFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private scheduleFrame(callback: () => void): number {
    if (typeof requestAnimationFrame !== 'undefined') {
      return requestAnimationFrame(callback);
    }
    return setTimeout(callback, 0) as unknown as number;
  }

  private cancelFrame(id: number): void {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  }
}
