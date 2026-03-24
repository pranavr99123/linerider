import { VEHICLES } from "./config.js";
import { add, angleFromPoints, len, scale, sub } from "./utils.js";

function createPoint(origin, local, vehicle) {
  return {
    x: origin.x + local.x,
    y: origin.y + local.y,
    prevX: origin.x + local.x,
    prevY: origin.y + local.y,
    radius: local.radius,
    mass: vehicle.mass / vehicle.points.length,
    contact: null,
  };
}

export class Vehicle {
  constructor(type, start) {
    this.configure(type, start);
  }

  configure(type, start) {
    this.type = type;
    this.definition = VEHICLES[type];
    this.points = this.definition.points.map((local) => createPoint(start, local, this.definition));
    this.constraints = this.definition.constraints.map((item) => ({ ...item }));
    this.angle = 0;
    this.crashed = false;
    this.shield = 0;
    this.magnetTimer = 0;
    this.slowmoTimer = 0;
    this.teleportCooldown = 0;
    this.invulnerabilityTimer = 0;
    this.trails = [];
    this.detachedRider = null;
    this.grounded = false;
    this.visualState = {
      rearWheelSpin: 0,
      frontWheelSpin: 0,
    };
  }

  reset(start) {
    this.configure(this.type, start);
  }

  getCenter() {
    const sum = this.points.reduce((acc, point) => add(acc, point), { x: 0, y: 0 });
    return scale(sum, 1 / this.points.length);
  }

  getVelocity() {
    const sum = this.points.reduce((acc, point) => add(acc, { x: point.x - point.prevX, y: point.y - point.prevY }), { x: 0, y: 0 });
    return scale(sum, 120 / this.points.length);
  }

  getPreviousCenter() {
    const sum = this.points.reduce((acc, point) => add(acc, { x: point.prevX, y: point.prevY }), { x: 0, y: 0 });
    return scale(sum, 1 / this.points.length);
  }

  setVelocity(velocity) {
    for (const point of this.points) {
      point.prevX = point.x - velocity.x / 120;
      point.prevY = point.y - velocity.y / 120;
    }
  }

  updateAngle() {
    if (this.points.length === 1) {
      const velocity = this.getVelocity();
      this.angle = Math.atan2(velocity.y, velocity.x);
      return;
    }
    this.angle = angleFromPoints(this.points[0], this.points[1]);
  }

  solveConstraints(iterations = 5) {
    for (let i = 0; i < iterations; i += 1) {
      for (const constraint of this.constraints) {
        const a = this.points[constraint.a];
        const b = this.points[constraint.b];
        const delta = sub(b, a);
        const distance = len(delta) || 1;
        const diff = (distance - constraint.length) / distance;
        const adjust = scale(delta, 0.5 * diff * constraint.stiffness);
        a.x += adjust.x;
        a.y += adjust.y;
        b.x -= adjust.x;
        b.y -= adjust.y;
      }
    }
  }

  updateVisualState() {
    const rearWheel = this.findRolePoint("rearWheel");
    const frontWheel = this.findRolePoint("frontWheel");
    if (rearWheel) {
      const rearDistance = Math.hypot(rearWheel.x - rearWheel.prevX, rearWheel.y - rearWheel.prevY);
      this.visualState.rearWheelSpin += rearDistance / Math.max(1, rearWheel.radius) * Math.sign(this.getVelocity().x || 1);
    }
    if (frontWheel) {
      const frontDistance = Math.hypot(frontWheel.x - frontWheel.prevX, frontWheel.y - frontWheel.prevY);
      this.visualState.frontWheelSpin += frontDistance / Math.max(1, frontWheel.radius) * Math.sign(this.getVelocity().x || 1);
    }
  }

  crash() {
    if (this.crashed) {
      return;
    }
    this.crashed = true;
    const velocity = this.getVelocity();
    const center = this.getCenter();
    const headPoint = this.findRolePoint("head") || this.points[0];
    const seatPoint = this.findRolePoint("seat") || center;
    const handsPoint = this.findRolePoint("hands") || { x: seatPoint.x + 8, y: seatPoint.y - 2 };
    this.detachedRider = {
      points: [
        createDetachedPoint(headPoint, { x: velocity.x * 0.011 + 1.2, y: velocity.y * 0.011 - 2.5 }, 6),
        createDetachedPoint(seatPoint, { x: velocity.x * 0.01 - 0.8, y: velocity.y * 0.01 - 1.4 }, 4),
        createDetachedPoint(handsPoint, { x: velocity.x * 0.01 + 2.6, y: velocity.y * 0.01 - 1.1 }, 3),
        createDetachedPoint({ x: seatPoint.x - 8, y: seatPoint.y + 14 }, { x: velocity.x * 0.01 - 2.1, y: velocity.y * 0.01 + 1.5 }, 3),
        createDetachedPoint({ x: seatPoint.x + 7, y: seatPoint.y + 14 }, { x: velocity.x * 0.01 + 1.7, y: velocity.y * 0.01 + 1.1 }, 3),
      ],
      links: [
        [0, 1, 18],
        [1, 2, 16],
        [1, 3, 18],
        [1, 4, 18],
      ],
    };
  }

  updateDetachedRider(gravity, drag, dt) {
    if (!this.detachedRider) {
      return;
    }
    for (const point of this.detachedRider.points) {
      const vx = point.x - point.prevX;
      const vy = point.y - point.prevY;
      point.prevX = point.x;
      point.prevY = point.y;
      point.x += vx * (1 - drag * 0.4) + gravity.x * dt * dt;
      point.y += vy * (1 - drag * 0.4) + gravity.y * dt * dt;
    }
    for (let i = 0; i < 3; i += 1) {
      for (const [aIndex, bIndex, lengthTarget] of this.detachedRider.links) {
        const a = this.detachedRider.points[aIndex];
        const b = this.detachedRider.points[bIndex];
        const delta = sub(b, a);
        const distance = len(delta) || 1;
        const diff = (distance - lengthTarget) / distance;
        const adjust = scale(delta, 0.5 * diff);
        a.x += adjust.x;
        a.y += adjust.y;
        b.x -= adjust.x;
        b.y -= adjust.y;
      }
    }
  }

  findRolePoint(role) {
    const index = this.definition.points.findIndex((point) => point.role === role);
    return index >= 0 ? this.points[index] : null;
  }
}

function createDetachedPoint(origin, impulse, radius) {
  return {
    x: origin.x,
    y: origin.y,
    prevX: origin.x - impulse.x,
    prevY: origin.y - impulse.y,
    radius,
  };
}
