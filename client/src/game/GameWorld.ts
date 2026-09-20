/** Prism Relay design reminder: the world owns all run rules; React only visualizes its compact diagnostic state. */
import type { Scene } from "@babylonjs/core/scene";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { InputManager } from "./InputManager";
import { Player } from "./Player";
import { ReactorEnvironment } from "./ReactorEnvironment";
import { EnemyDirector } from "./EnemyDirector";
import { GAME_ASSETS } from "./assets";
import { SECTORS, type SectorConfig } from "./sectors";
import type { CameraMode, GameStatus, HUDSnapshot, MinimapMarker, MinimapSnapshot, Point2, SentinelMode } from "./types";
import { composeEpilogue, createLedger, createTerminalEvent, resolveEvent, type Epilogue, type RunEvent, type RunLedger } from "./Narrative";
import { ProgressStore } from "./ProgressStore";
import { relicModifiers, DEFAULT_MODIFIERS, type RunModifiers } from "./relics";
import type { NightMode } from "./types";

export class GameWorld {
  private readonly input = new InputManager();
  private readonly player: Player;
  private readonly enemies: EnemyDirector;
  private readonly environment: ReactorEnvironment;
  private elapsed = 0;
  private secondsLeft = SECTORS[0].duration;
  private status: GameStatus = "playing";
  private sectorIndex = 0;
  private score = 0;
  private usedPulses = 0;
  private wasDetected = false;
  private grade: "S" | "A" | "B" | null = null;
  private hudThrottle = 0;
  private readonly demoMode = new URLSearchParams(window.location.search).has("demo");
  private demoRestartDelay = 0;
  private runSeed: number;
  private ledger: RunLedger = createLedger();
  private currentEvent: RunEvent | null = null;
  private ending: Epilogue | null = null;
  private trapCooldown = 0;
  private readonly mode: NightMode = new URLSearchParams(window.location.search).get("mode") === "free" ? "free" : "story";
  private readonly progress = new ProgressStore();
  private modifiers: RunModifiers = DEFAULT_MODIFIERS;
  private runCash = 0;
  private cameraMode: CameraMode = new URLSearchParams(window.location.search).get("camera") === "map" ? "map" : new URLSearchParams(window.location.search).get("camera") === "first" ? "first" : new URLSearchParams(window.location.search).get("camera") === "third" ? "third" : "tactical";
  private appliedCameraMode: CameraMode | null = null;
  private readonly discoveredRooms = new Set<number>();
  private scannerCooldown = 0;
  private scannerRevealTime = 0;
  private breadcrumbTimer = 0;
  private breadcrumbs: Point2[] = [];
  private doorNoiseTimer = 0;
  private paused: boolean;
  private checkpointTimer = 0;
  private firstLookPitch = 0;
  private announcedThreat: SentinelMode = "patrol";

  constructor(private readonly scene: Scene, private readonly camera?: ArcRotateCamera) {
    this.environment = new ReactorEnvironment(scene);
    this.player = new Player(scene, GAME_ASSETS.playerDrone);
    this.enemies = new EnemyDirector(scene, GAME_ASSETS.sentinel);
    const requestedSeed = Number(new URLSearchParams(window.location.search).get("seed"));
    this.runSeed = this.demoMode ? 417 : Number.isFinite(requestedSeed) && requestedSeed > 0 ? requestedSeed : Math.floor(100000 + Math.random() * 899999);
    this.paused = !this.demoMode && !new URLSearchParams(window.location.search).has("autostart");
    this.applyRelicModifiers();
    this.configureCurrentSector();
    if (this.environment.currentLayout) this.player.setSpawn(this.environment.currentLayout.start);
    this.updateMapDiscovery();
    if (new URLSearchParams(window.location.search).has("event-demo")) this.openTerminalEvent("story");
    if (new URLSearchParams(window.location.search).has("ending-demo")) {
      this.ledger = { guide: 3, core: 0, market: 2, debt: 1, relics: ["тихий маршрут", "призматический ключ"], choices: ["story:guide", "roulette:roulette"] };
      this.score = 4720;
      this.status = "campaign-complete";
      this.ending = composeEpilogue(this.ledger, this.runSeed + this.score);
    }
    this.emitHUD();
  }

