import fs from 'node:fs';
export const licenseFiles = [
 ...['andika','nunito','patrick-hand','quicksand','open-sans'].map(name=>[`font-${name}`,`node_modules/@fontsource/${name}/LICENSE`]),
 ['fontawesome','node_modules/@fortawesome/fontawesome-free/LICENSE.txt'],
 ['pdfjs','node_modules/pdfjs-dist/LICENSE'],['mammoth','node_modules/mammoth/LICENSE'],['jszip','node_modules/jszip/LICENSE.markdown']
];
export function licensesPlugin(){
 return {name:'bodhana-licenses',transformIndexHtml:{order:'post',handler(html){
  const notices=Object.fromEntries(licenseFiles.map(([name,file])=>[name,fs.readFileSync(file,'utf8')]));
  const block=`<script type="application/json" id="third-party-licenses">${JSON.stringify(notices).replaceAll('<','\\u003c')}</script>`;
  const at=html.lastIndexOf('</body>');return html.slice(0,at)+block+html.slice(at);
 }}};
}
