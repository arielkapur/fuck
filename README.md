# FUCK / WORLD 001

A browser-based experimental **3D multiplayer world**, built with Three.js and a Node.js WebSocket server. Render serves the game and the multiplayer endpoint.

**Play:** https://fuck-world.onrender.com/

## Latest changelog — v0.1.1 (2026-11-04)

**First Patch: Spawn Into Existence**

- **UI wiped:** tiny pixelated XYZ coordinates in the top-left, nothing else during gameplay.
- **A/D unfucked**, camera zooms seamlessly from third-person to first-person, and the cursor hides over gameplay.
- **ESC pause menu** with Inventory, Character, Skills, Settings, Resume and Quit. The first three are blank; Settings controls sensitivity, FOV, view distance and rendering resolution.
- **Procedural pillars deleted.** The world is now flat dark-grey concrete.
- **Pitch-black connected stick figures**, plus a concrete spawn building, a tree, and an identical NPC inside the building.
- Added this changelog and an ongoing conversation/prompt archive.

See [CHANGELOG.md](CHANGELOG.md) for full patch notes and [prompts.txt](prompts.txt) for the design transcript and summarized earlier milestones.

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

**Canonical client source:** `server/public/main.js`, `server/public/index.html`, `server/public/style.css`. Render serves those directly. The repository-root `index.html` points at the same client for local Python hosting and optional GitHub Pages. Legacy root-level `main.js` and `style.css` are not active in the game.

## Current limitations

This is a proof-of-concept, not a persistent MMO. A large **8192 × 8192-unit** world has one flat ground mesh and only a handful of static objects, so the map is spacious without huge server or rendering demands. Player positions are held in server memory and cleared when it restarts. The building, NPC and tree are static client geometry; gameplay events and NPC logic are not networked. There is basic local collision with building walls and the tree but no server-authoritative physics, security, saving, or player accounts.
