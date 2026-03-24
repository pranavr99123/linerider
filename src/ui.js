import { LINE_TYPES, OBJECT_TYPES, PHYSICS_MODES, POWERUP_TYPES, VEHICLES } from "./config.js";

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
      playToggle: document.getElementById("playToggle"),
      pauseBtn: document.getElementById("pauseBtn"),
      resetBtn: document.getElementById("resetBtn"),
      stepBtn: document.getElementById("stepBtn"),
      saveBtn: document.getElementById("saveBtn"),
      loadBtn: document.getElementById("loadBtn"),
      sampleBtn: document.getElementById("sampleBtn"),
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
    this.elements.gridSnap.addEventListener("change", () => { this.app.state.gridSnap = this.elements.gridSnap.checked; });
    this.elements.endpointSnap.addEventListener("change", () => { this.app.state.endpointSnap = this.elements.endpointSnap.checked; });
    this.elements.followCamera.addEventListener("change", () => { this.app.camera.follow = this.elements.followCamera.checked; });
    this.elements.debugOverlay.addEventListener("change", () => { this.app.state.debugOverlay = this.elements.debugOverlay.checked; });
    this.elements.motionTrails.addEventListener("change", () => { this.app.state.motionTrails = this.elements.motionTrails.checked; });
    this.elements.playToggle.addEventListener("click", () => this.app.play());
    this.elements.pauseBtn.addEventListener("click", () => this.app.pause());
    this.elements.resetBtn.addEventListener("click", () => this.app.resetRun());
    this.elements.stepBtn.addEventListener("click", () => this.app.stepFrame());
    this.elements.saveBtn.addEventListener("click", () => this.app.exportTrack());
    this.elements.loadBtn.addEventListener("click", () => this.app.importTrack());
    this.elements.sampleBtn.addEventListener("click", () => this.app.loadSampleTrack());
    this.elements.timelineSlider.addEventListener("input", () => this.app.scrubReplay(Number(this.elements.timelineSlider.value)));
  }

  refresh() {
    const mode = this.app.state.mode;
    for (const button of this.elements.modeButtons) {
      button.classList.toggle("active", button.dataset.mode === mode);
    }
    for (const button of this.elements.toolButtons) {
      button.classList.toggle("active", button.dataset.tool === this.app.editor.tool);
    }
    this.elements.timerLabel.textContent = `${this.app.physics.runtime.toFixed(2)}s`;
    this.elements.checkpointLabel.textContent = `${this.app.physics.collectedCheckpoints.size} / ${this.app.track.data.checkpoints.length}`;
    this.elements.statusLabel.textContent = this.app.physics.status;
    this.elements.timelineSlider.max = Math.max(0, this.app.replay.frames.length - 1);
    this.elements.timelineSlider.value = this.app.replay.playhead;
  }
}
