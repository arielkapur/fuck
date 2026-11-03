import {WebSocketServer} from 'ws';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
const port=Number(process.env.PORT)||3001;
const players=new Map();
const http=createServer((req,res)=>{res.writeHead(200,{'content-type':'text/plain','access-control-allow-origin':'*'});res.end('FUCK multiplayer server online\n')});
const wss=new WebSocketServer({server:http});
wss.on('connection',ws=>{
 const id=randomUUID();players.set(id,{id,x:0,z:0});ws.send(JSON.stringify({type:'welcome',id}));
 ws.on('message',raw=>{if(raw.length>1024)return;let m;try{m=JSON.parse(String(raw))}catch{return}
  if(m?.type!=='move'||!Number.isFinite(m.x)||!Number.isFinite(m.z))return;
  const p=players.get(id);if(p){p.x=Math.max(-140,Math.min(140,m.x));p.z=Math.max(-140,Math.min(140,m.z));}
 });
 ws.on('close',()=>players.delete(id));
});
setInterval(()=>{const data=JSON.stringify({type:'state',players:[...players.values()]});for(const c of wss.clients)if(c.readyState===1)c.send(data)},100);
http.listen(port,'0.0.0.0',()=>console.log(`FUCK server on ${port}`));