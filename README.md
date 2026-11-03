# FUCK / WORLD 001

Experimental **3D multiplayer browser world** with Three.js rendering and a Node.js WebSocket server. No frontend build step.

## Run locally

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

Visit http://localhost:6969 in two browser tabs. Use WASD / arrow keys to move, drag to orbit, scroll to zoom.

## Hosting

The client is a static site: enable GitHub Pages under **Settings → Pages → Deploy from a branch → main / root**.

Deploy the `server/` folder separately to a Node.js host (for example, a Render Web Service), with root directory `server`, build command `npm install`, start command `npm start`. The server uses `process.env.PORT`.

Once hosted, open:
`https://arielkapur.github.io/fuck/?server=wss%3A%2F%2FYOUR-SERVER-HOST`

Replace `YOUR-SERVER-HOST` with your actual server domain. Pages requires `wss://` for WebSockets. Without a `server` parameter, the deployed client runs as an offline 3D demo.

## Limitations

Prototype only: positions are sent by clients and aren't securely validated; no authentication, persistent world, player interpolation or anti-cheat. The server holds player positions in memory and restarting clears state. This is a foundation for multiplayer experiments, not a production MMO.
