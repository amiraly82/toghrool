import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  let buildTime = Date.now().toString();
  try {
    const versionFile = path.resolve(__dirname, 'version.json');
    if (fs.existsSync(versionFile)) {
      const parsed = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      if (parsed.buildTime) {
        buildTime = parsed.buildTime;
      }
    }
  } catch (e) {
    console.warn("Could not read version.json, using fallback timestamp", e);
  }

  return {
    define: {
      __APP_BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
