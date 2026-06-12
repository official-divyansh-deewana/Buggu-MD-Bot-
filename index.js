import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[INDEX.JS] Starting BUGGU MD via compiled full-stack server...');

// Spawns node dist/server.js in a separate processes
const serverProcess = spawn('node', [path.join(__dirname, 'dist', 'server.js')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
  }
});

serverProcess.on('exit', (code) => {
  console.log(`[INDEX.JS] Server process completed with exit code: ${code}`);
  process.exit(code || 0);
});
