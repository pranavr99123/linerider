export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, value) => (value - a) / (b - a || 1);

export function makeId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function vec(x = 0, y = 0) {
  return { x, y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a, s) {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function len(a) {
  return Math.hypot(a.x, a.y);
}

export function normalize(a) {
  const length = len(a) || 1;
  return { x: a.x / length, y: a.y / length };
}

export function perp(a) {
  return { x: -a.y, y: a.x };
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function closestPointOnSegment(point, a, b) {
  const ab = sub(b, a);
  const t = clamp(dot(sub(point, a), ab) / (dot(ab, ab) || 1), 0, 1);
  const projection = { x: a.x + ab.x * t, y: a.y + ab.y * t };
  return { point: projection, t };
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function roundToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

export function projectVelocity(velocity, tangent, normal) {
  return { tangent: dot(velocity, tangent), normal: dot(velocity, normal) };
}

export function angleFromPoints(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}
