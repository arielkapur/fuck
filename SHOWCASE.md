# FUCK / WORLD 001 — Project Showcase

> **Status:** Experimental multiplayer 3D browser-world prototype. This is a living experiment, not a finished MMO.

**Explore:** https://fuck-world.onrender.com/  
**Source:** https://github.com/arielkapur/fuck  
**Portfolio:** https://arielkapur.github.io/#work (after the portfolio PR is approved)

## The short version

A strange, explorable 3D landscape built in the browser. The experiment mixes a large terrain, procedurally placed forest scenery, a map that remembers the ground you've seen, and the early beginnings of a shared online world.

It is meant to feel like finding a place before anyone has decided exactly what it will become.

## What is there now

- 3D terrain with an analytic heightfield and camera-aware scenery.
- Mouse-controlled camera with first-person / third-person zoom.
- A map that records local discovery per browser, with hills able to hide the landscape.
- A camp with atmospheric details and a non-interactive goblin prototype.
- Multiplayer presence via a Node.js WebSocket service.
- Keyboard / mouse exploration controls and an in-game menu.

## Technology

**Three.js** for the visual world · **JavaScript** for the client · **Node.js and WebSockets** for multiplayer · **Render** for the deployed service.

The live build is served from `server/public/`. The root `index.html` is useful for local static hosting; the root `main.js` is legacy, not the live client.

## Known boundaries

This is not a persistent or fully authoritative MMO. Player positions live in server memory, so restarts reset them. The goblin is not an autonomous enemy; world events are not fully networked. The free Render service may sleep between visits.

See the project's [README](README.md) and [CHANGELOG](CHANGELOG.md) for current mechanics, technical caveats and release notes.

## Media still needed

For an accurate public showcase, capture the following from a running build:

1. An actual gameplay screenshot of the terrain and horizon.
2. A short silent clip of exploring and opening the discovered-world map.
3. A second screenshot showing the camp or the multiplayer world with multiple players.
4. A short technical note or diagram explaining how the heightfield and map fit together.

Until those assets exist, the portfolio uses **original abstract cover art**, not fake or mislabelled gameplay screenshots.

## Next directions to explore

Persistent worlds, more interactive simulation systems, player-to-player encounters, NPC behaviour, clearer feedback, and accessibility testing. These are *ideas*, not implemented features or promised release dates.
