import { describe, it, expect } from 'vitest';
import { APP_INFO } from '../src/main';

describe('Sanity test suite', () => {
  it('should verify test runner functionality', () => {
    expect(true).toBe(true);
    expect(1 + 1).toBe(2);
  });

  it('should load APP_INFO from src/main.ts', () => {
    expect(APP_INFO.name).toBe('Pathfinding Visualizer');
    expect(APP_INFO.version).toBe('2.0.0');
    expect(APP_INFO.status).toBe('initialized');
  });
});
