import { deepClone } from "./utils.js";

export class ReplaySystem {
  constructor() {
    this.frames = [];
    this.bestFrames = [];
    this.playhead = 0;
    this.recording = true;
  }

  reset() {
    this.frames = [];
    this.playhead = 0;
    this.recording = true;
  }

  record(vehicle, time) {
    if (!this.recording) return;
    this.frames.push({
      time,
      angle: vehicle.angle,
      crashed: vehicle.crashed,
      points: vehicle.points.map((point) => ({ x: point.x, y: point.y, radius: point.radius })),
    });
  }

  setBestRun() {
    if (this.frames.length > 0) this.bestFrames = deepClone(this.frames);
  }

  scrub(value) {
    this.playhead = Math.max(0, Math.min(this.frames.length - 1, value));
  }

  getFrame() {
    return this.frames[this.playhead] || null;
  }

  getGhostFrame(index) {
    if (!this.bestFrames.length) return null;
    return this.bestFrames[Math.min(index, this.bestFrames.length - 1)] || null;
  }
}
