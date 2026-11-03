// Deliberately tiny experiment: real 3D scene + optional multiplayer.
// Three.js renders. Game state stays independent of rendering.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const container=document.querySelector('#world');
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);container.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x07101b);scene.fog=new THREE.FogExp2(0x07101b,.022);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,500);
scene.add(new THREE.HemisphereLight(0x89ccff,0x172838,2.3));
const sun=new THREE.DirectionalLight(0xffe9c0,2.5);sun.position.set(20,40,10);scene.add(sun);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(300,300,50,50),new THREE.MeshStandardMaterial({color:0x173844,roughness:1,wireframe:false}));floor.rotation.x=-Math.PI/2;scene.add(floor);
const grid=new THREE.GridHelper(300,100,0x267e8d,0x1a5060);grid.position.y=.012;scene.add(grid);
for(let i=0;i<110;i++){const a=i*2.399963,r=12+Math.sqrt(i)*11;const h=2+(i%7)*1.6;const ob=new THREE.Mesh(new THREE.BoxGeometry(1.2,h,1.2),new THREE.MeshStandardMaterial({color:0x194f61,emissive:0x061e23}));ob.position.set(Math.sin(a)*r,h/2,Math.cos(a)*r);scene.add(ob)}
const bodyGeo=new THREE.CapsuleGeometry(.55,.95,4,8);
const local=new THREE.Mesh(bodyGeo,new THREE.MeshStandardMaterial({color:0x78ffe5,emissive:0x0b665a}));local.position.y=1.1;scene.add(local);
const peers=new Map();const peerMat=new THREE.MeshStandardMaterial({color:0xffbd7c,emissive:0x5c2914});
const keys=new Set();addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;keys.add(e.key.toLowerCase());if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))e.preventDefault()});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());
let yaw=.75,tilt=.49,distance=14,drag=false,px=0,py=0;
renderer.domElement.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);
renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;yaw-=(e.clientX-px)*.007;tilt=THREE.MathUtils.clamp(tilt+(e.clientY-py)*.005,.1,1.35);px=e.clientX;py=e.clientY});
renderer.domElement.addEventListener('wheel',e=>{distance=THREE.MathUtils.clamp(distance+e.deltaY*.015,5,36);e.preventDefault()},{passive:false});
const status=document.querySelector('#status');const explicit=new URLSearchParams(location.search).get('server');
const url=explicit||(location.hostname==='localhost'||location.hostname==='127.0.0.1'?'ws://localhost:3001':null);
let socket=null,id=null;
function connect(){if(!url)return;socket=new WebSocket(url);status.textContent='Connecting to shared world…';
 socket.onopen=()=>status.textContent='Connected to shared world';
 socket.onclose=()=>{status.textContent='Offline world (reconnecting…)';for(const p of peers.values())scene.remove(p);peers.clear();setTimeout(connect,2500)};
 socket.onerror=()=>status.textContent='Server unavailable — offline world';
 socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch{return}
  if(m.type==='welcome')id=m.id;
  if(m.type==='state'&&Array.isArray(m.players)){const visible=new Set();for(const p of m.players){if(p.id===id||typeof p.id!=='string')continue;visible.add(p.id);let mesh=peers.get(p.id);if(!mesh){mesh=new THREE.Mesh(bodyGeo,peerMat);scene.add(mesh);peers.set(p.id,mesh)}mesh.position.set(p.x,1.1,p.z)}for(const [pid,mesh] of peers)if(!visible.has(pid)){scene.remove(mesh);peers.delete(pid)}status.textContent=`Shared world · ${m.players.length} online`;}
 };
}connect();
let previous=performance.now(),sendAt=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
 const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
 const strafe=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
 const d=Math.hypot(forward,strafe)||1;
 if(forward||strafe){const f=forward/d,s=strafe/d,speed=7;local.position.x+=(Math.sin(yaw)*f+Math.cos(yaw)*s)*dt*speed;local.position.z+=(Math.cos(yaw)*f-Math.sin(yaw)*s)*dt*speed}
 const target=local.position;camera.position.set(target.x+Math.sin(yaw)*distance*Math.cos(tilt),target.y+distance*Math.sin(tilt),target.z+Math.cos(yaw)*distance*Math.cos(tilt));camera.lookAt(target);
 if(socket?.readyState===WebSocket.OPEN&&now-sendAt>70){socket.send(JSON.stringify({type:'move',x:local.position.x,z:local.position.z}));sendAt=now}
 renderer.render(scene,camera);
}requestAnimationFrame(frame);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});