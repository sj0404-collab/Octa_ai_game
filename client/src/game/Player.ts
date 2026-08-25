/** Night Shift design reminder: the worker is vulnerable and nonlethal; motion, teleport timing and cover are the power fantasy. */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import type { Scene } from "@babylonjs/core/scene";
import { SHELLS, type Point2, type ShellId } from "./types";

const MINT = new Color3(0.376, 0.965, 0.831);
const SHELL_COLORS: Record<ShellId, Color3> = { prism: new Color3(0.55, 0.96, 1), echo: MINT, bastion: new Color3(0.77, 0.88, 0.65) };
interface TrailPulse { mesh: Mesh; life: number; }
interface PulseRing { mesh: Mesh; life: number; }

export class Player {
  readonly mesh: Mesh;
  position: Point2 = { x: -8.9, z: 4.7 };
  charges = 1;
  pulseCooldown = 0;
  health = 2;
  shell: ShellId = "echo";
  stealth = 100;
  noise = 0;
  isCovered = false;
  private facing = 0;
  private trailTimer = 0;
  private teleportTime = 0;
  private teleportCooldown = 0;
  private jumpTime = 0;
  private rollTime = 0;
  private rollCooldown = 0;
  private sprinting = false;
  private crouching = false;
  private invulnerableTime = 0;
  private readonly trails: TrailPulse[] = [];
  private readonly pulseRings: PulseRing[] = [];
  private pulseRadius = 0;
  private readonly spriteTexture: Texture;
  private readonly coreBeacon: Mesh;
  private readonly body: Mesh;
  private readonly head: Mesh;
  private readonly flashlight: SpotLight;
  private flashlightOn = true;

  constructor(private readonly scene: Scene, spriteUrl: string) {
    this.mesh = MeshBuilder.CreatePlane("night-shift-worker", { size: 1.5, sideOrientation: 2 }, scene);
    // The visible face must point upward toward the tactical/overview cameras.
    // The previous +90° rotation exposed the plane backface and inverted some sprite frames.
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position = new Vector3(this.position.x, 0.42, this.position.z);
    const material = new StandardMaterial("night-shift-worker-material", scene);
    this.spriteTexture = new Texture(spriteUrl, scene, true, false);
    this.spriteTexture.hasAlpha = true;
    this.spriteTexture.uScale = 0.2;
    material.diffuseTexture = this.spriteTexture;
    material.opacityTexture = this.spriteTexture;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = MINT;
    material.disableLighting = true;
    this.mesh.material = material;
    this.body = MeshBuilder.CreateCylinder("night-shift-worker-body", { height: 0.56, diameterTop: 0.38, diameterBottom: 0.54, tessellation: 8 }, scene);
    this.body.position.set(this.position.x, 0.34, this.position.z);
    const bodyMaterial = new StandardMaterial("night-shift-worker-body-material", scene); bodyMaterial.diffuseColor = new Color3(0.04, 0.1, 0.15); bodyMaterial.emissiveColor = MINT.scale(0.48); bodyMaterial.disableLighting = true; this.body.material = bodyMaterial;
    this.head = MeshBuilder.CreateSphere("night-shift-worker-head", { diameter: 0.34, segments: 10 }, scene); this.head.position.set(this.position.x, 0.77, this.position.z); const headMaterial = new StandardMaterial("night-shift-worker-head-material", scene); headMaterial.emissiveColor = new Color3(0.77, 1, 0.96); headMaterial.disableLighting = true; this.head.material = headMaterial;
    this.coreBeacon = MeshBuilder.CreateTorus("night-shift-worker-beacon", { diameter: 1.48, thickness: 0.07, tessellation: 32 }, scene);
    this.coreBeacon.position.set(this.position.x, 0.065, this.position.z);
    const beaconMaterial = new StandardMaterial("night-shift-worker-beacon-material", scene); beaconMaterial.emissiveColor = new Color3(0.55, 1, 0.9); beaconMaterial.alpha = 1; beaconMaterial.disableLighting = true; this.coreBeacon.material = beaconMaterial;
    this.flashlight = new SpotLight("night-shift-worker-flashlight", new Vector3(this.position.x, 0.78, this.position.z), new Vector3(0, -0.16, 1), Math.PI / 4.2, 2, scene); this.flashlight.diffuse = new Color3(0.72, 0.9, 1); this.flashlight.intensity = 0.72; this.flashlight.range = 5.1;
  }

