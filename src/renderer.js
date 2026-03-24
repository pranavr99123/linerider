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
    if (!finish) {
      ctx.restore();
      return;
    }
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
    if (vehicle.grounded) {
      this.drawGroundShadow(vehicle);
    }
    this.drawVehicleShape(vehicle);
    if (vehicle.detachedRider) {
      this.drawDetachedRider(vehicle.detachedRider);
    }
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
    const scale = this.camera.zoom;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(rear.x, rear.y);
    ctx.quadraticCurveTo((rear.x + front.x) * 0.5, rear.y - 9 * scale, front.x, front.y);
    ctx.lineTo(front.x - 3 * scale, front.y - 7 * scale);
    ctx.quadraticCurveTo((rear.x + front.x) * 0.5, rear.y - 18 * scale, rear.x + 2 * scale, rear.y - 6 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(rear.x + 7 * scale, rear.y - 10 * scale);
    ctx.lineTo(front.x - 8 * scale, front.y - 11 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rear.x - 6 * scale, rear.y + 2 * scale);
    ctx.quadraticCurveTo(rear.x + 2 * scale, rear.y + 10 * scale, rear.x + 12 * scale, rear.y + 2 * scale);
    ctx.moveTo(front.x - 12 * scale, front.y + 2 * scale);
    ctx.quadraticCurveTo(front.x - 2 * scale, front.y + 10 * scale, front.x + 6 * scale, front.y + 1 * scale);
    ctx.stroke();
    ctx.restore();
    if (!vehicle.detachedRider) {
      this.drawCharacter({
        head,
        torso: seat,
        hands: { x: front.x - 3 * scale, y: front.y - 10 * scale },
        leftFoot: { x: seat.x - 8 * scale, y: seat.y + 14 * scale },
        rightFoot: { x: seat.x + 4 * scale, y: seat.y + 14 * scale },
      });
    }
  }

  drawBike(vehicle) {
    const ctx = this.ctx;
    const rear = this.camera.worldToScreen(vehicle.points[0]);
    const front = this.camera.worldToScreen(vehicle.points[1]);
    const top = this.camera.worldToScreen(vehicle.points[2]);
    const seat = this.camera.worldToScreen(vehicle.points[3]);
    const head = this.camera.worldToScreen(vehicle.points[4]);
    const hands = this.camera.worldToScreen(vehicle.points[5]);
    const scale = this.camera.zoom;
    this.drawWheel(rear, 10 * scale, vehicle.visualState?.rearWheelSpin || 0);
    this.drawWheel(front, 10 * scale, vehicle.visualState?.frontWheelSpin || 0);
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(rear.x, rear.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.lineTo(top.x, top.y);
    ctx.lineTo(front.x, front.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(front.x - 6 * scale, front.y - 18 * scale);
    ctx.lineTo(front.x + 10 * scale, front.y - 28 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(front.x - 6 * scale, front.y - 18 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rear.x - 3 * scale, rear.y - 3 * scale);
    ctx.lineTo(seat.x + 6 * scale, seat.y - 2 * scale);
    ctx.lineTo(top.x + 2 * scale, top.y - 4 * scale);
    ctx.lineTo(front.x - 2 * scale, front.y - 2 * scale);
    ctx.lineTo(front.x - 7 * scale, front.y + 2 * scale);
    ctx.lineTo(top.x - 2 * scale, top.y + 2 * scale);
    ctx.lineTo(seat.x - 6 * scale, seat.y + 1 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(seat.x - 2 * scale, seat.y - 8 * scale);
    ctx.lineTo(seat.x + 10 * scale, seat.y - 8 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(front.x + 8 * scale, front.y - 23 * scale);
    ctx.lineTo(front.x + 12 * scale, front.y - 20 * scale);
    ctx.stroke();
    ctx.restore();
    if (!vehicle.detachedRider) {
      this.drawSeatedRider({
        torso: seat,
        head,
        hands,
        leftFoot: { x: rear.x + 4 * scale, y: rear.y - 1 * scale },
        rightFoot: { x: top.x + 4 * scale, y: top.y + 10 * scale },
        lean: clamp((front.x - rear.x) * 0.006, -0.16, 0.16),
      });
      ctx.beginPath();
      ctx.moveTo(hands.x, hands.y);
      ctx.lineTo(front.x + 8 * scale, front.y - 24 * scale);
      ctx.stroke();
    }
  }

  drawCapsule(vehicle) {
    const ctx = this.ctx;
    const tailTop = this.camera.worldToScreen(vehicle.points[0]);
    const tailBottom = this.camera.worldToScreen(vehicle.points[1]);
    const nose = this.camera.worldToScreen(vehicle.points[2]);
    const seat = this.camera.worldToScreen(vehicle.points[3]);
    const head = this.camera.worldToScreen(vehicle.points[4]);
    const scale = this.camera.zoom;
    const bodyMidY = (tailTop.y + tailBottom.y) * 0.5;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(tailTop.x, tailTop.y);
    ctx.quadraticCurveTo(nose.x - 8 * scale, tailTop.y - 12 * scale, nose.x, nose.y);
    ctx.quadraticCurveTo(nose.x - 8 * scale, tailBottom.y + 12 * scale, tailBottom.x, tailBottom.y);
    ctx.lineTo(tailTop.x, tailTop.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(seat.x + 5 * scale, bodyMidY, 10 * scale, 12 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tailTop.x - 3 * scale, tailTop.y + 1 * scale);
    ctx.lineTo(tailTop.x - 15 * scale, tailTop.y - 3 * scale);
    ctx.lineTo(tailTop.x - 6 * scale, tailTop.y + 7 * scale);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tailBottom.x - 3 * scale, tailBottom.y - 1 * scale);
    ctx.lineTo(tailBottom.x - 15 * scale, tailBottom.y + 3 * scale);
    ctx.lineTo(tailBottom.x - 6 * scale, tailBottom.y - 7 * scale);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(nose.x - 4 * scale, nose.y);
    ctx.lineTo(nose.x + 8 * scale, nose.y);
    ctx.stroke();
    ctx.restore();
    if (!vehicle.detachedRider) {
      this.drawSeatedRider({
        torso: seat,
        head: { x: seat.x, y: seat.y - 16 * scale },
        hands: { x: seat.x + 9 * scale, y: seat.y - 2 * scale },
        leftFoot: { x: seat.x - 5 * scale, y: seat.y + 10 * scale },
        rightFoot: { x: seat.x + 5 * scale, y: seat.y + 10 * scale },
        lean: 0,
      });
    }
  }

  drawWheel(center, radius, spin) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.translate(center.x, center.y);
    ctx.rotate(spin);
    ctx.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const angle = i * (Math.PI / 2);
      ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.lineTo(Math.cos(angle + Math.PI) * radius, Math.sin(angle + Math.PI) * radius);
      ctx.moveTo(Math.cos(angle + Math.PI / 4) * radius * 0.72, Math.sin(angle + Math.PI / 4) * radius * 0.72);
      ctx.lineTo(Math.cos(angle + Math.PI + Math.PI / 4) * radius * 0.72, Math.sin(angle + Math.PI + Math.PI / 4) * radius * 0.72);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSeatedRider({ torso, head, hands, leftFoot, rightFoot, lean = 0 }) {
    const scale = this.camera.zoom;
    const uprightHead = { x: torso.x + lean * 6 * scale, y: torso.y - 22 * scale };
    this.drawCharacter({
      head: head || uprightHead,
      torso,
      hands,
      leftFoot,
      rightFoot,
      lean,
      upright: true,
    });
  }

  drawCharacter({ head, torso, hands, leftFoot, rightFoot, lean = 0, upright = false }) {
    const ctx = this.ctx;
    const scale = this.camera.zoom;
    const renderedHead = upright ? { x: torso.x + lean * 6 * scale, y: torso.y - 22 * scale } : head;
    const neck = { x: renderedHead.x, y: renderedHead.y + 6 * scale };
    const shoulder = { x: torso.x + lean * 8 * scale, y: torso.y - 6 * scale };
    const hip = { x: torso.x - lean * 3 * scale, y: torso.y + 4 * scale };
    const visor = { x: renderedHead.x + 4 * scale, y: renderedHead.y + 1 * scale };
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(renderedHead.x, renderedHead.y, 6 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(renderedHead.x - 3 * scale, renderedHead.y - 2 * scale);
    ctx.quadraticCurveTo(renderedHead.x, renderedHead.y - 8 * scale, renderedHead.x + 5 * scale, renderedHead.y - 2 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(renderedHead.x - 3 * scale, renderedHead.y + 1 * scale);
    ctx.quadraticCurveTo(visor.x, visor.y - 2 * scale, renderedHead.x + 5 * scale, renderedHead.y + 2 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.quadraticCurveTo(shoulder.x - 5 * scale, shoulder.y + 2 * scale, hip.x, hip.y);
    ctx.quadraticCurveTo(shoulder.x + 5 * scale, shoulder.y + 2 * scale, neck.x, neck.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(shoulder.x, shoulder.y + 2 * scale);
    ctx.lineTo(hands.x, hands.y);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(leftFoot.x, leftFoot.y);
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(rightFoot.x, rightFoot.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(neck.x - 2 * scale, neck.y + 1 * scale);
    ctx.lineTo(neck.x + 6 * scale, neck.y + 6 * scale);
    ctx.lineTo(neck.x + 1 * scale, neck.y + 6 * scale);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hip.x - 3 * scale, hip.y);
    ctx.lineTo(hip.x + 3 * scale, hip.y);
    ctx.stroke();
    ctx.restore();
  }

  drawGroundShadow(vehicle) {
    const ctx = this.ctx;
    const center = this.camera.worldToScreen(vehicle.getCenter());
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 20 * this.camera.zoom, 32 * this.camera.zoom, 7 * this.camera.zoom, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawDetachedRider(detachedRider) {
    const [head, torso, hands, leftFoot, rightFoot] = detachedRider.points.map((point) => this.camera.worldToScreen(point));
    this.drawCharacter({ head, torso, hands, leftFoot, rightFoot });
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(torso.x, torso.y);
    ctx.lineTo(hands.x, hands.y);
    ctx.moveTo(torso.x, torso.y);
    ctx.lineTo(leftFoot.x, leftFoot.y);
    ctx.moveTo(torso.x, torso.y);
    ctx.lineTo(rightFoot.x, rightFoot.y);
    ctx.stroke();
    ctx.restore();
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
