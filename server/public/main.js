import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { AsciiRenderer } from './ascii.js';
import { terrainHeight, treeAt, FOREST_CELL } from './terrain.js';
import { createForest } from './forest.js';

// FUCK / World 001 · Patch 002: ASCII-first world. The scene and input stay client-side.
// The existing WebSocket server relays positions; it does not render objects.
const HALF_WORLD = 4096;
const canvasHost = document.getElementById('world');
const coords = document.getElementById('coords');
const minimap = document.getElementById('minimap');
const minimapCtx = minimap.getContext('2d');
const tutorial = document.getElementById('tutorial');
let tutorialEnabled = true, menuHintSeen = false;
try { tutorialEnabled = localStorage.getItem('fuck:tutorial') !== 'off'; } catch {}
function updateTutorial(){ if(tutorial) tutorial.hidden = !tutorialEnabled || menuHintSeen || paused || quit; }
function toggleTutorial(){
  tutorialEnabled=!tutorialEnabled;
  if(tutorialEnabled) menuHintSeen=false;
  try { localStorage.setItem('fuck:tutorial',tutorialEnabled?'on':'off'); } catch {}
  updateTutorial();
}
const renderDebug = document.getElementById('render-debug');
let showDebug = false;
const menu = document.getElementById('menu');
const menuPanel = document.getElementById('menu-panel');
const menuTitle = document.getElementById('menu-title');
const menuBody = document.getElementById('menu-body');
const titleScreen = document.getElementById('title-screen');
// ASCII is the primary renderer: 3D mathematics and mesh surfaces, no WebGL.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, .05, 900);
const asciiCanvas = document.createElement('canvas');
canvasHost.appendChild(asciiCanvas);
const renderer = new AsciiRenderer(asciiCanvas, scene, camera);
const ink = new THREE.MeshLambertMaterial({ color: 0x111111 });
const concreteGrey = new THREE.MeshLambertMaterial({ color: 0x777777 });
const concreteShadow = new THREE.MeshLambertMaterial({ color: 0x444444 });

// A fuller human figure constructed in 3D before any ASCII projection.
const bodyMaterial = new THREE.MeshLambertMaterial({color:0x171717});
const skinMaterial = new THREE.MeshLambertMaterial({color:0x2b2b2b});
const unitSphere = new THREE.SphereGeometry(1,12,9);
const unitCylinder = new THREE.CylinderGeometry(1,1,1,10);
const characters = [];
function makeHuman() {
  const root = new THREE.Group();
  const meshes=[];
  const place=(geo,material,parent,x,y,z,sx,sy,sz)=>{
    const mesh=new THREE.Mesh(geo,material);
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.userData.asciiType=8;
    parent.add(mesh);meshes.push(mesh);return mesh;
  };
  // Pelvis, waist, ribcage, shoulder silhouette, neck, skull, nose and ears.
  place(unitSphere,bodyMaterial,root,0,1.0,0,.31,.24,.19);
  place(unitSphere,bodyMaterial,root,0,1.43,0,.27,.46,.18);
  place(unitSphere,bodyMaterial,root,0,1.73,0,.42,.29,.22);
  place(unitCylinder,skinMaterial,root,0,1.99,0,.105,.23,.105);
  place(unitSphere,skinMaterial,root,0,2.25,0,.22,.28,.21);
  place(unitSphere,skinMaterial,root,0,2.19,-.20,.095,.09,.12);
  for(const side of [-1,1])place(unitSphere,skinMaterial,root,side*.225,2.24,0,.068,.105,.07);
  const arms=[],legs=[];
  for(const side of [-1,1]) {
    const arm=new THREE.Group();root.add(arm);
    arm.position.set(side*.38,1.78,0);
    place(unitSphere,bodyMaterial,arm,0,-.055,0,.17,.17,.17);
    place(unitSphere,bodyMaterial,arm,side*.035,-.28,0,.132,.31,.13);
    place(unitSphere,bodyMaterial,arm,side*.055,-.60,0,.103,.105,.105);
    place(unitSphere,bodyMaterial,arm,side*.06,-.82,0,.097,.24,.099);
    place(unitSphere,skinMaterial,arm,side*.065,-1.065,0,.105,.15,.082);
    arms.push(arm);
    const leg=new THREE.Group();root.add(leg);leg.position.set(side*.17,1.10,0);
    place(unitSphere,bodyMaterial,leg,0,-.30,0,.20,.38,.22);
    place(unitSphere,bodyMaterial,leg,0,-.70,0,.14,.15,.155);
    place(unitSphere,bodyMaterial,leg,0,-.96,0,.135,.25,.14);
    place(unitSphere,bodyMaterial,leg,0,-1.06,-.13,.15,.105,.27);
    legs.push(leg);
  }
  root.userData={arms,legs,meshes};
  characters.push(root);
  for(const m of meshes)renderer.register(m,300,600);
  return root;
}
function removeHuman(h) {
  scene.remove(h);
  for(const m of h.userData.meshes)renderer.unregister(m);
}
const player = makeHuman();scene.add(player);
const peers = new Map();

