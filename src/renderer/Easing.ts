/**
 * Easing and interpolation utilities for Canvas visual animations.
 */

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(color: string): RGBA {
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
      a: 1,
    };
  }

  const rgbaMatch = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbaMatch) {
    return {
      r: parseFloat(rgbaMatch[1]),
      g: parseFloat(rgbaMatch[2]),
      b: parseFloat(rgbaMatch[3]),
      a: rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1,
    };
  }

  return { r: 6, g: 182, b: 212, a: 1 };
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const col1 = parseColor(c1);
  const col2 = parseColor(c2);
  const r = Math.round(lerp(col1.r, col2.r, t));
  const g = Math.round(lerp(col1.g, col2.g, t));
  const b = Math.round(lerp(col1.b, col2.b, t));
  const a = +(lerp(col1.a, col2.a, t).toFixed(3));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
