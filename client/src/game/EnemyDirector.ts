/** Night Shift design reminder: pursuers are physical corporate avatars; coral chase pressure must remain readable and escapable. */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import type { ReactorEnvironment } from "./ReactorEnvironment";
import type { EnemySpawn, EnemyKind, ProceduralLayout } from "./ProceduralSector";
import type { Point2, SentinelMode } from "./types";

const CORAL = new Color3(1, 0.32, 0.29); const AMBER = new Color3(0.96, 0.56, 0.18); const VIOLET = new Color3(0.58, 0.4, 0.95); const MINT = new Color3(0.376, 0.965, 0.831);
interface EnemySpec { range: number; patrolSpeed: number; chaseSpeed: number; cone: number; color: Color3; noiseBias: number; faceIndex: number; }
const SPECS: Record<EnemyKind, EnemySpec> = { watcher: { range: 6.35, patrolSpeed: 1.28, chaseSpeed: 2.85, cone: Math.PI / 4.1, color: CORAL, noiseBias: 0.2, faceIndex: 0 }, hunter: { range: 4.85, patrolSpeed: 1.92, chaseSpeed: 4.65, cone: Math.PI / 3.1, color: AMBER, noiseBias: 0.48, faceIndex: 1 }, harvester: { range: 4.2, patrolSpeed: 1.2, chaseSpeed: 3.35, cone: Math.PI / 2.2, color: VIOLET, noiseBias: 0.8, faceIndex: 2 } };

