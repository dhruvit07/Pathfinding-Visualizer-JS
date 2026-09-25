import { StepEvent } from '../core/algorithms/types';
import { coordKey } from '../core/grid/Coordinates';

export interface TelemetryData {
  nodesExplored: number;
  pathCost: number;
  pathLength: number;
  durationMs: number;
  frontierSize: number;
  opsPerSec: number;
}

/**
 * Tracks real-time simulation metrics including exploration count,
 * path cost, elapsed execution time, active frontier size, and operations/sec.
 */
export class TelemetryTracker {
  private _nodesExplored = 0;
  private _pathCost = 0;
  private _pathLength = 0;
  private _durationMs = 0;
  private frontier: Set<string> = new Set();
  private startTime = 0;
  private endTime = 0;
  private isRunning = false;

  get nodesExplored(): number {
    return this._nodesExplored;
  }

  get pathCost(): number {
    return this._pathCost;
  }

  get pathLength(): number {
    return this._pathLength;
  }

  get durationMs(): number {
    if (this.isRunning) {
      return Math.max(0, this.now() - this.startTime);
    }
    return this._durationMs;
  }

  get frontierSize(): number {
    return this.frontier.size;
  }

  get opsPerSec(): number {
    const sec = this.durationMs / 1000;
    return sec > 0 ? Math.round(this._nodesExplored / sec) : 0;
  }

  /**
   * Starts timing and marks the tracker as running.
   */
  start(): void {
    this.startTime = this.now();
    this.endTime = 0;
    this.isRunning = true;
    this._durationMs = 0;
  }

  /**
   * Ingests a StepEvent and updates live metrics.
   */
  recordStep(event: StepEvent): void {
    const key = coordKey(event.coord);

    switch (event.type) {
      case 'VISIT':
        this._nodesExplored++;
        this.frontier.delete(key);
        break;
      case 'CONSIDER':
      case 'RELAX':
        this.frontier.add(key);
        break;
      case 'PATH_STEP':
        this._pathLength++;
        if (event.cost !== undefined) {
          this._pathCost = event.cost;
        }
        break;
      case 'FINISHED':
        if (event.cost !== undefined) {
          this._pathCost = event.cost;
        }
        break;
      case 'NO_PATH':
        this._pathCost = Infinity;
        break;
    }

    if (this.isRunning) {
      this._durationMs = Math.max(0, this.now() - this.startTime);
    }
  }

  /**
   * Finalizes telemetry with search outcome.
   */
  finish(found: boolean, cost: number, pathLength: number): void {
    if (this.isRunning) {
      this.endTime = this.now();
      this._durationMs = Math.max(0, this.endTime - this.startTime);
      this.isRunning = false;
    }
    this._pathCost = found ? cost : Infinity;
    this._pathLength = found ? pathLength : 0;
  }

  /**
   * Resets all metric counters and timers to zero.
   */
  reset(): void {
    this._nodesExplored = 0;
    this._pathCost = 0;
    this._pathLength = 0;
    this._durationMs = 0;
    this.frontier.clear();
    this.startTime = 0;
    this.endTime = 0;
    this.isRunning = false;
  }

  /**
   * Recomputes metrics from an array of past events.
   * Useful when rewinding or seeking through the HistoryBuffer.
   */
  recomputeFromEvents(events: StepEvent[]): void {
    const wasRunning = this.isRunning;
    const prevStart = this.startTime;
    const prevDuration = this._durationMs;

    this._nodesExplored = 0;
    this._pathCost = 0;
    this._pathLength = 0;
    this.frontier.clear();

    for (const ev of events) {
      const key = coordKey(ev.coord);
      switch (ev.type) {
        case 'VISIT':
          this._nodesExplored++;
          this.frontier.delete(key);
          break;
        case 'CONSIDER':
        case 'RELAX':
          this.frontier.add(key);
          break;
        case 'PATH_STEP':
          this._pathLength++;
          if (ev.cost !== undefined) {
            this._pathCost = ev.cost;
          }
          break;
        case 'FINISHED':
          if (ev.cost !== undefined) {
            this._pathCost = ev.cost;
          }
          break;
        case 'NO_PATH':
          this._pathCost = Infinity;
          break;
      }
    }

    this.isRunning = wasRunning;
    this.startTime = prevStart;
    this._durationMs = prevDuration;
  }

  /**
   * Captures an immutable snapshot of the current telemetry state.
   */
  snapshot(): TelemetryData {
    const duration = this.durationMs;
    const sec = duration / 1000;
    const opsPerSec = sec > 0 ? Math.round(this._nodesExplored / sec) : 0;

    return {
      nodesExplored: this._nodesExplored,
      pathCost: this._pathCost,
      pathLength: this._pathLength,
      durationMs: Number(duration.toFixed(2)),
      frontierSize: this.frontier.size,
      opsPerSec,
    };
  }

  /**
   * Formatted duration string (e.g., "14.2 ms" or "1.25 s").
   */
  formatDuration(): string {
    const ms = this.durationMs;
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)} s`;
    }
    return `${ms.toFixed(1)} ms`;
  }

  /**
   * Formatted path cost string (e.g., "42" or "∞").
   */
  formatCost(): string {
    return this._pathCost === Infinity ? '∞' : this._pathCost.toString();
  }

  /**
   * Formatted operations per second string (e.g., "12,450 ops/s").
   */
  formatOpsPerSec(): string {
    return `${this.opsPerSec.toLocaleString()} ops/s`;
  }

  private now(): number {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }
}
