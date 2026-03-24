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
  normal: { label: "Normal", color: "#d7ecff", width: 3, friction: 0.985, restitution: 0.02, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  boost: { label: "Boost", color: "#ffbf55", width: 4, friction: 0.994, restitution: 0.02, tangentAccel: 820, oneWay: false, breakable: false, conveyor: 0 },
  brake: { label: "Brake", color: "#ff7a7a", width: 4, friction: 0.88, restitution: 0, tangentAccel: -640, oneWay: false, breakable: false, conveyor: 0 },
  ice: { label: "Ice", color: "#89e8ff", width: 4, friction: 0.998, restitution: 0.01, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  sticky: { label: "Sticky", color: "#8df38c", width: 4, friction: 0.78, restitution: 0.01, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  bounce: { label: "Bounce", color: "#d88cff", width: 4, friction: 0.99, restitution: 0.92, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 0 },
  breakable: { label: "Breakable", color: "#f8b2d3", width: 3, friction: 0.98, restitution: 0.02, tangentAccel: 0, oneWay: false, breakable: true, conveyor: 0 },
  oneway: { label: "One-Way", color: "#5de4b0", width: 4, friction: 0.99, restitution: 0, tangentAccel: 0, oneWay: true, breakable: false, conveyor: 0 },
  conveyor: { label: "Conveyor", color: "#71a8ff", width: 4, friction: 0.99, restitution: 0.01, tangentAccel: 0, oneWay: false, breakable: false, conveyor: 720 },
};

export const PHYSICS_MODES = {
  earth: { label: "Earth", gravity: { x: 0, y: 1800 }, airDrag: 0.0015, maxVelocity: 2600 },
  moon: { label: "Moon", gravity: { x: 0, y: 420 }, airDrag: 0.0007, maxVelocity: 2200 },
  mars: { label: "Mars", gravity: { x: 0, y: 720 }, airDrag: 0.001, maxVelocity: 2350 },
  antigravity: { label: "Anti-Gravity", gravity: { x: 0, y: -1100 }, airDrag: 0.0012, maxVelocity: 2400 },
  zero: { label: "Zero-G", gravity: { x: 0, y: 0 }, airDrag: 0.00045, maxVelocity: 1800 },
};

export const VEHICLES = {
  sled: {
    label: "Sled",
    points: [{ x: -24, y: 0, radius: 10 }, { x: 24, y: 0, radius: 10 }],
    constraints: [{ a: 0, b: 1, length: 48, stiffness: 1 }],
    mass: 1.15,
    traction: 1,
    crashSpeed: 1180,
    color: "#f2f6ff",
  },
  bike: {
    label: "Bike",
    points: [{ x: -20, y: 8, radius: 9 }, { x: 20, y: 8, radius: 9 }, { x: 0, y: -22, radius: 7 }],
    constraints: [{ a: 0, b: 1, length: 40, stiffness: 1 }, { a: 0, b: 2, length: 36, stiffness: 0.7 }, { a: 1, b: 2, length: 36, stiffness: 0.7 }],
    mass: 0.92,
    traction: 0.94,
    crashSpeed: 980,
    color: "#ffdcb7",
  },
  ball: {
    label: "Ball",
    points: [{ x: 0, y: 0, radius: 16 }],
    constraints: [],
    mass: 0.86,
    traction: 0.78,
    crashSpeed: 1440,
    color: "#ffb6d7",
  },
  capsule: {
    label: "Capsule",
    points: [{ x: -12, y: 10, radius: 10 }, { x: 12, y: 10, radius: 10 }, { x: 0, y: -16, radius: 11 }],
    constraints: [{ a: 0, b: 1, length: 24, stiffness: 1 }, { a: 0, b: 2, length: 30, stiffness: 0.8 }, { a: 1, b: 2, length: 30, stiffness: 0.8 }],
    mass: 1,
    traction: 0.9,
    crashSpeed: 1100,
    color: "#bfe0ff",
  },
};

export const POWERUP_TYPES = {
  speed: { label: "Speed Boost", color: "#ffbd4a" },
  jump: { label: "Jump Impulse", color: "#9af0ff" },
  gravitySwitch: { label: "Gravity Switch", color: "#dd93ff" },
  slowmo: { label: "Slow Motion", color: "#94a8ff" },
  shield: { label: "Shield", color: "#8fffb4" },
  magnet: { label: "Magnet", color: "#ff9dc8" },
  teleport: { label: "Teleport Node", color: "#ffffff" },
};

export const OBJECT_TYPES = {
  movingPlatform: { label: "Moving Platform", color: "#ffe37d" },
  rotatingArm: { label: "Rotating Arm", color: "#ff8b8b" },
};

export const DEFAULT_TRACK = {
  settings: { physicsMode: "earth", vehicleType: "sled", gridSnap: false, endpointSnap: true },
  start: { x: 160, y: 120 },
  finish: { x1: 2120, y1: 180, x2: 2120, y2: -180 },
  segments: [],
  powerups: [],
  checkpoints: [],
  objects: [],
  triggerZones: [],
  gravityZones: [],
};
