import {WebSocketServer} from 'ws';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

const port=Number(process.env.PORT)||3001;
const publicDir=join(dirname(fileURLToPath(import.meta.url)),'public');
const files=new Map([
  ['/','index.html'],['/index.html','index.html'],['/main.js','main.js'],['/style.css','style.css']
]);
const mime=new Map([['index.html','text/html; charset=utf-8'],['main.js','text/javascript; charset=utf-8'],['style.css','text/css; charset=utf-8']]);
const players=new Map();
const http=createServer(async(req,res)=>{
  const path=(req.url||'/').split('?')[0];
  if(path==='/health'){
    res.writeHead(200,{'content-type':'application/json'});
    res.end(JSON.stringify({ok:true,players:players.size,worldSize:8192}));
    return;
  }
  const file=files.get(path);
  if(!file){res.writeHead(404);res.end('Not found');return}
  try {
    const body=await readFile(join(publicDir,file));
    res.writeHead(200,{'content-type':mime.get(file),'cache-control':'no-cache'});
    res.end(body);
  }catch(err){console.error('Static file failure:',err);res.writeHead(500);res.end('Game files unavailable')}
});
const wss=new WebSocketServer({server:http});
wss.on('connection',ws=>{
  const id=randomUUID();
  players.set(id,{id,x:0,z:0});
  ws.send(JSON.stringify({type:'welcome',id}));
  ws.on('message',raw=>{
    if(raw.length>1024)return;
    let m;try{m=JSON.parse(String(raw))}catch{return}
    if(m?.type!=='move'||!Number.isFinite(m.x)||!Number.isFinite(m.z))return;
    const player=players.get(id);
    if(player){
      player.x=Math.max(-4091,Math.min(4091,m.x));
      player.z=Math.max(-4091,Math.min(4091,m.z));
    }
  });
  ws.on('close',()=>players.delete(id));
});
setInterval(()=>{
  const payload=JSON.stringify({type:'state',players:[...players.values()]});
  for(const client of wss.clients)if(client.readyState===1)client.send(payload);
},100);
http.listen(port,'0.0.0.0',()=>console.log('FUCK world / game server running on port '+port));
