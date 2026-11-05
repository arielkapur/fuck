// ASCII-FIRST RENDERER. No WebGL canvas or post-processing filter.
// CPU projects shaded 3D surface samples into a character + depth buffer.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const GLYPHS = ' .,:;irsXA253hMHGS#9B&@';
const V = new THREE.Vector3();
const TMP = new THREE.Vector3();
const N = new THREE.Vector3();
const inverse = new THREE.Matrix4();
const normalMatrix = new THREE.Matrix3();
const bright = new THREE.Vector3(-.5, .9, .3).normalize();
const xzGround = new THREE.Vector3();
const rgb = (r,g,b) => [r,g,b];
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

function sampleMesh(mesh, density, maxSamples=1400) {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  if (!position || !normal) return [];
  const indices = geometry.index;
  const tris=[];
  let total=0;
  const getIndex=i=>indices?indices.getX(i):i;
  const triangleCount=(indices?indices.count:position.count)/3;
  const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
  for(let t=0;t<triangleCount;t++){
    const ia=getIndex(t*3),ib=getIndex(t*3+1),ic=getIndex(t*3+2);
    a.fromBufferAttribute(position,ia);b.fromBufferAttribute(position,ib);c.fromBufferAttribute(position,ic);
    const area=b.clone().sub(a).cross(c.clone().sub(a)).length()*.5;
    if(area<1e-8)continue;
    total+=area;tris.push([ia,ib,ic,total]);
  }
  if(!total)return [];
  const count=clamp(Math.ceil(total*density),130,maxSamples);
  const samples=[];
  let cursor=0;
  for(let i=0;i<count;i++){
    const areaTarget=(i+.5)*total/count;
    while(cursor<tris.length-1 && tris[cursor][3]<areaTarget)cursor++;
    const [ia,ib,ic]=tris[cursor];
    // Low-discrepancy barycentric distribution: deterministic, no jitter between frames.
    const u=Math.sqrt((i*.618033988749895)%1),v=(i*.7548776662466927)%1;
    const w0=1-u,w1=u*(1-v),w2=u*v;
    const px=position.getX(ia)*w0+position.getX(ib)*w1+position.getX(ic)*w2;
    const py=position.getY(ia)*w0+position.getY(ib)*w1+position.getY(ic)*w2;
    const pz=position.getZ(ia)*w0+position.getZ(ib)*w1+position.getZ(ic)*w2;
    const nx=normal.getX(ia)*w0+normal.getX(ib)*w1+normal.getX(ic)*w2;
    const ny=normal.getY(ia)*w0+normal.getY(ib)*w1+normal.getY(ic)*w2;
    const nz=normal.getZ(ia)*w0+normal.getZ(ib)*w1+normal.getZ(ic)*w2;
    samples.push([px,py,pz,nx,ny,nz]);
  }
  return samples;
}
export class AsciiRenderer {
  constructor(canvas, scene, camera) {
    this.canvas=canvas;this.scene=scene;this.camera=camera;
    this.ctx=canvas.getContext('2d',{alpha:false});
    this.meshes=new Map();this.cellHeight=12;this.mode='mono';
    this.frame=0;
    this.resize();
  }
  register(mesh, density=125, maxSamples=1600) {
    this.meshes.set(mesh,sampleMesh(mesh,density,maxSamples));
  }
  unregister(mesh){this.meshes.delete(mesh)}
  setResolution(n){this.cellHeight=Number(n);this.resize()}
  setPalette(name){this.mode=name}
  resize(){
    const w=Math.max(1,innerWidth),h=Math.max(1,innerHeight),dpr=Math.min(devicePixelRatio||1,2);
    this.canvas.width=Math.round(w*dpr);this.canvas.height=Math.round(h*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.width=w;this.height=h;
    this.cellWidth=this.cellHeight*.62;
    this.cols=Math.max(1,Math.ceil(w/this.cellWidth));
    this.rows=Math.max(1,Math.ceil(h/this.cellHeight));
    this.depth=new Float32Array(this.cols*this.rows);
    this.symbol=new Uint8Array(this.depth.length);
    this.r=new Uint8Array(this.depth.length);
    this.g=new Uint8Array(this.depth.length);
    this.b=new Uint8Array(this.depth.length);
    this.ctx.font=this.cellHeight+'px monospace';
    // Measure actual glyph width instead of assuming that .62 * font size
    // is what the browser's monospace font really uses.
    this.cellWidth=Math.max(1,this.ctx.measureText('M').width);
    this.cols=Math.max(1,Math.floor(w/this.cellWidth));
    this.rows=Math.max(1,Math.floor(h/this.cellHeight));
    const n=this.cols*this.rows;
    this.depth=new Float32Array(n);this.symbol=new Uint8Array(n);
    this.r=new Uint8Array(n);this.g=new Uint8Array(n);this.b=new Uint8Array(n);
    this.ctx.textBaseline='top';
    this.ctx.fillStyle='#0a131b';
    this.ctx.fillRect(0,0,w,h);
  }
  draw() {
    const {ctx,cols,rows,depth,symbol,r,g,b}=this;
    depth.fill(Infinity);symbol.fill(0);r.fill(0);g.fill(0);b.fill(0);
    const cam=this.camera;
    cam.updateMatrixWorld();
    this.scene.updateMatrixWorld(true);
    inverse.copy(cam.matrixWorld).invert();
    const f=Math.tan(THREE.MathUtils.degToRad(cam.fov)*.5);
    const aspect=this.width/this.height;
    const light=bright;

    // Ground comes directly from an analytic ray/plane intersection per glyph:
    // no 8 km surface sampling or infinite prop generation.
    const cx=cam.position.x,cy=cam.position.y,cz=cam.position.z;
    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const ndcX=((x+.5)/cols*2-1)*aspect*f;
      const ndcY=(1-(y+.5)/rows*2)*f;
      V.set(ndcX,ndcY,-1).normalize().transformDirection(cam.matrixWorld);
      if(V.y>=-.0001)continue;
      const t=(-.035-cy)/V.y;
      if(t<=cam.near||t>=cam.far)continue;
      const gx=cx+V.x*t,gz=cz+V.z*t;
      if(Math.abs(gx)>4096||Math.abs(gz)>4096)continue;
      const k=y*cols+x;
      depth[k]=t;
      // Subtle concrete grain determined by world position, not a screen filter.
      const grain=(Math.sin(gx*2.15)*Math.cos(gz*1.73)+1)*.5;
      const luminance=clamp(.27+grain*.11-(t/cam.far)*.06,0,1);
      symbol[k]=Math.floor(luminance*(GLYPHS.length-1));
      const shade=Math.round(100+grain*17);
      r[k]=shade;g[k]=shade;b[k]=shade;
    }

    let visibleSamples=0;
    for(const [mesh,points] of this.meshes) {
      if(!mesh.visible || !this.isVisible(mesh) || !points.length) continue;
      mesh.updateWorldMatrix(true,false);
      const world=mesh.matrixWorld;
      normalMatrix.getNormalMatrix(world);
      const matColor=mesh.material.color || new THREE.Color('#bbbbbb');
      const baseR=matColor.r,baseG=matColor.g,baseB=matColor.b;
      for(let i=0;i<points.length;i++){
        const s=points[i];
        TMP.set(s[0],s[1],s[2]).applyMatrix4(world).applyMatrix4(inverse);
        const z=-TMP.z;
        if(z<=cam.near || z>=cam.far) continue;
        const xx=TMP.x/(z*f*aspect), yy=TMP.y/(z*f);
        if(Math.abs(xx)>1||Math.abs(yy)>1)continue;
        const gx=Math.floor((xx*.5+.5)*cols),gy=Math.floor((.5-yy*.5)*rows);
        if(gx<0||gy<0||gx>=cols||gy>=rows)continue;
        const k=gy*cols+gx;
        if(z>=depth[k]+.05)continue;
        N.set(s[3],s[4],s[5]).applyMatrix3(normalMatrix).normalize();
        const illumination=clamp(.24+Math.max(0,N.dot(light))*.76,0,1);
        // boost legibility so black characters remain distinct on concrete
        const darkness=1-Math.max(baseR,baseG,baseB);
        const density=clamp(illumination*.58+.2+darkness*.22,0,1);
        depth[k]=z;
        visibleSamples++;
        symbol[k]=Math.max(1,Math.floor(density*(GLYPHS.length-1)));
        const factor=.42+illumination*.58;
        r[k]=Math.round(clamp(baseR*255*factor,0,255));
        g[k]=Math.round(clamp(baseG*255*factor,0,255));
        b[k]=Math.round(clamp(baseB*255*factor,0,255));
      }
    }

    this.visibleSamples=visibleSamples;
    ctx.fillStyle='#0a131b';ctx.fillRect(0,0,this.width,this.height);
    if(this.mode==='mono'){
      ctx.fillStyle='#d0dae0';
      for(let y=0;y<rows;y++){
        let line='';
        for(let x=0;x<cols;x++){
          const k=y*cols+x;
          line+=Number.isFinite(depth[k])?GLYPHS[symbol[k]]:((x*17+y*13)%43===0?'·':' ');
        }
        ctx.fillText(line,0,y*this.cellHeight);
      }
      this.frame++;return;
    }
    // The sky itself is rendered as colored characters (no WebGL sky dome).
    const skyColor=this.mode==='mono'?rgb(122,157,175):rgb(111,164,206);
    for(let y=0;y<rows;y++){
      let cached='';
      for(let x=0;x<cols;x++){
        const k=y*cols+x;
        let char, red,green,blue;
        if(!Number.isFinite(depth[k])) {
          const daylight=clamp(1-y/rows,0,1);
          char=(x*17+y*13)%43===0?'·':' ';
          red=Math.round(skyColor[0]*(.62+.38*daylight));
          green=Math.round(skyColor[1]*(.68+.32*daylight));
          blue=Math.round(skyColor[2]*(.76+.24*daylight));
        } else {
          char=GLYPHS[symbol[k]];
          if(this.mode==='mono'){
            const brightness=Math.round(r[k]*.2126+g[k]*.7152+b[k]*.0722);
            red=green=blue=clamp(brightness+40,0,255);
          }else{
            red=r[k];green=g[k];blue=b[k];
            const max=Math.max(red,green,blue);
            if(max<75){red=green=blue=100} // distinguish dark humanoid from background
          }
        }
        if(char===' ')continue;
        const color=red+','+green+','+blue;
        if(color!==cached){ctx.fillStyle='rgb('+color+')';cached=color}
        ctx.fillText(char,x*this.cellWidth,y*this.cellHeight);
      }
    }
    this.frame++;
  }
  isVisible(object){
    for(let cur=object.parent;cur;cur=cur.parent)if(!cur.visible)return false;
    return true;
  }
}
