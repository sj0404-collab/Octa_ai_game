# Mobile update checklist

- [x] Define touch movement, pulse, restart, and tutorial interaction patterns for the mobile game viewport.
- [x] Add a virtual thumbstick and an appropriately sized pulse control that work with the existing game input system.
- [x] Translate player-facing HUD, controls, alerts, and outcome panels into Russian.
- [x] Add a concise Russian-language onboarding sequence for movement, energy collection, pulse use, and exit activation.
- [x] Refine portrait and landscape mobile layouts without obscuring core gameplay.
- [x] Validate touch input, visual clarity, type safety, and production build output.

## Full game and Android package checklist

- [x] Define the complete core loop, three-run progression, scoring, failure states, and final extraction objective.
- [x] Implement run selection, escalating sentinel patterns, objective tracking, and between-run progression feedback.
- [x] Add mobile-oriented game-state screens and keep all player-facing copy in Russian.
- [x] Prepare the Capacitor Android wrapper, launcher configuration, and Android signing-ready build files.
- [x] Build an installable debug APK and verify the web and Android build outputs.

## GitHub transfer checklist

- [ ] Confirm GitHub authentication and the destination owner or repository.
- [ ] Review source-control exclusions and prepare a clean project commit.
- [ ] Push the complete game source and Android wrapper to GitHub.
- [ ] Verify the repository contents and provide its URL.

## Android release checklist

- [x] Configure a release signing workflow without committing the signing key or credentials.
- [x] Build an optimized signed release APK and Android App Bundle.
- [x] Verify package metadata and release signatures.
- [ ] Deliver the release artifacts and key-preservation guidance.

## Roguelite expansion checklist

- [x] Define the narrative factions, choice economy, run structure, shells, events, and open-ended conclusion model.
- [x] Correct the virtual-joystick axis mapping and add mobile sensitivity, sprint, jump, health, and interaction controls.
- [x] Implement deterministic procedural room generation with platforms, hazards, cover nodes, rewards, and route variants.
- [x] Add enemy archetypes with sight, sound, alert, search, chase, and cover-aware tactical behavior.
- [x] Add player shells, health, stealth visibility, upgrades, risk-reward roulette events, and run persistence.
- [x] Add branching story events and ending summaries that reflect choices without fixed ending limits.
- [x] Test desktop and Android-touch flows, then verify the production build.

## Nightmare-heist expansion checklist

- [x] Define the two-mode structure, office-nightmare story, corporate-faction pressure, personal relics, rewards, and achievement-save model.
- [x] Upgrade the world into a semi-3D top-down office nightmare with animated player states and persistent 3D pursuers.
- [x] Generate dense procedural floors with moving walls, stairs, locked routes, healing stations, traps, safes, scattered ammunition, and salvageable tools.
- [x] Replace direct combat with a stun-only blaster, short teleport, deployable or reusable traps, and stealth-based escape mechanics.
- [x] Add money, safe loot, relic recovery, inventory, permanent memory-journal entries, achievements, and saved meta-progress.
- [x] Add Russian sound design for movement, alert, teleport, trap, healing, pickups, and ending states.
- [x] Validate the story and free-run modes on mobile and desktop, including progress recovery after an achievement.

## Portrait gameplay refinement checklist

- [x] Define portrait safe zones and a central unobstructed play corridor for compact Android viewports.
- [x] Reflow top telemetry, progress controls, and story overlays to avoid collision at narrow widths.
- [x] Consolidate touch actions into a lower-right radial cluster and preserve a clear route around the joystick.
- [x] Tune portrait camera framing and world contrast so the worker, threat, objective, and exit are readable at a glance.
- [x] Validate the live play, story result, and touch-control states at realistic Android portrait sizes.

## Camera and material overhaul checklist

- [x] Constrain player movement to valid office bounds and prevent movement under the map or through solid walls.
- [x] Replace uniform blue-glass treatment with distinct floor, wall, desk, stair, cover, hazard, safe, and healing materials.
- [x] Stabilize tactical follow behavior so ordinary movement never causes camera circling or uncontrolled rotation.
- [x] Add top-down tactical, third-person, and first-person camera modes with readable mobile controls.
- [x] Add a side zoom slider for the tactical camera and verify it avoids HUD and action-control collisions.
- [x] Validate desktop and portrait touch navigation across every camera mode.

## Minimap and release distribution checklist

- [x] Define map layers, discovery rules, marker semantics, and compact portrait placement.
- [x] Render a live room minimap with player position, exit, safes, relics, healing stations, ammunition, and discovered enemy alerts.
- [x] Add minimap-linked navigation mechanics: objective ping, last-known threat memory, route breadcrumbs, and floor/room discovery.
- [x] Add complementary stealth features: door noise, map blackout during alert, and a short scanner pulse with a cooldown.
- [x] Verify minimap legibility and controls on portrait/mobile plus desktop tactical camera modes.
- [x] Rebuild, sign, and verify the Android release APK/AAB with the expanded gameplay feature set.
- [ ] Request explicit approval before uploading the release package to Gofile.io and share the resulting URL only after authorized upload.

