import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {terrainHeight} from './terrain.js';

// Static decoration only. No damage, pathfinding, aggro or combat logic.
export const CAMP={x:-69,z:-39,radius:19};
export function createGoblinCamp(scene,ascii){
  const root=new THREE.Group();
  root.position.set(CAMP.x,terrainHeight(CAMP.x,CAMP.z),CAMP.z);
  scene.add(root);
  const material=(hex,type)=>{const m=new THREE.MeshLambertMaterial({color:hex});m.userData={asciiType:type};return m};
  const wood=material(0x936949,6),rag=material(0x806043,6),skin=material(0x4daa51,7),flame=material(0xffab33,10),ember=material(0xffdc78,10);
  function shape(geometry,mat,parent,x,y,z,sx=1,sy=1,sz=1,samples=160){
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);
    mesh.userData.asciiType=mat.userData.asciiType;parent.add(mesh);
    ascii.register(mesh,85,samples);
    return mesh;
  }
  const spikeGeometry=new THREE.ConeGeometry(.38,3.4,5);
  // Two broken semicircles, open toward spawn.
  for(let i=0;i<28;i++){
    const angle=Math.PI*.22+i*(Math.PI*1.56/27);
    const radius=8.5+Math.sin(i*3.2)*.55;
    shape(spikeGeometry,wood,root,Math.cos(angle)*radius,1.6,Math.sin(angle)*radius,.9,.85+((i%4)*.07),.9,120);
  }
  const logGeometry=new THREE.CylinderGeometry(.22,.3,2.8,7);
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7;
    const log=shape(logGeometry,wood,root,Math.cos(a)*1.1,.34,Math.sin(a)*1.1,1,1,1,80);
    log.rotation.z=Math.PI/2;log.rotation.y=a;
  }
  const flameShape=new THREE.ConeGeometry(.52,1.75,7),flames=[];
  for(let i=0;i<5;i++){
    const a=i*2*Math.PI/5;
    const f=shape(flameShape,i%2?flame:ember,root,Math.cos(a)*.35,.7,Math.sin(a)*.35,.68,.8,.68,150);
    flames.push(f);
  }
  // A lean, distinctly goblin-shaped humanoid with tattered rag tunic.
  const goblin=new THREE.Group();goblin.position.set(3.4,0,2.2);root.add(goblin);
  const sphere=new THREE.SphereGeometry(1,12,9),cone=new THREE.ConeGeometry(1,1,7);
  shape(sphere,skin,goblin,0,1.25,0,.32,.48,.23,260);
  shape(cone,rag,goblin,0,.88,0,.56,.85,.40,260).rotation.z=Math.PI;
  shape(sphere,skin,goblin,0,2.02,0,.38,.38,.34,350);
  for(const side of [-1,1]){
    const ear=shape(cone,skin,goblin,side*.49,2.04,0,.18,.53,.17,120);
    ear.rotation.z=side*-1.3;
    shape(sphere,skin,goblin,side*.41,1.15,0,.12,.52,.13,150);
    shape(sphere,skin,goblin,side*.2,.44,0,.15,.45,.15,160);
    const tear=shape(cone,rag,goblin,side*.26,.76,0,.28,.55,.27,120);
    tear.rotation.z=side*.16;
  }
  function animate(t){
    for(let i=0;i<flames.length;i++){
      const f=flames[i];f.scale.y=.68+Math.sin(t*9+i*2.9)*.22;
      f.position.y=.65+(f.scale.y-.65)*.4;
      f.rotation.z=Math.sin(t*5+i)*.13;
    }
    goblin.rotation.y=Math.sin(t*.8)*.13;
  }
  return {animate,position:new THREE.Vector2(CAMP.x,CAMP.z)};
}
