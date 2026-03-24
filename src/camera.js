import { clamp, lerp } from "./utils.js";
import { WORLD_BOUNDS } from "./config.js";

export class Camera {
  constructor(canvas) {
    this.canvas = canvas;
    this.position = { x: 600, y: 240 };
    this.target = { x: 600, y: 240 };
    this.zoom = 1;
    this.targetZoom = 1;
    this.follow = false;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
  }

  update(dt, followTarget = null) {
    if (this.follow && followTarget) {
      this.target.x = followTarget.x;
      this.target.y = followTarget.y - 70;
    }
    this.position.x = lerp(this.position.x, clamp(this.target.x, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX), 1 - Math.exp(-dt * 9));
    this.position.y = lerp(this.position.y, clamp(this.target.y, WORLD_BOUNDS.minY, WORLD_BOUNDS.maxY), 1 - Math.exp(-dt * 9));
    this.zoom = lerp(this.zoom, clamp(this.targetZoom, 0.18, 3.4), 1 - Math.exp(-dt * 10));
  }

  worldToScreen(point) {
    return {
      x: (point.x - this.position.x) * this.zoom + this.canvas.width / 2 / window.devicePixelRatio,
      y: (point.y - this.position.y) * this.zoom + this.canvas.height / 2 / window.devicePixelRatio,
    };
  }

  screenToWorld(point) {
    return {
      x: (point.x - this.canvas.width / 2 / window.devicePixelRatio) / this.zoom + this.position.x,
      y: (point.y - this.canvas.height / 2 / window.devicePixelRatio) / this.zoom + this.position.y,
    };
  }

  pan(dx, dy) {
    this.target.x -= dx / this.zoom;
    this.target.y -= dy / this.zoom;
  }

  zoomAt(delta, screenPoint) {
    const before = this.screenToWorld(screenPoint);
    this.targetZoom *= delta > 0 ? 0.88 : 1.14;
    this.targetZoom = clamp(this.targetZoom, 0.18, 3.4);
    const after = this.screenToWorld(screenPoint);
    this.target.x += before.x - after.x;
    this.target.y += before.y - after.y;
  }
}
