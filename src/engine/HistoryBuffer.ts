import { StepEvent } from '../core/algorithms/types';

export interface SeekResult {
  applied: StepEvent[];
  unapplied: StepEvent[];
}

/**
 * Stores the history of StepEvent objects yielded by algorithm generators.
 * Provides bidirectional navigation (stepForward, stepBackward, seek)
 * enabling reversible time-travel debugging.
 */
export class HistoryBuffer {
  private events: StepEvent[] = [];
  private cursor = -1;

  constructor(initialEvents: StepEvent[] = [], initialCursor?: number) {
    if (initialEvents.length > 0) {
      this.events = [...initialEvents];
      this.cursor = initialCursor !== undefined ? initialCursor : -1;
    }
  }

  /**
   * Current step pointer (-1 means before the first step has executed).
   */
  get currentStepIndex(): number {
    return this.cursor;
  }

  /**
   * Total number of recorded events in buffer.
   */
  get totalSteps(): number {
    return this.events.length;
  }

  /**
   * True if cursor is before the first step (index <= -1).
   */
  get isAtStart(): boolean {
    return this.cursor <= -1;
  }

  /**
   * True if no events exist or cursor is pointing at the last recorded event.
   */
  get isAtEnd(): boolean {
    return this.events.length === 0 || this.cursor >= this.events.length - 1;
  }

  /**
   * Appends an event to the history buffer.
   */
  push(event: StepEvent): void {
    this.events.push(event);
  }

  /**
   * Advances cursor and returns the next StepEvent, or null if already at the end.
   */
  stepForward(): StepEvent | null {
    if (this.isAtEnd) {
      return null;
    }
    this.cursor++;
    return this.events[this.cursor];
  }

  /**
   * Returns the event at current cursor and decrements cursor.
   * Returns null if already at start (cursor < 0).
   */
  stepBackward(): StepEvent | null {
    if (this.cursor < 0) {
      return null;
    }
    const event = this.events[this.cursor];
    this.cursor--;
    return event;
  }

  /**
   * Jumps to target step index (-1 to totalSteps - 1).
   * Returns applied events if moving forward, or unapplied events (in reverse order) if moving backward.
   */
  seek(targetIndex: number): SeekResult {
    if (this.events.length === 0) {
      this.cursor = -1;
      return { applied: [], unapplied: [] };
    }

    const clampedTarget = Math.max(-1, Math.min(this.events.length - 1, targetIndex));
    if (clampedTarget === this.cursor) {
      return { applied: [], unapplied: [] };
    }

    if (clampedTarget > this.cursor) {
      const applied = this.events.slice(this.cursor + 1, clampedTarget + 1);
      this.cursor = clampedTarget;
      return { applied, unapplied: [] };
    } else {
      const unapplied = this.events.slice(clampedTarget + 1, this.cursor + 1).reverse();
      this.cursor = clampedTarget;
      return { applied: [], unapplied };
    }
  }

  /**
   * Returns a copy of all events from index 0 up to the specified index.
   */
  getEventsUpTo(index: number): StepEvent[] {
    if (index < 0) {
      return [];
    }
    if (index >= this.events.length) {
      return this.events.slice();
    }
    return this.events.slice(0, index + 1);
  }

  /**
   * Returns the readonly array of all recorded events.
   */
  getAllEvents(): readonly StepEvent[] {
    return this.events;
  }

  /**
   * Resets the buffer to empty state with cursor at -1.
   */
  clear(): void {
    this.events = [];
    this.cursor = -1;
  }
}
