import { CHECKPOINT_RADIUS, GRID_SIZE, LINE_TYPES, OBJECT_TYPES, POWERUP_TYPES } from "./config.js";
import { clamp } from "./utils.js";

export class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.ctx = canvas.getContext("2d");
  }

  render(state) {
    const { ctx } = this;
    const ratio = window.devicePixelRatio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawBackdrop();
    this.drawGrid();
    this.drawGravityZones(state.track.data.gravityZones);
    this.drawSegments(state.track.data.segments, state.track.hoveredSegmentId, state.track.selectedSegmentId);
    this.drawObjects(state.dynamicSegments, state.track.data.objects);
    this.drawStartFinish(state.track.data.start, state.track.data.finish);
    this.drawCheckpoints(state.track.data.checkpoints, state.physics.collectedCheckpoints);
    this.drawPowerups(state.track.data.powerups);
    this.drawTriggerZones(state.track.data.triggerZones);
    this.drawGhost(state.replayGhost);
    this.drawVehicle(state.vehicle, state.motionTrails);
    this.drawEditorPreview(state.editorPreview);
    if (state.debugOverlay) this.drawDebug(state);
  }

  drawBackdrop() {
    const ctx = this.ctx;
    ctx.save();
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(18, 42, 58, 0.12)");
    gradient.addColorStop(1, "rgba(6, 10, 15, 0.18)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawGrid() {
    const ctx = this.ctx;
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const topLeft = this.camera.screenToWorld({ x: 0, y: 0 });
    const bottomRight = this.camera.screenToWorld({ x: width, y: height });
    const startX = Math.floor(topLeft.x / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(bottomRight.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(topLeft.y / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(bottomRight.y / GRID_SIZE) * GRID_SIZE;
    ctx.save();
    ctx.strokeStyle = "rgba(145, 184, 205, 0.09)";
    ctx.lineWidth = 1;
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      const a = this.camera.worldToScreen({ x, y: startY });
      const b = this.camera.worldToScreen({ x, y: endY });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    for (let y = startY; y <= endY; y += GRID_SIZE) {
      const a = this.camera.worldToScreen({ x: startX, y });
      const b = this.camera.worldToScreen({ x: endX, y });
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawSegments(segments, hoveredId, selectedId) {
    const ctx = this.ctx;
    for (const segment of segments) {
      if (segment.active === false) continue;
      const style = LINE_TYPES[segment.type] || LINE_TYPES.normal;
      const a = this.camera.worldToScreen({ x: segment.x1, y: segment.y1 });
      const b = this.camera.worldToScreen({ x: segment.x2, y: segment.y2 });
      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width + (segment.id === selectedId ? 3 : segment.id === hoveredId ? 2 : 0);
      if (segment.type === "breakable") ctx.setLineDash([10, 10]);
      if (segment.type === "conveyor") ctx.setLineDash([14, 8]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (segment.type === "oneway") {
        const mx = (a.x + b.x) * 0.5;
        const my = (a.y + b.y) * 0.5;
        ctx.fillStyle = style.color;
        ctx.beginPath();
        ctx.arc(mx, my, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawPowerups(powerups) {
    const ctx = this.ctx;
    for (const powerup of powerups) {
      if (powerup.active === false) continue;
      const style = POWERUP_TYPES[powerup.type];
      const p = this.camera.worldToScreen(powerup);
      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.fillStyle = `${style.color}22`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (powerup.type === "teleport") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawObjects(dynamicSegments, objectData) {
    const ctx = this.ctx;
    for (const segment of dynamicSegments) {
      const object = objectData.find((entry) => entry.id === segment.id);
      const color = object ? OBJECT_TYPES[object.type].color : "#ffe37d";
      const a = this.camera.worldToScreen({ x: segment.x1, y: segment.y1 });
      const b = this.camera.worldToScreen({ x: segment.x2, y: segment.y2 });
      ctx.save();
      ctx.lineWidth = 5;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawCheckpoints(checkpoints, collected) {
    const ctx = this.ctx;
    for (const checkpoint of checkpoints) {
      const p = this.camera.worldToScreen(checkpoint);
      ctx.save();
      ctx.strokeStyle = collected.has(checkpoint.id) ? "#6af0c7" : "#7dd2ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, CHECKPOINT_RADIUS * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawStartFinish(start, finish) {
    const ctx = this.ctx;
    const s = this.camera.worldToScreen(start);
    ctx.save();
    ctx.fillStyle = "#6af0c7";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.fill();
    const a = this.camera.worldToScreen({ x: finish.x1, y: finish.y1 });
    const b = this.camera.worldToScreen({ x: finish.x2, y: finish.y2 });
    ctx.strokeStyle = "#ffd264";
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }

  drawTriggerZones(zones) {
    const ctx = this.ctx;
    for (const zone of zones) {
      const a = this.camera.worldToScreen({ x: zone.x, y: zone.y });
      ctx.save();
      ctx.fillStyle = "rgba(255, 125, 125, 0.12)";
      ctx.strokeStyle = "rgba(255, 125, 125, 0.6)";
      ctx.lineWidth = 2;
      ctx.fillRect(a.x, a.y, zone.width * this.camera.zoom, zone.height * this.camera.zoom);
      ctx.strokeRect(a.x, a.y, zone.width * this.camera.zoom, zone.height * this.camera.zoom);
      ctx.restore();
    }
  }

  drawGravityZones(zones) {
    const ctx = this.ctx;
    for (const zone of zones) {
      if (zone.active === false) continue;
      const a = this.camera.worldToScreen({ x: zone.x, y: zone.y });
      ctx.save();
      ctx.fillStyle = "rgba(154, 180, 255, 0.09)";
      ctx.strokeStyle = "rgba(154, 180, 255, 0.42)";
      ctx.lineWidth = 2;
      ctx.fillRect(a.x, a.y, zone.width * this.camera.zoom, zone.height * this.camera.zoom);
      ctx.strokeRect(a.x, a.y, zone.width * this.camera.zoom, zone.height * this.camera.zoom);
      ctx.restore();
    }
  }

  drawVehicle(vehicle, motionTrails) {
    const ctx = this.ctx;
    const center = this.camera.worldToScreen(vehicle.getCenter());
    if (motionTrails) {
      vehicle.trails = vehicle.trails || [];
      vehicle.trails.push(vehicle.getCenter());
      if (vehicle.trails.length > 24) vehicle.trails.shift();
      ctx.save();
      for (let i = 1; i < vehicle.trails.length; i += 1) {
        const alpha = i / vehicle.trails.length;
        const a = this.camera.worldToScreen(vehicle.trails[i - 1]);
        const b = this.camera.worldToScreen(vehicle.trails[i]);
        ctx.strokeStyle = `rgba(106, 240, 199, ${alpha * 0.25})`;
        ctx.lineWidth = alpha * 3;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = vehicle.crashed ? "#ff7d7d" : vehicle.definition.color;
    ctx.fillStyle = `${vehicle.crashed ? "#ff7d7d" : vehicle.definition.color}55`;
    ctx.lineWidth = 3;
    if (vehicle.points.length > 1) {
      for (const constraint of vehicle.constraints) {
        const a = this.camera.worldToScreen(vehicle.points[constraint.a]);
        const b = this.camera.worldToScreen(vehicle.points[constraint.b]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const point of vehicle.points) {
      const p = this.camera.worldToScreen(point);
      ctx.beginPath();
      ctx.arc(p.x, p.y, point.radius * this.camera.zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    if (vehicle.shield > 0) {
      ctx.strokeStyle = "#8fffb4";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 26 * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGhost(frame) {
    if (!frame) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    for (const point of frame.points) {
      const p = this.camera.worldToScreen(point);
      ctx.beginPath();
      ctx.arc(p.x, p.y, point.radius * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEditorPreview(preview) {
    if (!preview) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    if (preview.type === "line") {
      const a = this.camera.worldToScreen(preview.a);
      const b = this.camera.worldToScreen(preview.b);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    if (preview.type === "box") {
      const a = this.camera.worldToScreen(preview.a);
      ctx.strokeRect(a.x, a.y, preview.width * this.camera.zoom, preview.height * this.camera.zoom);
    }
    if (preview.type === "curve") {
      const pts = preview.points.map((point) => this.camera.worldToScreen(point));
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawDebug(state) {
    const ctx = this.ctx;
    ctx.save();
    for (const collision of state.physics.collisions) {
      const p = this.camera.worldToScreen(collision.projection);
      ctx.fillStyle = "#ff6262";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7dedff";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + collision.normal.x * 28, p.y + collision.normal.y * 28);
      ctx.stroke();
      ctx.strokeStyle = "#ffe97a";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + collision.tangent.x * 28, p.y + collision.tangent.y * 28);
      ctx.stroke();
    }
    const center = this.camera.worldToScreen(state.vehicle.getCenter());
    const velocity = state.vehicle.getVelocity();
    ctx.strokeStyle = "#6af0c7";
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + clamp(velocity.x * 0.08 * this.camera.zoom, -120, 120), center.y + clamp(velocity.y * 0.08 * this.camera.zoom, -120, 120));
    ctx.stroke();
    ctx.restore();
  }
}
