export class InputManager {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.pointer = { x: 0, y: 0, worldX: 0, worldY: 0, down: false, button: 0 };
    this.prevPointer = { x: 0, y: 0, worldX: 0, worldY: 0 };
    this.keys = new Set();
    this.panActive = false;
    this.activePointerId = null;
    this.bind();
  }

  bind() {
    window.addEventListener("keydown", (event) => {
      this.keys.add(event.code);
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
    });
    this.canvas.addEventListener("pointerdown", (event) => {
      this.updatePointer(event);
      this.pointer.down = true;
      this.pointer.button = event.button;
      this.activePointerId = event.pointerId;
      if (event.button === 1 || event.button === 2 || this.keys.has("Space")) {
        this.panActive = true;
        event.preventDefault();
      }
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      this.prevPointer = { ...this.pointer };
      this.updatePointer(event);
      if (this.panActive) {
        event.preventDefault();
      }
    });
    this.canvas.addEventListener("pointerup", (event) => {
      this.updatePointer(event);
      this.endPointer(event.pointerId);
    });
    this.canvas.addEventListener("pointercancel", (event) => this.endPointer(event.pointerId));
    this.canvas.addEventListener("lostpointercapture", () => this.endPointer(this.activePointerId));
    this.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    this.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.camera.zoomAt(event.deltaY, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }, { passive: false });
  }

  updatePointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const world = this.camera.screenToWorld({ x, y });
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.worldX = world.x;
    this.pointer.worldY = world.y;
  }

  isKeyDown(code) {
    return this.keys.has(code);
  }

  startPan() {
    this.panActive = true;
  }

  endPointer(pointerId) {
    if (pointerId !== null && pointerId !== undefined && this.canvas.hasPointerCapture(pointerId)) {
      this.canvas.releasePointerCapture(pointerId);
    }
    this.pointer.down = false;
    this.panActive = false;
    this.activePointerId = null;
  }
}
