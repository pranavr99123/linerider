import { LINE_TYPES, OBJECT_TYPES, PHYSICS_MODES, POWERUP_TYPES, VEHICLES } from "./config.js";

const TOOL_DESCRIPTIONS = {
  freehand: "Draw a continuous track stroke by dragging across the canvas.",
  line: "Place one straight segment between two points.",
  curve: "Click three times to create a smooth curved run.",
  select: "Select and move a line segment or gravity zone box.",
  pan: "Click and drag the canvas to move around the world.",
  eraser: "Erase lines, powerups, checkpoints, objects, gravity zones, start, or finish.",
  start: "Set the rider spawn point.",
  checkpoint: "Place a checkpoint respawn marker.",
  finish: "Draw the finish line the rider must cross.",
  powerup: "Place a collectible like speed, jump, shield, magnet, or teleport.",
  object: "Place a moving platform or rotating arm.",
  gravityZone: "Draw a box with its own gravity vector and drag settings.",
};

function populate(select, map) {
  select.innerHTML = "";
  for (const [key, item] of Object.entries(map)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = item.label;
    select.appendChild(option);
  }
}

export class UI {
  constructor(app) {
    this.app = app;
    this.elements = {
      modeButtons: [...document.querySelectorAll("[data-mode]")],
      toolButtons: [...document.querySelectorAll("[data-tool]")],
      lineType: document.getElementById("lineType"),
      vehicleType: document.getElementById("vehicleType"),
      physicsMode: document.getElementById("physicsMode"),
      powerupType: document.getElementById("powerupType"),
      objectType: document.getElementById("objectType"),
      gravityX: document.getElementById("gravityX"),
      gravityY: document.getElementById("gravityY"),
      gravityDrag: document.getElementById("gravityDrag"),
      toolDescription: document.getElementById("toolDescription"),
      pauseBtn: document.getElementById("pauseBtn"),
      resetBtn: document.getElementById("resetBtn"),
      saveBtn: document.getElementById("saveBtn"),
      loadBtn: document.getElementById("loadBtn"),
      sampleBtn: document.getElementById("sampleBtn"),
      walkthroughBtn: document.getElementById("walkthroughBtn"),
      walkthrough: document.getElementById("walkthrough"),
      walkthroughClose: document.getElementById("walkthroughClose"),
      saveData: document.getElementById("saveData"),
      gridSnap: document.getElementById("gridSnap"),
      endpointSnap: document.getElementById("endpointSnap"),
      followCamera: document.getElementById("followCamera"),
      debugOverlay: document.getElementById("debugOverlay"),
      motionTrails: document.getElementById("motionTrails"),
      timelineSlider: document.getElementById("timelineSlider"),
      timerLabel: document.getElementById("timerLabel"),
      checkpointLabel: document.getElementById("checkpointLabel"),
      statusLabel: document.getElementById("statusLabel"),
    };
    this.populateSelects();
    this.bind();
  }

  populateSelects() {
    populate(this.elements.lineType, LINE_TYPES);
    populate(this.elements.vehicleType, VEHICLES);
    populate(this.elements.physicsMode, PHYSICS_MODES);
    populate(this.elements.powerupType, POWERUP_TYPES);
    populate(this.elements.objectType, OBJECT_TYPES);
    this.elements.lineType.value = this.app.editor.lineType;
    this.elements.vehicleType.value = this.app.state.vehicleType;
    this.elements.physicsMode.value = this.app.state.physicsMode;
    this.elements.powerupType.value = this.app.editor.powerupType;
    this.elements.objectType.value = this.app.editor.objectType;
  }

