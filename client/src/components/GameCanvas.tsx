/**
 * Prism Relay design reminder: the DOM is a lean diagnostic bezel around a full reactor viewport.
 * Relay Mint means agency, coral means threat, and every touch action has a dedicated, readable control.
 */
import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";
import type { HUDSnapshot, MinimapMarkerKind, MinimapSnapshot } from "@/game/types";
import { GAME_ASSETS } from "@/game/assets";

const INITIAL_HUD: HUDSnapshot = {
  charges: 0, maxCharges: 5, secondsLeft: 90, sentinelMode: "patrol", status: "playing",
  message: "СОБЕРИТЕ РЕЛЕ И НАЙДИТЕ ВЫХОД", pulseReady: false, sector: 1, sectorName: "ПЕРИМЕТР",
  totalSectors: 3, score: 0, usedPulses: 0, grade: null, health: 2, maxHealth: 2, stealth: 100,
  noise: 0, shell: "echo", jumpReady: true, dashReady: true, rollReady: true, crouching: false, flashlightOn: true, canInteract: false, event: null, ending: null, mode: "story", money: 0, rations: 0, runCash: 0, relics: [], achievements: 0, cameraMode: "tactical", tacticalZoom: 0.52, hasCheckpoint: false, minimap: { rooms: [], markers: [], player: { x: -15.2, z: 9.4 }, heading: { x: 0, z: 1 }, breadcrumbs: [], waypoint: null, waypointLabel: null, discoveredRooms: 0, totalRooms: 0, alert: "patrol", scannerReady: true, scannerCooldown: 0, scanActive: false },
};

const TUTORIAL_STEPS = [
  { eyebrow: "НОЧНАЯ СМЕНА 01/04", title: "ДЕРЖИТЕ КУРС", text: "Левый круг ведёт работника по офису. Чувствительность меняется в верхнем углу HUD.", glyph: "↗" },
  { eyebrow: "НОЧНАЯ СМЕНА 02/04", title: "НЕ ДАЙТЕ СЕБЯ ЗАМЕТИТЬ", text: "Столы и шкафы закрывают обзор. Белая шкала — здоровье, мятная — спокойствие, янтарная — шум.", glyph: "◒" },
  { eyebrow: "НОЧНАЯ СМЕНА 03/04", title: "ШАГ ДОМОЙ", text: "ТЕЛЕПОРТ пересекает опасный участок. Он не убивает: бластер лишь ненадолго оглушает преследователя.", glyph: "⌁" },
  { eyebrow: "НОЧНАЯ СМЕНА 04/04", title: "ВЕРНИТЕ СВОЁ", text: "Забирайте деньги из сейфов, ищите личные вещи и уходите через выход. Каждое достижение сохраняет ваш дневник.", glyph: "◇" },
] as const;

