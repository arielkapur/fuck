# Changelog

All notable updates to **FUCK / World 001** are recorded here. Newest first.

## [0.1.2b] — 2026-11-05 — Visibility Fix

- Fixed mismatched depth comparisons between the analytic ground and projected 3D surfaces.
- Made the monochrome ASCII world readable: dark/sparse concrete glyphs, bright building/character geometry, and distinct sky tones.
- Added **F3 renderer diagnostics** showing character-grid dimensions, registered meshes, projected visible samples and camera position.
- Preserved existing multiplayer, menus, movement, humanoids and camera controls.
- A browser visual confirmation is still required.

## [0.1.2a] — 2026-11-05 — Patch 002 Hotfix: Grey-Screen Diagnostics

- Corrected ASCII grid sizing to measure the browser's actual monospace glyph width.
- Added a startup status panel and on-screen error reporting for module and render failures.
- Guarded the ASCII draw loop, so a renderer exception is displayed rather than silently leaving an empty screen.
- Updated both Render's game page and the repository-root local entrypoint.
- **Verification:** Code pushed; the cause of the reported grey screen is not yet confirmed without browser error output.

## [0.1.2] — 2026-11-05 — Patch 002: ASCII-First

### Rendering
- **Goodbye WebGL rendering:** World 001 now projects 3D surface samples directly into an ASCII character grid using a CPU depth buffer and directional shading. This isn't a post-processing filter on a normal 3D image.
- **Monochrome by default:** batched text rendering for a fast, dense terminal aesthetic. Optional coloured glyphs and five ASCII character-size presets are available in Settings.
- **Concrete is raycast analytically** at each character cell; the large map doesn't need millions of geometry samples.
- The building, tree, NPC and multiplayer avatars remain three-dimensional; the ASCII renderer owns their final appearance.

### Characters
- **Stickmen evolved into humanoids.** Added skull, nose, ears, neck, shoulders, chest, waist, pelvis, upper and lower arms, hands, thighs, knees, calves and feet using assembled 3D geometry.
- Walking animations swing the connected arm and leg groups. First-person mode still hides the local character.
- Preserved Patch 001's first/third-person camera, ESC menu, settings and keyboard controls.

### Technical notes
- Renderer code lives in `server/public/ascii.js`; world/input/networking code remains in `server/public/main.js`.
- No WebGL rasterization or external ASCII conversion library.
- This is a CPU prototype, not a production renderer. Display density and performance will depend on screen size and device. Some detailed surfaces may look sparse at distance.

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