  update(delta: number) {
    this.elapsed += delta;
    this.followCamera(delta);
    this.environment.update(this.elapsed);
    this.trapCooldown = Math.max(0, this.trapCooldown - delta);
    this.scannerCooldown = Math.max(0, this.scannerCooldown - delta);
    this.scannerRevealTime = Math.max(0, this.scannerRevealTime - delta);
    this.doorNoiseTimer = Math.max(0, this.doorNoiseTimer - delta);
    if (this.input.consumeContinue()) { this.restoreCheckpoint(); this.paused = false; }
    if (this.input.consumeResume()) this.paused = false;
    if (this.input.consumeBuyRation()) { if (this.progress.buyRation()) this.emitVoice("Паёк куплен. Не тратьте его до опасного сектора."); else this.emitVoice("Недостаточно денег для пайка."); }
    if (this.input.consumeRestart()) this.restartRun();
    const requestedCamera = this.input.consumeCameraMode();
    if (requestedCamera) this.cameraMode = requestedCamera;
    const look = this.input.consumeLook();
    if (this.cameraMode === "first" && (look.x !== 0 || look.y !== 0)) { this.player.setFacing(this.player.getFacingAngle() + look.x); this.firstLookPitch = Math.max(-0.32, Math.min(0.26, this.firstLookPitch + look.y)); }
    if (this.input.consumeNextSector() && this.status === "won") this.advanceSector();
    const eventChoice = this.input.consumeEventChoice();
    if (eventChoice && this.status === "event" && this.currentEvent) this.resolveCurrentEvent(eventChoice);

    if (this.paused) { this.hudThrottle -= delta; if (this.hudThrottle <= 0) { this.hudThrottle = 0.16; this.emitHUD(); } return; }
    if (this.status === "playing") {
      this.secondsLeft = Math.max(0, this.secondsLeft - delta);
      const direction = this.demoMode ? this.getDemoDirection() : this.input.getMoveAxis();
      const sprintRequested = !this.demoMode && this.input.isSprinting();
      if (this.input.consumeJump() && this.player.tryJump()) this.emitSound("jump");
      if (this.input.consumeDash() && this.player.tryTeleport(direction, (from, wanted) => this.environment.resolveMovement(from, wanted))) this.emitSound("teleport");
      if (this.input.consumeRoll()) { if (this.player.tryRoll(direction, (from, wanted) => this.environment.resolveMovement(from, wanted))) this.emitSound("jump"); else this.emitVoice("Перекат заблокирован. Выберите свободное направление."); }
      if (this.input.consumeCrouch()) this.player.toggleCrouch();
      if (this.input.consumeFlashlight()) this.player.toggleFlashlight();
      if (this.input.consumeRation() && this.progress.consumeRation()) { this.player.heal(1); this.emitSound("heal"); this.emitVoice("Паёк использован. Целостность восстановлена."); }
      if (this.input.consumeInteract()) {
        const terminal = this.environment.getNearbyTerminal(this.player.position);
        if (terminal) this.openTerminalEvent(terminal.kind);
        else { const doorResult = this.environment.openNearbyDoor(this.player.position, this.player.passes); if (doorResult === "opened") { this.emitSound("door"); this.emitVoice("Пропуск подтверждён. Боковой маршрут открыт."); } else if (doorResult === "locked") { this.emitSound("door"); this.emitVoice("Дверь требует два пропуска. Найдите ещё один."); } }
      }
      this.player.update(delta, direction, (from, wanted) => this.environment.resolveMovement(from, wanted), sprintRequested);
      this.updateMapDiscovery();
      this.updateBreadcrumbs(delta);
      if (this.input.consumeScan()) this.triggerScanner();
      this.environment.setLocalVision(this.player.position, this.cameraMode === "tactical", this.scannerRevealTime > 0 ? 8.6 : 5.1);
      if (this.environment.isNearMovingWall(this.player.position)) { this.player.noise = Math.min(100, this.player.noise + delta * 12); if (this.doorNoiseTimer <= 0) { this.doorNoiseTimer = 1.8; this.emitSound("door"); } }
      const wantsPulse = this.demoMode ? this.player.charges > 0 : this.input.consumePulse();
      if (wantsPulse && this.player.tryPulse()) { this.usedPulses += 1; this.emitSound("stun"); }

      this.player.setCovered(this.environment.isCovered(this.player.position));
      this.enemies.update(delta, this.player.position, this.player.getPulseRadius(), this.player.noise, this.player.isFlashlightOn, this.player.getViewDirection(), this.environment);
      if (this.enemies.mode !== this.announcedThreat) { this.announcedThreat = this.enemies.mode; if (this.enemies.mode === "alert") this.emitVoice("Свет замечен. Служба безопасности идёт проверить сектор."); else if (this.enemies.mode === "chase") this.emitVoice("Тревога. Вас обнаружили. Меняйте маршрут."); else if (this.enemies.mode === "stunned") this.emitVoice("Преследователь оглушён. Окно для отхода открыто."); }
      if (this.enemies.mode === "chase") this.wasDetected = true;
      this.player.passes += this.environment.collectNearby(this.player.position);
      const loot = this.environment.collectLoot(this.player.position);
      loot.forEach((item) => {
        if (item.kind === "cash") { this.score += item.value; this.runCash += item.value; this.progress.award("первый-конверт"); this.emitSound("cash"); }
        if (item.kind === "ammo") { this.player.charges += item.value; this.emitSound("pickup"); }
        if (item.kind === "heal") { this.player.heal(item.value); this.emitSound("heal"); }
        if (item.kind === "relic" && item.relic) { this.ledger.relics.push(item.relic); this.progress.addRelic(item.relic); this.progress.award("вернул-памятку"); this.emitSound("relic"); }
      });
      const exitActive = this.player.passes >= this.passesRequired;
      this.environment.setExitActive(exitActive);
      if (this.enemies.catches(this.player.position)) { if (this.player.takeDamage(1)) this.emitImpact(); }
      if (this.trapCooldown <= 0 && this.environment.touchesTrap(this.player.position)) { if (this.player.takeDamage(1)) this.emitImpact(); this.player.noise = Math.min(100, this.player.noise + 60); this.trapCooldown = 1.1; this.emitSound("trap"); }
      if (exitActive && this.environment.atExit(this.player.position)) this.completeSector();
      else if (this.secondsLeft <= 0 || this.player.health <= 0) { this.status = "lost"; this.demoRestartDelay = 1.1; }
      this.checkpointTimer -= delta;
      if (!this.demoMode && this.checkpointTimer <= 0) { this.checkpointTimer = 8; this.saveCheckpoint(); this.emitVoice("Чекпоинт зафиксирован."); }
    } else if (this.demoMode && (this.status === "lost" || this.status === "won")) {
      this.demoRestartDelay -= delta;
      if (this.demoRestartDelay <= 0) this.status === "won" ? this.advanceSector() : this.restartRun();
    }

    this.hudThrottle -= delta;
    if (this.hudThrottle <= 0) { this.hudThrottle = 0.075; this.emitHUD(); }
  }

