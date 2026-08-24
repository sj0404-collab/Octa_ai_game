/** Prism Relay design reminder: every device maps through shared semantic actions, with screen-aligned directional intent. */
import type { CameraMode, Point2 } from "./types";

export class InputManager {
  private readonly keys = new Set<string>();
  private touchAxis: Point2 = { x: 0, z: 0 };
  private touchSensitivity = 1;
  private pulseQueued = false;
  private jumpQueued = false;
  private dashQueued = false;
  private rollQueued = false;
  private crouchQueued = false;
  private interactQueued = false;
  private restartQueued = false;
  private nextSectorQueued = false;
  private eventChoiceQueued: "guide" | "core" | "roulette" | null = null;
  private cameraModeQueued: CameraMode | null = null;
  private scanQueued = false;
  private resumeQueued = false;
  private continueQueued = false;
  private flashlightQueued = false;
  private rationQueued = false;
  private buyRationQueued = false;
  private lookDelta = { x: 0, y: 0 };
  private tacticalZoom = 0.52;

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d", "r", "enter", "q", "e", "f", "c", "l", "h", "m", "shift", "control", "x", "1", "2", "3"].includes(key)) event.preventDefault();
    this.keys.add(key);
    if (key === " ") this.pulseQueued = true;
    if (key === "q") this.jumpQueued = true;
    if (key === "shift") this.dashQueued = true;
    if (key === "control" || key === "x") this.rollQueued = true;
    if (key === "e") this.crouchQueued = true;
    if (key === "f" || key === "e") this.interactQueued = true;
    if (key === "r") this.restartQueued = true;
    if (key === "enter") this.nextSectorQueued = true;
    if (key === "m") this.cameraModeQueued = "map";
    if (key === "1") this.cameraModeQueued = "tactical";
    if (key === "2") this.cameraModeQueued = "third";
    if (key === "3") this.cameraModeQueued = "first";
    if (key === "c") this.scanQueued = true;
    if (key === "l") this.flashlightQueued = true;
    if (key === "h") this.rationQueued = true;
  };

  private readonly onKeyUp = (event: KeyboardEvent) => this.keys.delete(event.key.toLowerCase());
  private readonly onRestart = () => { this.restartQueued = true; };
  private readonly onNextSector = () => { this.nextSectorQueued = true; };
  private readonly onTouchMove = (event: Event) => {
    const { x, z } = (event as CustomEvent<Point2>).detail;
    const length = Math.hypot(x, z);
    this.touchAxis = length > 1 ? { x: x / length, z: z / length } : { x, z };
  };
  private readonly onTouchSettings = (event: Event) => {
    const { sensitivity } = (event as CustomEvent<{ sensitivity: number }>).detail;
    this.touchSensitivity = Math.max(0.65, Math.min(1.35, sensitivity));
  };
  private readonly onTouchPulse = () => { this.pulseQueued = true; };
  private readonly onTouchJump = () => { this.jumpQueued = true; };
  private readonly onTouchDash = () => { this.dashQueued = true; };
  private readonly onTouchInteract = () => { this.interactQueued = true; };
  private readonly onTouchScan = () => { this.scanQueued = true; };
  private readonly onEventChoice = (event: Event) => { this.eventChoiceQueued = (event as CustomEvent<{ choice: "guide" | "core" | "roulette" }>).detail.choice; };
  private readonly onCameraMode = (event: Event) => { this.cameraModeQueued = (event as CustomEvent<{ mode: CameraMode }>).detail.mode; };
  private readonly onCameraZoom = (event: Event) => { this.tacticalZoom = Math.max(0, Math.min(1, (event as CustomEvent<{ zoom: number }>).detail.zoom)); };
  private readonly onLook = (event: Event) => { const { x, y } = (event as CustomEvent<{ x: number; y: number }>).detail; this.lookDelta.x += x; this.lookDelta.y += y; };
  private readonly onResume = () => { this.resumeQueued = true; };
  private readonly onContinue = () => { this.continueQueued = true; };
  private readonly onFlashlight = () => { this.flashlightQueued = true; };
  private readonly onRation = () => { this.rationQueued = true; };
  private readonly onBuyRation = () => { this.buyRationQueued = true; };
  private readonly onWindowBlur = () => { this.keys.clear(); this.touchAxis = { x: 0, z: 0 }; };

  constructor() {
    window.addEventListener("keydown", this.onKeyDown, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("ai-core-restart", this.onRestart);
    window.addEventListener("ai-core-next-sector", this.onNextSector);
    window.addEventListener("ai-core-touch-move", this.onTouchMove);
    window.addEventListener("ai-core-touch-settings", this.onTouchSettings);
    window.addEventListener("ai-core-pulse", this.onTouchPulse);
    window.addEventListener("ai-core-jump", this.onTouchJump);
    window.addEventListener("ai-core-dash", this.onTouchDash);
    window.addEventListener("ai-core-interact", this.onTouchInteract);
    window.addEventListener("ai-core-scan", this.onTouchScan);
    window.addEventListener("ai-core-event-choice", this.onEventChoice);
    window.addEventListener("ai-core-camera-mode", this.onCameraMode);
    window.addEventListener("ai-core-camera-zoom", this.onCameraZoom);
    window.addEventListener("ai-core-look", this.onLook);
    window.addEventListener("ai-core-resume", this.onResume);
    window.addEventListener("ai-core-continue", this.onContinue);
    window.addEventListener("ai-core-flashlight", this.onFlashlight);
    window.addEventListener("ai-core-ration", this.onRation);
    window.addEventListener("ai-core-buy-ration", this.onBuyRation);
    window.addEventListener("blur", this.onWindowBlur);
  }

  getMoveAxis(): Point2 {
    const keyboardX = Number(this.keys.has("d") || this.keys.has("arrowright")) - Number(this.keys.has("a") || this.keys.has("arrowleft"));
    // The ArcRotate camera looks from -Z toward +Z; up on screen must therefore map to +Z.
    const keyboardZ = Number(this.keys.has("w") || this.keys.has("arrowup")) - Number(this.keys.has("s") || this.keys.has("arrowdown"));
    const keyboardLength = Math.hypot(keyboardX, keyboardZ);
    if (keyboardLength > 0.01) return { x: keyboardX / keyboardLength, z: keyboardZ / keyboardLength };
    return { x: this.touchAxis.x * this.touchSensitivity, z: this.touchAxis.z * this.touchSensitivity };
  }

  consumePulse() { return this.consume("pulseQueued"); }
  consumeJump() { return this.consume("jumpQueued"); }
  consumeDash() { return this.consume("dashQueued"); }
  consumeRoll() { return this.consume("rollQueued"); }
  consumeCrouch() { return this.consume("crouchQueued"); }
  consumeInteract() { return this.consume("interactQueued"); }
  consumeScan() { return this.consume("scanQueued"); }
  consumeRestart() { return this.consume("restartQueued"); }
  consumeNextSector() { return this.consume("nextSectorQueued"); }
  consumeEventChoice() { const choice = this.eventChoiceQueued; this.eventChoiceQueued = null; return choice; }
  consumeCameraMode() { const mode = this.cameraModeQueued; this.cameraModeQueued = null; return mode; }
  consumeResume() { return this.consume("resumeQueued"); }
  consumeContinue() { return this.consume("continueQueued"); }
  consumeFlashlight() { return this.consume("flashlightQueued"); }
  consumeRation() { return this.consume("rationQueued"); }
  consumeBuyRation() { return this.consume("buyRationQueued"); }
  consumeLook() { const look = { ...this.lookDelta }; this.lookDelta = { x: 0, y: 0 }; return look; }
  getTacticalZoom() { return this.tacticalZoom; }

  private consume(key: "pulseQueued" | "jumpQueued" | "dashQueued" | "rollQueued" | "crouchQueued" | "interactQueued" | "scanQueued" | "restartQueued" | "nextSectorQueued" | "resumeQueued" | "continueQueued" | "flashlightQueued" | "rationQueued" | "buyRationQueued") {
    const queued = this[key];
    this[key] = false;
    return queued;
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("ai-core-restart", this.onRestart);
    window.removeEventListener("ai-core-next-sector", this.onNextSector);
    window.removeEventListener("ai-core-touch-move", this.onTouchMove);
    window.removeEventListener("ai-core-touch-settings", this.onTouchSettings);
    window.removeEventListener("ai-core-pulse", this.onTouchPulse);
    window.removeEventListener("ai-core-jump", this.onTouchJump);
    window.removeEventListener("ai-core-dash", this.onTouchDash);
    window.removeEventListener("ai-core-interact", this.onTouchInteract);
    window.removeEventListener("ai-core-scan", this.onTouchScan);
    window.removeEventListener("ai-core-event-choice", this.onEventChoice);
    window.removeEventListener("ai-core-camera-mode", this.onCameraMode);
    window.removeEventListener("ai-core-camera-zoom", this.onCameraZoom);
    window.removeEventListener("ai-core-look", this.onLook);
    window.removeEventListener("ai-core-resume", this.onResume);
    window.removeEventListener("ai-core-continue", this.onContinue);
    window.removeEventListener("ai-core-flashlight", this.onFlashlight);
    window.removeEventListener("ai-core-ration", this.onRation);
    window.removeEventListener("ai-core-buy-ration", this.onBuyRation);
    window.removeEventListener("blur", this.onWindowBlur);
  }
}
