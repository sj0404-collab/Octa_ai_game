/** Night Shift design reminder: every generated office room carries cover, a route decision, a threat, or a meaningful reward—never empty floor. */
import type { SectorConfig } from "./sectors";
import type { Point2 } from "./types";

export type EnemyKind = "watcher" | "hunter" | "harvester";
export interface CoverNode extends Point2 { width: number; depth: number; }
export interface PlatformNode extends Point2 { width: number; depth: number; height: number; }
export interface TerminalNode extends Point2 { kind: "story" | "roulette"; }
export interface EnemySpawn extends Point2 { kind: EnemyKind; patrol: Point2[]; }
export interface OfficeRoom extends Point2 { width: number; depth: number; kind: "entry" | "work" | "archive" | "vault" | "relic" | "exit"; }
export interface OfficeConnection { from: number; to: number; }
export interface OfficeCorridor extends Point2 { width: number; depth: number; axis: "x" | "z"; from: number; to: number; }
export interface MovingWallNode extends Point2 { axis: "x" | "z"; travel: number; period: number; width: number; depth: number; }
export interface TrapNode extends Point2 { kind: "laser" | "tile"; }
export interface OfficePickup extends Point2 { kind: "cash" | "ammo" | "heal" | "relic"; value: number; relic?: "Часы отца" | "Памятная ручка" | "Ключ от дома" | "Фото близких"; }
export interface ProceduralLayout { seed: number; start: Point2; exit: Point2; shards: Point2[]; covers: CoverNode[]; platforms: PlatformNode[]; terminals: TerminalNode[]; enemySpawns: EnemySpawn[]; rooms: OfficeRoom[]; connections: OfficeConnection[]; corridors: OfficeCorridor[]; movingWalls: MovingWallNode[]; traps: TrapNode[]; pickups: OfficePickup[]; }

class Rng { constructor(private state: number) {} next() { this.state = (this.state + 0x6d2b79f5) | 0; let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; } range(min: number, max: number) { return min + (max - min) * this.next(); } pick<T>(items: T[]) { return items[Math.floor(this.next() * items.length)]; } }
const START: Point2 = { x: -15.2, z: 9.4 };

