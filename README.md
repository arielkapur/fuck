# FUCK / WORLD 001

A browser-based experimental **3D multiplayer world**. Hosted as one Render Web Service: Node.js provides the WebSocket multiplayer server **and serves the game page**.

## Play online

https://fuck-world.onrender.com/

On Render's free instance, the first visit may need time to wake the sleeping service. The original server-text page has been replaced by the game itself.

## Run locally

From the repository root, start two terminals.

Terminal 1:

```bash
cd server
npm install
npm start
```

Terminal 2 (from repo root):

```bash
python3 -m http.server 6969
```

Open http://localhost:6969. Local browser connects to localhost:3001. On Render it uses wss://fuck-world.onrender.com.

## Controls

- WASD or arrow keys — walk
- Shift — sprint
- Drag — orbit the camera
- Scroll — zoom

The map is **8192 × 8192 units** (nominally metres), with bounded multiplayer coordinates, a gradient sky dome, a sun, animated stick figures and deterministic scenery streamed around the camera. This is a prototype, not a persistent MMO; world objects are locally generated and player positions are stored only in memory.

## Deployment

Render: Web Service, Root Directory `server`, Build Command `npm install`, Start Command `npm start`, free instance. Enable automatic deploys for commits to `main`.

The canonical game client is in `server/public/` so edits there trigger Render auto-deploy; `index.html` in the repository root is the local/GitHub Pages entrypoint that loads those same client files. Keep game logic out of the old root-level `main.js` and `style.css`; those are legacy first-prototype files.

The same root entrypoint may also run on GitHub Pages if Pages is enabled, connecting to Render for multiplayer.
