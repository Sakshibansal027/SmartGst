import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(backendDir);
try { process.loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
async function findPort(start) {
  for (let port = start; port < start + 50; port++) {
    const available = await new Promise(resolve => {
      const probe = net.createServer();
      probe.once('error', () => resolve(false));
      probe.listen(port, '0.0.0.0', () => probe.close(() => resolve(true)));
    });
    if (available) return port;
  }
  throw new Error(`No free API port found near ${start}. Set SMARTGST_API_PORT to a free port.`);
}
const requestedPort = Number(process.env.SMARTGST_API_PORT || 5000);
const apiPort = process.env.SMARTGST_API_PORT ? requestedPort : await findPort(requestedPort);
const childEnv = { ...process.env, SMARTGST_API_PORT: String(apiPort) };
console.log(`Starting SmartGST API on port ${apiPort}`);
let mongoProcess = null;
if (!process.env.MONGODB_URI) {
  const mongoPortFree = await new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(27017, '0.0.0.0', () => probe.close(() => resolve(true)));
  });
  if (mongoPortFree) {
    fs.mkdirSync(path.join(backendDir, 'mongodb-data'), { recursive: true });
    const mongoBin = process.env.MONGOD_BIN || 'mongod';
    console.log('Starting local MongoDB on port 27017');
    mongoProcess = spawn(mongoBin, ['--dbpath', path.join(backendDir, 'mongodb-data'), '--bind_ip', '127.0.0.1', '--port', '27017'], { cwd: root, stdio: 'inherit', env: process.env });
  } else console.log('Using MongoDB already listening on port 27017');
}
const children = [
  ...(mongoProcess ? [mongoProcess] : []),
  spawn(process.execPath, [path.join(backendDir, 'server.js')], { cwd: root, stdio: 'inherit', env: childEnv }),
  spawn(process.execPath, [path.join(root, 'frontend', 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0'], { cwd: path.join(root, 'frontend'), stdio: 'inherit', env: childEnv })
];
let stopping = false;
function shutdown(signal = 'SIGTERM') {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null && !child.killed) child.kill(signal);
}
for (const child of children) {
  child.on('error', error => { console.error('Could not start a SmartGST service:', error.message); shutdown(); });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error(`A SmartGST service stopped (${signal || code}). Shutting down the other service.`);
      shutdown();
      process.exitCode = code || 1;
    }
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
