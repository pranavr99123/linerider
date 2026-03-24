import { DEFAULT_TRACK, GRID_SIZE, HOVER_RADIUS, SNAP_RADIUS } from "./config.js";
import { closestPointOnSegment, deepClone, dist, makeId, roundToGrid } from "./utils.js";

export class TrackModel {
  constructor() {
    this.reset();
  }

  reset() {
    this.data = deepClone(DEFAULT_TRACK);
    this.hoveredSegmentId = null;
    this.hoveredGravityZoneId = null;
    this.selectedSegmentId = null;
    this.selectedGravityZoneId = null;
    this.undoStack = [];
    this.redoStack = [];
    this.teleportPairSeed = null;
  }

  snapshot() {
    return deepClone(this.data);
  }

  load(data) {
    this.data = deepClone(data);
    this.hoveredSegmentId = null;
    this.hoveredGravityZoneId = null;
    this.selectedSegmentId = null;
    this.selectedGravityZoneId = null;
    this.undoStack = [];
    this.redoStack = [];
    this.teleportPairSeed = null;
  }

  pushHistory() {
    this.undoStack.push(this.snapshot());
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(this.snapshot());
    this.data = this.undoStack.pop();
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(this.snapshot());
    this.data = this.redoStack.pop();
    return true;
  }

  addSegment(segment) {
    this.data.segments.push({ id: makeId("seg"), active: true, ...segment });
  }

  updateSegment(id, updates) {
    const segment = this.data.segments.find((entry) => entry.id === id);
    if (segment) Object.assign(segment, updates);
  }

  addCheckpoint(position) {
    this.data.checkpoints.push({ id: makeId("cp"), x: position.x, y: position.y });
  }

  addPowerup(type, position) {
    let pairId = null;
    if (type === "teleport") {
      pairId = this.teleportPairSeed || makeId("tele");
      this.teleportPairSeed = this.teleportPairSeed ? null : pairId;
    }
    this.data.powerups.push({ id: makeId("power"), type, x: position.x, y: position.y, active: true, pairId });
  }

  addObject(type, a, b) {
    if (type === "movingPlatform") {
      this.data.objects.push({ id: makeId("obj"), type, x1: a.x, y1: a.y, x2: b.x, y2: b.y, offsetX: 200, offsetY: -60, speed: 0.8, phase: Math.random() * Math.PI * 2, active: true });
    }
    if (type === "rotatingArm") {
      this.data.objects.push({ id: makeId("obj"), type, centerX: a.x, centerY: a.y, length: Math.max(60, dist(a, b)), speed: 1.2, phase: Math.random() * Math.PI * 2, active: true });
    }
  }

