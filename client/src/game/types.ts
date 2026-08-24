/** Prism Relay design reminder: gameplay state is compact, readable telemetry with a clear safety/threat color system. */
export type GameStatus = "playing" | "won" | "lost" | "campaign-complete" | "event";
export type SentinelMode = "patrol" | "alert" | "search" | "chase" | "stunned";
export type ShellId = "prism" | "echo" | "bastion";
export type NightMode = "story" | "free";
export type CameraMode = "map" | "tactical" | "third" | "first";

export interface Point2 {
  x: number;
  z: number;
}

export type MinimapMarkerKind = "exit" | "safe" | "relic" | "heal" | "ammo" | "cash" | "terminal" | "moving-wall" | "trap" | "access" | "threat";

export interface MinimapRoom {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
  kind: "entry" | "work" | "archive" | "vault" | "relic" | "exit";
  discovered: boolean;
}

export interface MinimapCorridor {
  id: number;
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface MinimapMarker extends Point2 {
  id: string;
  kind: MinimapMarkerKind;
  known: boolean;
  active?: boolean;
}

export interface MinimapSnapshot {
  rooms: MinimapRoom[];
  corridors: MinimapCorridor[];
  markers: MinimapMarker[];
  player: Point2;
  heading: Point2;
  breadcrumbs: Point2[];
  waypoint: Point2 | null;
  waypointLabel: "ПРОПУСК" | "ВЫХОД" | null;
  discoveredRooms: number;
  totalRooms: number;
  alert: SentinelMode;
  scannerReady: boolean;
  scannerCooldown: number;
  scanActive: boolean;
}

export interface ShellProfile {
  id: ShellId;
  name: string;
  maxHealth: number;
  speedMultiplier: number;
  stealthMultiplier: number;
  dashMultiplier: number;
}

export const SHELLS: Record<ShellId, ShellProfile> = {
  prism: { id: "prism", name: "ПРИЗМА", maxHealth: 3, speedMultiplier: 1.16, stealthMultiplier: 0.82, dashMultiplier: 1.28 },
  echo: { id: "echo", name: "ЭХО", maxHealth: 2, speedMultiplier: 1, stealthMultiplier: 1.28, dashMultiplier: 1.08 },
  bastion: { id: "bastion", name: "БАСТИОН", maxHealth: 5, speedMultiplier: 0.84, stealthMultiplier: 0.72, dashMultiplier: 0.9 },
};

export interface HUDSnapshot {
  charges: number;
  maxCharges: number;
  secondsLeft: number;
  sentinelMode: SentinelMode;
  status: GameStatus;
  message: string;
  pulseReady: boolean;
  sector: number;
  sectorName: string;
  totalSectors: number;
  score: number;
  usedPulses: number;
  grade: "S" | "A" | "B" | null;
  health: number;
  maxHealth: number;
  stealth: number;
  noise: number;
  shell: ShellId;
  jumpReady: boolean;
  dashReady: boolean;
  rollReady: boolean;
  crouching: boolean;
  flashlightOn: boolean;
  canInteract: boolean;
  event: import("./Narrative").RunEvent | null;
  ending: import("./Narrative").Epilogue | null;
  mode: NightMode;
  money: number;
  rations: number;
  runCash: number;
  relics: string[];
  achievements: number;
  cameraMode: CameraMode;
  tacticalZoom: number;
  hasCheckpoint: boolean;
  minimap: MinimapSnapshot;
}
