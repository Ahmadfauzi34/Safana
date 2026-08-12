const WX = 22;
const WZ = -16;
const WATER_R = 8;
const WATER_LEVEL = -0.55;

export const SAVANNAH_CONSTANTS = {
  WX,
  WZ,
  WATER_R,
  WATER_LEVEL,
  MAP_SIZE: 300,
  SEGMENTS: 150,
};

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

export function rnd2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function vnoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = rnd2(xi, yi);
  const b = rnd2(xi + 1, yi);
  const c = rnd2(xi, yi + 1);
  const d = rnd2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, y: number, oct = 4): number {
  let v = 0;
  let a = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * vnoise(x * f, y * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

export function pathZ(x: number): number {
  return WZ + Math.sin((x - WX) * 0.045) * 18 + (x - WX) * 0.1;
}

export function pathDist(x: number, z: number): number {
  return Math.abs(z - pathZ(x));
}

export function terrainH(x: number, z: number): number {
  let h =
    (fbm(x * 0.02 + 3.1, z * 0.02 + 7.7, 4) * 2 - 1) * 3.4 +
    (fbm(x * 0.09 + 1.1, z * 0.09 + 4.4, 3) * 2 - 1) * 0.9;
  const d = Math.hypot(x - WX, z - WZ);
  h = lerp(h, -2.3, smoothstep(WATER_R * 2.2, WATER_R * 0.55, d));
  h -= Math.max(0, 1 - pathDist(x, z) / 3.5) * 0.3;
  return h;
}

export function validSpot(
  x: number,
  z: number,
  waterGap: number,
  minH: number
): number | null {
  if (Math.hypot(x - WX, z - WZ) < WATER_R + waterGap) return null;
  const h = terrainH(x, z);
  if (h < WATER_LEVEL + minH) return null;
  return h;
}