  addGravityZone(a, b, settings = { gravity: { x: 0, y: -900 }, drag: 0.0002 }) {
    this.data.gravityZones.push({ id: makeId("gzone"), x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y), gravity: { x: settings.gravity.x, y: settings.gravity.y }, drag: settings.drag, active: true });
  }

  eraseNear(point, radius = 20) {
    const before = this.data.segments.length + this.data.powerups.length + this.data.checkpoints.length + this.data.objects.length + this.data.gravityZones.length;
    this.data.segments = this.data.segments.filter((segment) => this.distanceToSegment(point, segment) > radius);
    this.data.powerups = this.data.powerups.filter((item) => dist(point, item) > radius);
    this.data.checkpoints = this.data.checkpoints.filter((item) => dist(point, item) > radius);
    this.data.objects = this.data.objects.filter((item) => {
      if (item.type === "movingPlatform") {
        return this.distanceToSegment(point, item) > radius;
      }
      if (item.type === "rotatingArm") {
        return dist(point, { x: item.centerX, y: item.centerY }) > item.length + radius;
      }
      return true;
    });
    this.data.gravityZones = this.data.gravityZones.filter((zone) => !this.pointHitsRect(point, zone, radius));
    if (dist(point, this.data.start) <= radius) {
      this.data.start = { x: DEFAULT_TRACK.start.x, y: DEFAULT_TRACK.start.y };
    }
    if (this.data.finish) {
      const finishMid = { x: (this.data.finish.x1 + this.data.finish.x2) * 0.5, y: (this.data.finish.y1 + this.data.finish.y2) * 0.5 };
      if (dist(point, finishMid) <= radius) {
        this.data.finish = deepClone(DEFAULT_TRACK.finish);
      }
    }
    return before !== this.data.segments.length + this.data.powerups.length + this.data.checkpoints.length + this.data.objects.length + this.data.gravityZones.length;
  }

  findHoverSegment(point, radius = HOVER_RADIUS) {
    let bestId = null;
    let bestDistance = Infinity;
    for (const segment of this.getActiveSegments()) {
      const distance = this.distanceToSegment(point, segment);
      if (distance < radius && distance < bestDistance) {
        bestId = segment.id;
        bestDistance = distance;
      }
    }
    this.hoveredSegmentId = bestId;
    return bestId;
  }

  findHoverGravityZone(point) {
    const zone = this.data.gravityZones.find((entry) => this.pointHitsRect(point, entry, 0));
    this.hoveredGravityZoneId = zone?.id || null;
    return this.hoveredGravityZoneId;
  }

  selectSegment(id) {
    this.selectedSegmentId = id;
    this.selectedGravityZoneId = null;
  }

  selectGravityZone(id) {
    this.selectedGravityZoneId = id;
    this.selectedSegmentId = null;
  }

  getSelectedSegment() {
    return this.data.segments.find((segment) => segment.id === this.selectedSegmentId) || null;
  }

  moveSelectedSegment(delta) {
    const segment = this.getSelectedSegment();
    if (!segment) return;
    segment.x1 += delta.x;
    segment.y1 += delta.y;
    segment.x2 += delta.x;
    segment.y2 += delta.y;
  }

  getSelectedGravityZone() {
    return this.data.gravityZones.find((zone) => zone.id === this.selectedGravityZoneId) || null;
  }

  moveSelectedGravityZone(delta) {
    const zone = this.getSelectedGravityZone();
    if (!zone) return;
    zone.x += delta.x;
    zone.y += delta.y;
  }

  updateGravityZone(id, updates) {
    const zone = this.data.gravityZones.find((entry) => entry.id === id);
    if (!zone) return;
    Object.assign(zone, updates);
  }

  snapPoint(point, useGrid, useEndpoints) {
    let result = { ...point };
    if (useGrid) {
      result.x = roundToGrid(result.x, GRID_SIZE);
      result.y = roundToGrid(result.y, GRID_SIZE);
    }
    if (useEndpoints) {
      const endpoint = this.findNearbyEndpoint(result);
      if (endpoint) result = endpoint;
    }
    return result;
  }

  findNearbyEndpoint(point) {
    for (const segment of this.data.segments) {
      const a = { x: segment.x1, y: segment.y1 };
      const b = { x: segment.x2, y: segment.y2 };
      if (dist(a, point) <= SNAP_RADIUS) return a;
      if (dist(b, point) <= SNAP_RADIUS) return b;
    }
    return null;
  }

  distanceToSegment(point, segment) {
    return dist(point, closestPointOnSegment(point, { x: segment.x1, y: segment.y1 }, { x: segment.x2, y: segment.y2 }).point);
  }

  pointHitsRect(point, rect, radius) {
    return point.x >= rect.x - radius && point.x <= rect.x + rect.width + radius && point.y >= rect.y - radius && point.y <= rect.y + rect.height + radius;
  }

  getActiveSegments() {
    return this.data.segments.filter((segment) => segment.active !== false);
  }

  getSegmentById(id) {
    return this.data.segments.find((segment) => segment.id === id);
  }

  setStart(position) {
    this.data.start = { x: position.x, y: position.y };
  }

  setFinish(a, b) {
    this.data.finish = { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  }

  buildCurveSegments(points, type) {
    const [p0, p1, p2] = points;
    const parts = 14;
    for (let i = 0; i < parts; i += 1) {
      const t0 = i / parts;
      const t1 = (i + 1) / parts;
      const a = this.sampleQuadratic(p0, p1, p2, t0);
      const b = this.sampleQuadratic(p0, p1, p2, t1);
      this.addSegment({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, type });
    }
  }

  sampleQuadratic(p0, p1, p2, t) {
    const mt = 1 - t;
    return { x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x, y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y };
  }
}
