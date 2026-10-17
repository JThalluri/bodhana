import { build } from 'vite';
process.env.BODHANA_TARGET='hosted';
await build();
