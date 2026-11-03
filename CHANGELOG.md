# Changelog

All notable updates to **FUCK / World 001** are recorded here. Newest first.

## [0.1.1] — 2026-11-04 — First Patch: Spawn Into Existence

### UI / Controls
- **Stripped the original HUD back to nothing.** Only small, pixel-font world coordinates (X, Y, Z) remain in the far top-left.
- **Un-fucked A/D movement:** A strafes left, D strafes right.
- **Added Elder Scrolls-style camera zoom:** scroll from third-person straight into first-person, with the player model hidden in first-person.
- **Cursor now disappears over active gameplay**, returning for menus.
- **ESC opens a dimmed pause menu** with Inventory, Character, Skills, Settings, Resume, and Quit.
- Inventory, Character, and Skills are intentionally empty placeholders.
- **Settings added:** mouse sensitivity, field of view, view distance, and rendering resolution.
- **Quit now disconnects and returns to a title screen** instead of attempting to close the browser tab.

### World
- **Deleted procedural scenery generation entirely.** Goodbye, infinite pillars.
- **Replaced the entire floor with a flat, dark-grey concrete texture.**
- **Rebuilt player models as fully connected, pitch-black stick figures.**
- **Placed a single concrete building beside spawn** with an actual walk-in doorway, a simple tree nearby, and an identical stick-figure NPC inside.
- Maintained the existing large flat world boundary and multiplayer player-position replication.

### Notes
- The building and tree are static local scenery; terrain objects are not yet synchronised by the server.
- World position Y stays at ground level until jumping/vertical traversal is implemented.
- Render's free service may take time to wake after inactivity.
- Changelog and design-conversation archive introduced.

## [0.1.0] — 2026-11-04 — World 001

- Created the first public browser-based 3D multiplayer world using Three.js and WebSockets.
- Served the game client and multiplayer endpoint from the same Render Web Service.
- Added multiplayer stick figures, an approximately 8.2 km × 8.2 km ground plane, and a gradient sky.
- Prototyped procedural scenery, camera orbit, WASD movement, zoom and sprint.
