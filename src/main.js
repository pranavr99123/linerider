import { Camera } from "./camera.js";
import { buildDynamicSegments } from "./collision.js";
import { Editor } from "./editor.js";
import { InputManager } from "./input.js";
import { PhysicsEngine } from "./physics.js";
import { Renderer } from "./renderer.js";
import { ReplaySystem } from "./replay.js";
import { exportTrack, importTrack } from "./saveLoad.js";
import { SAMPLE_TRACK } from "./sampleTrack.js";
import { TrackModel } from "./track.js";
import { UI } from "./ui.js";
import { Vehicle } from "./vehicles.js";

class App {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.track = new TrackModel();
    this.editor = new Editor(this.track);
    this.state = {
      mode: "edit",
      running: false,
      vehicleType: "sled",
      physicsMode: "earth",
      gridSnap: false,
      endpointSnap: true,
      debugOverlay: false,
      motionTrails: false,
    };
    this.vehicle = new Vehicle(this.state.vehicleType, this.track.data.start);
    this.replay = new ReplaySystem();
    this.physics = new PhysicsEngine(this.track, this.vehicle, this.replay);
    this.camera = new Camera(this.canvas);
    this.input = new InputManager(this.canvas, this.camera);
    this.renderer = new Renderer(this.canvas, this.camera);
    this.ui = new UI(this);
    this.editorPreview = null;
    this.lastTimestamp = performance.now();
    this.bindShortcuts();
    this.attachCanvasHandlers();
    this.onResize();
    window.addEventListener("resize", () => this.onResize());
    this.syncUiState();
    this.resetRun();
    this.ui.showWalkthrough();
    requestAnimationFrame((time) => this.loop(time));
  }

  onResize() {
    this.camera.resize();
  }

  bindShortcuts() {
    window.addEventListener("keydown", (event) => {
      if (event.target && ["TEXTAREA", "INPUT", "SELECT"].includes(event.target.tagName)) return;
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyZ") {
        event.preventDefault();
        if (event.shiftKey) this.track.redo();
        else this.track.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.code === "KeyY") {
        event.preventDefault();
        this.track.redo();
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        this.state.running ? this.pause() : this.play();
      }
      if (event.code === "KeyR") this.resetRun();
      if (event.code === "KeyF") {
        this.camera.follow = !this.camera.follow;
        this.ui.elements.followCamera.checked = this.camera.follow;
      }
      if (event.code === "KeyG") {
        this.state.gridSnap = !this.state.gridSnap;
        this.ui.elements.gridSnap.checked = this.state.gridSnap;
      }
      if (event.code === "KeyD") {
        this.state.debugOverlay = !this.state.debugOverlay;
        this.ui.elements.debugOverlay.checked = this.state.debugOverlay;
      }
      if (event.code === "Digit1") this.setTool("freehand");
      if (event.code === "Digit2") this.setTool("line");
      if (event.code === "Digit3") this.setTool("curve");
      if (event.code === "Digit4") this.setTool("select");
      if (event.code === "Digit5") this.setTool("pan");
      if (event.code === "Digit6") this.setTool("eraser");
    });
  }

  attachCanvasHandlers() {
    this.canvas.addEventListener("pointerdown", () => {
      const point = { x: this.input.pointer.worldX, y: this.input.pointer.worldY };
      if (this.editor.tool === "pan") {
        this.camera.follow = false;
        this.ui.elements.followCamera.checked = false;
        this.input.startPan();
      }
      if (this.input.panActive || this.editor.tool === "pan") return;
      if (this.state.mode === "edit") this.editor.begin(point, this.state);
    });
    this.canvas.addEventListener("pointermove", () => {
      if (this.input.pointer.down && (this.input.panActive || this.editor.tool === "pan")) {
        this.camera.pan(this.input.pointer.x - this.input.prevPointer.x, this.input.pointer.y - this.input.prevPointer.y);
        return;
      }
      const point = { x: this.input.pointer.worldX, y: this.input.pointer.worldY };
      if (this.state.mode === "edit" && this.input.pointer.down) this.editor.move(point, this.state);
      else {
        this.track.findHoverSegment(point, 18);
        this.track.findHoverGravityZone(point);
      }
    });
    this.canvas.addEventListener("pointerup", () => {
      const point = { x: this.input.pointer.worldX, y: this.input.pointer.worldY };
      if (this.state.mode === "edit" && !this.input.panActive && this.editor.tool !== "pan") this.editor.end(point, this.state);
    });
  }

  setMode(mode) {
    this.state.mode = mode;
    if (mode === "play") this.play();
    else {
      this.camera.follow = false;
      this.ui.elements.followCamera.checked = false;
      this.pause();
      this.physics.status = "Editing";
    }
  }

  setTool(tool) {
    this.editor.setTool(tool);
  }

  setVehicleType(type) {
    this.state.vehicleType = type;
    this.track.data.settings.vehicleType = type;
    this.vehicle = new Vehicle(type, this.physics.lastCheckpoint);
    this.physics.vehicle = this.vehicle;
    this.resetRun();
  }

  setPhysicsMode(mode) {
    this.state.physicsMode = mode;
    this.track.data.settings.physicsMode = mode;
    this.physics.configureMode(mode);
  }

  play() {
    this.state.running = true;
    this.state.mode = "play";
    this.camera.follow = true;
    this.ui.elements.followCamera.checked = true;
    this.physics.status = this.vehicle.crashed ? "Crashed" : "Running";
  }

  pause() {
    this.state.running = false;
    if (!this.vehicle.crashed && !this.physics.completed) this.physics.status = "Paused";
  }

  resetRun() {
    for (const segment of this.track.data.segments) segment.active = true;
    for (const powerup of this.track.data.powerups) powerup.active = true;
    for (const object of this.track.data.objects) object.active = true;
    for (const zone of this.track.data.gravityZones) zone.active = true;
    this.vehicle.reset(this.track.data.start);
    this.physics.configureMode(this.state.physicsMode);
    this.physics.reset();
    this.camera.target = { x: this.track.data.start.x + 260, y: this.track.data.start.y + 120 };
    this.camera.position = { ...this.camera.target };
  }

  stepFrame() {
    if (!this.state.running) this.physics.stepFrame();
  }

  exportTrack() {
    this.track.data.settings.gridSnap = this.state.gridSnap;
    this.track.data.settings.endpointSnap = this.state.endpointSnap;
    this.track.data.settings.vehicleType = this.state.vehicleType;
    this.track.data.settings.physicsMode = this.state.physicsMode;
    this.ui.elements.saveData.value = exportTrack(this.track);
  }

  importTrack() {
    try {
      const data = importTrack(this.ui.elements.saveData.value);
      this.track.load(data);
      this.state.gridSnap = data.settings.gridSnap;
      this.state.endpointSnap = data.settings.endpointSnap;
      this.state.vehicleType = data.settings.vehicleType;
      this.state.physicsMode = data.settings.physicsMode;
      this.vehicle = new Vehicle(this.state.vehicleType, this.track.data.start);
      this.physics.vehicle = this.vehicle;
      this.resetRun();
      this.syncUiState();
    } catch (error) {
      alert(error.message);
    }
  }

  loadSampleTrack() {
    this.track.load(SAMPLE_TRACK);
    this.state.gridSnap = SAMPLE_TRACK.settings.gridSnap;
    this.state.endpointSnap = SAMPLE_TRACK.settings.endpointSnap;
    this.state.vehicleType = SAMPLE_TRACK.settings.vehicleType;
    this.state.physicsMode = SAMPLE_TRACK.settings.physicsMode;
    this.vehicle = new Vehicle(this.state.vehicleType, this.track.data.start);
    this.physics.vehicle = this.vehicle;
    this.resetRun();
    this.syncUiState();
  }

  syncUiState() {
    this.track.data.settings.gridSnap = this.state.gridSnap;
    this.track.data.settings.endpointSnap = this.state.endpointSnap;
    this.track.data.settings.vehicleType = this.state.vehicleType;
    this.track.data.settings.physicsMode = this.state.physicsMode;
    this.ui.elements.gridSnap.checked = this.state.gridSnap;
    this.ui.elements.endpointSnap.checked = this.state.endpointSnap;
    this.ui.elements.vehicleType.value = this.state.vehicleType;
    this.ui.elements.physicsMode.value = this.state.physicsMode;
    this.ui.elements.motionTrails.checked = this.state.motionTrails;
  }

  scrubReplay(value) {
    if (this.replay.frames.length) {
      this.pause();
      this.replay.scrub(value);
    }
  }

  buildEditorPreview() {
    const point = { x: this.input.pointer.worldX, y: this.input.pointer.worldY };
    const snapped = this.track.snapPoint(point, this.state.gridSnap, this.state.endpointSnap);
    if (this.editor.dragStart && ["line", "finish", "object"].includes(this.editor.tool)) {
      return { type: "line", a: this.editor.dragStart, b: snapped };
    }
    if (this.editor.dragStart && ["gravityZone"].includes(this.editor.tool)) {
      return { type: "box", a: { x: Math.min(this.editor.dragStart.x, snapped.x), y: Math.min(this.editor.dragStart.y, snapped.y) }, width: Math.abs(this.editor.dragStart.x - snapped.x), height: Math.abs(this.editor.dragStart.y - snapped.y) };
    }
    if (this.editor.tool === "curve" && this.editor.pendingCurve.length) {
      return { type: "curve", points: [...this.editor.pendingCurve, snapped] };
    }
    return null;
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = timestamp;
    if (this.state.running) {
      if (this.vehicle.crashed && this.physics.crashElapsed >= this.physics.respawnDelay) {
        this.physics.respawn();
      }
      this.physics.update(dt);
    }
    const dynamicSegments = buildDynamicSegments(this.track.data.objects, this.physics.time);
    this.replay.playhead = this.state.running ? this.replay.frames.length - 1 : this.replay.playhead;
    this.editorPreview = this.state.mode === "edit" ? this.buildEditorPreview() : null;
    this.camera.update(dt, this.vehicle.getCenter());
    const replayFrame = this.replay.getFrame();
    const renderVehicle = !this.state.running && replayFrame ? {
      ...this.vehicle,
      points: replayFrame.points,
      crashed: replayFrame.crashed,
      getCenter: () => replayFrame.points.reduce((acc, point) => ({ x: acc.x + point.x / replayFrame.points.length, y: acc.y + point.y / replayFrame.points.length }), { x: 0, y: 0 }),
      getVelocity: () => this.vehicle.getVelocity(),
    } : this.vehicle;
    this.renderer.render({
      track: this.track,
      vehicle: renderVehicle,
      physics: this.physics,
      dynamicSegments,
      editorPreview: this.editorPreview,
      debugOverlay: this.state.debugOverlay,
      motionTrails: this.state.motionTrails,
      replayGhost: this.replay.getGhostFrame(Math.max(0, this.replay.frames.length - 1)),
    });
    this.ui.refresh();
    requestAnimationFrame((time) => this.loop(time));
  }
}

new App();
