import { chromium } from 'playwright';
import fs from 'node:fs';
const b=await chromium.launch(process.env.PORTAL_CHROME ? {executablePath:process.env.PORTAL_CHROME} : {});
const p=await b.newPage();
const source='data:image/png;base64,'+fs.readFileSync('src/pwa/brand-favicon.png').toString('base64');
for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable.png',512]]) {
 const data=await p.evaluate(async({source,size})=>{const image=new Image();image.src=source;await image.decode();const c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);const side=size*.6;ctx.drawImage(image,(size-side)/2,(size-side)/2,side,side);return c.toDataURL('image/png').split(',')[1];},{source,size});
 fs.writeFileSync('src/pwa/'+name,Buffer.from(data,'base64'));
}
await b.close();
