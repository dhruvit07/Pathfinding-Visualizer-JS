import { describe, it, expect } from 'vitest';
import {
  Theme,
  CYBERPUNK_THEME,
  LIGHT_THEME,
  HIGH_CONTRAST_THEME,
  DEFAULT_THEME,
  THEMES,
  getTheme,
} from '../../src/renderer/Theme';

describe('Theme Palette and Configurations', () => {
  const REQUIRED_PROPERTIES: (keyof Theme)[] = [
    'background',
    'gridLines',
    'empty',
    'wall',
    'weight',
    'weightText',
    'start',
    'target',
    'stop',
    'visited',
    'visitedForward',
    'visitedBackward',
    'frontier',
    'path',
    'pathGlow',
  ];

  it('CYBERPUNK_THEME defines all required color tokens', () => {
    for (const prop of REQUIRED_PROPERTIES) {
      expect(CYBERPUNK_THEME[prop]).toBeDefined();
      expect(typeof CYBERPUNK_THEME[prop]).toBe('string');
      expect(CYBERPUNK_THEME[prop].length).toBeGreaterThan(0);
    }
  });

  it('LIGHT_THEME defines all required color tokens', () => {
    for (const prop of REQUIRED_PROPERTIES) {
      expect(LIGHT_THEME[prop]).toBeDefined();
      expect(typeof LIGHT_THEME[prop]).toBe('string');
      expect(LIGHT_THEME[prop].length).toBeGreaterThan(0);
    }
  });

  it('HIGH_CONTRAST_THEME defines all required color tokens', () => {
    for (const prop of REQUIRED_PROPERTIES) {
      expect(HIGH_CONTRAST_THEME[prop]).toBeDefined();
      expect(typeof HIGH_CONTRAST_THEME[prop]).toBe('string');
      expect(HIGH_CONTRAST_THEME[prop].length).toBeGreaterThan(0);
    }
  });

  it('DEFAULT_THEME is set to CYBERPUNK_THEME', () => {
    expect(DEFAULT_THEME).toBe(CYBERPUNK_THEME);
  });

  it('THEMES map contains all 3 themes', () => {
    expect(THEMES.cyberpunk).toBe(CYBERPUNK_THEME);
    expect(THEMES.light).toBe(LIGHT_THEME);
    expect(THEMES['high-contrast']).toBe(HIGH_CONTRAST_THEME);
  });

  it('getTheme returns correct theme by identifier with fallback', () => {
    expect(getTheme('cyberpunk')).toBe(CYBERPUNK_THEME);
    expect(getTheme('light')).toBe(LIGHT_THEME);
    expect(getTheme('high-contrast')).toBe(HIGH_CONTRAST_THEME);
    expect(getTheme('unknown-theme')).toBe(DEFAULT_THEME);
    expect(getTheme('')).toBe(DEFAULT_THEME);
  });

  it('ensures endpoint colors are distinct from background', () => {
    for (const theme of [CYBERPUNK_THEME, LIGHT_THEME, HIGH_CONTRAST_THEME]) {
      expect(theme.start).not.toEqual(theme.background);
      expect(theme.target).not.toEqual(theme.background);
      expect(theme.stop).not.toEqual(theme.background);
      expect(theme.path).not.toEqual(theme.background);
    }
  });
});
