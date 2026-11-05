# Changelog

All notable updates to **FUCK / World 001** are recorded here. Newest first.

## [0.1.4] — 2026-11-05 — Patch 2.2: Into the Woods

### World & Environment
- **Spawn in a woodland clearing.** A deterministic forest of low-poly trees surrounds the original building, NPC and spawn area; the clearing stays level and free of trees.
- **Terrain has elevation.** Lightweight, seeded three-octave value noise shapes rolling hills; elevation blends gently into a flat clearing. Three.js uses **Y as the vertical axis** (Z remains horizontal/map depth).
- **Streaming without object leaks.** A fixed pool of 145 trees repositions as players travel, keeping the enormous world explorable without loading every tree simultaneously.
- **Minimap added.** A compact, pixel-styled map below XYZ coordinates shows approximate local elevation, woodland, nearby players, the building and the player's facing.
- **Terrain-aware movement.** Characters follow the ground when walking and land at the actual terrain height after jumping. Forest trunks have simple collision.

### Rendering
- **Roughly twice the character count by default.** ASCII cell height reduced from 15 to 10.5 pixels (~2.04× screen cells at the same viewport). Adjustable from 7.5 to 18px in Settings.
- **Colour and contrast.** The ASCII renderer now uses distinct palettes for concrete, grass, soil, buildings, highlighted edges, bark, foliage, players and stars, with four lighting levels.
- **Glyph atlas for speed.** Characters are cached into a canvas atlas and composited into the grid instead of calling font rasterisation repeatedly for each screen character.
- **Unicode experimentation.** Added selected CJK, Japanese, Devanagari and block-shading glyphs alongside Latin ASCII. Every glyph is constrained to a single cell. Actual appearance depends on the browser's available fonts; supporting literally every Unicode character is impractical and not guaranteed.
- **No postprocessing filter.** Terrain uses screen-cell ray-heightfield intersections and world objects use 3D surface projections with a shared depth buffer.

### Known limitations
- Trees and terrain are deterministic client-side geometry; the server still only replicates player position.
- High-resolution ASCII rendering is CPU-intensive. Lower character density in Settings if performance suffers.
- Live browser performance and appearance have not yet been independently verified.

## [0.1.3] — 2026-11-05 — Patch 2.1: The Sky Has Eyes

### World & Rendering
- **Made concrete building edges visible.** The software ASCII renderer now projects explicit box-edge outlines into the existing depth buffer, separating corners, rooflines and door frames from shaded wall faces.
- **Added an ASCII starfield.** Stars exist as fixed 3D directions and respond to camera movement; they only appear in unobstructed sky, never over walls or terrain.
- Kept the existing flat concrete world and all multiplayer foundations.

### Player Movement
- **Added jumping:** Space launches the character with gravity and a grounded landing. Player height is now replicated to nearby clients over WebSockets.
- **Mouse-look is now hands-free.** Click the game once to lock the pointer and look around freely without holding LMB. ESC releases the pointer and opens the menu; Resume reacquires it where the browser allows.
- Note: browsers require a user click to enter pointer lock; pointer capture cannot activate automatically on page load.

### Tutorial UI
- Introduced a pulsing pixel-font tutorial prompt: **PRESS ESC TO ACCESS MENU**, with gold ESC.
- Added **DISABLE TUTORIAL BY PRESSING [T]**, including a keyboard-style T keycap.
- First ESC acknowledgement hides the prompt. T toggles the tutorial back on/off, and the preference survives refreshes where browser storage is available.
- The tutorial vanishes while the menu is open.

### Technical
- Preserved the ASCII-first CPU renderer; no WebGL filter.
- New outlines are geometric and depth-tested, rather than drawn as screen-space decoration.
- Code syntax checked. Live browser playtesting remains necessary.

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
