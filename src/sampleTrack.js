export const SAMPLE_TRACK = {
  settings: { physicsMode: "earth", vehicleType: "bike", gridSnap: false, endpointSnap: true },
  start: { x: 120, y: -20 },
  finish: { x1: 1100, y1: 40, x2: 1100, y2: -120 },
  segments: [
    { id: "s1", x1: -40, y1: 60, x2: 240, y2: 20, type: "normal", active: true },
    { id: "s2", x1: 240, y1: 20, x2: 420, y2: -20, type: "boost", active: true },
    { id: "s3", x1: 420, y1: -20, x2: 620, y2: 10, type: "ice", active: true },
    { id: "s4", x1: 620, y1: 10, x2: 840, y2: -60, type: "normal", active: true },
    { id: "s5", x1: 840, y1: -60, x2: 1080, y2: -20, type: "bounce", active: true },
  ],
  powerups: [{ id: "p1", type: "speed", x: 460, y: -60, active: true }],
  checkpoints: [{ id: "c1", x: 700, y: -80 }],
  objects: [],
  gravityZones: [],
};
