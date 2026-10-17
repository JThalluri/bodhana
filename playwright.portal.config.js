import fs from 'node:fs';
const base=JSON.parse(fs.readFileSync('dist-hosted/release.json','utf8')).base;
import {defineConfig} from 'playwright/test';
export default defineConfig({
 testDir:'./tests/portal',testMatch:'**/*.e2e.spec.js',timeout:45000,workers:1,
 use:{browserName:process.env.PORTAL_BROWSER || 'chromium',headless:true,viewport:{width:1024,height:768},launchOptions:process.env.PORTAL_CHROME && process.env.PORTAL_BROWSER!=='webkit' ? {executablePath:process.env.PORTAL_CHROME}:{}},
 outputDir:process.env.PORTAL_BROWSER==='webkit'?'artifacts/webkit-results':'artifacts/portal-results',reporter:[['list'],['html',{outputFolder:process.env.PORTAL_BROWSER==='webkit'?'artifacts/webkit-report':'artifacts/portal-report',open:'never'}]],
 webServer:{command:'npm run serve:portal',url:`http://127.0.0.1:4178${base}`,reuseExistingServer:false}
});
