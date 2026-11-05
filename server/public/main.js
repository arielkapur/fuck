import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { AsciiRenderer } from './ascii.js';
import { terrainHeight, treeAt, FOREST_CELL } from './terrain.js';
import { createForest } from './forest.js';
import { createGoblinCamp } from './camp.js';
import { createCartography } from './cartography.js';

// FUCK / World 001 · Patch 002: ASCII-first world. The scene and input stay client-side.
// The existing WebSocket server relays positions; it does not render objects.
const HALF_WORLD = 4096;
const canvasHost = document.getElementById('world');
const coords = document.getElementById('coords');
const minimap = document.getElementById('minimap');
const mapCanvas=document.getElementById('world-map');
const cartography=createCartography();
let mapSpan=420, lastExplore=0;
let activeTab='inventory', punchStarted=-100;
const tutorial = document.getElementById('tutorial');
let tutorialEnabled = true, menuHintSeen = false, attackHintSeen = false;
try { tutorialEnabled = localStorage.getItem('fuck:tutorial') !== 'off'; } catch {}
function updateTutorial(){
  if(!tutorial)return;
  tutorial.hidden=!tutorialEnabled||quit||paused||(menuHintSeen&&attackHintSeen);
  const esc=document.getElementById('hint-menu'),attack=document.getElementById('hint-attack');
  if(esc)esc.hidden=menuHintSeen;
  if(attack)attack.hidden=!menuHintSeen||attackHintSeen;
}
function toggleTutorial(){
  tutorialEnabled=!tutorialEnabled;
  if(tutorialEnabled) { menuHintSeen=false; attackHintSeen=false; }
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

// Silhouette-first humanoid: cylindrical bones, plain oval face, no anatomy.
const black=new THREE.MeshLambertMaterial({color:0x12151a});
const headGeometry=new THREE.SphereGeometry(1,12,10);
const limbGeometry=new THREE.CylinderGeometry(1,1,1,9);
function makeHuman(){
  const body=new THREE.Group(),meshes=[],arms=[],legs=[];
  function part(parent,geo,x,y,z,sx,sy,sz){
    const mesh=new THREE.Mesh(geo,black);
    mesh.userData.asciiType=8;
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    parent.add(mesh);meshes.push(mesh);renderer.register(mesh,310,680);
    return mesh;
  }
  // Exactly one smooth, featureless head.
  part(body,headGeometry,0,2.12,0,.23,.28,.21);
  part(body,limbGeometry,0,1.88,0,.10,.26,.10);   // neck
  part(body,limbGeometry,0,1.46,0,.27,.72,.19);   // straight torso
  part(body,headGeometry,0,1.06,0,.25,.18,.18);   // hip joint
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.30,1.75,0);body.add(arm);
    part(arm,headGeometry,0,-.05,0,.13,.14,.13);
    part(arm,limbGeometry,0,-.35,0,.095,.52,.098);
    part(arm,headGeometry,0,-.62,0,.10,.10,.10);
    part(arm,limbGeometry,0,-.83,0,.077,.39,.078);
    part(arm,headGeometry,0,-1.06,0,.095,.12,.085);
    arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.17,.98,0);body.add(leg);
    part(leg,headGeometry,0,-.02,0,.14,.14,.14);
    part(leg,limbGeometry,0,-.24,0,.13,.42,.13);
    part(leg,headGeometry,0,-.46,0,.12,.11,.12);
    part(leg,limbGeometry,0,-.68,0,.10,.36,.10);
    // Toes point in +Z: this is the character's forward axis.
    part(leg,headGeometry,0,-.90,.09,.13,.10,.23);
    legs.push(leg);
  }
  body.userData={arms,legs,meshes};
  return body;
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
const camp=createGoblinCamp(scene,renderer);
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
canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||paused||quit)return;
  if(document.pointerLockElement===canvas){
    const now=performance.now()/1000;
    if(now-punchStarted>.42){
      punchStarted=now;
      attackHintSeen=true;updateTutorial();
    }
  }
});
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
  if (e.code === 'F3') {e.preventDefault();showDebug=!showDebug;if(renderDebug)renderDebug.hidden=!showDebug;return;}
  if (e.code === 'KeyT'&&!e.repeat){e.preventDefault();toggleTutorial();return;}
  if (e.code === 'KeyM'){
    e.preventDefault();if(quit)return;
    if(paused&&activeTab==='map')closeMenu();else openMenu('map',false);
    return;
  }
  if (e.key === 'Escape'){
    e.preventDefault();if(quit)return;
    if(paused)closeMenu();else openMenu('inventory',true);
    return;
  }
  if(paused||quit)return;
  const k=e.key.toLowerCase();keys.add(k);
  if(k.startsWith('arrow')||e.code==='Space')e.preventDefault();
  if(e.code==='Space'&&!e.repeat&&grounded){velocityY=7.7;grounded=false;}
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const tabs=[['Inventory','inventory'],['Character','character'],['Skills','skills'],['Map','map'],['Settings','settings']];
const tabsEl=document.getElementById('menu-tabs');
tabsEl.innerHTML=tabs.map(([label,id])=>'<button class="tab" data-tab="'+id+'">'+label+'</button>').join('')+
  '<span class="tab-spacer"></span><button class="tab" data-tab="resume">Resume</button>'+
  '<button class="tab quit-tab" data-tab="quit">Quit</button>';
