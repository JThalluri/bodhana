import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  test: {
    exclude: ['**/*.e2e.spec.js', 'node_modules/**'],
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    // Inline all assets (fonts, images) up to this threshold
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        // Bundle all dynamic imports into one chunk — required for file:// compatibility
        inlineDynamicImports: true,
      },
    },
  },
});
