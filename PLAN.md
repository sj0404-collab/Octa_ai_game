# Game Plan: AI Core Escape — Night Shift

## Risk tasks

### 1. Semi-3D camera and PNG animation
- **Why isolated:** The game must look materially more dimensional without losing the exact touch readability that top-down play requires.
- **Approach:** Keep navigation on a 2D floor plane, use raised meshes, stairs, walls and dynamic lights for depth, and render the player as a billboard sprite state machine. Enemy bodies use procedural 3D meshes with generated PNG faces, emissive cores and visible alert materials.
- **Verify:** The player has clearly distinct idle, walk, dash, stun and teleport frames; stairs/readable elevation appear in the first screenshot; enemies visibly retain depth and do not become flat UI icons.

### 2. Dense procedural office generation
- **Why isolated:** Larger maps can become empty, blocked or unfair if loot and hazards do not reserve a complete escape route.
- **Approach:** Generate a seed-stable room graph with mandatory entry, safe, personal relic and exit rooms. Fill each room with desk clusters, walls, cover, stair link, hazard or reward according to a density budget. Reserve one traversable spine before spawning optional loops and moving-wall variants.
- **Verify:** Every seed shows a non-empty office, at least one climb route, a safe/loot objective and an exit path. Two seeds visibly vary room layouts without trapping the player.

### 3. Nonlethal tools and persistent progress
- **Why isolated:** The requested tension collapses if the stun blaster, teleport, traps, money, relics and achievement saves are merely HUD labels.
- **Approach:** Tools have physical use windows and inventory counts. A localStorage profile holds money, diary relics and achievement IDs. Achievements save immediately after an extraction condition; relics transfer into the diary and leave the carried inventory.
- **Verify:** A stunner only disables enemies temporarily, teleport crosses a short threat line, a collected relic appears in the diary after leaving the run, and reloading preserves an earned achievement.

### 4. Nightmare story versus free run
- **Why isolated:** Two modes must change stakes and framing, not simply rename a seed button.
- **Approach:** Story mode chooses a scripted morning/contract prompt and tracks corporate pressure; free nightmare starts a seeded contract with modifiers and no fixed chapter. Both feed the same diary and achievement profile.
- **Verify:** The mode select screen states materially different objectives; the ending summary includes mode, recovered items and company impact.

### 5. Tactical room minimap and discovery layer
- **Why isolated:** A static decorative map would not solve orientation in a large procedural floor. It must represent current room topology, preserve unknown-space tension, and remain legible on a narrow mobile screen without covering action controls.
- **Approach:** Build a seeded map model from the procedural room graph. The map shows discovered room shells, player heading, exit, safe, personal relic, healing station, ammunition and known enemy alert. Objective pings, temporary breadcrumb vectors and a timed scanner pulse are semantic map effects rather than a second world simulation. During a high alert, non-critical loot markers dim while coral threat memory remains.
- **Verify:** The portrait HUD shows a readable corner map; moving the player updates its marker; discovered/undiscovered rooms have clear contrast; every key objective uses a distinct icon/color; scanner pulse and alert blackout produce visible, reversible changes.

### 6. Dense office dungeon and local vision
- **Why isolated:** The current procedural spine leaves too much exposed floor. A denser layout must retain guaranteed routes while making walls, doorways, windows and lines of sight meaningful to stealth rather than decorative.
- **Approach:** Generate a cardinal room graph with deliberate corridor links and loop routes. Each connection creates a doorway gap; all remaining room sides become physical walls with animated glass windows and door frames. A tactical-only local-vision mask follows the player, expands temporarily under scanner pulse, and keeps the discovered minimap as the strategic reference.
- **Verify:** The first portrait viewport is visually enclosed by rooms/corridors rather than empty ground; doors and windows visibly animate; walls block direct enemy sight; tactical view reveals a local illuminated bubble while the map preserves discovered topology.

## Main build

Build a top-down office nightmare that stays kinetic and readable on a phone: polished 2.5D geometry, animated PNG hero, persistent 3D pursuers, tightly furnished rooms, movement hazards and nonlethal escape. The main run is `scout → reclaim → extract`, while narrative rewards explain why a safe, a watch or a key matters.

- **Assets needed:** visual target for corporate nightmare office; transparent player animation sheet; three PNG-faced enemy avatars; office props/obstacles texture sheet; diary relic icons; compact sound palette.
- **Verify:**
  - The first viewport visibly contains dense office furniture, stairs, a safe, a relic, a healing station, a moving barrier, an enemy and a clear exit signal.
  - Player and enemy state changes are visible at a glance, including player teleport and enemy pursuit.
  - No lethal weapon is offered; stunner, trap, cover and teleport form the complete escape toolset.
  - Money, ammo, relics and diary updates make persistent progress legible.
  - Achievement save survives refresh; story and free nightmare use different objective framing.
  - `?demo` displays deterministic real movement and `pnpm check` passes.
  - The minimap exposes only discovered room information while preserving a clear player, exit, safe, relic, healing and threat vocabulary.