  get maxHealth() { return SHELLS[this.shell].maxHealth; }
  get jumpReady() { return this.jumpTime <= 0; }
  get dashReady() { return this.teleportCooldown <= 0; }
  get isAirborne() { return this.jumpTime > 0; }
  get isTeleporting() { return this.teleportTime > 0; }
  get isRolling() { return this.rollTime > 0; }
  get rollReady() { return this.rollCooldown <= 0; }
  get isSprinting() { return this.sprinting; }
  get isCrouching() { return this.crouching; }
  setShell(shell: ShellId) { this.shell = shell; this.health = Math.min(this.maxHealth, this.health + 1); (this.mesh.material as StandardMaterial).emissiveColor = SHELL_COLORS[shell]; }

  reset() {
    this.position = { x: -8.9, z: 4.7 }; this.charges = 1; this.health = this.maxHealth; this.stealth = 100; this.noise = 0; this.isCovered = false; this.pulseCooldown = 0; this.teleportCooldown = 0; this.teleportTime = 0; this.jumpTime = 0; this.rollTime = 0; this.rollCooldown = 0; this.sprinting = false; this.crouching = false; this.flashlightOn = true; this.invulnerableTime = 0; this.pulseRadius = 0;
    this.mesh.setEnabled(true); this.mesh.isVisible = true; this.coreBeacon.setEnabled(true); this.coreBeacon.isVisible = true; this.body.setEnabled(true); this.body.isVisible = true; this.head.setEnabled(true); this.head.isVisible = true; this.mesh.position.set(this.position.x, 0.42, this.position.z); this.body.position.set(this.position.x, 0.34, this.position.z); this.head.position.set(this.position.x, 0.77, this.position.z); this.mesh.rotation.set(-Math.PI / 2, 0, 0); this.spriteTexture.uOffset = 0;
    this.trails.forEach((trail) => trail.mesh.dispose()); this.pulseRings.forEach((ring) => ring.mesh.dispose()); this.trails.length = 0; this.pulseRings.length = 0;
  }
  setCovered(covered: boolean) { this.isCovered = covered; }
  setFirstPerson(enabled: boolean) { const visible = !enabled; this.mesh.setEnabled(visible); this.coreBeacon.setEnabled(visible); this.body.setEnabled(visible); this.head.setEnabled(visible); this.mesh.isVisible = visible; this.coreBeacon.isVisible = visible; this.body.isVisible = visible; this.head.isVisible = visible; this.trails.forEach((trail) => { trail.mesh.isVisible = visible; }); this.pulseRings.forEach((ring) => { ring.mesh.isVisible = visible; }); }
  setSpawn(position: Point2) { this.position = { ...position }; this.mesh.position.set(position.x, 0.42, position.z); this.body.position.set(position.x, 0.34, position.z); this.head.position.set(position.x, 0.77, position.z); }

