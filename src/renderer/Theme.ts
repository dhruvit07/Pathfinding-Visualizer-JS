/**
 * Theme definition and color palettes for the canvas visualizer.
 */

export interface Theme {
  name: string;
  background: string;
  gridLines: string;
  empty: string;
  wall: string;
  wallBorder: string;
  wallGlow: string;
  weight: string;
  weightBorder: string;
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
  pathCore: string;
  pathBloom: string;
}

export interface ThemeGradient {
  forward: string[];
  backward: string[];
}

export const THEME_GRADIENTS: Record<string, ThemeGradient> = {
  cyberpunk: {
    forward: [
      'rgba(3, 105, 161, 0.75)',   // Deep navy / ocean
      'rgba(2, 132, 199, 0.80)',   // Royal blue
      'rgba(6, 182, 212, 0.85)',   // Vibrant turquoise
      'rgba(34, 211, 238, 0.95)',  // Glowing cyan
    ],
    backward: [
      'rgba(134, 25, 143, 0.75)',  // Deep plum
      'rgba(192, 38, 211, 0.80)',  // Rich purple
      'rgba(236, 72, 153, 0.85)',  // Hot fuchsia
      'rgba(244, 114, 182, 0.95)', // Neon pink
    ],
  },
  light: {
    forward: [
      'rgba(191, 219, 254, 0.75)',
      'rgba(147, 197, 253, 0.80)',
      'rgba(96, 165, 250, 0.85)',
      'rgba(59, 130, 246, 0.90)',
    ],
    backward: [
      'rgba(253, 232, 240, 0.75)',
      'rgba(251, 207, 232, 0.80)',
      'rgba(244, 114, 182, 0.85)',
      'rgba(236, 72, 153, 0.90)',
    ],
  },
  'high-contrast': {
    forward: [
      'rgba(0, 100, 200, 0.8)',
      'rgba(0, 160, 230, 0.85)',
      'rgba(0, 210, 255, 0.9)',
      'rgba(50, 240, 255, 0.95)',
    ],
    backward: [
      'rgba(180, 0, 120, 0.8)',
      'rgba(220, 0, 160, 0.85)',
      'rgba(255, 0, 200, 0.9)',
      'rgba(255, 80, 220, 0.95)',
    ],
  },
};

export function getThemeGradients(theme: Theme | string): ThemeGradient {
  const name = typeof theme === 'string' ? theme : theme.name;
  return THEME_GRADIENTS[name] || THEME_GRADIENTS.cyberpunk;
}

/**
 * Cyberpunk Theme (Default)
 * High-tech aesthetic featuring dark obsidian/navy background, vibrant cyan visited nodes
 * with 4-tier radiant gradient transitions (Navy -> Royal Blue -> Turquoise -> Glowing Cyan),
 * electric golden laser beam shortest path with luminous bloom and white-hot core.
 */
export const CYBERPUNK_THEME: Theme = {
  name: 'cyberpunk',
  background: '#0b0f19',
  gridLines: 'rgba(51, 65, 85, 0.35)',
  empty: '#0f172a',
  wall: '#1e293b',
  wallBorder: 'rgba(148, 163, 184, 0.15)',
  wallGlow: 'rgba(30, 41, 59, 0.8)',
  weight: '#8b5cf6',
  weightBorder: 'rgba(167, 139, 250, 0.3)',
  weightText: '#ffffff',
  start: '#10b981',
  target: '#f43f5e',
  stop: '#f59e0b',
  visited: 'rgba(6, 182, 212, 0.45)',
  visitedForward: 'rgba(6, 182, 212, 0.65)',
  visitedBackward: 'rgba(236, 72, 153, 0.65)',
  frontier: 'rgba(59, 130, 246, 0.75)',
  path: '#fbbf24',
  pathGlow: 'rgba(251, 191, 36, 0.65)',
  pathCore: '#ffffff',
  pathBloom: 'rgba(6, 182, 212, 0.35)',
};

/**
 * Clean Light Theme
 * Minimalist, high-clarity slate palette suitable for daytime use and presentation decks.
 */
export const LIGHT_THEME: Theme = {
  name: 'light',
  background: '#f8fafc',
  gridLines: '#e2e8f0',
  empty: '#ffffff',
  wall: '#334155',
  wallBorder: 'rgba(51, 65, 85, 0.2)',
  wallGlow: 'rgba(226, 232, 240, 0.5)',
  weight: '#93c5fd',
  weightBorder: 'rgba(59, 130, 246, 0.3)',
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
  pathCore: '#ffffff',
  pathBloom: 'rgba(245, 158, 11, 0.2)',
};

/**
 * High Contrast Theme
 * Pure pitch black background with vivid neon markers for maximum accessibility.
 */
export const HIGH_CONTRAST_THEME: Theme = {
  name: 'high-contrast',
  background: '#000000',
  gridLines: '#333333',
  empty: '#000000',
  wall: '#ffffff',
  wallBorder: '#ffffff',
  wallGlow: 'rgba(255, 255, 255, 0.8)',
  weight: '#ff8800',
  weightBorder: '#ffa733',
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
  pathCore: '#ffffff',
  pathBloom: 'rgba(0, 255, 255, 0.5)',
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