function renderMenu(page='inventory'){
  activeTab=page;
  tabsEl.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===page));
  menuTitle.textContent=page.toUpperCase();
  if(page==='map'){
    menuBody.innerHTML='<div class="map-controls"><span>DISCOVERED WORLD · CAMERA VISIBILITY</span>'+
      '<button data-zoom="in">+</button><button data-zoom="out">−</button></div>';
    menuBody.appendChild(mapCanvas);
    mapCanvas.hidden=false;renderWorldMap();return;
  }
  mapCanvas.hidden=true;
  if(page==='settings'){
    menuBody.innerHTML=`
      <label>SENSITIVITY <output id="sens-out">${options.sensitivity.toFixed(1)}</output>
        <input id="sensitivity" type="range" min=".2" max="3" step=".1" value="${options.sensitivity}"></label>
      <label>FIELD OF VIEW <output id="fov-out">${options.fov}</output>
        <input id="fov" type="range" min="55" max="100" step="1" value="${options.fov}"></label>
      <label>VIEW DISTANCE <output id="distance-out">${options.drawDistance}</output>
        <input id="draw-distance" type="range" min="250" max="1500" step="50" value="${options.drawDistance}"></label>
      <label>ASCII CHARACTER SIZE <select id="quality">
        <option value="7.5">ULTRA / 7.5 PX</option><option value="9">DENSE / 9 PX</option>
        <option value="10.5">STANDARD 2X / 10.5 PX</option><option value="12">BALANCED / 12 PX</option>
        <option value="15">CLASSIC / 15 PX</option><option value="18">PERFORMANCE / 18 PX</option></select></label>
      <label>ASCII PALETTE <select id="palette">
        <option value="color">COLOURED</option><option value="mono">MONOCHROME</option></select></label>`;
    menuBody.querySelector('#quality').value=String(options.quality);
    menuBody.querySelector('#palette').value=options.palette;
    for(const [id,key,output,fn] of [
      ['#sensitivity','sensitivity','#sens-out',()=>{}],
      ['#fov','fov','#fov-out',()=>{camera.fov=options.fov;camera.updateProjectionMatrix();}],
      ['#draw-distance','drawDistance','#distance-out',()=>{camera.far=options.drawDistance;camera.updateProjectionMatrix();}]
    ])menuBody.querySelector(id).addEventListener('input',e=>{
      options[key]=Number(e.target.value);
      menuBody.querySelector(output).textContent=key==='sensitivity'?options[key].toFixed(1):options[key];
      fn();
    });
    menuBody.querySelector('#quality').addEventListener('change',e=>{
      options.quality=Number(e.target.value);renderer.setResolution(options.quality);
    });
    menuBody.querySelector('#palette').addEventListener('change',e=>{
      options.palette=e.target.value;renderer.setPalette(options.palette);
    });
    return;
  }
  menuBody.innerHTML='<div class="empty-panel">NOTHING HERE YET.</div>';
}
function renderWorldMap(){
  if(activeTab!=='map')return;
  cartography.draw(mapCanvas,player.position,peers,yaw,mapSpan);
}
function openMenu(page='inventory',acknowledge=false){
  if(acknowledge)menuHintSeen=true;
  paused=true;keys.clear();menu.hidden=false;
  updateTutorial();unlockPointer();renderMenu(page);
}
function closeMenu(){
  paused=false;menu.hidden=true;keys.clear();updateTutorial();
  canvas.requestPointerLock?.();
}
function leaveWorld(){
  quit=true;paused=false;menu.hidden=true;titleScreen.hidden=false;
  keys.clear();unlockPointer();socket?.close();socket=null;coords.hidden=true;
  minimap.hidden=true;cartography.save();updateTutorial();
}
tabsEl.addEventListener('click',e=>{
  const action=e.target.closest('button')?.dataset.tab;
  if(!action)return;
  if(action==='resume')closeMenu();
  else if(action==='quit')leaveWorld();
  else renderMenu(action);
});
menuBody.addEventListener('click',e=>{
  const zoom=e.target.closest('button')?.dataset.zoom;
  if(zoom){mapSpan=Math.max(160,Math.min(1600,mapSpan*(zoom==='in'?.7:1.4)));renderWorldMap();}
});
titleScreen.querySelector('button').addEventListener('click', () => {
  quit = false; titleScreen.hidden = true; coords.hidden = false;minimap.hidden=false;
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
function renderMinimap(){cartography.draw(minimap,player.position,peers,yaw,220);}
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
      // Our featureless character's feet point along +Z, matching this heading.
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
    // A deliberately casual hand-wave/punch, not a martial-arts animation.
    const attackAge=now/1000-punchStarted;
    if(attackAge>=0&&attackAge<.42){
      const wave=Math.sin(Math.PI*attackAge/.42);
      player.userData.arms[1].rotation.x=-1.85*wave;
      player.userData.arms[1].rotation.z=-.32*wave;
    }else player.userData.arms[1].rotation.z=0;
    camp.animate(now/1000);
  }
  const eyeY = player.position.y + 2.14;
  const firstPerson = distance <= 1.1;
  player.visible = !firstPerson;
  if (firstPerson) {
    camera.position.set(player.position.x, eyeY, player.position.z);
    camera.lookAt(player.position.x - Math.sin(yaw) * Math.cos(pitch),
      eyeY - Math.sin(pitch), player.position.z - Math.cos(yaw) * Math.cos(pitch));
  } else {
    // March the desired camera path towards the player until the ground blocks it;
    // the camera moves inward instead of clipping under the heightfield.
    const origin=new THREE.Vector3(player.position.x,eyeY,player.position.z);
    const desired=new THREE.Vector3(
      player.position.x+Math.sin(yaw)*distance*Math.cos(pitch),
      eyeY+Math.sin(pitch)*distance,
      player.position.z+Math.cos(yaw)*distance*Math.cos(pitch));
    const dir=desired.clone().sub(origin);
    let safe=1,prev=0;
    for(let i=1;i<=24;i++){
      const t=i/24,p=origin.clone().addScaledVector(dir,t);
      if(p.y<terrainHeight(p.x,p.z)+.65){safe=prev;break;}
      prev=t;
    }
    camera.position.copy(origin).addScaledVector(dir,safe);
    camera.position.y=Math.max(camera.position.y,terrainHeight(camera.position.x,camera.position.z)+.65);
    camera.lookAt(player.position.x,player.position.y+1.45,player.position.z);
  }

  if (!quit && socket?.readyState === WebSocket.OPEN && now - lastSent > 70) {
    socket.send(JSON.stringify({ type: 'move', x: player.position.x, y: player.position.y, z: player.position.z }));
    lastSent = now;
  }
  coords.textContent = `X ${player.position.x.toFixed(1)}  Y ${player.position.y.toFixed(1)}  Z ${player.position.z.toFixed(1)}`;
  if(now-lastExplore>280&&!quit&&!paused){
    cartography.discover(player.position.x,player.position.z,camera);
    lastExplore=now;
  }
  if(now-lastMap>160){renderMinimap();if(activeTab==='map'&&paused)renderWorldMap();lastMap=now;}
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
