import { CHECKPOINT_RADIUS, FIXED_DT, LINE_TYPES, MAX_SUBSTEPS, PHYSICS_MODES } from "./config.js";
import { buildDynamicSegments, detectCheckpointHit, detectRectHit, resolvePointVsSegments } from "./collision.js";
import { dist } from "./utils.js";
import { collectPowerups } from "./powerups.js";

function zoneGravity(zone, fallback) {
  return zone.gravity ? { ...zone.gravity } : { ...fallback };
}

export class PhysicsEngine {
  constructor(track, vehicle, replay) {
    this.track = track;
    this.vehicle = vehicle;
    this.replay = replay;
    this.accumulator = 0;
    this.time = 0;
    this.runtime = 0;
    this.completed = false;
    this.finishedTime = null;
    this.status = "Editing";
    this.collectedCheckpoints = new Set();
    this.lastCheckpoint = track.data.start;
    this.gravity = { ...PHYSICS_MODES.earth.gravity };
    this.airDrag = PHYSICS_MODES.earth.airDrag;
    this.maxVelocity = PHYSICS_MODES.earth.maxVelocity;
    this.collisions = [];
    this.crashElapsed = 0;
    this.respawnDelay = 1.25;
    this.grounded = false;
  }

  configureMode(modeKey) {
    const mode = PHYSICS_MODES[modeKey] || PHYSICS_MODES.earth;
    this.gravity = { ...mode.gravity };
    this.airDrag = mode.airDrag;
    this.maxVelocity = mode.maxVelocity;
  }

  reset() {
    this.accumulator = 0;
    this.time = 0;
    this.runtime = 0;
    this.completed = false;
    this.finishedTime = null;
    this.status = "Ready";
    this.collectedCheckpoints = new Set();
    this.lastCheckpoint = this.track.data.start;
    this.collisions = [];
    this.crashElapsed = 0;
    this.grounded = false;
    this.replay.reset();
  }

  stepFrame() {
    this.step(FIXED_DT);
  }

  update(dt) {
    const slowScale = this.vehicle.slowmoTimer > 0 ? 0.38 : 1;
    this.accumulator += Math.min(dt, 0.05) * slowScale;
    let loops = 0;
    while (this.accumulator >= FIXED_DT && loops < MAX_SUBSTEPS * 3) {
      this.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      loops += 1;
    }
  }

  step(dt) {
    this.time += dt;
    if (!this.vehicle.crashed && !this.completed) this.runtime += dt;
    if (this.vehicle.crashed) this.crashElapsed += dt;
    if (this.vehicle.magnetTimer > 0) this.vehicle.magnetTimer = Math.max(0, this.vehicle.magnetTimer - dt);
    if (this.vehicle.slowmoTimer > 0) this.vehicle.slowmoTimer = Math.max(0, this.vehicle.slowmoTimer - dt);
    if (this.vehicle.teleportCooldown > 0) this.vehicle.teleportCooldown = Math.max(0, this.vehicle.teleportCooldown - dt);

    const gravityZone = this.track.data.gravityZones.find((zone) => zone.active !== false && detectRectHit(this.vehicle.getCenter(), zone));
    const currentGravity = gravityZone ? zoneGravity(gravityZone, this.gravity) : this.gravity;
    const currentDrag = gravityZone ? gravityZone.drag : this.airDrag;
    const dynamicSegments = buildDynamicSegments(this.track.data.objects, this.time);
    const segments = [...this.track.getActiveSegments(), ...dynamicSegments];

    this.collisions = [];
    for (const point of this.vehicle.points) {
      const vx = point.x - point.prevX;
      const vy = point.y - point.prevY;
      point.prevX = point.x;
      point.prevY = point.y;
      point.x += vx * (1 - currentDrag) + currentGravity.x * dt * dt;
      point.y += vy * (1 - currentDrag) + currentGravity.y * dt * dt;
      const collision = resolvePointVsSegments(point, segments, this.vehicle.definition.traction);
      if (collision) {
        this.collisions.push(collision);
        if (collision.style.breakable) {
          const hit = this.track.getSegmentById(collision.segment.id);
          if (hit) hit.active = false;
        }
      }
    }
    this.grounded = this.vehicle.points.some((point) => point.contact?.hardContact);
    this.vehicle.grounded = this.grounded;

    if (this.vehicle.magnetTimer > 0) {
      const center = this.vehicle.getCenter();
      let closest = null;
      for (const segment of this.track.getActiveSegments()) {
        const mid = { x: (segment.x1 + segment.x2) * 0.5, y: (segment.y1 + segment.y2) * 0.5 };
        const d = dist(center, mid);
        if (!closest || d < closest.distance) closest = { mid, distance: d };
      }
      if (closest) {
        for (const point of this.vehicle.points) {
          point.x += (closest.mid.x - point.x) * 0.003;
          point.y += (closest.mid.y - point.y) * 0.003;
        }
      }
    }

    this.vehicle.solveConstraints(6);
    this.vehicle.updateAngle();
    this.vehicle.updateVisualState(dt);
    this.enforceVelocityClamp();
    this.evaluateState();
    this.vehicle.updateDetachedRider(currentGravity, currentDrag, dt);
    collectPowerups(this.track, this.vehicle, this);
    this.processCheckpoints();
    this.processFinish();
    this.replay.record(this.vehicle, this.runtime);
    this.status = this.completed ? "Finished" : this.vehicle.crashed ? "Crashed" : "Running";
  }

