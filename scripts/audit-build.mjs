import fs from 'node:fs';
import {parse} from 'parse5';
for(const dir of ['dist','dist-hosted']) {
 const html=fs.readFileSync(`${dir}/index.html`,'utf8');const ast=parse(html);let errors=[];let resources=[];
 const walk=n=>{for(const a of n.attrs||[]){if((a.name==='src' || n.tagName==='link' && a.name==='href') && !a.value.startsWith('data:'))resources.push(a.value);}for(const c of n.childNodes||[])walk(c);};walk(ast);
 for(const resource of resources) {
  if(dir==='dist' || !resource.endsWith('/manifest.webmanifest'))errors.push(resource);
 }
 if(errors.length)throw Error(`${dir}: unresolved runtime resources ${errors.join(', ')}`);
 console.log(`${dir}/index.html: ${Buffer.byteLength(html)} bytes; runtime companion references: ${resources.join(', ') || 'none'}`);
}
