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

const LINE_TYPE_DESCRIPTIONS = {
  normal: "The classic line. Smooth, predictable, and best for most of the track.",
  boost: "Adds forward push along the line so the rider accelerates through the section.",
  brake: "Bleeds off speed quickly and makes steep landings easier to control.",
  ice: "Very low grip. The rider keeps sliding and carries momentum longer.",
  sticky: "High grip with strong contact. Useful for steep climbs and controlled turns.",
  bounce: "Throws the rider back off the surface with strong restitution.",
  breakable: "Acts like a normal line until touched, then disappears.",
  oneway: "Collides from the solid side only so the rider can pass through the other way.",
  conveyor: "Carries the rider along the surface like a moving belt.",
};

const VEHICLE_DESCRIPTIONS = {
  sled: "Closest to classic Line Rider. Stable, forgiving, and smooth on hand-drawn lines.",
  bike: "Fast and agile, but more likely to pitch or crash on rough transitions.",
  capsule: "Balanced and enclosed. Handles drops better than the bike with a heavier feel.",
};

const PHYSICS_DESCRIPTIONS = {
  earth: "Standard gravity and drag. Best baseline for building normal runs.",
  moon: "Low gravity with fast travel and springier landings, closer to lunar hops than slow motion.",
  mars: "Moderately reduced gravity with lighter air resistance and longer airtime than Earth.",
  antigravity: "Gravity pulls upward, turning hills into ceilings and drops into climbs.",
  zero: "No gravity, just inertia and line contact. Great for drifting experiments.",
};

const POWERUP_DESCRIPTIONS = {
  speed: "Instantly adds forward speed when the rider touches it.",
  jump: "Launches the rider upward from the current line or mid-air path.",
  gravitySwitch: "Flips the global gravity direction for dramatic route changes.",
  slowmo: "Temporarily slows simulation time to make tricky sections easier to read.",
  shield: "Prevents one crash and lets the rider survive a bad impact.",
  magnet: "Temporarily pulls the rider toward nearby lines and surfaces.",
  teleport: "A reusable portal pair. Fall through one node to emerge from its partner.",
};

const OBJECT_DESCRIPTIONS = {
  movingPlatform: "A solid moving line that slides back and forth through the world.",
  rotatingArm: "A spinning obstacle that can deflect, launch, or block the rider.",
};

