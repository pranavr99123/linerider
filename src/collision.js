import { LINE_TYPES } from "./config.js";
import { closestPointOnSegment, dist, dot, len, normalize, perp, projectVelocity, scale, sub } from "./utils.js";

export function buildDynamicSegments(objects, time) {
  const segments = [];
  for (const object of objects) {
    if (object.active === false) continue;
    if (object.type === "movingPlatform") {
      const phase = Math.sin(time * object.speed + object.phase);
      const dx = object.offsetX * phase;
      const dy = object.offsetY * phase;
      segments.push({ id: object.id, x1: object.x1 + dx, y1: object.y1 + dy, x2: object.x2 + dx, y2: object.y2 + dy, type: "normal", dynamic: true });
    }
    if (object.type === "rotatingArm") {
      const angle = time * object.speed + object.phase;
      const dx = Math.cos(angle) * object.length;
      const dy = Math.sin(angle) * object.length;
      segments.push({ id: object.id, x1: object.centerX - dx, y1: object.centerY - dy, x2: object.centerX + dx, y2: object.centerY + dy, type: "bounce", dynamic: true });
    }
  }
  return segments;
}

export function resolvePointVsSegments(point, segments, vehicleTraction) {
  point.contact = null;
  let best = null;
  for (const segment of segments) {
    if (segment.active === false) continue;
    const a = { x: segment.x1, y: segment.y1 };
    const b = { x: segment.x2, y: segment.y2 };
    const tangent = normalize(sub(b, a));
    let normal = perp(tangent);
    const projection = closestPointOnSegment(point, a, b);
    if ((projection.t <= 0.0001 || projection.t >= 0.9999) && !hasConnectedEndpoint(segment, projection.t <= 0.0001 ? a : b, segments)) {
      continue;
    }
    const delta = sub(point, projection.point);
    const distance = len(delta);
    if (distance > point.radius + 0.5) continue;
    if (distance > 0.001) normal = scale(delta, 1 / distance);
    const style = LINE_TYPES[segment.type] || LINE_TYPES.normal;
    const velocity = { x: point.x - point.prevX, y: point.y - point.prevY };
    const relativeNormal = dot(velocity, normal);
    if (style.oneWay && relativeNormal <= -0.5) continue;
    const penetration = point.radius - distance;
    if (!best || penetration > best.penetration) {
      best = { segment, tangent, normal, projection: projection.point, penetration, style };
    }
  }
  if (!best) return null;
  point.x += best.normal.x * (best.penetration + 0.4);
  point.y += best.normal.y * (best.penetration + 0.4);
  const velocity = { x: point.x - point.prevX, y: point.y - point.prevY };
  const components = projectVelocity(velocity, best.tangent, best.normal);
  const hardContact = best.penetration >= 0.15;
  let tangentVel = components.tangent;
  if (hardContact) {
    tangentVel *= best.style.friction * vehicleTraction;
    tangentVel += (best.style.tangentAccel + best.style.conveyor) / 120;
  }
  let normalVel = components.normal;
  if (normalVel > 0) normalVel = -normalVel * best.style.restitution;
  const newVelocity = { x: best.tangent.x * tangentVel + best.normal.x * normalVel, y: best.tangent.y * tangentVel + best.normal.y * normalVel };
  point.prevX = point.x - newVelocity.x;
  point.prevY = point.y - newVelocity.y;
  point.contact = { point: best.projection, tangent: best.tangent, normal: best.normal, segmentId: best.segment.id, segmentType: best.segment.type, hardContact };
  return best;
}

function hasConnectedEndpoint(segment, endpoint, segments) {
  for (const other of segments) {
    if (other.id === segment.id || other.active === false) continue;
    const otherA = { x: other.x1, y: other.y1 };
    const otherB = { x: other.x2, y: other.y2 };
    if (dist(otherA, endpoint) < 0.5 || dist(otherB, endpoint) < 0.5) {
      return true;
    }
  }
  return false;
}

export function detectCheckpointHit(center, checkpoint, radius) {
  return dist(center, checkpoint) <= radius;
}

export function detectRectHit(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}