class EnemyAgent {
  readonly mesh: Mesh; readonly face: Mesh; readonly cone: Mesh; readonly rigParts: Mesh[] = []; position: Point2; mode: SentinelMode = "patrol";
  private facing = Math.PI; private patrolIndex = 0; private memory = 0; private stun = 0; private frustration = 0; private lastKnown: Point2; private readonly spec: EnemySpec;
  constructor(private readonly scene: Scene, private readonly spawn: EnemySpawn, faceUrl: string) {
    this.position = { x: spawn.x, z: spawn.z }; this.lastKnown = { ...this.position }; this.spec = SPECS[spawn.kind];
    this.mesh = MeshBuilder.CreateCylinder(`office-pursuer-${spawn.kind}`, { height: spawn.kind === "harvester" ? 1.08 : 0.86, diameterTop: 0.82, diameterBottom: 1.05, tessellation: 8 }, scene);
    const bodyMaterial = new StandardMaterial(`office-pursuer-body-${spawn.kind}-${spawn.x}`, scene); bodyMaterial.diffuseColor = new Color3(0.03, 0.05, 0.1); bodyMaterial.emissiveColor = this.spec.color.scale(0.28); bodyMaterial.disableLighting = true; this.mesh.material = bodyMaterial;
    const shoulder = MeshBuilder.CreateBox(`office-pursuer-shoulder-${spawn.kind}-${spawn.x}`, { width: 1.05, depth: 0.48, height: 0.18 }, scene); shoulder.parent = this.mesh; shoulder.position.set(0, 0.18, 0); shoulder.material = bodyMaterial; this.rigParts.push(shoulder);
    [-1, 1].forEach((side) => { const arm = MeshBuilder.CreateBox(`office-pursuer-arm-${spawn.kind}-${spawn.x}-${side}`, { width: 0.14, depth: 0.18, height: 0.64 }, scene); arm.parent = this.mesh; arm.position.set(side * 0.52, -0.18, 0.06); arm.material = bodyMaterial; this.rigParts.push(arm); });
    const antenna = MeshBuilder.CreateCylinder(`office-pursuer-antenna-${spawn.kind}-${spawn.x}`, { diameter: 0.08, height: 0.46, tessellation: 6 }, scene); antenna.parent = this.mesh; antenna.position.set(0, 0.64, 0); const antennaMaterial = new StandardMaterial(`office-pursuer-antenna-material-${spawn.kind}-${spawn.x}`, scene); antennaMaterial.emissiveColor = this.spec.color; antennaMaterial.disableLighting = true; antenna.material = antennaMaterial; this.rigParts.push(antenna);
    this.face = MeshBuilder.CreatePlane(`office-pursuer-face-${spawn.kind}`, { size: 0.74 }, scene); this.face.rotation.x = Math.PI / 2; this.face.parent = this.mesh; this.face.position = new Vector3(0, 0.52, 0);
    const faceMaterial = new StandardMaterial(`office-pursuer-face-material-${spawn.kind}-${spawn.x}`, scene); const faceTexture = new Texture(faceUrl, scene, true, false); faceTexture.hasAlpha = true; faceTexture.uScale = 1 / 3; faceTexture.uOffset = this.spec.faceIndex / 3; faceMaterial.diffuseTexture = faceTexture; faceMaterial.opacityTexture = faceTexture; faceMaterial.useAlphaFromDiffuseTexture = true; faceMaterial.emissiveColor = this.spec.color; faceMaterial.disableLighting = true; this.face.material = faceMaterial;
    this.cone = MeshBuilder.CreateDisc(`office-pursuer-cone-${spawn.kind}`, { radius: this.spec.range, tessellation: 38, arc: this.spec.cone / Math.PI, sideOrientation: 2 }, scene); this.cone.rotation.x = Math.PI / 2; const coneMaterial = new StandardMaterial(`office-pursuer-cone-material-${spawn.kind}-${spawn.x}`, scene); coneMaterial.diffuseColor = this.spec.color; coneMaterial.emissiveColor = this.spec.color.scale(0.78); coneMaterial.alpha = 0.16; coneMaterial.disableLighting = true; this.cone.material = coneMaterial;
  }
  reset() { this.position = { x: this.spawn.x, z: this.spawn.z }; this.lastKnown = { ...this.position }; this.mode = "patrol"; this.patrolIndex = 0; this.memory = 0; this.stun = 0; this.frustration = 0; this.sync(); }
  update(delta: number, player: Point2, pulseRadius: number, noise: number, flashlightOn: boolean, flashlightDirection: Point2, environment: ReactorEnvironment) {
    const distanceToPlayer = distance(this.position, player); if (pulseRadius > 0 && distanceToPlayer <= pulseRadius) { this.mode = "stunned"; this.stun = 1.32; this.frustration = Math.max(0, this.frustration - 0.16); }
    if (this.mode === "stunned") { this.stun -= delta; if (this.stun <= 0) { this.mode = "search"; this.memory = 2.7; } this.sync(); return; }
    const visible = this.canSee(player, environment); const lit = flashlightOn && this.inFlashlight(player, flashlightDirection, environment); const heard = !environment.isCovered(player) && noise > 10 && distanceToPlayer < 1.55 + noise * (0.026 + this.spec.noiseBias * 0.012);
    if (visible) { this.mode = "chase"; this.lastKnown = { ...player }; this.memory = 3.4; this.frustration = Math.min(0.46, this.frustration + delta * 0.085); }
    else if ((heard || lit) && this.mode !== "chase") { this.mode = "alert"; this.lastKnown = { ...player }; this.memory = lit ? 2.5 : 1.45; }
    else if (this.mode === "chase" || this.mode === "alert") { this.memory -= delta; if (this.memory <= 0) { this.mode = "search"; this.memory = 2.7; this.frustration = Math.min(0.46, this.frustration + 0.06); } }
    else if (this.mode === "search") { this.memory -= delta; if (this.memory <= 0) this.mode = "patrol"; }
    const target = this.mode === "chase" || this.mode === "alert" || this.mode === "search" ? this.lastKnown : this.spawn.patrol[this.patrolIndex]; const speed = (this.mode === "chase" ? this.spec.chaseSpeed : this.mode === "alert" || this.mode === "search" ? this.spec.patrolSpeed * 1.42 : this.spec.patrolSpeed) * (1 + this.frustration);
    this.steer(target, speed, delta); if (this.mode === "patrol" && distance(this.position, target) < 0.25) this.patrolIndex = (this.patrolIndex + 1) % this.spawn.patrol.length; if (this.mode === "search" && distance(this.position, target) < 0.32) this.memory = 0; this.sync();
  }
  catches(player: Point2) { return this.mode === "chase" && distance(this.position, player) < 0.74; }
  dispose() { this.rigParts.forEach((part) => part.dispose()); this.mesh.dispose(); this.face.dispose(); this.cone.dispose(); }
  private canSee(player: Point2, environment: ReactorEnvironment) { const dx = player.x - this.position.x; const dz = player.z - this.position.z; const length = Math.hypot(dx, dz); if (length > this.spec.range || length < 0.1 || environment.blocksSight(this.position, player)) return false; const dot = (dx / length) * Math.sin(this.facing) + (dz / length) * Math.cos(this.facing); return dot > Math.cos(this.spec.cone / 2); }
  private inFlashlight(player: Point2, direction: Point2, environment: ReactorEnvironment) { const dx = this.position.x - player.x; const dz = this.position.z - player.z; const length = Math.hypot(dx, dz); if (length > 6.1 || length < 0.2 || environment.blocksSight(player, this.position)) return false; return (dx / length) * direction.x + (dz / length) * direction.z > 0.7; }
  private steer(target: Point2, speed: number, delta: number) { const dx = target.x - this.position.x; const dz = target.z - this.position.z; const length = Math.hypot(dx, dz) || 1; this.position.x += (dx / length) * speed * delta; this.position.z += (dz / length) * speed * delta; this.facing = Math.atan2(dx / length, dz / length); }
  private sync() { const clock = performance.now() * 0.006 + this.spawn.x; const bob = Math.sin(clock) * 0.045; this.mesh.position.set(this.position.x, 0.46 + bob, this.position.z); this.mesh.rotation.y = this.facing; this.rigParts.forEach((part, index) => { if (index === 0) part.scaling.x = 1 + Math.sin(clock * 0.5) * 0.04; else part.rotation.z = Math.sin(clock * (this.mode === "chase" ? 3.4 : 1.45) + index) * (this.mode === "chase" ? 0.52 : 0.18); }); this.cone.position.set(this.position.x, 0.025, this.position.z); this.cone.rotation.y = this.facing - Math.PI / 2; this.cone.isVisible = this.mode !== "stunned"; const coneMaterial = this.cone.material as StandardMaterial; coneMaterial.alpha = this.mode === "chase" ? 0.47 : this.mode === "alert" || this.mode === "search" ? 0.31 : 0.16; (this.mesh.material as StandardMaterial).emissiveColor = this.mode === "stunned" ? MINT : this.spec.color.scale(this.mode === "chase" ? 0.78 : 0.4); }
}
export class EnemyDirector {
  private enemies: EnemyAgent[] = [];
  constructor(private readonly scene: Scene, private readonly spriteUrl: string) {}
  configure(layout: ProceduralLayout) { this.enemies.forEach((enemy) => enemy.dispose()); this.enemies = layout.enemySpawns.map((spawn) => new EnemyAgent(this.scene, spawn, this.spriteUrl)); this.enemies.forEach((enemy) => enemy.reset()); }
  update(delta: number, player: Point2, pulseRadius: number, noise: number, flashlightOn: boolean, flashlightDirection: Point2, environment: ReactorEnvironment) { this.enemies.forEach((enemy) => enemy.update(delta, player, pulseRadius, noise, flashlightOn, flashlightDirection, environment)); }
  catches(player: Point2) { return this.enemies.some((enemy) => enemy.catches(player)); }
  getMinimapContacts(player: Point2, revealRadius = 4.8) {
    return this.enemies.filter((enemy) => enemy.mode !== "patrol" || distance(enemy.position, player) < revealRadius).map((enemy, index) => ({ id: `threat-${index}`, x: enemy.position.x, z: enemy.position.z, mode: enemy.mode }));
  }
  get mode(): SentinelMode { const order: SentinelMode[] = ["patrol", "alert", "search", "chase", "stunned"]; return this.enemies.reduce((current, enemy) => order.indexOf(enemy.mode) > order.indexOf(current) ? enemy.mode : current, "patrol" as SentinelMode); }
  dispose() { this.enemies.forEach((enemy) => enemy.dispose()); this.enemies = []; }
}
function distance(a: Point2, b: Point2) { return Math.hypot(a.x - b.x, a.z - b.z); }
