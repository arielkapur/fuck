// FUCK / 2.2: ASCII-FIRST SOFTWARE 3D RENDERER.
// No WebGL image and no postprocess effect: per-character rays + projected 3D
// geometry share one CPU depth buffer. A cached glyph atlas keeps colour affordable.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {terrainHeight} from './terrain.js';

const RAMP = Array.from(' .,:;irsXA253hMHGS#9B&@');
const EXTRA = Array.from('░▒▓█木林山水火天風森林कमनहवनあア');
const CHARS=[...new Set([...RAMP,...EXTRA,'*','+','·'])];
const rampIndex = char => CHARS.indexOf(char);
const starSmall=rampIndex('·'),starBig=rampIndex('*');
const edgeGlyph=rampIndex('#');
const v=new THREE.Vector3(), tmp=new THREE.Vector3(), normal=new THREE.Vector3();
const inverse=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
const light=new THREE.Vector3(-.45,.82,.35).normalize();
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const clampByte=n=>clamp(Math.round(n),0,255);
const PALETTE=[
  [73,116,154],   // 0 sky
  [91,105,117],   // 1 concrete
  [92,137,99],    // 2 grass
  [155,136,101],  // 3 ground/soil
  [181,191,202],  // 4 building
  [244,216,145],  // 5 edges
  [136,96,66],    // 6 bark
  [64,176,110],   // 7 foliage
  [223,226,236],  // 8 player silhouettes
  [245,241,208]   // 9 stars
];
function samplesFor(mesh,density,limit) {
  const geo=mesh.geometry,pos=geo.getAttribute('position'),norm=geo.getAttribute('normal');
  if(!pos||!norm)return [];
  const idx=geo.index,triangles=(idx?idx.count:pos.count)/3;
  const index=i=>idx?idx.getX(i):i;
  const areas=[],p0=new THREE.Vector3(),p1=new THREE.Vector3(),p2=new THREE.Vector3();
  let total=0;
  for(let t=0;t<triangles;t++){
    const i0=index(t*3),i1=index(t*3+1),i2=index(t*3+2);
    p0.fromBufferAttribute(pos,i0);p1.fromBufferAttribute(pos,i1);p2.fromBufferAttribute(pos,i2);
    const area=p1.clone().sub(p0).cross(p2.clone().sub(p0)).length()*.5;
    total+=area;areas.push(total);
  }
  if(total<1e-8)return [];
  const count=clamp(Math.round(total*density),30,limit),out=[];
  let tri=0;
  for(let i=0;i<count;i++){
    const target=(i+.5)/count*total;
    while(tri<triangles-1 && areas[tri]<target)tri++;
    const indices=[index(tri*3),index(tri*3+1),index(tri*3+2)];
    const u=Math.sqrt((i*.61803398875)%1),w=(i*.75487766625)%1;
    const weights=[1-u,u*(1-w),u*w];
    let x=0,y=0,z=0,nx=0,ny=0,nz=0;
    for(let q=0;q<3;q++){
      const k=indices[q],a=weights[q];
      x+=pos.getX(k)*a;y+=pos.getY(k)*a;z+=pos.getZ(k)*a;
      nx+=norm.getX(k)*a;ny+=norm.getY(k)*a;nz+=norm.getZ(k)*a;
    }
    out.push([x,y,z,nx,ny,nz]);
  }
  return out;
}
export class AsciiRenderer {
  constructor(canvas,scene,camera) {
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.scene=scene;this.camera=camera;
    this.meshes=new Map();this.edges=new Map();this.mode='color';
    this.cellHeight=10.5;this.frame=0;this.visibleSamples=0;
    this.stars=Array.from({length:420},(_,i)=>{
      const y=1-2*(i+.5)/420,a=i*2.399963229728653,r=Math.sqrt(1-y*y);
      return new THREE.Vector3(Math.cos(a)*r,y,Math.sin(a)*r);
    });
    this.resize();
  }
  register(mesh,density=80,maxSamples=600){this.meshes.set(mesh,samplesFor(mesh,density,maxSamples))}
  unregister(mesh){this.meshes.delete(mesh);this.edges.delete(mesh)}
  registerEdges(mesh){
    const geo=mesh.geometry;
    if(!geo.boundingBox)geo.computeBoundingBox();
    const {min,max}=geo.boundingBox,corners=[];
    for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])corners.push([x,y,z]);
    const edges=[];
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){
      const a=corners[i],b=corners[j];
      const diffs=(a[0]!==b[0])+(a[1]!==b[1])+(a[2]!==b[2]);
      if(diffs===1)edges.push([a,b]);
    }
    this.edges.set(mesh,edges);
  }
  setResolution(value){this.cellHeight=Number(value)||10.5;this.resize()}
  setPalette(value){this.mode=value==='mono'?'mono':'color'}
  makeAtlas(){
    const w=Math.ceil(this.cellWidth),h=Math.ceil(this.cellHeight);
    this.tileW=w;this.tileH=h;
    const atlas=document.createElement('canvas');
    atlas.width=w*CHARS.length;atlas.height=h*PALETTE.length*4;
    const c=atlas.getContext('2d',{alpha:true});
    c.textBaseline='top';
    // Browser font fallback: multilingual glyphs stay within one ASCII cell.
    const family='monospace, "Noto Sans CJK SC", "Noto Sans Devanagari", sans-serif';
    c.font=(h-1)+'px '+family;
    for(let color=0;color<PALETTE.length;color++)for(let level=0;level<4;level++){
      const [red,green,blue]=PALETTE[color],factor=this.mode==='mono'?(0.55+level*.16):(0.46+level*.2);
      if(this.mode==='mono'){const lum=.2126*red+.7152*green+.0722*blue;
        c.fillStyle='rgb('+clampByte(lum*factor)+','+clampByte(lum*factor)+','+clampByte(lum*factor)+')';
      }else c.fillStyle='rgb('+clampByte(red*factor)+','+clampByte(green*factor)+','+clampByte(blue*factor)+')';
      for(let glyph=1;glyph<CHARS.length;glyph++){
        // Draw each character with explicit maximum width; even double-width
        // CJK and Devanagari glyphs cannot spill into neighbouring grid cells.
        c.fillText(CHARS[glyph],glyph*w,(color*4+level)*h,w);
      }
    }
    this.atlas=atlas;
  }
  resize(){
    const cw=Math.max(1,innerWidth),ch=Math.max(1,innerHeight);
    const scale=Math.min(devicePixelRatio||1,2);
    this.canvas.width=Math.round(cw*scale);this.canvas.height=Math.round(ch*scale);
    this.ctx.setTransform(scale,0,0,scale,0,0);
    this.ctx.font=this.cellHeight+'px monospace';
    this.cellWidth=Math.max(1,this.ctx.measureText('M').width);
    this.width=cw;this.height=ch;
    this.cols=Math.max(1,Math.floor(cw/this.cellWidth));
    this.rows=Math.max(1,Math.floor(ch/this.cellHeight));
    const n=this.cols*this.rows;
    this.depth=new Float32Array(n);this.glyph=new Uint8Array(n);
    this.type=new Uint8Array(n);this.shade=new Uint8Array(n);
    this.makeAtlas();
  }
  visible(mesh){if(!mesh.visible)return false;for(let p=mesh.parent;p;p=p.parent)if(!p.visible)return false;return true}
  draw(){
    const {cols,rows,depth,glyph,type,shade,ctx,camera:cam}=this;
    depth.fill(Infinity);glyph.fill(0);type.fill(0);shade.fill(0);
    cam.updateMatrixWorld();this.scene.updateMatrixWorld(true);
    inverse.copy(cam.matrixWorld).invert();
    const tan=Math.tan(THREE.MathUtils.degToRad(cam.fov)*.5);
    const aspect=this.width/this.height;
    const cx=cam.position.x,cy=cam.position.y,cz=cam.position.z;
    const xScale=aspect*tan,yScale=tan;
    // Terrain is sampled directly at the character grid rather than meshed.
    // Three fixed-point iterations find the heightfield/eye-ray intersection.
    for(let iy=0;iy<rows;iy++){
      const ry=(1-2*(iy+.5)/rows)*yScale;
      for(let ix=0;ix<cols;ix++){
        const rx=(2*(ix+.5)/cols-1)*xScale;
        v.set(rx,ry,-1).normalize().transformDirection(cam.matrixWorld);
        if(v.y>=-.008)continue;
        let t=(terrainHeight(cx,cz)-cy)/v.y;
        if(t<=0)t=(cy+9)/-v.y;
        for(let k=0;k<3;k++){
          const gx=cx+v.x*t,gz=cz+v.z*t;
          t=(terrainHeight(gx,gz)-cy)/v.y;
          if(t<=0||t>cam.far*2)break;
        }
        if(t<=cam.near||t>=cam.far*Math.sqrt(1+rx*rx+ry*ry))continue;
        const gx=cx+v.x*t,gz=cz+v.z*t;
        if(Math.abs(gx)>4096||Math.abs(gz)>4096)continue;
        const index=iy*cols+ix;
        depth[index]=t/Math.sqrt(1+rx*rx+ry*ry);
        const radius=Math.hypot(gx-4,gz+6);
        const variation=Math.sin(gx*.17)*Math.cos(gz*.22);
        const slope=Math.abs(terrainHeight(gx+.7,gz)-terrainHeight(gx,gz))+
                    Math.abs(terrainHeight(gx,gz+.7)-terrainHeight(gx,gz));
        type[index]=radius<33?1:slope>.55?3:2;
        shade[index]=clamp(Math.floor(2.1+variation*.65-slope*.6),0,3);
        const value=clamp(Math.floor(4+variation*2+slope*1.6),1,RAMP.length-1);
        glyph[index]=value;
        if(radius>=33&&index%31===0)glyph[index]=rampIndex('░');
      }
    }
    let visibleSamples=0;
    for(const [mesh,points] of this.meshes){
      if(!points.length||!this.visible(mesh))continue;
      mesh.updateWorldMatrix(true,false);
      const world=mesh.matrixWorld;normalMatrix.getNormalMatrix(world);
      const surface=mesh.userData.asciiType||4;
      for(const point of points){
        tmp.set(point[0],point[1],point[2]).applyMatrix4(world).applyMatrix4(inverse);
        const z=-tmp.z;
        if(z<=cam.near||z>cam.far)continue;
        const nx=tmp.x/(z*xScale),ny=tmp.y/(z*yScale);
        if(Math.abs(nx)>1||Math.abs(ny)>1)continue;
        const ix=Math.floor((nx*.5+.5)*cols),iy=Math.floor((.5-ny*.5)*rows);
        if(ix<0||iy<0||ix>=cols||iy>=rows)continue;
        const k=iy*cols+ix;
        if(z>=depth[k]+.06)continue;
        normal.set(point[3],point[4],point[5]).applyMatrix3(normalMatrix).normalize();
        const illum=clamp(.23+Math.max(0,normal.dot(light))*.77,0,1);
        const detail=clamp(Math.floor(illum*3.8),0,3);
        depth[k]=z;type[k]=surface;shade[k]=detail;visibleSamples++;
        let ramp=clamp(Math.floor(illum*(RAMP.length-1)),1,RAMP.length-1);
        // UTF-8 / Unicode accents. Not all Unicode codepoints have equal
        // advance widths, so the glyph atlas clips them into fixed cells.
        if(surface===7&&k%7===0)ramp=rampIndex('林');
        else if(surface===7&&k%11===0)ramp=rampIndex('木');
        else if(surface===3&&k%37===0)ramp=rampIndex('山');
        else if(surface===4&&k%41===0)ramp=rampIndex('क');
        glyph[k]=ramp;
      }
    }
    // Building edge outlines remain depth-tested.
    const project=(p,m)=>{
      const pt=new THREE.Vector3(...p).applyMatrix4(m).applyMatrix4(inverse);
      const z=-pt.z;if(z<=cam.near||z>=cam.far)return null;
      return {x:(pt.x/(z*xScale)*.5+.5)*cols,y:(.5-pt.y/(z*yScale)*.5)*rows,z};
    };
    for(const [mesh,segments] of this.edges){
      if(!this.visible(mesh))continue;
      mesh.updateWorldMatrix(true,false);
      for(const [a,b] of segments){
        const pa=project(a,mesh.matrixWorld),pb=project(b,mesh.matrixWorld);
        if(!pa||!pb)continue;
        const count=clamp(Math.ceil(Math.max(Math.abs(pb.x-pa.x),Math.abs(pb.y-pa.y))*1.4),1,1200);
        for(let i=0;i<=count;i++){
          const t=i/count,x=Math.floor(pa.x+(pb.x-pa.x)*t),y=Math.floor(pa.y+(pb.y-pa.y)*t);
          if(x<0||y<0||x>=cols||y>=rows)continue;
          const k=y*cols+x,z=pa.z+(pb.z-pa.z)*t;
          if(z<=depth[k]+.4){depth[k]=Math.min(depth[k],z);type[k]=5;shade[k]=3;glyph[k]=edgeGlyph;}
        }
      }
    }
    for(let i=0;i<this.stars.length;i++){
      const dir=this.stars[i].clone().transformDirection(inverse);
      if(dir.z>=-.01)continue;
      const nx=dir.x/(-dir.z*xScale),ny=dir.y/(-dir.z*yScale);
      const x=Math.floor((nx*.5+.5)*cols),y=Math.floor((.5-ny*.5)*rows);
      if(x<0||y<0||x>=cols||y>=rows)continue;
      const k=y*cols+x;if(type[k]!==0)continue;
      type[k]=9;shade[k]=3;glyph[k]=i%13===0?starBig:starSmall;
    }
    this.visibleSamples=visibleSamples;
    this.meshCount=this.meshes.size;
    ctx.fillStyle='#08131c';ctx.fillRect(0,0,this.width,this.height);
    // Atlas blits instead of thousands of per-cell font rasterisations.
    const tw=this.tileW,th=this.tileH;
    for(let k=0;k<glyph.length;k++){
      const g=glyph[k];if(!g)continue;
      ctx.drawImage(this.atlas,g*tw,(type[k]*4+shade[k])*th,tw,th,
        (k%cols)*this.cellWidth,Math.floor(k/cols)*this.cellHeight,this.cellWidth,this.cellHeight);
    }
    this.frame++;
  }
}
