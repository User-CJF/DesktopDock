const { spawn } = require('node:child_process');
const electronPath = require('electron');

const child = spawn(electronPath, ['.', '--no-sandbox', '--disable-gpu', '--disable-features=Vulkan'], {
  cwd: process.cwd(),
  env: { ...process.env, DESKTOPDOCK_SMOKE_TEST: '1' },
  stdio: 'inherit',
  windowsHide: true,
});

const timeout = setTimeout(() => {
  console.error('DesktopDock smoke test timed out before the renderer reported readiness.');
  child.kill();
}, 90000);

child.on('exit', (code) => {
  clearTimeout(timeout);
  process.exit(code ?? 1);
});
child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