  dispose() { this.input.dispose(); this.enemies.dispose(); }
  private get currentSector(): SectorConfig { return SECTORS[this.sectorIndex]; }
  private get passesRequired() { return Math.max(3, this.currentSector.chargesRequired - this.modifiers.passDiscount); }
  private applyRelicModifiers() { this.modifiers = relicModifiers(this.progress.profile); this.player.noiseRelax = this.modifiers.noiseRelax; }
  private configureCurrentSector() { const sector = this.currentSector; this.discoveredRooms.clear(); this.secondsLeft = sector.duration + this.modifiers.extraTime; this.environment.configureSector(sector, this.runSeed + sector.id * 1009); if (this.environment.currentLayout) this.enemies.configure(this.environment.currentLayout); }
  private resetSector() { this.elapsed = 0; this.status = "playing"; this.demoRestartDelay = 0; this.usedPulses = 0; this.wasDetected = false; this.grade = null; this.currentEvent = null; this.ending = null; this.trapCooldown = 0; this.scannerCooldown = 0; this.scannerRevealTime = 0; this.breadcrumbTimer = 0; this.breadcrumbs = []; this.doorNoiseTimer = 0; this.checkpointTimer = 3; this.runCash = 0; this.configureCurrentSector(); this.player.reset(); this.applyRelicModifiers(); if (this.environment.currentLayout) this.player.setSpawn(this.environment.currentLayout.start); this.updateMapDiscovery(); this.emitHUD(); }
  private restartRun() { this.sectorIndex = 0; this.score = 0; this.ledger = createLedger(); this.runSeed = this.demoMode ? 417 : Math.floor(100000 + Math.random() * 899999); this.resetSector(); }
  private advanceSector() { this.sectorIndex = Math.min(this.sectorIndex + 1, SECTORS.length - 1); this.resetSector(); }
  private completeSector() { this.grade = this.getGrade(); const gradeBonus = this.grade === "S" ? 900 : this.grade === "A" ? 540 : 260; const quietBonus = !this.wasDetected ? this.modifiers.quietBonus : 0; this.score += Math.ceil(this.secondsLeft * 10) + Math.ceil(gradeBonus * (1 + quietBonus)) + this.player.passes * 45 + this.player.charges * 60 - this.usedPulses * 25; if (this.runCash > 0) this.progress.addMoney(this.runCash); if (!this.wasDetected) this.progress.award("тихая-смена"); if (this.player.health === this.player.maxHealth) this.progress.award("не-дала-панике-взять-верх"); this.status = this.sectorIndex === SECTORS.length - 1 ? "campaign-complete" : "won"; if (this.status === "campaign-complete") { this.progress.completeRun(); this.progress.clearCheckpoint(); this.progress.award(this.mode === "story" ? "пережил-смену" : "свободный-кошмар"); this.ending = composeEpilogue(this.ledger, this.runSeed + this.score); } else this.saveCheckpoint(); this.emitSound("escape"); this.emitVoice(this.status === "campaign-complete" ? "Смена закрыта. Вы сохранили своё." : "Лифт разблокирован. Переход на следующий этаж готов."); this.demoRestartDelay = 1.4; }
  private getGrade(): "S" | "A" | "B" { const timeRatio = this.secondsLeft / this.currentSector.duration; if (!this.wasDetected && timeRatio >= 0.35) return "S"; if (timeRatio >= 0.15) return "A"; return "B"; }
  private saveCheckpoint() { this.progress.saveCheckpoint({ sectorIndex: this.sectorIndex, runSeed: this.runSeed, x: this.player.position.x, z: this.player.position.z, passes: this.player.passes, charges: this.player.charges, secondsLeft: Math.ceil(this.secondsLeft) }); }
  private restoreCheckpoint() { const checkpoint = this.progress.profile.checkpoint; if (!checkpoint) return; this.sectorIndex = Math.max(0, Math.min(SECTORS.length - 1, checkpoint.sectorIndex)); this.runSeed = checkpoint.runSeed; this.resetSector(); this.player.setSpawn({ x: checkpoint.x, z: checkpoint.z }); this.player.passes = checkpoint.passes ?? checkpoint.charges; this.player.charges = checkpoint.charges; this.secondsLeft = Math.max(30, checkpoint.secondsLeft); this.updateMapDiscovery(); }

