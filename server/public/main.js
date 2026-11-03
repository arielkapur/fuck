import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

// The browser draws the world. The Node server only relays player positions.
const WORLD_HALF = 4096; // 8.192 km by 8.192 km
const view = document.querySelector('#world');
const status = document.querySelector('#status');
const coords = document.querySelector('#coords');
const renderer = new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa2d2e3);
scene.fog = new THREE.Fog(0x9ebfd0, 150, 850);
const camera = new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,2000);
scene.add(new THREE.HemisphereLight(0xcbeaff,0x35514b,2.0));
const sunlight = new THREE.DirectionalLight(0xffeacb,2.5);
sunlight.position.set(-130,220,-190);scene.add(sunlight);

// A sky dome follows the camera, so the horizon never runs out.
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(1600,32,16),
  new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vDirection; void main(){ vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader:'varying vec3 vDirection; void main(){ float h=normalize(vDirection).y; vec3 horizon=vec3(0.67,0.82,0.87); vec3 zenith=vec3(0.075,0.23,0.43); vec3 ground=vec3(0.32,0.44,0.48); vec3 c=mix(horizon,zenith,smoothstep(-0.08,0.85,h)); c=mix(ground,c,smoothstep(-0.20,0.02,h)); gl_FragColor=vec4(c,1.0); }'
  })
);
sky.frustumCulled=false;scene.add(sky);
const sun = new THREE.Mesh(new THREE.SphereGeometry(50,16,12),new THREE.MeshBasicMaterial({color:0xffedc0,fog:false}));
sky.add(sun);sun.position.set(-650,520,-1000);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_HALF*2,WORLD_HALF*2),
  new THREE.MeshLambertMaterial({color:0x476d5f})
);
ground.rotation.x=-Math.PI/2;scene.add(ground);

// Only draw the nearby grid, keeping the enormous world cheap.
const grid = new THREE.GridHelper(400,40,0x7fa9a0,0x577d70);
grid.position.y=.018;scene.add(grid);

function stickFigure(color) {
  const figure = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.12,roughness:.7});
  const bone = new THREE.CylinderGeometry(.075,.075,1,7);
  function segment(parent,x,y,z,length,radius=.075) {
    const mesh = new THREE.Mesh(bone,mat);
    mesh.scale.set(radius/.075,length,radius/.075);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  segment(figure,0,1.46,0,.96,.10);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24,12,9),mat);
  head.position.y=2.22;figure.add(head);
  const arms=[],legs=[];
  for(const side of [-1,1]) {
    const arm = new THREE.Group();arm.position.set(side*.19,1.88,0);
    segment(arm,side*.15,-.34,0,.70);
    arm.rotation.z=-side*.32;figure.add(arm);arms.push(arm);
    const leg = new THREE.Group();leg.position.set(side*.14,.98,0);
    segment(leg,0,-.47,0,.94,.09);figure.add(leg);legs.push(leg);
  }
  figure.userData = {arms,legs};
  return figure;
}
const self = stickFigure(0x7cf5f2);
scene.add(self);
const peers = new Map();

function hash(x,z,i){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(i+19,2246822519);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;}
const chunkSize=128,chunkRadius=3;
const pillarGeometry=new THREE.CylinderGeometry(.6,1.2,1,5);
const pillarMaterial=new THREE.MeshStandardMaterial({color:0x668d8d,roughness:1,flatShading:true});
const rocks = new THREE.InstancedMesh(pillarGeometry,pillarMaterial,2200);
rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
rocks.frustumCulled=false;scene.add(rocks);
const dummy=new THREE.Object3D();
let lastChunkX=Infinity,lastChunkZ=Infinity;
function updateScenery() {
  const cx=Math.floor(self.position.x/chunkSize),cz=Math.floor(self.position.z/chunkSize);
  if(cx===lastChunkX&&cz===lastChunkZ)return;
  lastChunkX=cx;lastChunkZ=cz;let count=0;
  for(let dz=-chunkRadius;dz<=chunkRadius;dz++)for(let dx=-chunkRadius;dx<=chunkRadius;dx++){
    const a=cx+dx,b=cz+dz;
    for(let i=0;i<17;i++){
      const x=(a+hash(a,b,i*3)) * chunkSize, z=(b+hash(a,b,i*3+1))*chunkSize;
      if(Math.abs(x)>WORLD_HALF-12||Math.abs(z)>WORLD_HALF-12||Math.hypot(x,z)<16)continue;
      const height=2+hash(a,b,i*3+2)*17;
      dummy.position.set(x,height*.5,z);
      const w=.8+hash(a,b,i+100)*2.4;
      dummy.scale.set(w,height,w);
      dummy.rotation.set(0,hash(a,b,i+200)*Math.PI*2,0);
      dummy.updateMatrix();rocks.setMatrixAt(count++,dummy.matrix);
    }
  }
  rocks.count=count;rocks.instanceMatrix.needsUpdate=true;
}

