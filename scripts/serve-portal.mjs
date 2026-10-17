import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const port=Number(process.env.PORT || 4178);
const base=process.env.BODHANA_BASE || JSON.parse(fs.readFileSync('dist-hosted/release.json','utf8')).base;
const types={'.html':'text/html','.js':'application/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(!url.pathname.startsWith(base)) {res.writeHead(404).end();return;}
 let file=decodeURIComponent(url.pathname.slice(base.length)) || 'index.html';
 const root=path.resolve('dist-hosted'), target=path.resolve(root,file);
 if(!target.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
 try {const body=fs.readFileSync(target);res.writeHead(200,{'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(body);} catch{res.writeHead(404).end();}
}).listen(port,'127.0.0.1',()=>console.log(`Hosted artifact: http://127.0.0.1:${port}${base}`));
