import { licensesPlugin } from './scripts/vite-licenses-plugin.mjs';
﻿import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { toolInfoPlugin } from './scripts/vite-tool-info-plugin.mjs';
import { hostedPlugin } from './scripts/vite-hosted-plugin.mjs';
import deploymentTarget from './deployment/target.json';
const hosted = process.env.BODHANA_TARGET === 'hosted';
const base = hosted ? (process.env.BODHANA_BASE || deploymentTarget.base) : './';
if (hosted && base !== '/' && (!/^\/[a-zA-Z0-9/_.-]*\/$/.test(base) || base.includes('//') || base.split('/').some(part=>part==='.' || part==='..'))) throw new Error('BODHANA_BASE must be an absolute directory path ending in /');
export default defineConfig({
  base,
  define: { __HOSTED_PRODUCTION__: JSON.stringify(hosted), __APP_BASE__: JSON.stringify(base) },
  plugins: [licensesPlugin(), toolInfoPlugin(), viteSingleFile(), ...(hosted ? [hostedPlugin(base)] : [])],
  test: { exclude: ['**/*.e2e.spec.js','node_modules/**','.npm-cache/**'] },
  build: { outDir: hosted ? 'dist-hosted':'dist', target:'esnext', assetsInlineLimit:100_000_000,
    rollupOptions:{output:{inlineDynamicImports:true}} }
});
