import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// FUCK / World 001 · first patch. The scene and input stay client-side.
// The existing WebSocket server relays positions; it does not render objects.
const HALF_WORLD = 4096;
const canvasHost = document.getElementById('world');
const coords = document.getElementById('coords');
const menu = document.getElementById('menu');
const menuPanel = document.getElementById('menu-panel');
const menuTitle = document.getElementById('menu-title');
const menuBody = document.getElementById('menu-body');
const titleScreen = document.getElementById('title-screen');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
canvasHost.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2e3);
scene.fog = new THREE.Fog(0xa6c7d3, 210, 900);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 1900);
scene.add(new THREE.HemisphereLight(0xe1efff, 0x485252, 2.25));
const sunLight = new THREE.DirectionalLight(0xffead0, 2.1);
sunLight.position.set(-130, 220, -180);
scene.add(sunLight);

// Low-cost sky gradient dome, with a static sun disk.
const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: 'varying vec3 ray; void main(){ ray=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: 'varying vec3 ray; void main(){ float y=normalize(ray).y; vec3 horizon=vec3(.67,.82,.87); vec3 high=vec3(.075,.23,.43); vec3 low=vec3(.32,.44,.48); vec3 col=mix(horizon,high,smoothstep(-.08,.85,y)); col=mix(low,col,smoothstep(-.20,.02,y)); gl_FragColor=vec4(col,1.); }'
}));
sky.frustumCulled = false; scene.add(sky);
const sunDisk = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffedc0, fog: false }));
sunDisk.position.set(-650, 520, -1000); sky.add(sunDisk);

// One concrete plane across the full world. No procedural scenery or streaming.
const texCanvas = document.createElement('canvas');
texCanvas.width = texCanvas.height = 128;
const tctx = texCanvas.getContext('2d');
tctx.fillStyle = '#424447'; tctx.fillRect(0, 0, 128, 128);
const imageData = tctx.getImageData(0, 0, 128, 128);
for (let i = 0; i < imageData.data.length; i += 4) {
  const n = ((i * 13 + (i >>> 7) * 17) % 13) - 6;
  imageData.data[i] += n;
  imageData.data[i + 1] += n;
  imageData.data[i + 2] += n;
}
tctx.putImageData(imageData, 0, 0);
const concrete = new THREE.CanvasTexture(texCanvas);
concrete.wrapS = concrete.wrapT = THREE.RepeatWrapping;
concrete.repeat.set(256, 256);
concrete.colorSpace = THREE.SRGBColorSpace;
concrete.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(HALF_WORLD * 2, HALF_WORLD * 2),
  new THREE.MeshStandardMaterial({ map: concrete, color: 0xb9b9b9, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.035; scene.add(ground);

// Fully joined black stick figures: every limb terminates at a joint.
const black = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .85 });
function makeStickman() {
  const body = new THREE.Group();
  const jointGeo = new THREE.SphereGeometry(.105, 10, 8);
  const boneGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
  const sphere = (x, y, z, radius) => {
    const joint = new THREE.Mesh(jointGeo, black);
    joint.scale.setScalar(radius / .105); joint.position.set(x, y, z); body.add(joint);
  };
  const bone = (from, to, radius = .085) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const segment = new THREE.Mesh(boneGeo, black);
    segment.position.copy(a).add(b).multiplyScalar(.5);
    segment.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    segment.scale.set(radius, a.distanceTo(b), radius);
    body.add(segment);
  };
  const rig = [];
  const limb = (start, endpoint, radius) => {
    const pivot = new THREE.Group(); pivot.position.set(...start); body.add(pivot);
    const mesh = new THREE.Mesh(boneGeo, black);
    const end = new THREE.Vector3(...endpoint); const origin = new THREE.Vector3();
    mesh.position.copy(end).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().normalize());
    mesh.scale.set(radius, end.length(), radius); pivot.add(mesh);
    const tip = new THREE.Mesh(jointGeo, black);
    tip.position.copy(end); tip.scale.setScalar(radius / .105); pivot.add(tip);
    return pivot;
  };
  bone([0, .95, 0], [0, 1.85, 0], .105);
  sphere(0, .95, 0, .15); sphere(0, 1.85, 0, .16);
  sphere(0, 2.18, 0, .245);
  bone([0, 1.85, 0], [0, 1.99, 0], .085);
  // Shoulder bar bridges the arms; hip bar bridges the legs.
  bone([-.26, 1.81, 0], [.26, 1.81, 0], .088);
  bone([-.17, .95, 0], [.17, .95, 0], .09);
  for (const side of [-1, 1]) {
    const arm = limb([side * .26, 1.81, 0], [side * .21, -.74, 0], .076);
    arm.rotation.z = side * .07;
    const leg = limb([side * .17, .95, 0], [side * .14, -.91, 0], .09);
    rig.push({ arm, leg });
  }
  body.userData.rig = rig;
  return body;
}
const player = makeStickman(); scene.add(player);
const peers = new Map();

// Static spawn structures. Building front faces the spawn, with a walk-in door.
const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x727478, roughness: 1 });
const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x323436, roughness: 1 });
const colliders = [];
function block(x, y, z, w, h, d, material = buildingMaterial, solid = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); scene.add(mesh);
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
const npc = makeStickman(); npc.position.set(BX, .12, BZ - 1.3); npc.rotation.y = Math.PI; scene.add(npc);
const interiorLight = new THREE.PointLight(0xffeac8, 32, 12);
interiorLight.position.set(BX, 3.8, BZ); scene.add(interiorLight);