## Real mobile browser compactness follow-up

- [x] Reserve a larger central playfield on 720×1612-style portrait browser previews by reducing HUD, minimap, and control footprints.
- [x] Reposition the compact minimap and map details so they do not visually compete with the player and lower-right action stack.
- [x] Recheck camera dock, joystick, scanner, and browser-overlay interaction zones against the supplied mobile screenshots.
- [x] Rebuild and verify a replacement signed APK/AAB after the portrait composition update.

## Dense room dungeon and local-vision follow-up

- [x] Replace the open field feeling with a dense connected room-and-corridor topology that reserves clear playable routes.
- [x] Add room walls on every side with intentional door gaps, windows, and closed sightlines rather than isolated furniture shells.
- [x] Add visible environmental animation for doors, window light, monitors, security sweeps, props, and hazards.
- [x] Implement player-centered local visibility, discovery fog, and wall/cover occlusion while preserving tactical map readability.
- [x] Validate tactical, third-person, and first-person mobile play inside the dense room layout.
- [x] Rebuild and verify a signed APK/AAB after the dense-layout and visibility update.

## Blocking dense-dungeon control regression

- [x] Trace why mobile/keyboard direction updates player facing without translating position.
- [x] Restore stable stationary facing and reliable analog/touch movement semantics.
- [x] Rebuild dense-room wall colliders so the player cannot cross room and corridor walls.
- [x] Validate joystick, keyboard, teleport, and camera modes against the repaired collision map.
- [x] Rebuild and verify a replacement signed APK/AAB after the control fix.

## Completabile stealth-campaign vertical slice

- [x] Guarantee a navigable route through every room, add usable opening doors, and prevent nearby walls from visually disappearing.
- [x] Extend early-run time pressure and optimize teleport effects to avoid mobile frame drops.
- [x] Add crouch, dodge roll, first-person touch look, meaningful jump routes, and a mobile-ready action layout.
- [x] Add a main menu, casual checkpoints, and a reliable restart/continue flow.
- [x] Add flashlight cones, room light sources, enemy investigation of visible light, and a readable non-black floor.
- [x] Add enemy identity/animation hooks, ambient voice foundation, and action idle/use animations.
- [x] Add comic campaign intro/outro, AI dialogue choices, floor/elevator/attic/basement transitions, food, and a purchase/upgrade hook.
- [x] Validate the mobile campaign slice end to end and rebuild a signed Android APK/AAB.

## Real-device camera framing correction

- [x] Trace why 3Л/1Л camera views intersect close walls, stairs, and oversized room objects in portrait play.
- [x] Add camera-safe wall/prop occlusion so nearby geometry cannot hide the player or route.
- [x] Reduce visually dominant structural meshes and restore readable room/corridor proportions in all mobile views.
- [x] Validate tactical, third-person, and first-person camera routes against the supplied portrait screenshots.
- [x] Rebuild and verify a signed APK/AAB after the camera framing correction.

## Authorized GitHub transfer

- [x] Verify the available GitHub integration and choose the repository owner/name.
- [x] Obtain explicit authorization to create or update the destination repository.
- [x] Export the current checkpointed project to the authorized GitHub repository without using chat-provided credentials.
- [x] Confirm the repository URL and handoff status.

## Existing repository destination

- [x] Verify write access and existing content for `sj0404-collab/Octa_ai_game`.
- [x] Preserve any existing repository content or obtain confirmation before replacing conflicting files.
- [x] Export the current camera-hotfix checkpoint to the approved repository and confirm its revision.

## GitHub-backed continuation

- [x] Synchronize the local project and GitHub working copy against the exported `main` revision.
- [x] Implement access-card doors with clear route requirements, responsive opening feedback, and a useful alternate-route payoff.
- [x] Validate the slice in mobile camera modes and Android packaging.
- [x] Commit and push the verified follow-up revision to `sj0404-collab/Octa_ai_game`.

## 2D navigation and action-camera overhaul

- [x] Trace the upside-down/disappearing player states and unsafe enemy pursuit presentation shown in the real mobile screenshots.
- [x] Stabilize player orientation, visibility resets, and a readable semi-3D worker rig across tactical, 3Л, and 1Л modes.
- [x] Rebalance pursuer speed, enforce shared wall collision, and add an always-readable coral threat ring/cone and identity silhouette.
- [x] Add a full-level interactive 2D map mode that exposes rooms, corridor links, player, objectives, and known threats, with a one-tap return to player focus.
- [x] Keep semi-3D action modes and add only depth-appropriate background parallax layers.
- [x] Validate map, tactical, and 3Л framing at portrait size; build and verify the signed Android v1.4.0 APK/AAB.
- [ ] Push the verified navigation/camera update to `sj0404-collab/Octa_ai_game`.
