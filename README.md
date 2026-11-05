# FUCK / WORLD 001

A browser-based experimental **3D multiplayer world**, built with Three.js and a Node.js WebSocket server. Render serves the game and the multiplayer endpoint.

**Play:** https://fuck-world.onrender.com/

## Latest changelog — v0.1.5 (2026-11-05)

**Patch 2.3 — Unknown Territory**

- Corrected the backwards-facing avatar and simplified the model into a featureless, lean 3D humanoid.
- Added an **unarmed LMB hand-wave punch**. The tutorial now introduces attacking after the ESC menu is first opened.
- **M opens the Map**, also accessible from the new borderless, horizontal ESC menu tabs.
- The map reveals only cells seen inside the local camera's view and discovery radius; hills can obstruct visibility. Exploration persists **per browser**.
- Added a nearby **goblin camp** with wooden spikes, an animated fire and one green, rag-clothed goblin (no AI yet).
- Third-person camera now moves in toward the player when terrain obstructs it.

See [CHANGELOG.md](CHANGELOG.md) for the complete release notes and [prompts.txt](prompts.txt) for the design archive.

## Controls

- **WASD / arrows**: move (A left, D right)
- **Shift**: sprint
- **Click once**: lock mouse and rotate camera without holding a button
- **LMB**: unarmed hand-wave attack (visual only)
- **Space**: jump
- **T**: toggle tutorial prompts
- **Scroll**: zoom, including into first-person
- **M**: open/close the discovered-world map
- **Escape**: open horizontal menu tabs, resume
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

**Canonical client source:** `server/public/main.js`, `server/public/ascii.js`, `server/public/terrain.js`, `server/public/forest.js`, `server/public/camp.js`, `server/public/cartography.js`, `server/public/index.html`, `server/public/style.css`. Render serves those directly. The repository-root `index.html` points at the same client for local Python hosting and optional GitHub Pages. Legacy root-level `main.js` and `style.css` are not active in the game.

## Current limitations

This is a proof-of-concept, not a persistent MMO. The **8192 × 8192-unit** world uses analytic heightfield rendering and a pool of nearby tree models rather than allocating geometry for the entire map. Player positions are held in server memory and cleared when it restarts. The building, NPC and tree are static client geometry; gameplay events and NPC logic are not networked. There is basic local collision with building walls and tree trunks but no server-authoritative physics, security, saving, or player accounts.
