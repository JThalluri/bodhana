import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {transformInfo} from '../../scripts/vite-tool-info-plugin.mjs';
const file=path.resolve('tests/content/fixtures/content.html');
const assetRoot=path.dirname(file);
const options={assetRoot};
describe('trusted guidance transform',()=>{
 it('inlines local raster assets and normalizes external watch links',()=>{
  const html=transformInfo('<table><caption>Example</caption><tr><th>Setting</th></tr><tr><td>Count</td></tr></table><img src="images/chart.png" alt="Example chart"><a href="https://example.org/watch">External video</a>',file,options);
  expect(html).toContain('data:image/png;base64,');expect(html).toContain('noopener noreferrer');expect(html).toContain('target="_blank"');expect(html).toContain('<caption>Example</caption>');
 });
 it.each(['<input type="image" src="https://example.org/image.png">','<a href="https://example.org" ping="https://example.org/track">x</a>','<script>alert(1)</script>','<iframe src="https://example.org"></iframe>','<img src="images/chart.png" onerror="x()" alt="">','<img src="https://example.org/a.png" alt="">','<img src="images/chart.png" srcset="a.png 2x" alt="">','<p style="color:red">x</p>','<a href="javascript:alert(1)">x</a>','<svg><use href="x"/></svg>'])('rejects unsupported markup: %s',html=>expect(()=>transformInfo(html,file,options)).toThrow());
 it('diagnoses missing images, unsupported types and absent alt',()=>{
  for(const html of ['<img src="missing.png" alt="x">','<img src="content.html" alt="x">','<img src="images/chart.png">']) expect(()=>transformInfo(html,file,options)).toThrow();
 });
 it('checks realpath containment',()=>expect(()=>transformInfo('<img src="../../../src/pwa/brand-favicon.png" alt="x">',file,options)).toThrow());
 it('checks MIME signature',()=>expect(()=>transformInfo('<img src="images/invalid.png" alt="x">',file,options)).toThrow(/MIME/));
});
