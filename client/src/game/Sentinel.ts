/** Prism Relay design reminder: changing speed and cone range creates escalating pressure without hiding the threat. */
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import type { SectorConfig } from "./sectors";
import type { Point2, SentinelMode } from "./types";

const CORAL = new Color3(1, 0.42, 0.39);
const MUTED_CORAL = new Color3(0.76, 0.18, 0.19);
const BASE_RANGE = 4.75;
const PATROL_POINTS: Point2[] = [{ x: 5.8, z: 3.7 }, { x: 8.8, z: -2.7 }, { x: 2.8, z: -4.9 }, { x: -1.2, z: -1.6 }];

export class Sentinel {
  readonly mesh: Mesh;
  readonly sightCone: Mesh;
  position: Point2 = { x: 5.8, z: 3.7 };
  mode: SentinelMode = "patrol";
  private patrolIndex = 0;
  private facing = Math.PI;
  private chaseMemory = 0;
  private stunTime = 0;
  private patrolSpeed = 1.58;
  private chaseSpeed = 3.15;
  private visionRange = BASE_RANGE;

  constructor(private readonly scene: Scene, spriteUrl: string) {
    this.mesh = MeshBuilder.CreatePlane("sentinel", { size: 1.65 }, scene);
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position = new Vector3(this.position.x, 0.24, this.position.z);
    const bodyMaterial = new StandardMaterial("sentinel-material", scene);
    const texture = new Texture(spriteUrl, scene, true, false);
    texture.hasAlpha = true;
    bodyMaterial.diffuseTexture = texture;
    bodyMaterial.opacityTexture = texture;
    bodyMaterial.useAlphaFromDiffuseTexture = true;
    bodyMaterial.emissiveColor = CORAL;
    bodyMaterial.disableLighting = true;
    this.mesh.material = bodyMaterial;
    this.sightCone = MeshBuilder.CreateDisc("sentinel-sight-cone", { radius: BASE_RANGE, tessellation: 44, arc: 0.19, sideOrientation: 2 }, scene);
    this.sightCone.rotation.x = Math.PI / 2;
    this.sightCone.position.set(this.position.x, 0.025, this.position.z);
    const coneMaterial = new StandardMaterial("sentinel-cone-material", scene);
    coneMaterial.diffuseColor = CORAL;
    coneMaterial.emissiveColor = MUTED_CORAL;
    coneMaterial.alpha = 0.18;
    coneMaterial.disableLighting = true;
    this.sightCone.material = coneMaterial;
  }

  configure(config: SectorConfig) {
    this.patrolSpeed = config.patrolSpeed;
    this.chaseSpeed = config.chaseSpeed;
    this.visionRange = config.visionRange;
    this.sightCone.scaling.set(this.visionRange / BASE_RANGE, this.visionRange / BASE_RANGE, 1);
  }

  reset() {
    this.position = { x: 5.8, z: 3.7 };
    this.mode = "patrol";
    this.patrolIndex = 0;
    this.facing = Math.PI;
    this.chaseMemory = 0;
    this.stunTime = 0;
    this.syncVisuals();
  }

  update(delta: number, player: Point2, pulseRadius: number, canPulse: boolean) {
    const playerDistance = distance(this.position, player);
    if (canPulse && pulseRadius > 0 && playerDistance <= pulseRadius) {
      this.mode = "stunned";
      this.stunTime = 1.35;
    }
    if (this.mode === "stunned") {
      this.stunTime -= delta;
      if (this.stunTime <= 0) this.mode = "patrol";
      this.syncVisuals();
      return;
    }
    const canSeePlayer = this.canSee(player);
    if (canSeePlayer || playerDistance < 1.45) {
      this.mode = "chase";
      this.chaseMemory = 2.7;
    } else if (this.mode === "chase") {
      this.chaseMemory -= delta;
      if (this.chaseMemory <= 0) this.mode = "patrol";
    }
    const target = this.mode === "chase" ? player : PATROL_POINTS[this.patrolIndex];
    this.steerTowards(target, this.mode === "chase" ? this.chaseSpeed : this.patrolSpeed, delta);
    if (this.mode === "patrol" && distance(this.position, target) < 0.25) this.patrolIndex = (this.patrolIndex + 1) % PATROL_POINTS.length;
    this.syncVisuals();
  }

  catches(player: Point2) { return this.mode !== "stunned" && distance(this.position, player) < 0.73; }

  private canSee(player: Point2) {
    const dx = player.x - this.position.x;
    const dz = player.z - this.position.z;
    const length = Math.hypot(dx, dz);
    if (length > this.visionRange || length < 0.1) return length < 0.1;
    const forwardX = Math.sin(this.facing);
    const forwardZ = Math.cos(this.facing);
    return (dx / length) * forwardX + (dz / length) * forwardZ > Math.cos(Math.PI / 5.2);
  }

  private steerTowards(target: Point2, speed: number, delta: number) {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    const length = Math.hypot(dx, dz) || 1;
    const directionX = dx / length;
    const directionZ = dz / length;
    this.position.x += directionX * speed * delta;
    this.position.z += directionZ * speed * delta;
    this.facing = Math.atan2(directionX, directionZ);
  }

  private syncVisuals() {
    this.mesh.position.set(this.position.x, 0.24 + Math.sin(performance.now() * 0.004) * 0.06, this.position.z);
    this.mesh.rotation.y = this.facing;
    this.sightCone.position.set(this.position.x, 0.025, this.position.z);
    this.sightCone.rotation.y = this.facing - Math.PI / 2;
    this.sightCone.isVisible = this.mode !== "stunned";
    const coneMaterial = this.sightCone.material as StandardMaterial;
    coneMaterial.alpha = this.mode === "chase" ? 0.32 : 0.16;
    const bodyMaterial = this.mesh.material as StandardMaterial;
    bodyMaterial.emissiveColor = this.mode === "stunned" ? new Color3(0.37, 0.97, 0.83) : CORAL;
  }
}

function distance(a: Point2, b: Point2) { return Math.hypot(a.x - b.x, a.z - b.z); }
