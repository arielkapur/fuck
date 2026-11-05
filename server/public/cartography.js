import {terrainHeight,treeAt,FOREST_CELL} from './terrain.js';
import {CAMP} from './camp.js';

// Per-browser fog-of-war. Discovery is determined by what falls inside the
// CURRENT camera frustum rather than a circular proximity auto-reveal.
const CELL=12,VIEW=105;
const key=(x,z)=>x+','+z;
export function createCartography(){
  const visited=new Map();
  try{
    const raw=JSON.parse(localStorage.getItem('fuck:explored:v1')||'[]');
    for(const [x,z] of raw)if(Number.isInteger(x)&&Number.isInteger(z)&&Math.abs(x)<343&&Math.abs(z)<343)
      visited.set(key(x,z),[x,z]);
  }catch{}
  let lastSave=0;
  function discover(px,pz,camera){
    camera.updateMatrixWorld();
    const cx=Math.floor(px/CELL),cz=Math.floor(pz/CELL);
    const tanY=Math.tan(camera.fov*Math.PI/360),tanX=tanY*camera.aspect;
    const right=[camera.matrixWorld.elements[0],camera.matrixWorld.elements[2]];
    const e=camera.matrixWorld.elements;
    const cameraX=camera.position.x,cameraY=camera.position.y,cameraZ=camera.position.z;
    const fwdX=-e[8],fwdY=-e[9],fwdZ=-e[10];
    const sideX=e[0],sideY=e[1],sideZ=e[2];
    const upX=e[4],upY=e[5],upZ=e[6];
    const radius=Math.ceil(VIEW/CELL);
    for(let dz=-radius;dz<=radius;dz++)for(let dx=-radius;dx<=radius;dx++){
      const x=cx+dx,z=cz+dz,sx=(x+.5)*CELL,sz=(z+.5)*CELL;
      if(Math.hypot(sx-px,sz-pz)>VIEW)continue;
      const sy=terrainHeight(sx,sz)+.6;
      const vx=sx-cameraX,vy=sy-cameraY,vz=sz-cameraZ;
      const depth=vx*fwdX+vy*fwdY+vz*fwdZ;
      if(depth<=.2)continue;
      if(Math.abs(vx*sideX+vy*sideY+vz*sideZ)>depth*tanX*1.1)continue;
      if(Math.abs(vx*upX+vy*upY+vz*upZ)>depth*tanY*1.25)continue;
      // Terrain ridges block discovery; do not reveal terrain behind hills.
      let occluded=false;
      for(let step=1;step<=4;step++){
        const t=step/5;
        const rx=cameraX+vx*t,rz=cameraZ+vz*t,ry=cameraY+vy*t;
        if(terrainHeight(rx,rz)>ry+.5){occluded=true;break;}
      }
      if(occluded)continue;
      visited.set(key(x,z),[x,z]);
    }
    const now=performance.now();
    if(now-lastSave>10000){
      lastSave=now;
      try{localStorage.setItem('fuck:explored:v1',JSON.stringify([...visited.values()].slice(-16000)))}catch{}
    }
  }
  function save(){
    try{localStorage.setItem('fuck:explored:v1',JSON.stringify([...visited.values()].slice(-16000)))}catch{}
  }
  // A reusable painter: different viewport and scale for HUD and world map.
  function draw(canvas,player,peers,heading,worldSpan=220,showUnknown=false){
    const ctx=canvas.getContext('2d');
    const width=canvas.width,height=canvas.height;
    ctx.fillStyle='#080e16';ctx.fillRect(0,0,width,height);
    const scale=Math.min(width,height)/worldSpan;
    const minX=player.x-width/(scale*2),maxX=player.x+width/(scale*2);
    const minZ=player.z-height/(scale*2),maxZ=player.z+height/(scale*2);
    const a=Math.floor(minX/CELL),b=Math.ceil(maxX/CELL),c=Math.floor(minZ/CELL),d=Math.ceil(maxZ/CELL);
    for(let z=c;z<=d;z++)for(let x=a;x<=b;x++){
      if(!visited.has(key(x,z)))continue;
      const wx=(x+.5)*CELL,wz=(z+.5)*CELL,px=width/2+(wx-player.x)*scale,py=height/2+(wz-player.z)*scale;
      const h=terrainHeight(wx,wz),green=Math.max(39,Math.min(102,70+h*3));
      ctx.fillStyle='rgb('+Math.max(28,Math.round(37+h))+','+Math.round(green)+',56)';
      ctx.fillRect(px-CELL*scale/2,py-CELL*scale/2,Math.ceil(CELL*scale)+1,Math.ceil(CELL*scale)+1);
    }
    const treeStartX=Math.floor(minX/FOREST_CELL),treeEndX=Math.ceil(maxX/FOREST_CELL);
    const treeStartZ=Math.floor(minZ/FOREST_CELL),treeEndZ=Math.ceil(maxZ/FOREST_CELL);
    ctx.fillStyle='#9bce9d';
    for(let z=treeStartZ;z<=treeEndZ;z++)for(let x=treeStartX;x<=treeEndX;x++){
      const tree=treeAt(x,z);if(!tree)continue;
      if(!visited.has(key(Math.floor(tree.x/CELL),Math.floor(tree.z/CELL))))continue;
      const px=width/2+(tree.x-player.x)*scale,py=height/2+(tree.z-player.z)*scale;
      ctx.fillRect(px-1,py-1,Math.max(2,scale*1.5),Math.max(2,scale*1.5));
    }
    function explored(x,z){return visited.has(key(Math.floor(x/CELL),Math.floor(z/CELL)))}
    if(explored(8,-12)){
      ctx.fillStyle='#d8dce2';ctx.fillRect(width/2+(8-player.x)*scale-4,height/2+(-12-player.z)*scale-4,8,8);
    }
    if(explored(CAMP.x,CAMP.z)){
      ctx.fillStyle='#ffa461';ctx.fillRect(width/2+(CAMP.x-player.x)*scale-4,height/2+(CAMP.z-player.z)*scale-4,8,8);
    }
    for(const other of peers.values()){
      if(!explored(other.position.x,other.position.z))continue;
      ctx.fillStyle='#ffb86c';ctx.beginPath();ctx.arc(width/2+(other.position.x-player.x)*scale,height/2+(other.position.z-player.z)*scale,3,0,2*Math.PI);ctx.fill();
    }
    ctx.save();ctx.translate(width/2,height/2);ctx.rotate(-heading);
    ctx.fillStyle='#ffdd7b';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(-5,6);ctx.lineTo(5,6);ctx.closePath();ctx.fill();ctx.restore();
    ctx.strokeStyle='#61797b';ctx.strokeRect(.5,.5,width-1,height-1);
  }
  return {discover,draw,save,get count(){return visited.size}};
}