  bind() {
    for (const button of this.elements.modeButtons) button.addEventListener("click", () => this.app.setMode(button.dataset.mode));
    for (const button of this.elements.toolButtons) button.addEventListener("click", () => this.app.setTool(button.dataset.tool));
    this.elements.lineType.addEventListener("change", () => { this.app.editor.lineType = this.elements.lineType.value; });
    this.elements.vehicleType.addEventListener("change", () => this.app.setVehicleType(this.elements.vehicleType.value));
    this.elements.physicsMode.addEventListener("change", () => this.app.setPhysicsMode(this.elements.physicsMode.value));
    this.elements.powerupType.addEventListener("change", () => { this.app.editor.powerupType = this.elements.powerupType.value; });
    this.elements.objectType.addEventListener("change", () => { this.app.editor.objectType = this.elements.objectType.value; });
    this.elements.gravityX.addEventListener("input", () => this.updateGravitySettings());
    this.elements.gravityY.addEventListener("input", () => this.updateGravitySettings());
    this.elements.gravityDrag.addEventListener("input", () => this.updateGravitySettings());
    this.elements.gridSnap.addEventListener("change", () => { this.app.state.gridSnap = this.elements.gridSnap.checked; });
    this.elements.endpointSnap.addEventListener("change", () => { this.app.state.endpointSnap = this.elements.endpointSnap.checked; });
    this.elements.followCamera.addEventListener("change", () => { this.app.camera.follow = this.elements.followCamera.checked; });
    this.elements.debugOverlay.addEventListener("change", () => { this.app.state.debugOverlay = this.elements.debugOverlay.checked; });
    this.elements.motionTrails.addEventListener("change", () => { this.app.state.motionTrails = this.elements.motionTrails.checked; });
    this.elements.pauseBtn.addEventListener("click", () => this.app.pause());
    this.elements.resetBtn.addEventListener("click", () => this.app.resetRun());
    this.elements.saveBtn.addEventListener("click", () => this.app.exportTrack());
    this.elements.loadBtn.addEventListener("click", () => this.app.importTrack());
    this.elements.sampleBtn.addEventListener("click", () => this.app.loadSampleTrack());
    this.elements.walkthroughBtn.addEventListener("click", () => this.showWalkthrough(true));
    this.elements.walkthroughClose.addEventListener("click", () => this.hideWalkthrough());
    this.elements.timelineSlider.addEventListener("input", () => this.app.scrubReplay(Number(this.elements.timelineSlider.value)));
  }

  updateGravitySettings() {
    const gravity = {
      x: Number(this.elements.gravityX.value),
      y: Number(this.elements.gravityY.value),
    };
    const drag = Math.max(0, Number(this.elements.gravityDrag.value));
    this.app.editor.gravityZoneSettings = { gravity, drag };
    const selected = this.app.track.getSelectedGravityZone();
    if (selected) {
      this.app.track.updateGravityZone(selected.id, { gravity, drag });
    }
  }

  showWalkthrough(force = false) {
    if (!force && localStorage.getItem("vector-rider-lab-walkthrough-seen")) return;
    this.elements.walkthrough.classList.remove("hidden");
  }

  hideWalkthrough() {
    localStorage.setItem("vector-rider-lab-walkthrough-seen", "true");
    this.elements.walkthrough.classList.add("hidden");
  }

  refresh() {
    const mode = this.app.state.mode;
    for (const button of this.elements.modeButtons) {
      button.classList.toggle("active", button.dataset.mode === mode);
    }
    for (const button of this.elements.toolButtons) {
      button.classList.toggle("active", button.dataset.tool === this.app.editor.tool);
    }
    this.elements.toolDescription.textContent = TOOL_DESCRIPTIONS[this.app.editor.tool] || "";
    const selectedZone = this.app.track.getSelectedGravityZone();
    const gravity = selectedZone ? selectedZone.gravity : this.app.editor.gravityZoneSettings.gravity;
    const drag = selectedZone ? selectedZone.drag : this.app.editor.gravityZoneSettings.drag;
    this.elements.gravityX.value = gravity.x;
    this.elements.gravityY.value = gravity.y;
    this.elements.gravityDrag.value = drag;
    this.elements.timerLabel.textContent = `${this.app.physics.runtime.toFixed(2)}s`;
    this.elements.checkpointLabel.textContent = `${this.app.physics.collectedCheckpoints.size} / ${this.app.track.data.checkpoints.length}`;
    this.elements.statusLabel.textContent = this.app.physics.status;
    this.elements.timelineSlider.max = Math.max(0, this.app.replay.frames.length - 1);
    this.elements.timelineSlider.value = this.app.replay.playhead;
  }
}