  private emitHUD() {
    const isExitActive = this.player.passes >= this.passesRequired;
    const snapshot: HUDSnapshot = {
      passes: this.player.passes, passesRequired: this.passesRequired, charges: this.player.charges, secondsLeft: Math.ceil(this.secondsLeft), sentinelMode: this.enemies.mode, status: this.status,
      pulseReady: this.player.charges > 0 && this.player.pulseCooldown <= 0, sector: this.currentSector.id, sectorName: this.currentSector.codeName, totalSectors: SECTORS.length, score: this.score, usedPulses: this.usedPulses, grade: this.grade, seed: this.runSeed,
      health: this.player.health, maxHealth: this.player.maxHealth, stealth: Math.round(this.player.stealth), noise: Math.round(this.player.noise), shell: this.player.shell, jumpReady: this.player.jumpReady, dashReady: this.player.dashReady, rollReady: this.player.rollReady, sprinting: this.player.isSprinting, crouching: this.player.isCrouching, flashlightOn: this.player.isFlashlightOn, canInteract: this.environment.canInteract(this.player.position), event: this.currentEvent, ending: this.ending, mode: this.mode, money: this.progress.profile.money, rations: this.progress.profile.rations, runCash: this.runCash, relics: this.progress.profile.relics, achievements: this.progress.profile.achievements.length, cameraMode: this.cameraMode, tacticalZoom: this.input.getTacticalZoom(), hasCheckpoint: Boolean(this.progress.profile.checkpoint), minimap: this.buildMinimap(isExitActive),
      message: this.status === "event" ? "КОРПОРАТИВНЫЙ УЗЕЛ ЖДЁТ РЕШЕНИЯ" : this.status === "campaign-complete" ? "СМЕНА ЗАКРЫТА — ВЫ СОХРАНИЛИ СВОЁ" : this.status === "won" ? "ЭТАЖ ПРОЙДЕН — ПЕРЕХОД ДОСТУПЕН" : this.status === "lost" ? "ПАНИКА РАЗБУДИЛА ВАС ДО ВЫХОДА" : isExitActive ? "ПОЖАРНЫЙ ВЫХОД АКТИВЕН — ИДИТЕ К НЕМУ" : this.enemies.mode === "chase" ? "СЛУЖБА БЕЗОПАСНОСТИ ИДЁТ ПО СЛЕДУ" : this.environment.isNearMovingWall(this.player.position) ? "СДВИЖНАЯ ПЕРЕГОРОДКА ШУМИТ — НЕ ЗАДЕРЖИВАЙТЕСЬ" : this.environment.isNearbyDoorLocked(this.player.position) ? `БОКОВАЯ ДВЕРЬ: ${this.player.passes}/2 ПРОПУСКА — НАЖМИТЕ СВЯЗЬ` : this.environment.getNearbyDoor(this.player.position) ? "ДВЕРЬ ЗАКРЫТА — НАЖМИТЕ СВЯЗЬ" : this.environment.canInteract(this.player.position) ? "РАБОЧИЙ УЗЕЛ ДОСТУПЕН — НАЖМИТЕ СВЯЗЬ" : this.player.passes < this.passesRequired ? `СОБЕРИТЕ ПРОПУСКА ${this.player.passes}/${this.passesRequired} — ВЫХОД ЗАПЕРТ` : this.player.charges === 0 ? "БЛАСТЕР РАЗРЯЖЕН — ИЩИТЕ ЗАРЯДЫ В ШКАФАХ" : "БЛАСТЕР ГОТОВ — ОГЛУШИТЕ ПРЕСЛЕДОВАТЕЛЯ",
    };
    window.dispatchEvent(new CustomEvent<HUDSnapshot>("ai-core-hud", { detail: snapshot }));
  }