function formatTime(totalSeconds: number) {
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(Math.max(0, totalSeconds % 60)).padStart(2, "0")}`;
}

const MAP_SYMBOLS: Record<MinimapMarkerKind, string> = { exit: "ВЫХ", safe: "СЕЙФ", relic: "РЕЛ", heal: "ЛЕЧ", ammo: "ЗРД", cash: "$", terminal: "УЗЛ", "moving-wall": "СТЕН", trap: "ЛОВ", access: "ПРОП", threat: "УГР" };

function TacticalMinimap({ map, expanded, onToggle }: { map: MinimapSnapshot; expanded: boolean; onToggle: () => void }) {
  const playerAngle = -(Math.atan2(map.heading.x, map.heading.z) * 180 / Math.PI);
  const visibleMarkers = map.markers.filter((marker) => marker.known);
  const waypointAngle = map.waypoint ? Math.atan2(map.waypoint.x - map.player.x, -(map.waypoint.z - map.player.z)) * 180 / Math.PI : 0;
  const waypointDistance = map.waypoint ? Math.round(Math.hypot(map.waypoint.x - map.player.x, map.waypoint.z - map.player.z)) : 0;
  return <button className={`tactical-minimap ${expanded ? "is-expanded" : ""} ${map.alert === "chase" ? "is-alert" : ""}`} type="button" onClick={onToggle} aria-expanded={expanded} aria-label={expanded ? "Свернуть карту" : "Развернуть карту комнат"}>
    <span className="minimap-title"><b>КАРТА ЭТАЖА</b><i>{map.discoveredRooms}/{map.totalRooms}</i></span>
    <svg className="minimap-svg" viewBox="-21 -15 42 30" role="img" aria-label="Тактическая карта комнат">
      <g transform="scale(1 -1)">
        <rect className="map-boundary" x="-20.5" y="-14.5" width="41" height="29" />
        {map.rooms.map((room) => <rect className={`map-room kind-${room.kind} ${room.discovered ? "is-discovered" : ""}`} key={room.id} x={room.x - room.width / 2} y={room.z - room.depth / 2} width={room.width} height={room.depth} />)}
        {map.waypoint && <line className="map-route" x1={map.player.x} y1={map.player.z} x2={map.waypoint.x} y2={map.waypoint.z} />}
        <g className="map-breadcrumbs">{map.breadcrumbs.map((crumb, index) => <circle key={`${crumb.x}-${crumb.z}-${index}`} cx={crumb.x} cy={crumb.z} r="0.16" />)}</g>
        {visibleMarkers.map((marker) => <g className={`map-marker marker-${marker.kind} ${marker.active ? "is-active" : ""}`} key={marker.id} transform={`translate(${marker.x} ${marker.z})`}><circle r={marker.kind === "threat" ? 0.62 : 0.42} /></g>)}
        <g className="map-player" transform={`rotate(${playerAngle} ${map.player.x} ${map.player.z}) translate(${map.player.x} ${map.player.z})`}><path d="M 0 0.95 L -0.55 -0.56 L 0 -0.28 L 0.55 -0.56 Z" /></g>
      </g>
    </svg>
    <span className="minimap-footer"><em className={map.scannerReady ? "scan-ready" : ""}>{map.scannerReady ? "C / СКАН ГОТОВ" : `СКАН ${Math.ceil(map.scannerCooldown)}с`}</em>{map.waypoint && <span className="map-route-readout"><b style={{ transform: `rotate(${waypointAngle}deg)` }}>↑</b><i>К {map.waypointLabel} {waypointDistance}м</i></span>}<span className="map-legend">{visibleMarkers.slice(0, expanded ? 8 : 3).map((marker) => <i key={`label-${marker.id}`} className={`marker-${marker.kind}`}>{MAP_SYMBOLS[marker.kind]}</i>)}</span></span>
  </button>;
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joystickRef = useRef<HTMLButtonElement>(null);
  const startedRef = useRef(false);
  const [hud, setHud] = useState<HUDSnapshot>(INITIAL_HUD);
  const [isReady, setIsReady] = useState(false);
  const [showMenu, setShowMenu] = useState(() => !new URLSearchParams(window.location.search).has("demo") && !new URLSearchParams(window.location.search).has("autostart"));
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(() => !showMenu && !new URLSearchParams(window.location.search).has("tutorial-off"));
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const [sensitivity, setSensitivity] = useState(1);
  const [showDiary, setShowDiary] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const onHud = (event: Event) => { setHud((event as CustomEvent<HUDSnapshot>).detail); setIsReady(true); };
    window.addEventListener("ai-core-hud", onHud);
    return () => window.removeEventListener("ai-core-hud", onHud);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ai-core-touch-settings", { detail: { sensitivity } }));
  }, [sensitivity]);

  useEffect(() => {
    let audio: AudioContext | null = null;
    const unlock = () => { if (!audio) audio = new AudioContext(); if (audio.state === "suspended") void audio.resume(); };
    const onSound = (event: Event) => {
      if (!audio || audio.state !== "running") return;
      const kind = (event as CustomEvent<{ kind: string }>).detail.kind;
      const cue: Record<string, [number, number, OscillatorType, number]> = { jump: [420, 0.06, "sine", 0.045], teleport: [190, 0.17, "sawtooth", 0.06], stun: [640, 0.14, "square", 0.055], cash: [760, 0.08, "triangle", 0.05], pickup: [520, 0.07, "sine", 0.035], heal: [330, 0.2, "sine", 0.055], relic: [580, 0.28, "triangle", 0.055], trap: [130, 0.2, "sawtooth", 0.075], escape: [680, 0.35, "sine", 0.065], scan: [280, 0.31, "triangle", 0.045], door: [98, 0.19, "sawtooth", 0.035] };
      const [frequency, duration, type, volume] = cue[kind] ?? cue.pickup;
      const oscillator = audio.createOscillator(); const gain = audio.createGain(); oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, audio.currentTime); oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, frequency * (kind === "trap" ? 0.45 : 1.48)), audio.currentTime + duration); gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration); oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
    };
    window.addEventListener("pointerdown", unlock, { once: true }); window.addEventListener("keydown", unlock, { once: true }); window.addEventListener("ai-core-sound", onSound);
    return () => { window.removeEventListener("ai-core-sound", onSound); audio?.close(); };
  }, []);

  useEffect(() => {
    const onVoice = (event: Event) => { const text = (event as CustomEvent<{ text: string }>).detail.text; if (!("speechSynthesis" in window) || window.speechSynthesis.speaking) return; const utterance = new SpeechSynthesisUtterance(text); utterance.lang = "ru-RU"; utterance.rate = 1.04; utterance.pitch = 0.78; window.speechSynthesis.speak(utterance); };
    window.addEventListener("ai-core-voice", onVoice);
    return () => { window.removeEventListener("ai-core-voice", onVoice); window.speechSynthesis?.cancel(); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let disposed = false;
    createGameScene(engine, canvas).then((nextHandle) => {
      if (disposed) return nextHandle.dispose();
      handle = nextHandle;
      engine.runRenderLoop(() => nextHandle.scene.render());
    }).catch((error) => console.error("AI Core Escape failed to initialize:", error));
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => { disposed = true; window.removeEventListener("resize", onResize); handle?.dispose(); engine.dispose(); startedRef.current = false; };
  }, []);

  const send = (name: string) => window.dispatchEvent(new Event(name));
  const restart = () => send("ai-core-restart");
  const advanceSector = () => send("ai-core-next-sector");
  const setTouchAxis = (x: number, z: number) => window.dispatchEvent(new CustomEvent("ai-core-touch-move", { detail: { x, z } }));
  const updateJoystick = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const element = joystickRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const rawX = event.clientX - (bounds.left + bounds.width / 2);
    const rawY = event.clientY - (bounds.top + bounds.height / 2);
    const maxDistance = bounds.width * 0.31;
    const scale = Math.min(1, maxDistance / (Math.hypot(rawX, rawY) || 1));
    const x = rawX * scale;
    const y = rawY * scale;
    setStickOffset({ x, y });
    // Canvas Y grows down. Negating Y makes a physical “up” action move toward the visible top of the arena.
    setTouchAxis(x / maxDistance, -y / maxDistance);
  };
  const startJoystick = (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); updateJoystick(event); };
  const stopJoystick = (event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setStickOffset({ x: 0, y: 0 }); setTouchAxis(0, 0);
  };
  const trigger = (name: string) => (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); send(name); };
  const nextSensitivity = () => setSensitivity((value) => value >= 1.25 ? 0.75 : Number((value + 0.25).toFixed(2)));
  const chooseEvent = (choice: "guide" | "core" | "roulette") => window.dispatchEvent(new CustomEvent("ai-core-event-choice", { detail: { choice } }));
  const chooseCamera = (mode: "tactical" | "third" | "first") => window.dispatchEvent(new CustomEvent("ai-core-camera-mode", { detail: { mode } }));
  const changeCameraZoom = (event: ChangeEvent<HTMLInputElement>) => window.dispatchEvent(new CustomEvent("ai-core-camera-zoom", { detail: { zoom: Number(event.target.value) } }));
  const switchMode = (mode: "story" | "free") => { const params = new URLSearchParams(window.location.search); params.set("mode", mode); window.location.search = params.toString(); };
  const startRun = (continueRun = false) => { setShowMenu(false); setShowTutorial(false); send(continueRun ? "ai-core-continue" : "ai-core-resume"); };
  const startLook = (event: ReactPointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; };
  const updateLook = (event: ReactPointerEvent<HTMLButtonElement>) => { const pointer = lookPointer.current; if (!pointer || pointer.id !== event.pointerId) return; const dx = event.clientX - pointer.x; const dy = event.clientY - pointer.y; pointer.x = event.clientX; pointer.y = event.clientY; window.dispatchEvent(new CustomEvent("ai-core-look", { detail: { x: -dx * 0.014, y: -dy * 0.008 } })); };
  const stopLook = (event?: ReactPointerEvent<HTMLButtonElement>) => { if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); lookPointer.current = null; };

  const statusLabel = hud.sentinelMode === "stunned" ? "УГРОЗА: ОГЛУШЕНА" : hud.sentinelMode === "chase" ? "УГРОЗА: ПРЕСЛЕДОВАНИЕ" : hud.sentinelMode === "search" ? "УГРОЗА: ПОИСК" : hud.sentinelMode === "alert" ? "УГРОЗА: ТРЕВОГА" : "УГРОЗА: ПАТРУЛЬ";
  const tutorial = TUTORIAL_STEPS[tutorialStep];
  const isCampaignComplete = hud.status === "campaign-complete";
  const isWon = hud.status === "won";

  return (
    <main className="prism-shell rogue-shell night-shift-shell" aria-label="Игра AI Core Escape Night Shift">
      <div className="prism-vignette" aria-hidden="true" /><div className="prism-scanlines" aria-hidden="true" />
      <canvas ref={canvasRef} className="prism-canvas" aria-label="Игровая зона офисного кошмара" />
      <div className={`tactical-vision ${hud.cameraMode === "tactical" ? "is-active" : ""} ${hud.minimap.scanActive ? "is-scanning" : ""}`} aria-hidden="true" />
      <div className={`threat-field threat-${hud.sentinelMode}`} aria-hidden="true"><span /><i /></div>
      {showMenu && <section className="main-menu-panel" aria-label="Главное меню"><p className="hud-kicker">AI//CORE // НОЧНАЯ СМЕНА</p><div className="comic-strip" aria-hidden="true"><i>УТРО</i><i>СМЕНА</i><i>ВЫХОД?</i></div><h2>ВЕРНИТЕ СВОЁ.<br />НАЙДИТЕ ВЫХОД.</h2><p>Подвал ведёт к архивному лифту, лифт — к чердачному хранилищу. Офис говорит голосом AI//CORE, но решение остаётся за вами.</p><div className="main-menu-actions"><button type="button" onClick={() => startRun(false)}>НОВАЯ СМЕНА <span>→</span></button>{hud.hasCheckpoint && <button type="button" className="menu-secondary" onClick={() => startRun(true)}>ПРОДОЛЖИТЬ С ЧЕКПОИНТА <span>↗</span></button>}<button type="button" className="menu-secondary" onClick={() => send("ai-core-buy-ration")}>ПАЁК +1 // $40 <span>{hud.rations}</span></button></div><p className="menu-tip">ВЕКТОР — движение · СВЯЗЬ — двери/узлы · ПЕРЕКАТ — уход от угрозы · H — паёк</p></section>}

      <section className="hud hud-top-left" aria-label="Статус протокола">
        <div className="brand-lockup"><span className="brand-symbol" aria-hidden="true"><img src={GAME_ASSETS.mark} alt="" className="brand-mark" /><span className="brand-core-glyph" /></span><div><p className="hud-kicker">NIGHT SHIFT // {hud.mode === "story" ? "СМЕНА" : "СВОБОДНЫЙ КОШМАР"}</p><h1>AI//CORE</h1></div></div>
        <p className="objective-line">{hud.message}</p><p className="sector-readout">СЕКТОР {String(hud.sector).padStart(2, "0")}/{String(hud.totalSectors).padStart(2, "0")} <span>{hud.sectorName}</span></p>
      </section>

      <section className="hud hud-top-center" aria-label="Пропуска и заряды бластера"><p className="hud-kicker">ПРОПУСКА / ЗАРЯДЫ</p><div className="charge-pips">{Array.from({ length: hud.maxCharges }, (_, index) => <span className={index < hud.charges ? "charge-pip is-live" : "charge-pip"} key={index} />)}</div></section>
      <section className="hud hud-top-right" aria-label="Время и деньги"><p className="hud-kicker">ДО ПРОБУЖДЕНИЯ</p><p className="timer-readout">{formatTime(hud.secondsLeft)}</p><p className="score-readout">$ {String(hud.money + hud.runCash).padStart(5, "0")}</p><button className="sensitivity-chip" type="button" onClick={nextSensitivity}>SENS {sensitivity.toFixed(2)}</button></section>

      <section className="hud survival-panel" aria-label="Живучесть и скрытность">
        <div className="survival-row"><span>ЦЕЛОСТНОСТЬ</span><div className="meter health-meter">{Array.from({ length: hud.maxHealth }, (_, index) => <i className={index < hud.health ? "is-live" : ""} key={index} />)}</div></div>
        <div className="survival-row"><span>СКРЫТНОСТЬ</span><div className="meter stealth-meter"><i style={{ width: `${hud.stealth}%` }} /></div></div>
        <div className="survival-row"><span>ШУМ</span><div className="meter noise-meter"><i style={{ width: `${hud.noise}%` }} /></div></div>
        <p className="shell-readout">РЕЖИМ: <strong>{hud.shell.toUpperCase()}</strong></p>
      </section>

      <section className="hud night-shift-progress" aria-label="Дневник и достижения"><button type="button" onClick={() => setShowDiary(true)}>ДНЕВНИК <span>{hud.relics.length}</span></button><p>АЧИВКИ {String(hud.achievements).padStart(2, "0")}</p><div className="mode-chips"><button className={hud.mode === "story" ? "is-active" : ""} type="button" onClick={() => switchMode("story")}>СМЕНА</button><button className={hud.mode === "free" ? "is-active" : ""} type="button" onClick={() => switchMode("free")}>КОШМАР</button></div></section>

      <TacticalMinimap map={hud.minimap} expanded={mapExpanded} onToggle={() => setMapExpanded((value) => !value)} />

      <section className="camera-rig" aria-label="Вид камеры"><div className="camera-modes"><button type="button" className={hud.cameraMode === "tactical" ? "is-active" : ""} onClick={() => chooseCamera("tactical")}>ТАКТ</button><button type="button" className={hud.cameraMode === "third" ? "is-active" : ""} onClick={() => chooseCamera("third")}>3Л</button><button type="button" className={hud.cameraMode === "first" ? "is-active" : ""} onClick={() => chooseCamera("first")}>1Л</button></div>{hud.cameraMode === "tactical" && <label className="zoom-rail"><span>МАСШТАБ</span><input aria-label="Масштаб тактической камеры" type="range" min="0" max="1" step="0.05" value={hud.tacticalZoom} onChange={changeCameraZoom} /><i>+</i><b>−</b></label>}<button type="button" aria-label={hud.flashlightOn ? "Выключить фонарик" : "Включить фонарик"} className={hud.flashlightOn ? "flashlight-chip is-on" : "flashlight-chip"} onClick={() => send("ai-core-flashlight")}>{hud.flashlightOn ? "☼" : "○"}</button></section>

      <section className="hud hud-bottom-left controls-card" aria-label="Управление с клавиатуры"><p><kbd>WASD</kbd> ДВИЖЕНИЕ</p><p><kbd>Q</kbd> ПРЫЖОК <kbd>⇧</kbd> ТЕЛЕПОРТ</p><p><kbd>SPACE</kbd> БЛАСТЕР <kbd>F</kbd> СВЯЗЬ <kbd>C</kbd> СКАН</p></section>
      <section className="hud hud-bottom-right sentinel-card" aria-live="polite"><span className={`sentinel-dot ${hud.sentinelMode}`} /><p>{statusLabel}</p></section>
      {!isReady && <div className="boot-sequence">ЗАПУСК СЕТКИ РЕАКТОРА…</div>}

      {!showTutorial && <section className="touch-controls rogue-touch-controls" aria-label="Сенсорное управление">
        <button ref={joystickRef} type="button" className="touch-joystick" aria-label="Джойстик движения" onPointerDown={startJoystick} onPointerMove={updateJoystick} onPointerUp={stopJoystick} onPointerCancel={stopJoystick} onLostPointerCapture={stopJoystick} onContextMenu={(event) => event.preventDefault()}><span className="joystick-cross" aria-hidden="true" /><span className="joystick-knob" style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }} aria-hidden="true" /><span className="touch-label">ВЕКТОР</span></button>
        <div className="touch-action-stack">
          <button type="button" className={hud.jumpReady ? "touch-action is-ready" : "touch-action"} onPointerDown={trigger("ai-core-jump")}><strong>ПРЫЖОК</strong><small>{hud.jumpReady ? "ГОТОВ" : "ОЖИДАНИЕ"}</small></button>
          <button type="button" className={hud.rollReady ? "touch-action touch-roll is-ready" : "touch-action touch-roll"} onPointerDown={trigger("ai-core-roll")}><strong>ПЕРЕКАТ</strong><small>{hud.rollReady ? "УЙТИ ОТ УГРОЗЫ" : "ОЖИДАНИЕ"}</small></button>
          <button type="button" className={hud.crouching ? "touch-action touch-crouch is-ready" : "touch-action touch-crouch"} onPointerDown={trigger("ai-core-crouch")}><strong>ПРИСЕСТЬ</strong><small>{hud.crouching ? "ТИХО" : "НИЖЕ ШУМ"}</small></button>
          <button type="button" className={hud.dashReady ? "touch-action touch-dash is-ready" : "touch-action touch-dash"} onPointerDown={trigger("ai-core-dash")}><strong>ТЕЛЕПОРТ</strong><small>{hud.dashReady ? "ШАГ ДОМОЙ" : "ОЖИДАНИЕ"}</small></button>
          <button type="button" className={hud.canInteract ? "touch-action touch-interact is-ready" : "touch-action touch-interact"} onPointerDown={trigger("ai-core-interact")}><strong>СВЯЗЬ</strong><small>{hud.canInteract ? "ОТКРЫТЬ / УЗЕЛ" : "НЕТ УЗЛА"}</small></button>
          <button type="button" className={hud.minimap.scannerReady ? "touch-action touch-scan is-ready" : "touch-action touch-scan"} onPointerDown={trigger("ai-core-scan")}><strong>СКАНЕР</strong><small>{hud.minimap.scannerReady ? "ШУМ +16" : `${Math.ceil(hud.minimap.scannerCooldown)}с`}</small></button>
          <button type="button" className={hud.rations > 0 ? "touch-action touch-ration is-ready" : "touch-action touch-ration"} onPointerDown={trigger("ai-core-ration")}><strong>ПАЁК</strong><small>{hud.rations > 0 ? `${hud.rations} В СУМКЕ` : "НЕТ ПАЙКА"}</small></button>
        </div>
        <button type="button" className={hud.pulseReady ? "touch-pulse is-ready" : "touch-pulse"} aria-label="Оглушающий бластер" onPointerDown={trigger("ai-core-pulse")}><span className="pulse-rings" aria-hidden="true" /><strong>БЛАСТЕР</strong><small>{hud.pulseReady ? "ЗАРЯЖЕН" : "НЕТ ЗАРЯДА"}</small></button>
        {hud.cameraMode === "first" && <button type="button" className="first-look-pad" aria-label="Осмотр от первого лица" onPointerDown={startLook} onPointerMove={updateLook} onPointerUp={stopLook} onPointerCancel={stopLook} onLostPointerCapture={stopLook}><span>ОБЗОР</span><i>↔</i></button>}
      </section>}

      {showTutorial && <section className="tutorial-panel" aria-live="polite" aria-label="Обучение управлению"><div className="tutorial-glyph" aria-hidden="true">{tutorial.glyph}</div><p className="hud-kicker">{tutorial.eyebrow}</p><h2>{tutorial.title}</h2><p>{tutorial.text}</p><div className="tutorial-actions"><button type="button" className="tutorial-skip" onClick={() => setShowTutorial(false)}>ПРОПУСТИТЬ БРИФИНГ</button><button type="button" className="tutorial-next" onClick={() => tutorialStep === TUTORIAL_STEPS.length - 1 ? setShowTutorial(false) : setTutorialStep((step) => step + 1)}>{tutorialStep === TUTORIAL_STEPS.length - 1 ? "ВХОД В РУН" : "ПРОДОЛЖИТЬ"}<span>→</span></button></div></section>}

      {showDiary && <section className="diary-panel" aria-live="polite"><p className="hud-kicker">ЛИЧНЫЙ ДНЕВНИК // СОХРАНЕНО</p><h2>ВЕРНУТЫЕ ВЕЩИ</h2>{hud.relics.length ? <ul>{hud.relics.map((relic) => <li key={relic}>{relic}</li>)}</ul> : <p>Пока пусто. Ищите личные вещи в дальних кабинетах и уходите с ними через выход.</p>}<p className="diary-achievement">ДОСТИЖЕНИЯ СОХРАНЕНЫ: {hud.achievements}</p><button type="button" onClick={() => setShowDiary(false)}>ЗАКРЫТЬ ДНЕВНИК</button></section>}

      {hud.status === "event" && hud.event && <section className="event-panel" aria-live="assertive"><p className="hud-kicker">{hud.event.kicker}</p><h2>{hud.event.title}</h2><p>{hud.event.body}</p><div className="event-choices">{hud.event.choices.map((choice) => <button className={`event-choice ${choice.tone}`} type="button" key={choice.id} onClick={() => chooseEvent(choice.id)}><strong>{choice.label}</strong><small>{choice.detail}</small></button>)}</div></section>}
      {hud.status !== "playing" && hud.status !== "event" && !showTutorial && <section className={`outcome-panel ${hud.status === "lost" ? "lost" : ""}`} aria-live="assertive"><p className="hud-kicker">{isCampaignComplete ? "ПРОТОКОЛ ЗАВЕРШЁН" : isWon ? `ЭТАЖ ${String(hud.sector).padStart(2, "0")} ПРОЙДЕН` : "РУН ПРЕРВАН"}</p><h2>{isCampaignComplete ? hud.ending?.title ?? "ЯДРО РАЗОМКНУТО." : isWon ? `ЛИФТ: ${hud.grade ?? "B"}` : "СИГНАЛ ПОТЕРЯН."}</h2><p>{isCampaignComplete ? hud.ending?.body ?? "Маршрут свободен. Вы вышли за пределы расчёта ядра." : isWon ? `Осталось ${formatTime(hud.secondsLeft)}. Импульсов: ${hud.usedPulses}. Лифт переносит вас на следующий этаж.` : "Потеряна целостность сигнала. Пробуйте другой маршрут или продолжайте с чекпоинта."}</p>{isCampaignComplete && hud.ending && <p className="ending-ledger">{hud.ending.ledger}</p>}{(isWon || isCampaignComplete) && <p className="outcome-score">СИГНАЛ: {String(hud.score).padStart(5, "0")}</p>}<div className="outcome-actions">{isWon && <button type="button" onClick={advanceSector}>ВОЙТИ В ЛИФТ <span>↗</span></button>}<button type="button" className={isWon ? "outcome-secondary" : ""} onClick={restart}>{isCampaignComplete ? "НОВЫЙ ЦИКЛ" : "ПОВТОРИТЬ ВЕКТОР"} <span>R</span></button></div></section>}
    </main>
  );
}