// Static spawn structures. Building front faces the spawn, with a walk-in door.
const buildingMaterial = concreteGrey;
const frameMaterial = concreteShadow;
const colliders = [];
function block(x, y, z, w, h, d, material = buildingMaterial, solid = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);mesh.userData.asciiType=4;
  scene.add(mesh); renderer.register(mesh,95,1900); renderer.registerEdges(mesh);
  if (solid) colliders.push({ minX: x - w/2, maxX: x + w/2, minZ: z - d/2, maxZ: z + d/2 });
  return mesh;
}
const BX = 8, BZ = -12, BW = 10, BD = 10, H = 4.7;
block(BX, H/2, BZ - BD/2, BW, H, .5);                 // back wall
block(BX - BW/2, H/2, BZ, .5, H, BD);                  // left wall
block(BX + BW/2, H/2, BZ, .5, H, BD);                  // right wall
block(BX - 3.2, H/2, BZ + BD/2, 3.6, H, .5);         // front left
block(BX + 3.2, H/2, BZ + BD/2, 3.6, H, .5);         // front right
block(BX, 4.05, BZ + BD/2, 2.9, 1.3, .5);             // door lintel
block(BX, H + .17, BZ, BW + .6, .35, BD + .6, frameMaterial, false);
block(BX, .055, BZ, BW - .5, .11, BD - .5, frameMaterial, false);
const npc = makeHuman(); npc.position.set(BX, .12, BZ - 1.3); npc.rotation.y = Math.PI; scene.add(npc);
// ASCII lighting is performed directly from surface normals.

// One intentionally simple tree beside the building.
const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.32, .45, 4, 8), new THREE.MeshLambertMaterial({ color: 0x735647 }));
trunk.userData.asciiType=6;
trunk.position.set(BX + 8, 2, BZ + 1); scene.add(trunk); renderer.register(trunk,130,1200);
const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.0, 7, 8), new THREE.MeshLambertMaterial({ color: 0x43664e }));
leaves.userData.asciiType=7;
leaves.position.set(BX + 8, 6, BZ + 1); scene.add(leaves); renderer.register(leaves,145,1600);
colliders.push({ minX: BX + 7.4, maxX: BX + 8.6, minZ: BZ + .4, maxZ: BZ + 1.6 });
const forest = createForest(scene, renderer);
forest.update(0, 0);
function canStand(x, z) {
  if (Math.abs(x) >= HALF_WORLD - 1 || Math.abs(z) >= HALF_WORLD - 1) return false;
  const radius = .27;
  if (colliders.some(c => x + radius > c.minX && x - radius < c.maxX &&
                                   z + radius > c.minZ && z - radius < c.maxZ))return false;
  const cx=Math.floor(x/FOREST_CELL),cz=Math.floor(z/FOREST_CELL);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
    const tree=treeAt(cx+dx,cz+dz);
    if(tree&&Math.hypot(x-tree.x,z-tree.z)<.68+radius)return false;
  }
  return true;
}