  enforceVelocityClamp() {
    for (const point of this.vehicle.points) {
      const vx = point.x - point.prevX;
      const vy = point.y - point.prevY;
      const speed = Math.hypot(vx, vy) * 120;
      if (speed > this.maxVelocity) {
        const factor = this.maxVelocity / speed;
        point.prevX = point.x - vx * factor;
        point.prevY = point.y - vy * factor;
      }
    }
  }

  evaluateState() {
    const speed = Math.hypot(this.vehicle.getVelocity().x, this.vehicle.getVelocity().y);
    const hardImpact = this.collisions.some((entry) => {
      const style = LINE_TYPES[entry.segment.type] || LINE_TYPES.normal;
      return style.restitution < 0.5 && entry.penetration > 5;
    });
    const violentWallStrike = this.collisions.some((entry) => {
      const point = this.vehicle.points.find((candidate) => candidate.contact?.segmentId === entry.segment.id);
      if (!point) return false;
      const velocity = { x: point.x - point.prevX, y: point.y - point.prevY };
      const impactAlongNormal = Math.abs(velocity.x * entry.normal.x + velocity.y * entry.normal.y) * 120;
      return point.contact?.hardContact && impactAlongNormal > this.vehicle.definition.crashSpeed * 0.58;
    });
    if (!this.vehicle.crashed && ((speed > this.vehicle.definition.crashSpeed && hardImpact) || violentWallStrike)) {
      if (this.vehicle.shield > 0) this.vehicle.shield = 0;
      else {
        this.vehicle.crash();
        this.crashElapsed = 0;
      }
    }
  }

  processCheckpoints() {
    const center = this.vehicle.getCenter();
    for (const checkpoint of this.track.data.checkpoints) {
      if (this.collectedCheckpoints.has(checkpoint.id)) continue;
      if (detectCheckpointHit(center, checkpoint, CHECKPOINT_RADIUS)) {
        this.collectedCheckpoints.add(checkpoint.id);
        this.lastCheckpoint = { x: checkpoint.x, y: checkpoint.y - 40 };
      }
    }
  }

  processFinish() {
    if (this.completed) return;
    const finish = this.track.data.finish;
    if (!finish) return;
    const center = this.vehicle.getCenter();
    const minX = Math.min(finish.x1, finish.x2) - 18;
    const maxX = Math.max(finish.x1, finish.x2) + 18;
    const minY = Math.min(finish.y1, finish.y2) - 18;
    const maxY = Math.max(finish.y1, finish.y2) + 18;
    const allCollected = this.collectedCheckpoints.size >= this.track.data.checkpoints.length;
    if (allCollected && center.x >= minX && center.x <= maxX && center.y >= minY && center.y <= maxY) {
      this.completed = true;
      this.finishedTime = this.runtime;
      this.replay.setBestRun();
    }
  }

  respawn() {
    this.vehicle.reset(this.lastCheckpoint);
    this.vehicle.setVelocity({ x: 0, y: 0 });
    this.vehicle.crashed = false;
    this.vehicle.shield = 0;
    this.vehicle.detachedRider = null;
    this.vehicle.grounded = false;
    this.crashElapsed = 0;
    this.grounded = false;
    this.status = "Running";
  }
}
