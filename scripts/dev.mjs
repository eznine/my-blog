/**
 * 一键开发：同时启动 Next.js 站点（3000）与后台 API 服务（3001）。
 * Ctrl+C 一起退出；任一子进程退出则整体退出（后台服务端口被占用时仅提示、不阻塞站点）。
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');

const tag = (name, buf) =>
  buf
    .toString('utf-8')
    .split('\n')
    .filter(Boolean)
    .forEach((l) => console.log(`[${name}] ${l}`));

const children = [];
let exiting = false;

function killAll() {
  for (const c of children) {
    if (c.exitCode !== null) continue;
    if (process.platform === 'win32' && c.pid) {
      spawn('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      c.kill('SIGTERM');
    }
  }
}

function run(name, cmd, args) {
  const c = spawn(cmd, args, { cwd: ROOT, env: process.env });
  children.push(c);
  c.stdout.on('data', (b) => tag(name, b));
  c.stderr.on('data', (b) => tag(name, b));
  return c;
}

const site = run('site', process.execPath, [nextBin, 'dev']);
const admin = run('admin', process.execPath, ['scripts/admin-server.mjs']);

site.on('exit', (code) => {
  if (exiting) return;
  exiting = true;
  console.log(`\n[dev] 站点进程退出（code ${code}），停止全部服务…`);
  killAll();
  process.exit(code ?? 0);
});

admin.on('exit', (code) => {
  if (exiting) return;
  console.log(`\n[dev] 后台服务退出（code ${code}）。站点不受影响；需要后台时另开终端运行 npm run admin。`);
});

const shutdown = () => {
  if (exiting) return;
  exiting = true;
  killAll();
  setTimeout(() => process.exit(0), 300);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', killAll);

console.log('[dev] 启动中：站点 http://localhost:3000 · 后台 http://localhost:3000/admin');
