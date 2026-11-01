import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 1. Generate unique build version timestamp
const buildTime = Date.now().toString();
const versionData = {
  buildTime,
  date: new Date().toISOString()
};

// 2. Write version.json in root (for vite.config.ts)
fs.writeFileSync(path.join(rootDir, 'version.json'), JSON.stringify(versionData, null, 2));

// 3. Ensure public directory exists and write version.json there
const publicDir = path.join(rootDir, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify(versionData, null, 2));

console.log(`[Build] Target build version: ${buildTime}`);

// 4. Run Vite build
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

// 5. Ensure dist directory has version.json
const distDir = path.join(rootDir, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
fs.writeFileSync(path.join(distDir, 'version.json'), JSON.stringify(versionData, null, 2));

// 6. Build Node server bundle if server.ts exists
const serverTs = path.join(rootDir, 'server.ts');
if (fs.existsSync(serverTs)) {
  execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs', {
    cwd: rootDir,
    stdio: 'inherit'
  });
}

console.log(`[Build] Completed successfully with build version: ${buildTime}`);
