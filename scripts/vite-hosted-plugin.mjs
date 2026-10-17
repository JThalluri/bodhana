import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export function hostedPlugin(base) {
 return {
  name:'bodhana-hosted', enforce:'post',
  transformIndexHtml(html) { return html.replace('</head>', `<link rel="manifest" href="${base}manifest.webmanifest"><meta name="theme-color" content="#c2410c"></head>`); },
  closeBundle() {
    const dir='dist-hosted';
    for(const name of ['icon-192.png','icon-512.png','icon-maskable.png']) fs.copyFileSync(`src/pwa/${name}`,path.join(dir,name));
    fs.writeFileSync(path.join(dir,'manifest.webmanifest'),JSON.stringify({id:base,name:'Bodhana Learning Tools',short_name:'Bodhana',start_url:base,scope:base,display:'standalone',theme_color:'#c2410c',background_color:'#f0f4f8',icons:[{src:base+'icon-192.png',sizes:'192x192',type:'image/png'},{src:base+'icon-512.png',sizes:'512x512',type:'image/png'},{src:base+'icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},null,2));
    const files=fs.readdirSync(dir).sort().filter(f=>!['sw.js','release.json'].includes(f));
    const template=fs.readFileSync('src/pwa/sw-template.js','utf8');
    const hash=createHash('sha256').update(base).update(JSON.stringify(files)).update(template);
    for(const file of files) hash.update(fs.readFileSync(path.join(dir,file)));
    const version=hash.digest('hex').slice(0,16);
    const prefix='bodhana:'+base+':';
    const worker=template.replace('__CONFIG__',JSON.stringify({base,version,prefix,assets:files.map(f=>base+f)}));
    fs.writeFileSync(path.join(dir,'sw.js'),worker);
    fs.writeFileSync(path.join(dir,'release.json'),JSON.stringify({version,base,files},null,2));
    console.log(`[hosted] ${base} release ${version}, ${files.length} required assets`);
  }
 };
}
