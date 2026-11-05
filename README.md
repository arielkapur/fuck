# FUCK / WORLD 001

A browser-based experimental **3D multiplayer world**, built with Three.js and a Node.js WebSocket server. Render serves the game and the multiplayer endpoint.

**Play:** https://fuck-world.onrender.com/

## Latest changelog — v0.1.2b (2026-11-05)

**Patch 002 — visibility hotfix**

- Corrected inconsistent ground/geometry depth comparisons.
- Increased contrast between concrete, characters, building and sky.
- Press **F3** to inspect ASCII rendering statistics (grid, surface samples, camera) when troubleshooting.
- See [CHANGELOG.md](CHANGELOG.md) for full history.

## Controls

- **WASD / arrows**: move (A left, D right)
- **Shift**: sprint
- **Drag**: rotate camera
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

**Canonical client source:** `server/public/main.js`, `server/public/ascii.js`, `server/public/index.html`, `server/public/style.css`. Render serves those directly. The repository-root `index.html` points at the same client for local Python hosting and optional GitHub Pages. Legacy root-level `main.js` and `style.css` are not active in the game.

## Current limitations

This is a proof-of-concept, not a persistent MMO. A large **8192 × 8192-unit** world has one flat ground mesh and only a handful of static objects, so the map is spacious without huge server or rendering demands. Player positions are held in server memory and cleared when it restarts. The building, NPC and tree are static client geometry; gameplay events and NPC logic are not networked. There is basic local collision with building walls and the tree but no server-authoritative physics, security, saving, or player accounts.
