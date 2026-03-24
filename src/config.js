export const GRID_SIZE = 40;
export const SNAP_RADIUS = 22;
export const HOVER_RADIUS = 14;
export const PICKUP_RADIUS = 22;
export const CHECKPOINT_RADIUS = 30;
export const FIXED_DT = 1 / 120;
export const MAX_SUBSTEPS = 6;
export const WORLD_BOUNDS = {
  minX: -4000,
  maxX: 12000,
  minY: -5000,
  maxY: 6000,
};

export const LINE_TYPES = {
  normal: { label: "Normal", color: "#111111", width: 3, friction: 0.985, restitution: 0.02, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  boost: { label: "Boost", color: "#000000", width: 4, friction: 0.994, restitution: 0.02, tangentAccel: 820, oneWay: false, breakable: false, conveyor: 0 },
  brake: { label: "Brake", color: "#444444", width: 4, friction: 0.88, restitution: 0, tangentAccel: -640, oneWay: false, breakable: false, conveyor: 0 },
  ice: { label: "Ice", color: "#888888", width: 4, friction: 0.998, restitution: 0.01, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  sticky: { label: "Sticky", color: "#222222", width: 4, friction: 0.78, restitution: 0.01, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  bounce: { label: "Bounce", color: "#666666", width: 4, friction: 0.99, restitution: 0.92, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  breakable: { label: "Breakable", color: "#999999", width: 3, friction: 0.98, restitution: 0.02, tangentAccel: 0, oneWay: false, breakable: true, conveyor: 0 },
  oneway: { label: "One-Way", color: "#000000", width: 4, friction: 0.99, restitution: 0, tangentAccel: 0, oneWay: true, breakable: false, conveyor: 0 },
  conveyor: { label: "Conveyor", color: "#555555", width: 4, friction: 0.99, restitution: 0.01, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 720 },
};

export const PHYSICS_MODES = {
  earth: { label: "Earth", gravity: { x: 0, y: 1800 }, airDrag: 0.0015, maxVelocity: 2600 },
  moon: { label: "Moon", gravity: { x: 0, y: 300 }, airDrag: 0.00002, maxVelocity: 3400 },
  mars: { label: "Mars", gravity: { x: 0, y: 680 }, airDrag: 0.00018, maxVelocity: 2900 },
  antigravity: { label: "Anti-Gravity", gravity: { x: 0, y: -1100 }, airDrag: 0.0012, maxVelocity: 2400 },
  zero: { label: "Zero-G", gravity: { x: 0, y: 0 }, airDrag: 0.00045, maxVelocity: 1800 },
};

export const VEHICLES = {
  sled: {
    label: "Sled",
    points: [
      { x: -24, y: 8, radius: 9, role: "runnerRear" },
      { x: 24, y: 8, radius: 9, role: "runnerFront" },
      { x: -4, y: -8, radius: 5, role: "seat" },
      { x: 8, y: -34, radius: 6, role: "head" },
    ],
    constraints: [
      { a: 0, b: 1, length: 48, stiffness: 1 },
      { a: 0, b: 2, length: 24, stiffness: 0.85 },
      { a: 1, b: 2, length: 30, stiffness: 0.85 },
      { a: 2, b: 3, length: 28, stiffness: 0.8 },
      { a: 0, b: 3, length: 52, stiffness: 0.6 },
    ],
    mass: 1.15,
    traction: 1,
    crashSpeed: 1180,
    color: "#111111",
    renderType: "sled",
  },
  bike: {
    label: "Bike",
    points: [
      { x: -24, y: 10, radius: 10, role: "rearWheel" },
      { x: 24, y: 10, radius: 10, role: "frontWheel" },
      { x: 0, y: -10, radius: 4, role: "frameTop" },
      { x: -8, y: -8, radius: 4, role: "seat" },
      { x: -2, y: -34, radius: 6, role: "head" },
      { x: 10, y: -18, radius: 4, role: "hands" },
    ],
    constraints: [
      { a: 0, b: 1, length: 48, stiffness: 1 },
      { a: 0, b: 2, length: 31, stiffness: 0.9 },
      { a: 1, b: 2, length: 31, stiffness: 0.9 },
      { a: 0, b: 3, length: 22, stiffness: 0.9 },
      { a: 3, b: 4, length: 27, stiffness: 0.8 },
      { a: 4, b: 5, length: 17, stiffness: 0.75 },
      { a: 5, b: 1, length: 31, stiffness: 0.8 },
      { a: 3, b: 5, length: 19, stiffness: 0.7 },
    ],
    mass: 0.92,
    traction: 0.94,
    crashSpeed: 980,
    color: "#111111",
    renderType: "bike",
  },
  capsule: {
    label: "Rocket Capsule",
    points: [
      { x: -22, y: -10, radius: 8, role: "tailTop" },
      { x: -22, y: 10, radius: 8, role: "tailBottom" },
      { x: 28, y: 0, radius: 11, role: "nose" },
      { x: 0, y: 2, radius: 6, role: "seat" },
      { x: 0, y: -16, radius: 5, role: "head" },
    ],
    constraints: [
      { a: 0, b: 1, length: 20, stiffness: 1 },
      { a: 0, b: 2, length: 51, stiffness: 0.95 },
      { a: 1, b: 2, length: 51, stiffness: 0.95 },
      { a: 0, b: 3, length: 25, stiffness: 0.84 },
      { a: 1, b: 3, length: 25, stiffness: 0.84 },
      { a: 3, b: 4, length: 18, stiffness: 0.82 },
      { a: 2, b: 3, length: 28, stiffness: 0.78 },
    ],
    mass: 1,
    traction: 0.9,
    crashSpeed: 1100,
    color: "#111111",
    renderType: "capsule",
  },
};

export const POWERUP_TYPES = {
  speed: { label: "Speed Boost", color: "#111111" },
  jump: { label: "Jump Impulse", color: "#333333" },
  gravitySwitch: { label: "Gravity Switch", color: "#555555" },
  slowmo: { label: "Slow Motion", color: "#777777" },
  shield: { label: "Shield", color: "#222222" },
  magnet: { label: "Magnet", color: "#666666" },
  teleport: { label: "Teleport Node", color: "#000000" },
};

export const OBJECT_TYPES = {
  movingPlatform: { label: "Moving Platform", color: "#111111" },
  rotatingArm: { label: "Rotating Arm", color: "#444444" },
};

export const DEFAULT_TRACK = {
  settings: { physicsMode: "earth", vehicleType: "sled", gridSnap: false, endpointSnap: true },
  start: { x: 160, y: 120 },
  finish: null,
  segments: [],
  powerups: [],
  checkpoints: [],
  objects: [],
  gravityZones: [],
};