// Pointer-lock mouse-look: one click enters, browser keeps cursor centred.
const keys = new Set();
const options = { sensitivity: 1, fov: 70, drawDistance: 900, quality: 10.5, palette: 'color' };
renderer.setResolution(options.quality);
let yaw = -.38, pitch = .35, distance = 9, savedDistance = 9;
let paused = false, quit = false;
const canvas = asciiCanvas;
function mouseLook(dx,dy){
  yaw -= dx * .003 * options.sensitivity;
  pitch = THREE.MathUtils.clamp(pitch + dy * .003 * options.sensitivity, -.85, 1.25);
}
canvas.addEventListener('click', () => {
  if (!paused && !quit && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
});
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement === canvas && !paused && !quit) mouseLook(e.movementX,e.movementY);
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && !paused && !quit) openMenu();
});
function unlockPointer(){ if(document.pointerLockElement === canvas) document.exitPointerLock(); }
canvas.addEventListener('wheel', e => {
  if (paused || quit) return;
  e.preventDefault();
  distance = THREE.MathUtils.clamp(distance + e.deltaY * .015, 0, 36);
  if (distance > 1.1) savedDistance = distance;
}, { passive: false });
addEventListener('keydown', e => {
  if (e.code === 'F3') { e.preventDefault(); showDebug=!showDebug; if(renderDebug)renderDebug.hidden=!showDebug; return; }
  if (e.code === 'KeyT' && !e.repeat) { e.preventDefault(); toggleTutorial(); return; }
  if (e.key === 'Escape') {
    e.preventDefault();
    if (quit) return;
    if (paused) closeMenu(); else openMenu();
    return;
  }
  if (paused || quit) return;
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k.startsWith('arrow') || e.code === 'Space') e.preventDefault();
  if (e.code === 'Space' && !e.repeat && grounded) { velocityY = 7.7; grounded = false; }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const mainOptions = [
  ['Inventory', 'inventory'],
  ['Character', 'character'],
  ['Skills', 'skills'],
  ['Settings', 'settings'],
  ['Resume', 'resume'],
  ['Quit', 'quit']
];
function menuButtons(items) {
  return items.map(([label, action]) => '<button class="menu-button" data-action="' + action + '">' + label + '</button>').join('');
}
function renderMenu(page = 'main') {
  const names = { main:'PAUSED', inventory:'INVENTORY', character:'CHARACTER', skills:'SKILLS', settings:'SETTINGS' };
  menuTitle.textContent = names[page] || 'PAUSED';
  if (page === 'main') { menuBody.innerHTML = menuButtons(mainOptions); return; }
  if (page === 'settings') {
    menuBody.innerHTML = `
      <label>SENSITIVITY <output id="sens-out">${options.sensitivity.toFixed(1)}</output>
        <input id="sensitivity" type="range" min="0.2" max="3" step="0.1" value="${options.sensitivity}">
      </label>
      <label>FIELD OF VIEW <output id="fov-out">${options.fov}</output>
        <input id="fov" type="range" min="55" max="100" step="1" value="${options.fov}">
      </label>
      <label>VIEW DISTANCE <output id="distance-out">${options.drawDistance}</output>
        <input id="draw-distance" type="range" min="250" max="1500" step="50" value="${options.drawDistance}">
      </label>
      <label>ASCII CHARACTER SIZE <select id="quality">
        <option value="7.5">ULTRA / 7.5 PX</option><option value="9">DENSE / 9 PX</option>
        <option value="10.5">STANDARD 2X / 10.5 PX</option><option value="12">BALANCED / 12 PX</option>
        <option value="15">CLASSIC / 15 PX</option><option value="18">PERFORMANCE / 18 PX</option>
      </select></label>
      <label>ASCII PALETTE <select id="palette">
        <option value="color">COLOURED</option><option value="mono">MONOCHROME</option>
      </select></label>
      ${menuButtons([['Back','main']])}`;
    menuBody.querySelector('#quality').value = String(options.quality);
    menuBody.querySelector('#palette').value = options.palette;
    function range(id, key, output, onChange = () => {}) {
      menuBody.querySelector(id).addEventListener('input', e => {
        options[key] = Number(e.target.value);
        menuBody.querySelector(output).textContent = key === 'sensitivity' ? options[key].toFixed(1) : options[key];
        onChange();
      });
    }
    range('#sensitivity', 'sensitivity', '#sens-out');
    range('#fov', 'fov', '#fov-out', () => { camera.fov = options.fov; camera.updateProjectionMatrix(); });
    range('#draw-distance', 'drawDistance', '#distance-out', () => { camera.far = options.drawDistance; camera.updateProjectionMatrix(); });
    menuBody.querySelector('#quality').addEventListener('change', e => { options.quality = Number(e.target.value); renderer.setResolution(options.quality); });
    menuBody.querySelector('#palette').addEventListener('change', e => { options.palette = e.target.value; renderer.setPalette(options.palette); });
    return;
  }
  menuBody.innerHTML = '<div class="empty-panel">NOTHING HERE YET.</div>' + menuButtons([['Back', 'main']]);
}
function openMenu() {
  paused=true; menuHintSeen=true; keys.clear(); menu.hidden=false; updateTutorial();
  unlockPointer(); renderMenu();
}
function closeMenu() {
  paused=false; menu.hidden=true; keys.clear(); updateTutorial();
  // Must be triggered from the user's menu click or ESC key to reacquire.
  canvas.requestPointerLock?.();
}
function leaveWorld() {
  quit = true; paused = false; menu.hidden = true; titleScreen.hidden = false;
  keys.clear(); unlockPointer(); socket?.close(); socket = null; coords.hidden = true; updateTutorial();
}
menuBody.addEventListener('click', e => {
  const action = e.target.closest('button')?.dataset.action;
  if (!action) return;
  if (action === 'resume') closeMenu();
  else if (action === 'quit') leaveWorld();
  else renderMenu(action);
});
titleScreen.querySelector('button').addEventListener('click', () => {
  quit = false; titleScreen.hidden = true; coords.hidden = false;
  player.position.set(0, terrainHeight(0,0), 0); velocityY=0; grounded=true; updateTutorial(); connect();
});

// Networking: Render is the authoritative shared room only for player coordinates.
const explicit = new URLSearchParams(location.search).get('server');
const local = ['localhost','127.0.0.1'].includes(location.hostname);
const endpoint = explicit || (local ? 'ws://localhost:3001' : 'wss://fuck-world.onrender.com');
let socket = null, playerId = null, reconnectHandle = null;
function connect() {
  if (quit) return;
  socket = new WebSocket(endpoint);
  socket.onmessage = e => {
    let msg; try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type === 'welcome') { playerId = msg.id; return; }
    if (msg.type !== 'state' || !Array.isArray(msg.players)) return;
    const seen = new Set();
    for (const p of msg.players) {
      if (p.id === playerId || typeof p.id !== 'string' || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
      seen.add(p.id);
      let figure = peers.get(p.id);
      if (!figure) { figure = makeHuman(); peers.set(p.id, figure); scene.add(figure); }
      const ox = figure.position.x, oz = figure.position.z;
      figure.position.set(p.x, Number.isFinite(p.y)?p.y:0, p.z);
      if (Math.hypot(p.x - ox, p.z - oz) > .02) figure.rotation.y = Math.atan2(p.x - ox, p.z - oz);
    }
    for (const [id, figure] of peers) if (!seen.has(id)) { removeHuman(figure); peers.delete(id); }
  };
  socket.onclose = () => {
    for (const fig of peers.values()) removeHuman(fig);
    peers.clear(); playerId = null;
    if (!quit) reconnectHandle = setTimeout(connect, 3000);
  };
  socket.onerror = () => {}; // Free Render service may be asleep.
}
connect();

let lastTime = performance.now(), lastSent = 0, step = 0, lastMap = 0, lastDraw = 0;
function renderMinimap(){
  const c=minimapCtx,w=minimap.width,h=minimap.height;
  const range=105,scale=w/(range*2);
  const centerX=player.position.x,centerZ=player.position.z;
  c.fillStyle='#0a1820';c.fillRect(0,0,w,h);
  // Altitude shading on a small coarse grid is independent from the 3D renderer.
  const tiles=22,tile=w/tiles;
  for(let iz=0;iz<tiles;iz++)for(let ix=0;ix<tiles;ix++){
    const x=centerX+(ix+.5-tiles/2)*range*2/tiles;
    const z=centerZ+(iz+.5-tiles/2)*range*2/tiles;
    const height=terrainHeight(x,z);
    const green=Math.max(32,Math.min(87,68+height*3));
    c.fillStyle='rgb('+Math.round(30+height*1.2)+','+Math.round(green)+','+Math.round(54+height*1.3)+')';
    c.fillRect(ix*tile,iz*tile,Math.ceil(tile),Math.ceil(tile));
  }
  // Draw stable tree candidates; no trees inside the spawn clearing.
  const minX=Math.floor((centerX-range)/FOREST_CELL),maxX=Math.ceil((centerX+range)/FOREST_CELL);
  const minZ=Math.floor((centerZ-range)/FOREST_CELL),maxZ=Math.ceil((centerZ+range)/FOREST_CELL);
  c.fillStyle='#a0d5a2';
  for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
    const t=treeAt(x,z);if(!t)continue;
    const px=w/2+(t.x-centerX)*scale,py=h/2+(t.z-centerZ)*scale;
    if(px<2||py<2||px>w-2||py>h-2)continue;
    c.fillRect(px-1,py-1,2,2);
  }
  const bx=w/2+(8-centerX)*scale,bz=h/2+(-12-centerZ)*scale;
  c.fillStyle='#d8dde2';c.fillRect(bx-4*scale,bz-4*scale,8*scale,8*scale);
  for(const other of peers.values()){
    const x=w/2+(other.position.x-centerX)*scale,y=h/2+(other.position.z-centerZ)*scale;
    c.fillStyle='#f0bb69';c.beginPath();c.arc(x,y,2.9,0,Math.PI*2);c.fill();
  }
  c.save();c.translate(w/2,h/2);c.rotate(-yaw);
  c.fillStyle='#ffda77';c.beginPath();c.moveTo(0,-7);c.lineTo(-5,5);c.lineTo(5,5);c.closePath();c.fill();
  c.restore();
  c.strokeStyle='#9fb9a0';c.strokeRect(.5,.5,w-1,h-1);
}
let velocityY = 0, grounded = true;
updateTutorial();
function resize() {
  renderer.resize();
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastTime) / 1000 || 0); lastTime = now;
  if (!paused && !quit) {
    const f = Number(keys.has('w') || keys.has('arrowup')) - Number(keys.has('s') || keys.has('arrowdown'));
    const s = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
    const norm = Math.hypot(f, s) || 1, speed = keys.has('shift') ? 16 : 7;
    // Forward is opposite the camera offset. Right is its positive right vector.
    const mx = (-Math.sin(yaw) * f + Math.cos(yaw) * s) / norm;
    const mz = (-Math.cos(yaw) * f - Math.sin(yaw) * s) / norm;
    const moving = f !== 0 || s !== 0;
    if (moving) {
      const x = player.position.x + mx * speed * dt;
      const z = player.position.z + mz * speed * dt;
      if (canStand(x, player.position.z)) player.position.x = x;
      if (canStand(player.position.x, z)) player.position.z = z;
      player.rotation.y = Math.atan2(mx, mz);
      step += dt * speed * 1.8;
    }
    const groundY=terrainHeight(player.position.x, player.position.z);
    if (!grounded) {
      velocityY -= 19 * dt;
      player.position.y += velocityY * dt;
      if(player.position.y <= groundY){player.position.y=groundY;velocityY=0;grounded=true;}
    } else {
      player.position.y=groundY;
    }
    forest.update(player.position.x, player.position.z);
    const swing = moving && grounded ? Math.sin(step) * .48 : 0;
    for (let i = 0; i < 2; i++) {
      player.userData.legs[i].rotation.x = (i ? 1 : -1) * swing;
      player.userData.arms[i].rotation.x = (i ? -1 : 1) * swing * .7;
    }
  }
  const eyeY = player.position.y + 2.14;
  const firstPerson = distance <= 1.1;
  player.visible = !firstPerson;
  if (firstPerson) {
    camera.position.set(player.position.x, eyeY, player.position.z);
    camera.lookAt(player.position.x - Math.sin(yaw) * Math.cos(pitch),
      eyeY - Math.sin(pitch), player.position.z - Math.cos(yaw) * Math.cos(pitch));
  } else {
    camera.position.set(
      player.position.x + Math.sin(yaw) * distance * Math.cos(pitch),
      eyeY + Math.sin(pitch) * distance,
      player.position.z + Math.cos(yaw) * distance * Math.cos(pitch));
    camera.lookAt(player.position.x, player.position.y + 1.45, player.position.z);
  }

  if (!quit && socket?.readyState === WebSocket.OPEN && now - lastSent > 70) {
    socket.send(JSON.stringify({ type: 'move', x: player.position.x, y: player.position.y, z: player.position.z }));
    lastSent = now;
  }
  coords.textContent = `X ${player.position.x.toFixed(1)}  Y ${player.position.y.toFixed(1)}  Z ${player.position.z.toFixed(1)}`;
  if(now-lastMap>160){renderMinimap();lastMap=now;}
  // Physics/input update at display refresh rate, expensive glyph raster at ~30 FPS.
  if(now-lastDraw<32)return;
  lastDraw=now;
  try {
    renderer.draw();
    if(renderDebug && showDebug)renderDebug.textContent =
      'ASCII '+renderer.cols+'x'+renderer.rows+
      ' | registered meshes '+renderer.meshCount+
      ' | visible surface samples '+renderer.visibleSamples+
      ' | camera '+camera.position.x.toFixed(1)+','+camera.position.y.toFixed(1)+','+camera.position.z.toFixed(1);
    const boot=document.getElementById('boot-status');
    if(boot)boot.hidden=true;
  } catch(error) {
    console.error('ASCII renderer failure',error);
    const boot=document.getElementById('boot-status');
    if(boot){boot.hidden=false;boot.style.background='#421d20';boot.textContent='RENDER ERROR: '+(error?.message||String(error));}
  }
}
requestAnimationFrame(frame);
