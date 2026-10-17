import { licenseFiles } from './vite-licenses-plugin.mjs';
﻿import fs from 'node:fs';
import path from 'node:path';
const release=JSON.parse(fs.readFileSync('dist-hosted/release.json','utf8'));
const target=path.resolve('artifacts/pages-release');
const artifactRoot=path.resolve('artifacts');
if(path.dirname(target)!==artifactRoot || path.basename(target)!=='pages-release') throw new Error('Unsafe staging target');
fs.rmSync(target,{recursive:true,force:true});
fs.mkdirSync(target,{recursive:true});
// An explicit allowlist prevents copying source, settings, credentials or user files.
for(const file of [...release.files,'sw.js','release.json']) fs.copyFileSync(path.join('dist-hosted',file),path.join(target,file));
fs.mkdirSync(path.join(target,'.github/workflows'),{recursive:true});
fs.copyFileSync('deployment/pages-repository/.github/workflows/pages.yml',path.join(target,'.github/workflows/pages.yml'));
fs.copyFileSync('deployment/pages-repository/README.md',path.join(target,'README.md'));
fs.writeFileSync(path.join(target,'.nojekyll'),'');
for(const file of fs.readdirSync('.').filter(f=>/^licen[sc]e/i.test(f))) fs.copyFileSync(file,path.join(target,file));
fs.mkdirSync(path.join(target,'licenses'),{recursive:true});
for(const [name,file] of licenseFiles) fs.copyFileSync(file,path.join(target,`licenses/${name}.txt`));
console.log(`Staged ${release.version} at ${target}`);