  update(delta: number, direction: Point2, resolveMove?: (from: Point2, wanted: Point2) => Point2, sprintRequested = false) {
    this.pulseCooldown = Math.max(0, this.pulseCooldown - delta); this.teleportCooldown = Math.max(0, this.teleportCooldown - delta); this.teleportTime = Math.max(0, this.teleportTime - delta); this.jumpTime = Math.max(0, this.jumpTime - delta); this.rollTime = Math.max(0, this.rollTime - delta); this.rollCooldown = Math.max(0, this.rollCooldown - delta); this.invulnerableTime = Math.max(0, this.invulnerableTime - delta);
    const moving = Math.hypot(direction.x, direction.z) > 0.01;
    const profile = SHELLS[this.shell];
    this.sprinting = sprintRequested && moving && !this.crouching && !this.isRolling && !this.isTeleporting;
    const speed = 5.75 * profile.speedMultiplier * (this.isTeleporting ? 1.3 : this.isRolling ? 1.72 : this.crouching ? 0.48 : this.sprinting ? 1.42 : 1);
    if (moving) {
      const wanted = { x: this.position.x + direction.x * speed * delta, z: this.position.z + direction.z * speed * delta };
      const resolved = resolveMove ? resolveMove(this.position, wanted) : wanted;
      const translated = Math.hypot(resolved.x - this.position.x, resolved.z - this.position.z) > 0.0005;
      if (translated) {
        this.position = resolved;
        this.facing = Math.atan2(direction.x, direction.z); this.mesh.rotation.y = this.facing; this.trailTimer -= delta;
        if (this.trailTimer <= 0) { this.trailTimer = this.isTeleporting ? 0.085 : 0.095; this.addTrail(); }
      }
    }
    const exposedDrain = this.crouching || this.isCovered ? -34 : this.sprinting ? 19 : moving ? 7 : -10;
    this.stealth = clamp(this.stealth - exposedDrain * profile.stealthMultiplier * delta - this.noise * 0.022 * delta, 0, 100);
    this.noise = Math.max(0, this.noise - delta * (this.isCovered ? 48 : 22));
    const airborneHeight = this.jumpTime > 0 ? Math.sin((1 - this.jumpTime / 0.46) * Math.PI) * 0.95 : 0;
    const bob = Math.sin(performance.now() * 0.006) * 0.03; this.mesh.position.set(this.position.x, (this.crouching ? 0.28 : 0.42) + airborneHeight + bob, this.position.z);
    this.mesh.scaling.y = this.crouching ? 0.72 : this.isRolling ? 0.62 : 1;
    this.body.position.set(this.position.x, (this.crouching ? 0.23 : 0.34) + airborneHeight + bob, this.position.z); this.body.scaling.y = this.crouching ? 0.65 : this.isRolling ? 0.48 : 1; this.body.rotation.y = this.facing; this.head.position.set(this.position.x, (this.crouching ? 0.53 : 0.77) + airborneHeight + bob, this.position.z);
    this.coreBeacon.position.set(this.position.x, 0.065, this.position.z); this.coreBeacon.rotation.y += delta * 2.4; this.coreBeacon.scaling.setAll(0.92 + Math.sin(performance.now() * 0.006) * 0.11);
    const forward = this.getViewDirection(); this.flashlight.position.set(this.position.x, this.crouching ? 0.52 : 0.78, this.position.z); this.flashlight.direction.set(forward.x, -0.12, forward.z); this.flashlight.intensity = this.flashlightOn ? (this.crouching ? 0.45 : 0.72) : 0;
    const material = this.mesh.material as StandardMaterial; material.alpha = this.invulnerableTime > 0 && Math.floor(this.invulnerableTime * 18) % 2 === 0 ? 0.46 : 1;
    this.spriteTexture.uOffset = (this.isTeleporting ? 4 : moving && this.trailTimer < 0.09 ? (Math.sin(this.facing) < 0 ? 1 : 2) : 0) * 0.2;
    this.updateEffects(delta);
  }