const keys=new Set();
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if(k.startsWith('arrow')||k===' ')e.preventDefault()});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
addEventListener('blur',()=>keys.clear());
let yaw=.65,pitch=.46,distance=12,drag=false,px=0,py=0;
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>drag=false);
canvas.addEventListener('pointercancel',()=>drag=false);
canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-px)*.006;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-py)*.005,.12,1.25);px=e.clientX;py=e.clientY});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.014,5,35)},{passive:false});

const qp=new URLSearchParams(location.search);
const localHost=['localhost','127.0.0.1'].includes(location.hostname);
const defaultWs=localHost?'ws://localhost:3001':location.hostname==='fuck-world.onrender.com'?'wss://fuck-world.onrender.com':'wss://fuck-world.onrender.com';
const endpoint=qp.get('server')||defaultWs;
let socket,id=null;
function connect() {
  socket=new WebSocket(endpoint);status.textContent='Connecting to world…';
  socket.onopen=()=>status.textContent='Connected';
  socket.onerror=()=>status.textContent='Connection error';
  socket.onclose=()=>{
    status.textContent='Reconnecting (free server may be waking up)…';
    for(const figure of peers.values())scene.remove(figure);
    peers.clear();setTimeout(connect,3000);
  };
  socket.onmessage=e=>{
    let msg;try{msg=JSON.parse(e.data)}catch{return}
    if(msg.type==='welcome'){id=msg.id;return}
    if(msg.type!=='state'||!Array.isArray(msg.players))return;
    const visible=new Set();
    for(const p of msg.players){
      if(p.id===id||typeof p.id!=='string'||!Number.isFinite(p.x)||!Number.isFinite(p.z))continue;
      visible.add(p.id);
      let figure=peers.get(p.id);
      if(!figure){figure=stickFigure(0xffbd83);peers.set(p.id,figure);scene.add(figure)}
      const ox=figure.position.x,oz=figure.position.z;
      figure.position.set(p.x,0,p.z);
      if(Math.hypot(p.x-ox,p.z-oz)>.001)figure.rotation.y=Math.atan2(p.x-ox,p.z-oz);
    }
    for(const [pid,figure] of peers)if(!visible.has(pid)){scene.remove(figure);peers.delete(pid)}
    status.textContent='ONLINE · '+msg.players.length+' player(s)';
  };
}
connect();

let prior=performance.now(),sent=0,step=0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min((now-prior)/1000,.05);prior=now;
  const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
  const s=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  const len=Math.hypot(f,s)||1,speed=Number(keys.has('shift'))?17:8;
  const mx=(Math.sin(yaw)*f+Math.cos(yaw)*s)/len;
  const mz=(Math.cos(yaw)*f-Math.sin(yaw)*s)/len;
  const moving=f!==0||s!==0;
  if(moving){
    self.position.x=THREE.MathUtils.clamp(self.position.x+mx*dt*speed,-WORLD_HALF+5,WORLD_HALF-5);
    self.position.z=THREE.MathUtils.clamp(self.position.z+mz*dt*speed,-WORLD_HALF+5,WORLD_HALF-5);
    self.rotation.y=Math.atan2(mx,mz);
    step+=dt*speed*1.5;
  }
  const stride=moving?Math.sin(step)*.55:0;
  for(let i=0;i<2;i++){
    self.userData.legs[i].rotation.x=(i?1:-1)*stride;
    self.userData.arms[i].rotation.x=(i?-1:1)*stride*.6;
  }
  updateScenery();
  grid.position.x=Math.round(self.position.x/10)*10;
  grid.position.z=Math.round(self.position.z/10)*10;
  camera.position.set(self.position.x+Math.sin(yaw)*Math.cos(pitch)*distance,self.position.y+1.2+Math.sin(pitch)*distance,self.position.z+Math.cos(yaw)*Math.cos(pitch)*distance);
  camera.lookAt(self.position.x,1.4,self.position.z);
  sky.position.copy(camera.position);
  if(socket?.readyState===WebSocket.OPEN&&now-sent>70){socket.send(JSON.stringify({type:'move',x:self.position.x,z:self.position.z}));sent=now}
  if(coords)coords.textContent='X '+Math.round(self.position.x)+'  Z '+Math.round(self.position.z)+' · 8.2 km × 8.2 km';
  renderer.render(scene,camera);
}
requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
