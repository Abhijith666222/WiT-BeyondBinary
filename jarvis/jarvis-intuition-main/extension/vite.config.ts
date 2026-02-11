import { defineConfig } from 'vite';
import { resolve } from 'path';

// Chrome MV3: content scripts cannot use ES module imports/exports.
// Background service workers support type:"module" but IIFE also works.
// We build each entry point separately to avoid code-splitting across them.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
        // ES format is fine as long as we prevent shared chunks.
        // With no shared code between content & background, each entry
        // becomes a self-contained bundle with no import/export.
        format: 'es'
      }
    },
    sourcemap: true,
    minify: false
  },
  publicDir: 'public'
});