  tryPulse() { if (this.charges < 1 || this.pulseCooldown > 0) return false; this.charges -= 1; this.pulseCooldown = 0.82; this.pulseRadius = 3.85; this.addRing(0.35, 0.56, MINT); this.noise = Math.min(100, this.noise + 48); return true; }
  tryJump() { if (!this.jumpReady) return false; this.jumpTime = 0.46; this.noise = Math.min(100, this.noise + 18); this.addRing(0.2, 0.3, new Color3(0.72, 0.95, 1)); return true; }
  tryRoll(direction: Point2, resolveMove?: (from: Point2, wanted: Point2) => Point2) { if (!this.rollReady || this.isAirborne || this.isTeleporting) return false; const fallback = { x: Math.sin(this.facing), z: Math.cos(this.facing) }; const axis = Math.hypot(direction.x, direction.z) > 0.1 ? direction : fallback; const wanted = { x: this.position.x + axis.x * 1.42, z: this.position.z + axis.z * 1.42 }; const resolved = resolveMove ? resolveMove(this.position, wanted) : wanted; if (Math.hypot(resolved.x - this.position.x, resolved.z - this.position.z) < 0.14) return false; this.position = resolved; this.rollTime = 0.34; this.rollCooldown = 0.82; this.invulnerableTime = 0.2; this.noise = Math.min(100, this.noise + 12); this.addRing(0.24, 0.26, new Color3(0.65, 0.95, 0.9)); return true; }
  toggleCrouch() { this.crouching = !this.crouching; return this.crouching; }
  toggleFlashlight() { this.flashlightOn = !this.flashlightOn; return this.flashlightOn; }
  get isFlashlightOn() { return this.flashlightOn; }
  setFacing(angle: number) { this.facing = angle; this.mesh.rotation.y = angle; this.body.rotation.y = angle; }
  tryTeleport(direction: Point2, resolveMove?: (from: Point2, wanted: Point2) => Point2) { if (!this.dashReady) return false; const fallback = { x: Math.sin(this.facing), z: Math.cos(this.facing) }; const axis = Math.hypot(direction.x, direction.z) > 0.1 ? direction : fallback; const wanted = { x: this.position.x + axis.x * 2.45, z: this.position.z + axis.z * 2.45 }; const resolved = resolveMove ? resolveMove(this.position, wanted) : wanted; if (Math.hypot(resolved.x - this.position.x, resolved.z - this.position.z) < 0.55) return false; this.position = resolved; this.teleportTime = 0.24; this.teleportCooldown = 3.15; this.invulnerableTime = 0.34; this.noise = Math.min(100, this.noise + 38); this.addRing(0.32, 0.55, MINT); return true; }
  takeDamage(amount: number) { if (this.invulnerableTime > 0 || this.isAirborne || this.isTeleporting) return false; this.health = Math.max(0, this.health - amount); this.invulnerableTime = 0.85; this.stealth = Math.max(0, this.stealth - 26); return true; }
  heal(amount = 1) { const before = this.health; this.health = Math.min(this.maxHealth, this.health + amount); return this.health > before; }
  getPulseRadius() { return this.pulseRadius; }
  getViewDirection() { return { x: Math.sin(this.facing), z: Math.cos(this.facing) }; }
  getFacingAngle() { return this.facing; }

  private addRing(diameter: number, life: number, color: Color3) { const ring = MeshBuilder.CreateTorus("night-shift-pulse", { diameter, thickness: 0.05, tessellation: 40 }, this.scene); ring.position.set(this.position.x, 0.08, this.position.z); const material = new StandardMaterial("night-shift-pulse-material", this.scene); material.emissiveColor = color; material.alpha = 0.85; material.disableLighting = true; ring.material = material; this.pulseRings.push({ mesh: ring, life }); }
  private addTrail() { if (this.trails.length >= 12) this.trails.shift()?.mesh.dispose(); const trail = MeshBuilder.CreateDisc("night-shift-trail", { radius: this.isTeleporting ? 0.23 : 0.15, tessellation: 12 }, this.scene); trail.rotation.x = Math.PI / 2; trail.position.set(this.position.x - Math.sin(this.facing) * 0.25, 0.04, this.position.z - Math.cos(this.facing) * 0.25); const material = new StandardMaterial("night-shift-trail-material", this.scene); material.emissiveColor = SHELL_COLORS[this.shell]; material.alpha = this.isTeleporting ? 0.98 : 0.76; material.disableLighting = true; trail.material = material; this.trails.push({ mesh: trail, life: this.isTeleporting ? 0.42 : 0.48 }); }
  private updateEffects(delta: number) { this.pulseRadius = Math.max(0, this.pulseRadius - delta * 7.2); for (let index = this.trails.length - 1; index >= 0; index -= 1) { const trail = this.trails[index]; trail.life -= delta; trail.mesh.scaling.scaleInPlace(0.97); (trail.mesh.material as StandardMaterial).alpha = Math.max(0, trail.life * 1.8); if (trail.life <= 0) { trail.mesh.dispose(); this.trails.splice(index, 1); } } for (let index = this.pulseRings.length - 1; index >= 0; index -= 1) { const ring = this.pulseRings[index]; ring.life -= delta; ring.mesh.scaling.scaleInPlace(1.12); (ring.mesh.material as StandardMaterial).alpha = Math.max(0, ring.life * 1.8); if (ring.life <= 0) { ring.mesh.dispose(); this.pulseRings.splice(index, 1); } } }
}
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
