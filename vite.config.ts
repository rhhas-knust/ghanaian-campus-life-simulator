import { defineConfig } from 'vite';

/**
 * Vite configuration for Campus Life: The Journey.
 *
 * `base` MUST match the GitHub Pages project-site sub-directory, otherwise every
 * bundled asset 404s once deployed:
 *   https://rhhas-knust.github.io/ghanaian-campus-life-simulator/
 *                                 ^------------ base -----------^
 *
 * Keep the leading AND trailing slash. If the repository is ever renamed, or the
 * site is moved to a custom/user domain served from the root, change this single
 * value (see DEPLOYMENT.md).
 */
export const BASE_PATH = '/ghanaian-campus-life-simulator/';

export default defineConfig({
  base: BASE_PATH,
  build: {
    // GitHub Pages' official deploy action uploads this directory as the artifact.
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    // Keep the first paint small on modest Android phones: three.js is split out
    // so the engine chunk can be cached independently of our game code.
    rollupOptions: {
      output: {
        manualChunks: (id: string): string | undefined =>
          id.includes('node_modules/three') ? 'three' : undefined,
      },
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
