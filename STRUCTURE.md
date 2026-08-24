# Night Shift architecture

```text
React GameCanvas (canvas lifecycle, HUD, touch controls, diary, mode selector, WebAudio cues)
└── Babylon scene
    └── GameWorld
        ├── ProceduralSector (seeded office rooms, stairs, desks, vaults, traps, loot, exit)
        ├── ReactorEnvironment (semi-3D office meshes, moving walls, sight blocks, pickups)
        ├── Player (worker sprite states, stun blaster, jump, short teleport, health, stealth)
        ├── EnemyDirector (Watcher, Hunter, Harvester 3D pursuer bodies with PNG faces)
        ├── InputManager (keyboard and corrected touch semantic actions)
        ├── Narrative (company choices, night-shift ledger, compositional ending)
        └── ProgressStore (local money, diary relics, achievements, completed-run saves)
```

`GameWorld` remains the owner of run state and emits a compact `HUDSnapshot`; React never alters the core simulation. `ProceduralSector` creates the deterministic room graph and resource locations. `ReactorEnvironment` converts that data into dense, angled top-down geometry and exposes sight, trap, exit and collection queries. The player can only temporarily stun pursuers or short-teleport through danger; it cannot use lethal combat.

The project remains intentionally 2.5D. All navigation takes place on an accessible floor plane while walls, stairs, desks, raised routes, doors and moving partitions provide visible semi-3D depth. The browser profile is stored in localStorage whenever an achievement, relic, money reward or run completion changes so the diary survives reloads.
