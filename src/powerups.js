import { PICKUP_RADIUS } from "./config.js";
import { dist } from "./utils.js";

export function applyPowerup(powerup, vehicle, simulation) {
  const velocity = vehicle.getVelocity();
  if (powerup.type === "speed") {
    const mag = Math.hypot(velocity.x, velocity.y) || 1;
    vehicle.setVelocity({ x: velocity.x + (velocity.x / mag) * 380, y: velocity.y + (velocity.y / mag) * 380 });
  }
  if (powerup.type === "jump") vehicle.setVelocity({ x: velocity.x, y: velocity.y - 520 });
  if (powerup.type === "gravitySwitch") {
    simulation.gravity.x *= -1;
    simulation.gravity.y *= -1;
  }
  if (powerup.type === "slowmo") vehicle.slowmoTimer = 4;
  if (powerup.type === "shield") vehicle.shield = 1;
  if (powerup.type === "magnet") vehicle.magnetTimer = 5;
}

export function collectPowerups(track, vehicle, simulation) {
  const center = vehicle.getCenter();
  const previousCenter = vehicle.getPreviousCenter();
  for (const powerup of track.data.powerups) {
    if (powerup.active === false) continue;
    if (powerup.type === "teleport") {
      if (vehicle.teleportCooldown > 0) continue;
      if (dist(center, powerup) > PICKUP_RADIUS + 12) continue;
      const enteredFromAbove = previousCenter.y < powerup.y - 2 && center.y >= powerup.y - 2;
      if (!enteredFromAbove) continue;
      const pair = track.data.powerups.find((item) => item.id !== powerup.id && item.type === "teleport" && item.pairId && item.pairId === powerup.pairId);
      if (pair) {
        const velocity = vehicle.getVelocity();
        const exitOffset = { x: 0, y: -26 };
        for (const point of vehicle.points) {
          const dx = point.x - center.x;
          const dy = point.y - center.y;
          point.x = pair.x + dx + exitOffset.x;
          point.y = pair.y + dy + exitOffset.y;
          point.prevX = point.x - velocity.x / 120;
          point.prevY = point.y - velocity.y / 120;
        }
        vehicle.teleportCooldown = 0.35;
      }
      continue;
    }
    if (dist(center, powerup) > PICKUP_RADIUS + 12) continue;
    applyPowerup(powerup, vehicle, simulation);
    powerup.active = false;
  }
}
