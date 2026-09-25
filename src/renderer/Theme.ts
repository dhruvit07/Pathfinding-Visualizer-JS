/**
 * Theme definition and color palettes for the canvas visualizer.
 */

export interface Theme {
  background: string;
  gridLines: string;
  empty: string;
  wall: string;
  weight: string;
  weightText: string;
  start: string;
  target: string;
  stop: string;
  visited: string;
  visitedForward: string;
  visitedBackward: string;
  frontier: string;
  path: string;
  pathGlow: string;
}

/**
 * Cyberpunk Theme (Default)
 * High-tech aesthetic featuring dark obsidian/navy background, vibrant cyan visited nodes,
 * electric yellow path, emerald start, and hot magenta target.
 */
export const CYBERPUNK_THEME: Theme = {
  background: '#0b0f19',
  gridLines: 'rgba(51, 65, 85, 0.35)',
  empty: '#0f172a',
  wall: '#1e293b',
  weight: '#8b5cf6',
  weightText: '#ffffff',
  start: '#10b981',
  target: '#f43f5e',
  stop: '#f59e0b',
  visited: 'rgba(6, 182, 212, 0.45)',
  visitedForward: 'rgba(6, 182, 212, 0.55)',
  visitedBackward: 'rgba(236, 72, 153, 0.55)',
  frontier: 'rgba(59, 130, 246, 0.65)',
  path: '#fbbf24',
  pathGlow: 'rgba(251, 191, 36, 0.6)',
};

/**
 * Clean Light Theme
 * Minimalist, high-clarity slate palette suitable for daytime use and presentation decks.
 */
export const LIGHT_THEME: Theme = {
  background: '#f8fafc',
  gridLines: '#e2e8f0',
  empty: '#ffffff',
  wall: '#334155',
  weight: '#93c5fd',
  weightText: '#1e293b',
  start: '#16a34a',
  target: '#dc2626',
  stop: '#d97706',
  visited: 'rgba(147, 197, 253, 0.6)',
  visitedForward: 'rgba(147, 197, 253, 0.7)',
  visitedBackward: 'rgba(251, 207, 232, 0.7)',
  frontier: 'rgba(186, 230, 253, 0.9)',
  path: '#f59e0b',
  pathGlow: 'rgba(245, 158, 11, 0.4)',
};

/**
 * High Contrast Theme
 * Pure pitch black background with vivid neon markers for maximum accessibility.
 */
export const HIGH_CONTRAST_THEME: Theme = {
  background: '#000000',
  gridLines: '#333333',
  empty: '#000000',
  wall: '#ffffff',
  weight: '#ff8800',
  weightText: '#000000',
  start: '#00ff66',
  target: '#ff0055',
  stop: '#ffff00',
  visited: 'rgba(0, 200, 255, 0.7)',
  visitedForward: 'rgba(0, 200, 255, 0.8)',
  visitedBackward: 'rgba(255, 0, 200, 0.8)',
  frontier: 'rgba(255, 255, 255, 0.9)',
  path: '#ffff00',
  pathGlow: 'rgba(255, 255, 0, 0.85)',
};

export const DEFAULT_THEME = CYBERPUNK_THEME;

export type ThemeName = 'cyberpunk' | 'light' | 'high-contrast';

export const THEMES: Record<ThemeName, Theme> = {
  cyberpunk: CYBERPUNK_THEME,
  light: LIGHT_THEME,
  'high-contrast': HIGH_CONTRAST_THEME,
};

/**
 * Retrieves a theme by name with fallback to default theme.
 */
export function getTheme(name: string): Theme {
  return THEMES[name as ThemeName] ?? DEFAULT_THEME;
}