const WALKTHROUGH_STEPS = [
  { title: "Draw A Track", body: "Start with Freehand, Line, or Curve. Those are your main building tools.", selector: "[data-tool='freehand']", actionLabel: "Switch To Freehand", action: (app) => app.setTool("freehand") },
  { title: "Move The Camera", body: "Use Pan to drag across the world. The mouse wheel zooms without leaving the editor.", selector: "[data-tool='pan']", actionLabel: "Switch To Pan", action: (app) => app.setTool("pan") },
  { title: "Choose Surface Feel", body: "Line Type changes how the rider behaves on contact, from Boost to Ice to Bounce. Pick a type before you draw.", selector: "#lineType", actionLabel: "Set Normal Line", action: (app) => { app.editor.lineType = "normal"; app.ui.elements.lineType.value = "normal"; } },
  { title: "Add Gameplay Pieces", body: "Start, Checkpoint, Finish, Powerup, Object, and Gravity Zone turn a drawing into a playable run. Teleport nodes work in pairs.", selector: "[data-tool='powerup']", actionLabel: "Switch To Powerups", action: (app) => app.setTool("powerup") },
  { title: "Play And Iterate", body: "Press Play to simulate and the camera will follow the rider automatically. Pause or Reset, then jump back to Edit to keep shaping the run.", selector: "[data-mode='play']", actionLabel: "Switch To Play", action: (app) => app.setMode("play") },
];

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
      lineTypeDescription: document.getElementById("lineTypeDescription"),
      vehicleType: document.getElementById("vehicleType"),
      vehicleDescription: document.getElementById("vehicleDescription"),
      physicsMode: document.getElementById("physicsMode"),
      physicsDescription: document.getElementById("physicsDescription"),
      powerupType: document.getElementById("powerupType"),
      powerupDescription: document.getElementById("powerupDescription"),
      objectType: document.getElementById("objectType"),
      objectDescription: document.getElementById("objectDescription"),
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
      walkthroughTitle: document.getElementById("walkthroughTitle"),
      walkthroughBody: document.getElementById("walkthroughBody"),
      walkthroughStepLabel: document.getElementById("walkthroughStepLabel"),
      walkthroughPrev: document.getElementById("walkthroughPrev"),
      walkthroughNext: document.getElementById("walkthroughNext"),
      walkthroughUse: document.getElementById("walkthroughUse"),
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
    this.walkthroughIndex = 0;
    this.walkthroughTarget = null;
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
    for (const button of this.elements.toolButtons) {
      button.addEventListener("click", () => this.app.setTool(button.dataset.tool));
      button.addEventListener("mouseenter", () => {
        this.elements.toolDescription.textContent = button.dataset.tooltip || TOOL_DESCRIPTIONS[button.dataset.tool] || "";
      });
      button.addEventListener("mouseleave", () => {
        this.elements.toolDescription.textContent = TOOL_DESCRIPTIONS[this.app.editor.tool] || "";
      });
    }
    this.elements.lineType.addEventListener("change", () => {
      this.app.editor.lineType = this.elements.lineType.value;
      this.updateDescriptions();
    });
    this.elements.vehicleType.addEventListener("change", () => {
      this.app.setVehicleType(this.elements.vehicleType.value);
      this.updateDescriptions();
    });
    this.elements.physicsMode.addEventListener("change", () => {
      this.app.setPhysicsMode(this.elements.physicsMode.value);
      this.updateDescriptions();
    });
    this.elements.powerupType.addEventListener("change", () => {
      this.app.editor.powerupType = this.elements.powerupType.value;
      this.updateDescriptions();
    });
    this.elements.objectType.addEventListener("change", () => {
      this.app.editor.objectType = this.elements.objectType.value;
      this.updateDescriptions();
    });
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
    this.elements.walkthroughPrev.addEventListener("click", () => this.stepWalkthrough(-1));
    this.elements.walkthroughNext.addEventListener("click", () => this.stepWalkthrough(1));
    this.elements.walkthroughUse.addEventListener("click", () => this.useWalkthroughStep());
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
    this.walkthroughIndex = 0;
    this.elements.walkthrough.classList.remove("hidden");
    this.renderWalkthrough();
  }

  hideWalkthrough() {
    localStorage.setItem("vector-rider-lab-walkthrough-seen", "true");
    this.elements.walkthrough.classList.add("hidden");
    this.clearWalkthroughHighlight();
  }

  stepWalkthrough(direction) {
    this.walkthroughIndex = Math.max(0, Math.min(WALKTHROUGH_STEPS.length - 1, this.walkthroughIndex + direction));
    this.renderWalkthrough();
  }

  renderWalkthrough() {
    const step = WALKTHROUGH_STEPS[this.walkthroughIndex];
    this.elements.walkthroughTitle.textContent = step.title;
    this.elements.walkthroughBody.textContent = step.body;
    this.elements.walkthroughStepLabel.textContent = `Step ${this.walkthroughIndex + 1} of ${WALKTHROUGH_STEPS.length}`;
    this.elements.walkthroughPrev.disabled = this.walkthroughIndex === 0;
    this.elements.walkthroughNext.disabled = this.walkthroughIndex === WALKTHROUGH_STEPS.length - 1;
    this.elements.walkthroughUse.textContent = step.actionLabel || "Use Highlighted";
    this.elements.walkthroughUse.disabled = !step.action;
    this.highlightWalkthroughTarget(step.selector);
  }

  useWalkthroughStep() {
    const step = WALKTHROUGH_STEPS[this.walkthroughIndex];
    if (!step?.action) return;
    step.action(this.app);
    this.app.syncUiState();
    this.updateDescriptions();
    this.refresh();
  }

  highlightWalkthroughTarget(selector) {
    this.clearWalkthroughHighlight();
    const target = document.querySelector(selector);
    if (!target) return;
    this.walkthroughTarget = target;
    target.classList.add("walkthrough-target");
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  clearWalkthroughHighlight() {
    if (!this.walkthroughTarget) return;
    this.walkthroughTarget.classList.remove("walkthrough-target");
    this.walkthroughTarget = null;
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
    this.updateDescriptions();
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

  updateDescriptions() {
    this.elements.lineTypeDescription.textContent = LINE_TYPE_DESCRIPTIONS[this.elements.lineType.value] || "";
    this.elements.vehicleDescription.textContent = VEHICLE_DESCRIPTIONS[this.elements.vehicleType.value] || "";
    this.elements.physicsDescription.textContent = PHYSICS_DESCRIPTIONS[this.elements.physicsMode.value] || "";
    this.elements.powerupDescription.textContent = POWERUP_DESCRIPTIONS[this.elements.powerupType.value] || "";
    this.elements.objectDescription.textContent = OBJECT_DESCRIPTIONS[this.elements.objectType.value] || "";
  }
}