export function createProceduralLayout(config: SectorConfig, seed: number): ProceduralLayout {
  const rng = new Rng(seed || 1);
  const exit: Point2 = config.id === 1 ? { x: 15.2, z: -9.2 } : config.id === 2 ? { x: 16.2, z: 8.4 } : { x: 15.4, z: -1.2 };
  const room = (x: number, z: number, kind: OfficeRoom["kind"], depth?: number): OfficeRoom => ({ x, z, kind, width: kind === "vault" ? 5.95 : kind === "exit" ? 5.8 : rng.range(5.15, 5.72), depth: depth ?? (kind === "vault" ? 5.9 : kind === "exit" ? 5.9 : rng.range(5.05, 5.65)) });
  const rooms: OfficeRoom[] = [room(START.x, START.z, "entry"), room(-8.7, 9.4, "work"), room(-2.2, 9.4, "archive"), room(-2.2, 2.9, "work"), room(4.3, 2.9, "vault"), room(4.3, -3.6, "work"), room(10.8, -3.6, "relic")];
  const connections: OfficeConnection[] = [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 6 }];
  const addRoute = (x: number, z: number, kind: OfficeRoom["kind"]) => { const from = rooms.length - 1; rooms.push(room(x, z, kind)); connections.push({ from, to: rooms.length - 1 }); };
  if (config.id === 1) { addRoute(10.8, -9.2, "work"); addRoute(exit.x, exit.z, "exit"); }
  else if (config.id === 2) { addRoute(10.8, 2.9, "work"); addRoute(exit.x, 2.9, "work"); addRoute(exit.x, exit.z, "exit"); }
  else { addRoute(15.4, -3.6, "work"); addRoute(exit.x, exit.z, "exit"); }
  const addLoop = (x: number, z: number, kind: OfficeRoom["kind"], links: number[]) => { const index = rooms.length; rooms.push(room(x, z, kind)); links.forEach((from) => connections.push({ from, to: index })); };
  addLoop(-8.7, 2.9, "work", [1, 3]); addLoop(-2.2, -3.6, "archive", [3, 5]); addLoop(4.3, 9.4, "work", [2, 4]); addLoop(10.8, 2.9, "work", [4, 6]);
  const corridors = connections.map(({ from, to }) => makeCorridor(rooms[from], rooms[to], from, to));
  const routeRooms = rooms.filter((candidate) => candidate.kind !== "entry" && candidate.kind !== "exit");
  const covers: CoverNode[] = rooms.flatMap((candidate) => Array.from({ length: candidate.kind === "vault" ? 2 : candidate.kind === "archive" || candidate.kind === "relic" ? 1 : 0 }, (_, index) => ({ x: clamp(candidate.x + rng.range(-candidate.width * 0.2, candidate.width * 0.2), -19.4, 19.4), z: clamp(candidate.z + rng.range(-candidate.depth * 0.2, candidate.depth * 0.2), -13.6, 13.6), width: index % 2 ? 1.05 : 1.42, depth: index % 2 ? 0.58 : 0.72 })));
  const platforms: PlatformNode[] = [rooms[3], rooms[rooms.length - 2]].map((candidate, index) => ({ x: candidate.x + (index % 2 ? -1.55 : 1.55), z: candidate.z + (index % 2 ? 1.35 : -1.35), width: 1.05, depth: 1.35, height: 0.32 }));
  const shards = routeRooms.slice(1, Math.min(routeRooms.length - 1, config.chargesRequired + 3)).map((candidate) => ({ x: candidate.x + rng.range(-1.25, 1.25), z: candidate.z + rng.range(-1.05, 1.05) }));
  while (shards.length < config.chargesRequired) { const candidate = rng.pick(routeRooms); shards.push({ x: candidate.x + rng.range(-1.3, 1.3), z: candidate.z + rng.range(-1.05, 1.05) }); }
  const archive = rooms.find((candidate) => candidate.kind === "archive") ?? rooms[2]; const vault = rooms.find((candidate) => candidate.kind === "vault") ?? rooms[4]; const relicRoom = rooms.find((candidate) => candidate.kind === "relic") ?? rooms[6];
  const terminals: TerminalNode[] = [{ x: archive.x + 1.22, z: archive.z - 1.05, kind: "story" }, { x: vault.x - 1.42, z: vault.z + 1.02, kind: "roulette" }];
  const movingWalls: MovingWallNode[] = [{ x: archive.x + 1.75, z: archive.z, axis: "z", travel: 2.15, period: 5.4, width: 2.35, depth: 0.32 }, { x: vault.x - 1.35, z: vault.z - 1.55, axis: "x", travel: 1.95, period: 6.6, width: 0.32, depth: 2.25 }];
  const traps: TrapNode[] = [{ x: rooms[1].x + 1.28, z: rooms[1].z - 1.18, kind: "tile" }, { x: rooms[3].x - 1.2, z: rooms[3].z + 1.05, kind: "laser" }, { x: relicRoom.x + 1.15, z: relicRoom.z - 1.12, kind: "laser" }];
  const relics: OfficePickup["relic"][] = ["Часы отца", "Памятная ручка", "Ключ от дома", "Фото близких"];
  const pickups: OfficePickup[] = [...routeRooms.flatMap((candidate) => Array.from({ length: candidate.kind === "vault" ? 3 : 1 }, () => ({ kind: "cash" as const, x: candidate.x + rng.range(-1.55, 1.55), z: candidate.z + rng.range(-1.15, 1.15), value: Math.floor(rng.range(20, 76)) }))), ...routeRooms.filter((candidate) => candidate.kind !== "relic").slice(0, 4).map((candidate) => ({ kind: "ammo" as const, x: candidate.x + rng.range(-1.15, 1.15), z: candidate.z + rng.range(-0.95, 0.95), value: 1 })), { kind: "heal", x: rooms[3].x + 1.65, z: rooms[3].z - 0.8, value: 1 }, { kind: "relic", x: relicRoom.x, z: relicRoom.z + 1.22, value: 0, relic: relics[Math.abs(seed + config.id) % relics.length] }];
  const enemySpawns: EnemySpawn[] = [{ kind: "watcher", ...offset(vault, rng, 1.8), patrol: [vault, relicRoom, rooms[rooms.length - 1]] }, { kind: "hunter", ...offset(archive, rng, 1.6), patrol: [rooms[1], archive, rooms[3]] }, { kind: "harvester", ...offset(relicRoom, rng, 1.85), patrol: [vault, relicRoom, terminals[1]] }];
  return { seed, start: START, exit, shards, covers, platforms, terminals, enemySpawns, rooms, connections, corridors, movingWalls, traps, pickups };
}
function makeCorridor(fromRoom: OfficeRoom, toRoom: OfficeRoom, from: number, to: number): OfficeCorridor { const horizontal = Math.abs(fromRoom.x - toRoom.x) >= Math.abs(fromRoom.z - toRoom.z); if (horizontal) { const left = fromRoom.x < toRoom.x ? fromRoom : toRoom; const right = left === fromRoom ? toRoom : fromRoom; const start = left.x + left.width / 2 - 0.08; const end = right.x - right.width / 2 + 0.08; return { from, to, axis: "x", x: (start + end) / 2, z: (fromRoom.z + toRoom.z) / 2, width: Math.max(0.7, end - start), depth: 2.9 }; } const north = fromRoom.z < toRoom.z ? fromRoom : toRoom; const south = north === fromRoom ? toRoom : fromRoom; const start = north.z + north.depth / 2 - 0.08; const end = south.z - south.depth / 2 + 0.08; return { from, to, axis: "z", x: (fromRoom.x + toRoom.x) / 2, z: (start + end) / 2, width: 2.9, depth: Math.max(0.7, end - start) }; }
function offset(point: Point2, rng: Rng, radius: number): Point2 { const angle = rng.range(0, Math.PI * 2); return { x: clamp(point.x + Math.cos(angle) * radius, -18.5, 18.5), z: clamp(point.z + Math.sin(angle) * radius, -13.5, 13.5) }; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
