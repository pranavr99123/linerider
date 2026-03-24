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
    this.trails = [];
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
}
