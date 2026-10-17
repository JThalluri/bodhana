import fs from 'node:fs';
import path from 'node:path';
import { parseFragment, serialize } from 'parse5';
import { createHash } from 'node:crypto';
export const contentKeys = ['math-tests','place-value','fractions','money-counting','time-problems','math-games','word-puzzles','math-puzzles','sudoku','dictionary-builder','seyes','handwriting','certificates','phonics-worksheets'];
const encodedImages = new Map();
const allowedElements = new Set('a abbr b blockquote br caption code col colgroup dd del details div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img li ol p pre s small span strong sub summary sup table tbody td th thead tfoot tr ul'.split(' '));
const mime = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif' };
export function transformInfo(source, file, { assetRoot = path.resolve('src/content/tool-info'), dependency = () => {}, report = () => {} } = {}) {
  const fail = message => { throw new Error(`${file}: ${message}`); };
  const ast = parseFragment(source);
  const walk = node => {
    if (node.tagName && !allowedElements.has(node.tagName)) fail(`unsupported element ${node.tagName}`);
    for (const attr of node.attrs || []) {
      if (['ping','background','lowsrc','action','formaction'].includes(attr.name) || (attr.name==='src' && node.tagName!=='img')) fail(`unexpected resource attribute ${attr.name}`);
      if (attr.name.startsWith('on') || ['style','srcset','srcdoc'].includes(attr.name)) fail(`unsupported attribute ${attr.name}`);
      if (['href','src','action','xlink:href','poster','background'].includes(attr.name) && /^\s*(javascript|vbscript|data):/i.test(attr.value)) fail('unsafe URL');
    }
    if (node.tagName === 'img') {
      const src = node.attrs.find(a => a.name === 'src');
      if (!src || /^(?:[a-z]+:|\/|\\)/i.test(src.value)) fail('images must use local relative paths');
      if (!node.attrs.some(a => a.name === 'alt')) fail('image requires alt text or explicit alt=""');
      let real;
      try { real = fs.realpathSync(path.resolve(path.dirname(file), src.value)); } catch { fail(`missing image ${src.value}`); }
      const relative = path.relative(fs.realpathSync(assetRoot), real);
      if (relative.startsWith('..') || path.isAbsolute(relative)) fail('image escapes content tree');
      const type = mime[path.extname(real).toLowerCase()]; if (!type) fail('unsupported image type (raster only)');
      const bytes = fs.readFileSync(real);
      const valid = type === 'image/png' ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 : type === 'image/webp' ? bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' : bytes.toString('ascii',0,3) === 'GIF';
      if (!valid) fail('image MIME/signature mismatch');
      const hash=createHash('sha256').update(bytes).digest('hex');
      dependency(real); report({path:real,bytes:bytes.length,hash});
      const cacheKey=real+':'+hash;
      if(!encodedImages.has(cacheKey)) encodedImages.set(cacheKey,`data:${type};base64,${bytes.toString('base64')}`);
      src.value = encodedImages.get(cacheKey);
    }
    if (node.tagName === 'a') {
      const href = node.attrs.find(a => a.name === 'href')?.value || '';
      if (href && !href.startsWith('#') && !/^https:\/\//.test(href)) fail('links must use HTTPS or a fragment');
      if (href.startsWith('https://')) {
        node.attrs = node.attrs.filter(a => !['target','rel'].includes(a.name));
        node.attrs.push({name:'target',value:'_blank'},{name:'rel',value:'noopener noreferrer'});
      }
    }
    for (const child of node.childNodes || []) walk(child);
  };
  // A fragment parser repairs document wrappers, so reject them through parser tokens too.
  if (/<\/?(?:html|head|body)\b/i.test(source)) fail('use a fragment, not a document');
  walk(ast); return serialize(ast);
}
export function toolInfoPlugin() {
  const assets = [];
  return {
    name: 'bodhana-tool-info', enforce:'pre',
    buildStart() {
      for (const key of contentKeys) if (!fs.existsSync(`src/content/tool-info/${key}/content.html`)) this.error(`Missing guidance: ${key}`);
    },
    transform(source, id) {
      if (!id.endsWith('content.html?tool-info')) return;
      const file = id.split('?')[0];
      const html = transformInfo(source,file,{dependency:p=>this.addWatchFile(p),report:a=>assets.push(a)});
      return {code:`export default ${JSON.stringify(html)}`,map:null};
    },
    load(id) { if(id.endsWith('content.html?tool-info')) return fs.readFileSync(id.split('?')[0],'utf8'); },
    handleHotUpdate(ctx) { if(ctx.file.replaceAll('\\','/').includes('/content/tool-info/')) { ctx.server.ws.send({type:'full-reload'}); return []; } },
    closeBundle() {
      const unique = new Map(assets.map(a=>[a.hash,a]));
      console.log(`[tool-info] ${assets.length} image references; ${unique.size} unique; ${[...unique.values()].reduce((n,a)=>n+a.bytes,0)} source bytes; ${assets.reduce((n,a)=>n+a.bytes,0)} referenced bytes`);
    }
  };
}