// One intentionally simple tree beside the building.
const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.32, .45, 4, 8), new THREE.MeshStandardMaterial({ color: 0x604536 }));
trunk.position.set(BX + 8, 2, BZ + 1); scene.add(trunk);
const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.0, 7, 8), new THREE.MeshStandardMaterial({ color: 0x2f553e, roughness: 1, flatShading: true }));
leaves.position.set(BX + 8, 6, BZ + 1); scene.add(leaves);
colliders.push({ minX: BX + 7.4, maxX: BX + 8.6, minZ: BZ + .4, maxZ: BZ + 1.6 });
function canStand(x, z) {
  if (Math.abs(x) >= HALF_WORLD - 1 || Math.abs(z) >= HALF_WORLD - 1) return false;
  const radius = .27;
  return !colliders.some(c => x + radius > c.minX && x - radius < c.maxX &&
                                   z + radius > c.minZ && z - radius < c.maxZ);
}

// Input/camera. Mouse cursor is hidden by CSS only during active gameplay.
const keys = new Set();
const options = { sensitivity: 1, fov: 70, drawDistance: 900, quality: 2 };
let yaw = -.38, pitch = .35, distance = 9, savedDistance = 9;
let dragging = false, lastX = 0, lastY = 0, paused = false, quit = false;
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', e => {
  if (paused || quit) return;
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', () => dragging = false);
canvas.addEventListener('pointercancel', () => dragging = false);
canvas.addEventListener('pointermove', e => {
  if (!dragging || paused || quit) return;
  yaw -= (e.clientX - lastX) * .006 * options.sensitivity;
  pitch = THREE.MathUtils.clamp(pitch + (e.clientY - lastY) * .005 * options.sensitivity, -.85, 1.25);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', e => {
  if (paused || quit) return;
  e.preventDefault();
  distance = THREE.MathUtils.clamp(distance + e.deltaY * .015, 0, 36);
  if (distance > 1.1) savedDistance = distance;
}, { passive: false });
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (quit) return;
    if (paused) closeMenu(); else openMenu();
    return;
  }
  if (paused || quit) return;
  const k = e.key.toLowerCase(); keys.add(k);
  if (k.startsWith('arrow') || k === ' ') e.preventDefault();
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
      <label>RENDER RESOLUTION <select id="quality">
        <option value="1">LOW</option><option value="1.5">MEDIUM</option><option value="2">HIGH</option>
      </select></label>
      ${menuButtons([['Back','main']])}`;
    menuBody.querySelector('#quality').value = String(options.quality);
    function range(id, key, output, onChange = () => {}) {
      menuBody.querySelector(id).addEventListener('input', e => {
        options[key] = Number(e.target.value);
        menuBody.querySelector(output).textContent = key === 'sensitivity' ? options[key].toFixed(1) : options[key];
        onChange();
      });
    }
    range('#sensitivity', 'sensitivity', '#sens-out');
    range('#fov', 'fov', '#fov-out', () => { camera.fov = options.fov; camera.updateProjectionMatrix(); });
    range('#draw-distance', 'drawDistance', '#distance-out', () => { scene.fog.far = options.drawDistance; camera.far = options.drawDistance + 100; camera.updateProjectionMatrix(); });
    menuBody.querySelector('#quality').addEventListener('change', e => { options.quality = Number(e.target.value); resize(); });
    return;
  }
  menuBody.innerHTML = '<div class="empty-panel">NOTHING HERE YET.</div>' + menuButtons([['Back', 'main']]);
}
function openMenu() { paused = true; dragging = false; keys.clear(); menu.hidden = false; renderMenu(); }
function closeMenu() { paused = false; menu.hidden = true; keys.clear(); }
function leaveWorld() {
  quit = true; paused = false; menu.hidden = true; titleScreen.hidden = false;
  keys.clear(); socket?.close(); socket = null; coords.hidden = true;
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
  player.position.set(0, 0, 0); connect();
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
      if (!figure) { figure = makeStickman(); peers.set(p.id, figure); scene.add(figure); }
      const ox = figure.position.x, oz = figure.position.z;
      figure.position.set(p.x, 0, p.z);
      if (Math.hypot(p.x - ox, p.z - oz) > .02) figure.rotation.y = Math.atan2(p.x - ox, p.z - oz);
    }
    for (const [id, figure] of peers) if (!seen.has(id)) { scene.remove(figure); peers.delete(id); }
  };
  socket.onclose = () => {
    for (const fig of peers.values()) scene.remove(fig);
    peers.clear(); playerId = null;
    if (!quit) reconnectHandle = setTimeout(connect, 3000);
  };
  socket.onerror = () => {}; // Free Render service may be asleep.
}
connect();

let lastTime = performance.now(), lastSent = 0, step = 0;
function resize() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, options.quality));
  renderer.setSize(innerWidth, innerHeight);
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
    const swing = moving ? Math.sin(step) * .48 : 0;
    for (let i = 0; i < 2; i++) {
      player.userData.rig[i].leg.rotation.x = (i ? 1 : -1) * swing;
      player.userData.rig[i].arm.rotation.x = (i ? -1 : 1) * swing * .7;
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
  sky.position.copy(camera.position);
  if (!quit && socket?.readyState === WebSocket.OPEN && now - lastSent > 70) {
    socket.send(JSON.stringify({ type: 'move', x: player.position.x, z: player.position.z }));
    lastSent = now;
  }
  coords.textContent = `X ${player.position.x.toFixed(1)}  Y ${player.position.y.toFixed(1)}  Z ${player.position.z.toFixed(1)}`;
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
