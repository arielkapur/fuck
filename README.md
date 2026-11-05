# FUCK / WORLD 001

A browser-based experimental **3D multiplayer world**, built with Three.js and a Node.js WebSocket server. Render serves the game and the multiplayer endpoint.

**Play:** https://fuck-world.onrender.com/

## Latest changelog — v0.1.4 (2026-11-05)

**Patch 2.2 — Into the Woods**

- A **seeded procedural forest** now surrounds a deliberately flat, open spawn clearing. A fixed pool of up to 145 tree models is recycled as you move.
- **Rolling terrain elevation** uses inexpensive multi-octave value noise; jumping and walking now follow the ground. In Three.js, height is **Y**, not Z.
- A **pixel minimap** appears under XYZ coordinates with vegetation, terrain, player facing, other players and the spawn building.
- **About 2× as many ASCII cells** at the default 10.5px character size, with density controls in Settings.
- **Colour/contrast upgrade:** distinct vegetation, concrete, soil, silhouettes, edges and star palettes; cached coloured glyph atlas for drawing.
- **Unicode glyph accents** include selected Chinese/Japanese and Devanagari symbols, with fixed-cell clipping. Complete Unicode coverage is neither practical nor guaranteed.

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes and [prompts.txt](prompts.txt) for the design conversation.

## Controls

- **WASD / arrows**: move (A left, D right)
- **Shift**: sprint
- **Click once**: lock mouse and rotate camera without holding a button
- **Space**: jump
- **T**: toggle tutorial prompts
- **Scroll**: zoom, including into first-person
- **Escape**: pause/resume, open settings and submenus
- **Quit**: disconnect from multiplayer and return to title screen

## Local development

Terminal 1:
```bash
cd server
npm install
npm start
```

Terminal 2, from repository root:
```bash
python3 -m http.server 6969
```

Open http://localhost:6969 — it connects to the local WebSocket server on port 3001. The live game uses `wss://fuck-world.onrender.com`.

## Deployment

Render: **Web Service** · Root Directory `server` · Build `npm install` · Start `npm start` · Branch `main`.

Enable auto-deploy on Render to redeploy the game whenever changes land on `main`. On free hosting, the service can sleep during inactivity.

**Canonical client source:** `server/public/main.js`, `server/public/ascii.js`, `server/public/terrain.js`, `server/public/forest.js`, `server/public/index.html`, `server/public/style.css`. Render serves those directly. The repository-root `index.html` points at the same client for local Python hosting and optional GitHub Pages. Legacy root-level `main.js` and `style.css` are not active in the game.

## Current limitations

This is a proof-of-concept, not a persistent MMO. The **8192 × 8192-unit** world uses analytic heightfield rendering and a pool of nearby tree models rather than allocating geometry for the entire map. Player positions are held in server memory and cleared when it restarts. The building, NPC and tree are static client geometry; gameplay events and NPC logic are not networked. There is basic local collision with building walls and tree trunks but no server-authoritative physics, security, saving, or player accounts.
