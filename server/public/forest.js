import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {FOREST_CELL,treeAt} from './terrain.js';

// Pool a fixed number of low-poly trees. Reposition only when entering a new
// forest cell. Positions follow the deterministic terrain; no scene growth.
const MAX_TREES=145;
const RADIUS_CELLS=7;
export function createForest(scene,ascii) {
  const trunkGeo=new THREE.CylinderGeometry(.22,.40,1,5);
  const canopyGeo=new THREE.ConeGeometry(1,1,7);
  const bark=new THREE.MeshLambertMaterial({color:0x78543c});
  const foliage=new THREE.MeshLambertMaterial({color:0x387b59});
  const pool=[];
  for(let i=0;i<MAX_TREES;i++){
    const tree=new THREE.Group();
    const trunk=new THREE.Mesh(trunkGeo,bark);
    const canopy=new THREE.Mesh(canopyGeo,foliage);
    trunk.userData.asciiType=6;
    canopy.userData.asciiType=7;
    tree.add(trunk,canopy);scene.add(tree);
    ascii.register(trunk,37,66);ascii.register(canopy,65,140);
    tree.visible=false;
    pool.push({tree,trunk,canopy});
  }
  let lastX=Infinity,lastZ=Infinity;
  let positions=[];
  function update(x,z){
    const cx=Math.floor(x/FOREST_CELL),cz=Math.floor(z/FOREST_CELL);
    if(cx===lastX&&cz===lastZ)return;
    lastX=cx;lastZ=cz;
    positions=[];
    for(let dz=-RADIUS_CELLS;dz<=RADIUS_CELLS;dz++)
      for(let dx=-RADIUS_CELLS;dx<=RADIUS_CELLS;dx++){
        const p=treeAt(cx+dx,cz+dz);
        if(p)positions.push(p);
      }
    positions.sort((a,b)=>(a.x-x)**2+(a.z-z)**2-(b.x-x)**2-(b.z-z)**2);
    positions.length=Math.min(MAX_TREES,positions.length);
    for(let i=0;i<pool.length;i++){
      const obj=pool[i],p=positions[i];
      obj.tree.visible=!!p;
      if(!p)continue;
      obj.tree.position.set(p.x,p.y,p.z);
      const h=p.height;
      obj.trunk.position.y=h*.24;obj.trunk.scale.set(p.scale,h*.48,p.scale);
      obj.canopy.position.y=h*.69;obj.canopy.scale.set(2.6*p.scale,h*.74,2.6*p.scale);
    }
  }
  return {update,get positions(){return positions}};
}