  private getDemoDirection(): Point2 { const available = this.environment.shards.filter((shard) => !shard.collected && shard.active); const target = available.length > 0 ? available[0].position : this.environment.getExit(); const dx = target.x - this.player.position.x; const dz = target.z - this.player.position.z; const length = Math.hypot(dx, dz) || 1; return { x: dx / length, z: dz / length }; }
  private updateMapDiscovery() {
    const layout = this.environment.currentLayout;
    if (!layout) return;
    layout.rooms.forEach((room, index) => {
      const discoveryRadius = Math.max(room.width, room.depth) * 0.63 + 2.25;
      if (Math.hypot(room.x - this.player.position.x, room.z - this.player.position.z) <= discoveryRadius) this.discoveredRooms.add(index);
    });
  }
  private buildMinimap(exitActive: boolean): MinimapSnapshot {
    const layout = this.environment.currentLayout;
    if (!layout) return { rooms: [], corridors: [], markers: [], player: { ...this.player.position }, heading: this.player.getViewDirection(), breadcrumbs: [], waypoint: null, waypointLabel: null, discoveredRooms: 0, totalRooms: 0, alert: this.enemies.mode, scannerReady: this.scannerCooldown <= 0, scannerCooldown: this.scannerCooldown, scanActive: this.scannerRevealTime > 0 };
    const mapReveal = this.cameraMode === "map";
    const knownAt = (point: Point2) => mapReveal || this.scannerRevealTime > 0 && Math.hypot(point.x - this.player.position.x, point.z - this.player.position.z) <= 8.5 || layout.rooms.some((room, index) => this.discoveredRooms.has(index) && Math.abs(point.x - room.x) <= room.width / 2 + 1.35 && Math.abs(point.z - room.z) <= room.depth / 2 + 1.35);
    const marker = (id: string, kind: MinimapMarker["kind"], point: Point2, known = knownAt(point), active?: boolean): MinimapMarker => ({ id, kind, x: point.x, z: point.z, known, active });
    const lootMarkers = this.environment.loot.filter((item) => !item.collected).map((item, index) => marker(`loot-${index}`, item.data.kind, item.data));
    const objectiveAccess = this.environment.shards.find((shard) => shard.active && !shard.collected);
    const accessMarkers = this.environment.shards.filter((shard) => shard.active && !shard.collected).map((shard, index) => marker(`access-${index}`, "access", shard.position, undefined, shard === objectiveAccess));
    const terminalMarkers = layout.terminals.map((terminal, index) => marker(`terminal-${index}`, "terminal", terminal));
    const hazardMarkers = [...layout.movingWalls.map((wall, index) => marker(`wall-${index}`, "moving-wall", wall)), ...layout.traps.map((trap, index) => marker(`trap-${index}`, "trap", trap))];
    const roomMarkers = layout.rooms.flatMap((room, index) => room.kind === "vault" ? [marker(`safe-${index}`, "safe", room, this.discoveredRooms.has(index))] : []);
    const exitIndex = layout.rooms.findIndex((room) => room.kind === "exit");
    const threatMarkers = this.enemies.getMinimapContacts(this.player.position, mapReveal ? 99 : this.scannerRevealTime > 0 ? 8.5 : 4.8).map((contact) => marker(contact.id, "threat", contact, true, contact.mode === "chase"));
    const waypoint = exitActive || !objectiveAccess ? layout.exit : objectiveAccess.position;
    return { rooms: layout.rooms.map((room, index) => ({ id: index, ...room, discovered: mapReveal || this.discoveredRooms.has(index) })), corridors: layout.corridors.map((corridor, index) => ({ id: index, x: corridor.x, z: corridor.z, width: corridor.width, depth: corridor.depth })), markers: [marker("exit", "exit", layout.exit, exitActive || mapReveal || this.discoveredRooms.has(exitIndex), exitActive), ...roomMarkers, ...accessMarkers, ...lootMarkers, ...terminalMarkers, ...hazardMarkers, ...threatMarkers], player: { ...this.player.position }, heading: this.player.getViewDirection(), breadcrumbs: this.breadcrumbs, waypoint, waypointLabel: exitActive || !objectiveAccess ? "ВЫХОД" : "ПРОПУСК", discoveredRooms: mapReveal ? layout.rooms.length : this.discoveredRooms.size, totalRooms: layout.rooms.length, alert: this.enemies.mode, scannerReady: this.scannerCooldown <= 0, scannerCooldown: this.scannerCooldown, scanActive: this.scannerRevealTime > 0 };
  }
  private updateBreadcrumbs(delta: number) { this.breadcrumbTimer -= delta; if (this.breadcrumbTimer > 0) return; this.breadcrumbTimer = 1.08; const last = this.breadcrumbs[this.breadcrumbs.length - 1]; if (!last || Math.hypot(last.x - this.player.position.x, last.z - this.player.position.z) > 1.2) this.breadcrumbs = [...this.breadcrumbs.slice(-8), { ...this.player.position }]; }
  private triggerScanner() { if (this.scannerCooldown > 0) return; this.scannerCooldown = 11.5; this.scannerRevealTime = 3.8; this.player.noise = Math.min(100, this.player.noise + 16); const layout = this.environment.currentLayout; layout?.rooms.forEach((room, index) => { if (Math.hypot(room.x - this.player.position.x, room.z - this.player.position.z) <= 8.5) this.discoveredRooms.add(index); }); this.emitSound("scan"); }
  private openTerminalEvent(kind: "story" | "roulette") { this.currentEvent = createTerminalEvent(kind, this.runSeed + this.sectorIndex * 817 + this.ledger.choices.length * 97, this.currentSector.id); this.status = "event"; }
  private resolveCurrentEvent(choice: "guide" | "core" | "roulette") { if (!this.currentEvent) return; const outcome = resolveEvent(this.ledger, this.currentEvent, choice, this.runSeed + this.score + this.sectorIndex * 77); if (outcome.shell) this.player.setShell(outcome.shell); this.player.health = Math.max(1, Math.min(this.player.maxHealth, this.player.health + outcome.health)); this.currentEvent = null; this.status = "playing"; this.score += 180 + Math.max(0, outcome.health) * 70; }
  private emitSound(kind: "jump" | "teleport" | "stun" | "cash" | "pickup" | "heal" | "relic" | "trap" | "escape" | "scan" | "door") { window.dispatchEvent(new CustomEvent("ai-core-sound", { detail: { kind } })); }
  private emitVoice(text: string) { window.dispatchEvent(new CustomEvent("ai-core-voice", { detail: { text } })); }
  private emitImpact() { window.dispatchEvent(new CustomEvent("ai-core-impact")); }
  private followCamera(delta: number) {
    if (!this.camera) return;
    const engine = this.camera.getEngine();
    const portrait = engine.getRenderHeight() > engine.getRenderWidth();
    const forward = this.player.getViewDirection();
    const zoom = this.input.getTacticalZoom();
    const isMap = this.cameraMode === "map";
    const isTactical = this.cameraMode === "tactical";
    this.player.setFirstPerson(this.cameraMode === "first");
    this.environment.setFirstPersonFocus(this.player.position, this.cameraMode === "first");
    this.environment.setCameraOcclusion(this.player.position, !isTactical && !isMap);
    const rooms = this.environment.currentLayout?.rooms ?? [];
    const mapCenter = rooms.length ? rooms.reduce((center, room) => new Vector3(center.x + room.x / rooms.length, 0.16, center.z + room.z / rooms.length), Vector3.Zero()) : new Vector3(this.player.position.x, 0.16, this.player.position.z);
    const mapSpan = rooms.length ? Math.max(...rooms.map((room) => Math.max(Math.abs(room.x - mapCenter.x) + room.width / 2, Math.abs(room.z - mapCenter.z) + room.depth / 2))) : 12;
    const desired = isMap ? mapCenter : this.cameraMode === "first" ? new Vector3(this.player.position.x + forward.x * 1.85, 0.34, this.player.position.z + forward.z * 1.85) : new Vector3(this.player.position.x, 0.2, this.player.position.z);
    const easing = Math.min(1, delta * (isTactical ? 5.2 : 7.4));
    this.camera.target = Vector3.Lerp(this.camera.target, desired, easing);
    const radius = isMap ? Math.min(36, Math.max(portrait ? 28.5 : 24, mapSpan * (portrait ? 1.22 : 0.95))) : isTactical ? (portrait ? 10.8 + zoom * 5.8 : 14 + zoom * 8) : this.cameraMode === "third" ? (portrait ? 10.6 : 9.1) : 5.7;
    const beta = isMap ? 0.18 : isTactical ? (portrait ? 0.42 : 0.38) : this.cameraMode === "third" ? 0.86 : 1.04 + this.firstLookPitch;
    const alpha = isMap || isTactical ? -Math.PI / 2 : this.cameraMode === "third" ? -Math.PI / 2 + 0.58 : Math.atan2(-forward.z, -forward.x);
    if (this.appliedCameraMode !== this.cameraMode) {
      this.camera.target = desired;
      this.camera.radius = radius;
      this.camera.beta = beta;
      this.camera.alpha = alpha;
      this.appliedCameraMode = this.cameraMode;
    } else {
      this.camera.radius += (radius - this.camera.radius) * Math.min(1, delta * 5.5);
      this.camera.beta += (beta - this.camera.beta) * Math.min(1, delta * 5.5);
      this.camera.alpha += (alpha - this.camera.alpha) * Math.min(1, delta * 5.5);
    }
    this.camera.fov = isMap ? 0.84 : isTactical ? 0.76 : this.cameraMode === "third" ? 0.76 : 0.7;
  }
}
