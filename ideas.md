# AI Core Escape — Design Direction

## Three stylistic approaches

| Theme Name | Very Brief Intro | Probability |
| --- | --- | --- |
| **Prism Relay** | An electric, glassy cyber-arcade where a lone spark darts through a failing server core. It feels urgent, bright, and legible in motion. | 0.07 |
| **Signal Garden** | A serene technobiological labyrinth in which warm coral intelligence grows through a cool teal machine habitat. The mood is more meditative than aggressive. | 0.03 |
| **Blueprint Ruin** | A restrained, ink-and-paper systems map animated into a tense stealth game. It emphasizes clarity and tactical observation over spectacle. | 0.09 |

## Chosen approach: Prism Relay

### Design Movement

**Prism Relay** draws from late-1990s vector arcade interfaces, digital-glass industrial design, and the clear state language of classic Godot-style prototypes. It should feel like a small, self-contained game system—not a website that happens to contain a game.

### Core Principles

1. **Gameplay readability first.** Every hazard, pickup, and player action uses a distinct silhouette, motion pattern, and color role.
2. **One luminous accent against a deep field.** Intensity comes from contrast and bloom-like layering, not crowded decoration.
3. **Tactile system feedback.** Movement trails, pulse rings, screen-edge alerts, and compact text telemetry make every action feel acknowledged.
4. **Controlled asymmetry.** The world reads as a breached core chamber rather than a regular grid of UI cards.

### Color Philosophy

The arena is an inky blue-black field that visually recedes. The ownable signal color is **Relay Mint (#60F6D4)**: a high-energy mint that identifies the player, collected energy, safe routes, and successful actions. Coral-red marks the sentinel's threat field, while off-white is reserved for concise telemetry. The palette tells the player what is safe before they need to read text.

### Layout Paradigm

The game occupies the full screen as one uninterrupted **reactor viewport**. HUD elements are positioned as instrument labels around the action rather than collected in a conventional header or sidebar. The arena has a loose orbital composition: a bright core, drifting frame lines, and an offset exit relay.

### Signature Elements

1. **Prismatic scanlines:** sparse, broken horizontal lines crossing the field at varying speeds and opacity.
2. **Concentric relay rings:** thin mint rings pulse outward from energy pickups and the central core.
3. **Sentinel sight cone:** a translucent coral wedge clearly communicates the autonomous AI's line of pursuit.

### Interaction Philosophy

Inputs remain immediate, with no menu depth between player and play. WASD/arrow movement is paired with a small directional engine flare. Pressing **Space** emits a short pulse that stuns the sentinel only when energy has been collected, making the player feel clever rather than overpowered. Restart remains one visible key action.

### Animation

Movement is crisp and eased only at the visual layer: the player has a trailing glow, pickups bob in 900 ms loops, relay rings expand and fade, and the enemy cone gains a subtle 1.2-second scanning sweep while patrolling. A hit triggers a brief coral flash and camera-like field jolt. In reduced-motion contexts, movement remains functional but trails, scanline motion, and ring expansion are minimized.

### Typography System

Use **Space Grotesk** for compact, authoritative interface labels and **JetBrains Mono** for diagnostic telemetry. Headings use heavy, letter-spaced Space Grotesk; controls and live state use high-contrast mono at small sizes. Avoid generic marketing voice or oversized centered landing-page typography.

### Brand Essence

**AI Core Escape is a compact arcade stealth run for players who enjoy outsmarting systems through movement and timing.**

Personality: **precise, electric, alert**.

### Brand Voice

Headlines are clipped system notices; CTAs are action commands; microcopy names the state without fluff.

> “ROUTE LOCKED. MAKE YOUR OWN.”

> “CHARGE THE RELAY — THEN BREAK THE LOOP.”

### Wordmark & Logo

The wordmark is a split, condensed **AI//CORE** logotype with a thin doubled slash standing in for a broken circuit. The logo mark is a bold four-segment diamond that resembles a directional cursor enclosing a bright central core; it is rendered without text as the favicon and in-game system glyph.

### Signature Brand Color

**Relay Mint — #60F6D4**

## Style Decisions

- The first viewport always presents a live reactor state: an active player signal, a visible coral sentinel threat, energy anchors, perimeter telemetry, and relay-ring geometry.
- Relay Mint is reserved for player agency, energy, safe routes, successful actions, and primary commands. Coral remains exclusive to threat and failure states.
- The experience remains one uninterrupted game canvas, with HUD language as clipped system notices and action commands rather than landing-page copy.
- Tutorial layers read as translucent reactor diagnostics with asymmetric geometry and a visible link to the playfield, never as generic modal dialogs.
- The AI//CORE four-segment diamond/core glyph is repeated as a HUD primitive. The grid remains background infrastructure; active player, pickup, route, and relay states receive the brightest Relay Mint emission.
- Passive structural grid lines, scanlines, and panel frames use cold blue or off-white rather than bright Relay Mint; Relay Mint remains reserved for player agency, success, and primary commands.
- Event and ending layers remain asymmetric reactor diagnostics tethered to the active playfield through clipped corners, relay rings, and live-link telemetry rather than conventional dialog-card geometry.
- Coral threat is always given a visible competing role through the active sight cone, alert telemetry, or failure field; it must be legible before the player reads a status label.
- Night Shift environment detail remains subordinate to Prism Relay readability: office furniture is staged as crisp digital-glass geometry inside a reactor-like vector frame, never a cinematic escape-room set.
- Touch controls and narrative results use clipped, asymmetric diagnostic geometry. The live field stays visible behind every overlay, while the brightest Relay Mint is reserved for agency, success and the primary command.
- In first-frame tactical play, the player beacon, access relay path, and coral security sweep outrank passive HUD chrome so the stealth conflict is legible without reading labels.
- Office props use cold cyan-blue digital-glass masses and schematic screen edges; warm color is reserved for explicit corporate danger, traps, or failure signals.
- The player beacon, current access route and coral security field form the first tactical read; panels and passive room masses remain secondary.
- Bright Relay Mint belongs to player movement, collectible access and successful extraction only, while passive chrome recedes into cold cyan-blue and off-white.
- Coral is a continuously visible security language through sweeps, field geometry, patrol pressure and failure signals rather than a late textual warning.

- Every active camera profile carries a visible coral security wedge or pursuit field, while passive HUD chrome stays cold blue/off-white and Relay Mint is reserved for live player agency.
- The campaign menu remains translucent and structurally tied to the live reactor viewport through clipped geometry and relay rings; it is not an opaque standalone card.
- In first-person mode, nearest collectible geometry yields to route readability so the camera preserves the same player–threat–objective hierarchy as tactical mode.
