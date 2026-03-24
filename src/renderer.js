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
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    ctx.save();
    ctx.fillStyle = "#ffffff";
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
    ctx.strokeStyle = "rgba(0, 0, 0, 0.06)";
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
      ctx.lineWidth = style.width + (segment.id === selectedId ? 2 : segment.id === hoveredId ? 1.5 : 0);
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
        ctx.arc(mx, my, 3, 0, Math.PI * 2);
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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      if (powerup.type === "teleport") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawObjects(dynamicSegments, objectData) {
    const ctx = this.ctx;
    for (const segment of dynamicSegments) {
      const object = objectData.find((entry) => entry.id === segment.id);
      const color = object ? OBJECT_TYPES[object.type].color : "#111111";
      const a = this.camera.worldToScreen({ x: segment.x1, y: segment.y1 });
      const b = this.camera.worldToScreen({ x: segment.x2, y: segment.y2 });
      ctx.save();
      ctx.lineWidth = 4;
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
      ctx.strokeStyle = collected.has(checkpoint.id) ? "#000000" : "#777777";
      ctx.lineWidth = 2;
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
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fill();
    const a = this.camera.worldToScreen({ x: finish.x1, y: finish.y1 });
    const b = this.camera.worldToScreen({ x: finish.x2, y: finish.y2 });
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
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
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
      ctx.lineWidth = 1.5;
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
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
      ctx.lineWidth = 1.5;
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
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.12})`;
        ctx.lineWidth = Math.max(1, alpha * 2);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = vehicle.crashed ? "#444444" : vehicle.definition.color;
    ctx.lineWidth = 2.5;
    this.drawVehicleShape(vehicle);
    if (vehicle.shield > 0) {
      ctx.strokeStyle = "#333333";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 24 * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawVehicleShape(vehicle) {
    const type = vehicle.definition.renderType;
    if (type === "bike") return this.drawBike(vehicle);
    if (type === "capsule") return this.drawCapsule(vehicle);
    return this.drawSled(vehicle);
  }

  drawSled(vehicle) {
    const ctx = this.ctx;
    const rear = this.camera.worldToScreen(vehicle.points[0]);
    const front = this.camera.worldToScreen(vehicle.points[1]);
    const seat = this.camera.worldToScreen(vehicle.points[2]);
    const head = this.camera.worldToScreen(vehicle.points[3]);
    ctx.beginPath();
    ctx.moveTo(rear.x, rear.y);
    ctx.quadraticCurveTo((rear.x + front.x) * 0.5, rear.y - 8, front.x, front.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(rear.x + 7, rear.y - 10);
    ctx.lineTo(front.x - 8, front.y - 11);
    ctx.stroke();
    this.drawStickRider(seat, head, front);
  }

  drawBike(vehicle) {
    const ctx = this.ctx;
    const rear = this.camera.worldToScreen(vehicle.points[0]);
    const front = this.camera.worldToScreen(vehicle.points[1]);
    const top = this.camera.worldToScreen(vehicle.points[2]);
    const seat = this.camera.worldToScreen(vehicle.points[3]);
    const head = this.camera.worldToScreen(vehicle.points[4]);
    const hands = this.camera.worldToScreen(vehicle.points[5]);
    for (const wheel of [rear, front]) {
      ctx.beginPath();
      ctx.arc(wheel.x, wheel.y, 10 * this.camera.zoom, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(rear.x, rear.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.lineTo(top.x, top.y);
    ctx.lineTo(front.x, front.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(front.x - 6 * this.camera.zoom, front.y - 18 * this.camera.zoom);
    ctx.lineTo(front.x + 10 * this.camera.zoom, front.y - 28 * this.camera.zoom);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(front.x - 6 * this.camera.zoom, front.y - 18 * this.camera.zoom);
    ctx.stroke();
    this.drawStickRider(seat, head, hands);
    ctx.beginPath();
    ctx.moveTo(hands.x, hands.y);
    ctx.lineTo(front.x + 8 * this.camera.zoom, front.y - 24 * this.camera.zoom);
    ctx.stroke();
  }

  drawCapsule(vehicle) {
    const ctx = this.ctx;
    const left = this.camera.worldToScreen(vehicle.points[0]);
    const right = this.camera.worldToScreen(vehicle.points[1]);
    const nose = this.camera.worldToScreen(vehicle.points[2]);
    const seat = this.camera.worldToScreen(vehicle.points[3]);
    const head = this.camera.worldToScreen(vehicle.points[4]);
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.quadraticCurveTo(left.x - 12 * this.camera.zoom, seat.y, nose.x, nose.y);
    ctx.quadraticCurveTo(right.x + 12 * this.camera.zoom, seat.y, right.x, right.y);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc((nose.x + seat.x) * 0.5, (nose.y + seat.y) * 0.5, 10 * this.camera.zoom, 0, Math.PI * 2);
    ctx.stroke();
    this.drawStickRider(seat, head, { x: seat.x + 8 * this.camera.zoom, y: seat.y + 8 * this.camera.zoom });
  }

  drawStickRider(seat, head, hands) {
    const ctx = this.ctx;
    const neck = { x: head.x, y: head.y + 6 * this.camera.zoom };
    const torso = { x: seat.x, y: seat.y - 4 * this.camera.zoom };
    ctx.beginPath();
    ctx.arc(head.x, head.y, 6 * this.camera.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.lineTo(torso.x, torso.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(torso.x, torso.y + 4 * this.camera.zoom);
    ctx.lineTo(hands.x, hands.y);
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(seat.x - 8 * this.camera.zoom, seat.y + 14 * this.camera.zoom);
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(seat.x + 6 * this.camera.zoom, seat.y + 14 * this.camera.zoom);
    ctx.stroke();
  }

  drawGhost(frame) {
    if (!frame) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
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
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
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
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#555555";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + collision.normal.x * 28, p.y + collision.normal.y * 28);
      ctx.stroke();
      ctx.strokeStyle = "#777777";
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + collision.tangent.x * 28, p.y + collision.tangent.y * 28);
      ctx.stroke();
    }
    const center = this.camera.worldToScreen(state.vehicle.getCenter());
    const velocity = state.vehicle.getVelocity();
    ctx.strokeStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(center.x + clamp(velocity.x * 0.08 * this.camera.zoom, -120, 120), center.y + clamp(velocity.y * 0.08 * this.camera.zoom, -120, 120));
    ctx.stroke();
    ctx.restore();
  }
}
