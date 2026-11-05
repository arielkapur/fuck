// Seeded value-noise terrain. No dependencies, no runtime mesh generation.
// Shared by renderer, character physics and minimap.
const smooth=t=>t*t*(3-2*t);
export function hash(x,z,seed=1){
  let n=Math.imul(x|0,374761393)^Math.imul(z|0,668265263)^Math.imul(seed|0,2246822519);
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function valueNoise(x,z,seed){
  const xi=Math.floor(x),zi=Math.floor(z),a=smooth(x-xi),b=smooth(z-zi);
  const u=hash(xi,zi,seed)*(1-a)+hash(xi+1,zi,seed)*a;
  const v=hash(xi,zi+1,seed)*(1-a)+hash(xi+1,zi+1,seed)*a;
  return (u*(1-b)+v*b)*2-1;
}
export function terrainHeight(x,z){
  const base=valueNoise(x*.012,z*.012,11)*6.2+
    valueNoise(x*.038,z*.038,23)*2.2+
    valueNoise(x*.105,z*.105,37)*.55;
  // Building, NPC, and original spawn are kept level.
  const d=Math.hypot(x-4,z+6);
  const blend=smooth(Math.max(0,Math.min(1,(d-29)/23)));
  return base*blend;
}
export const WORLD_HALF=4096;
export const CLEARING_RADIUS=48;
export const FOREST_CELL=17;
// Stable tree positions at regular candidate cells with jitter.
// Shared with the minimap; values are invariant between clients.
export function treeAt(cellX,cellZ){
  if(hash(cellX,cellZ,70)<.24)return null;
  const x=(cellX+(.18+hash(cellX,cellZ,71)*.64))*FOREST_CELL;
  const z=(cellZ+(.18+hash(cellX,cellZ,72)*.64))*FOREST_CELL;
  if(Math.hypot(x-4,z+6)<CLEARING_RADIUS || Math.hypot(x+69,z+39)<19 || Math.abs(x)>WORLD_HALF-9 || Math.abs(z)>WORLD_HALF-9)return null;
  return {x,z,y:terrainHeight(x,z),height:6+hash(cellX,cellZ,73)*6.2,scale:.75+hash(cellX,cellZ,74)*.65};
}
