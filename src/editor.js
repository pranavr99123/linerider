import { dist } from "./utils.js";

export class Editor {
  constructor(track) {
    this.track = track;
    this.tool = "freehand";
    this.lineType = "normal";
    this.powerupType = "speed";
    this.objectType = "movingPlatform";
    this.pendingCurve = [];
    this.dragStart = null;
    this.lastFreehandPoint = null;
    this.selectionDragging = false;
  }

  setTool(tool) {
    this.tool = tool;
    this.pendingCurve = [];
    this.dragStart = null;
    this.lastFreehandPoint = null;
    this.selectionDragging = false;
  }

  begin(worldPoint, settings) {
    const point = this.track.snapPoint(worldPoint, settings.gridSnap, settings.endpointSnap);
    if (this.tool === "freehand") {
      this.track.pushHistory();
      this.lastFreehandPoint = point;
      return;
    }
    if (this.tool === "line" || this.tool === "object" || this.tool === "trigger" || this.tool === "gravityZone" || this.tool === "finish") {
      this.dragStart = point;
      return;
    }
    if (this.tool === "curve") {
      this.pendingCurve.push(point);
      if (this.pendingCurve.length === 1) this.track.pushHistory();
      if (this.pendingCurve.length === 3) {
        this.track.buildCurveSegments(this.pendingCurve, this.lineType);
        this.pendingCurve = [];
      }
      return;
    }
    if (this.tool === "eraser") {
      this.track.pushHistory();
      this.track.eraseNear(point, 28);
      return;
    }
    if (this.tool === "select") {
      const id = this.track.findHoverSegment(point, 18);
      this.track.selectSegment(id);
      if (id) {
        this.track.pushHistory();
        this.selectionDragging = true;
        this.dragStart = point;
      }
      return;
    }
    if (this.tool === "start") {
      this.track.pushHistory();
      this.track.setStart(point);
      return;
    }
    if (this.tool === "checkpoint") {
      this.track.pushHistory();
      this.track.addCheckpoint(point);
      return;
    }
    if (this.tool === "powerup") {
      this.track.pushHistory();
      this.track.addPowerup(this.powerupType, point);
    }
  }

  move(worldPoint, settings) {
    const point = this.track.snapPoint(worldPoint, settings.gridSnap, settings.endpointSnap);
    this.track.findHoverSegment(point, 18);
    if (this.tool === "freehand" && this.lastFreehandPoint && dist(point, this.lastFreehandPoint) > 14) {
      this.track.addSegment({ x1: this.lastFreehandPoint.x, y1: this.lastFreehandPoint.y, x2: point.x, y2: point.y, type: this.lineType });
      this.lastFreehandPoint = point;
    }
    if (this.tool === "eraser") this.track.eraseNear(point, 30);
    if (this.tool === "select" && this.selectionDragging && this.dragStart) {
      this.track.moveSelectedSegment({ x: point.x - this.dragStart.x, y: point.y - this.dragStart.y });
      this.dragStart = point;
    }
  }

  end(worldPoint, settings) {
    const point = this.track.snapPoint(worldPoint, settings.gridSnap, settings.endpointSnap);
    if (this.tool === "line" && this.dragStart) {
      this.track.pushHistory();
      this.track.addSegment({ x1: this.dragStart.x, y1: this.dragStart.y, x2: point.x, y2: point.y, type: this.lineType });
    }
    if (this.tool === "finish" && this.dragStart) {
      this.track.pushHistory();
      this.track.setFinish(this.dragStart, point);
    }
    if (this.tool === "object" && this.dragStart) {
      this.track.pushHistory();
      this.track.addObject(this.objectType, this.dragStart, point);
    }
    if (this.tool === "trigger" && this.dragStart) {
      this.track.pushHistory();
      this.track.addTriggerZone(this.dragStart, point);
    }
    if (this.tool === "gravityZone" && this.dragStart) {
      this.track.pushHistory();
      this.track.addGravityZone(this.dragStart, point);
    }
    this.dragStart = null;
    this.lastFreehandPoint = null;
    this.selectionDragging = false;
  }
}
