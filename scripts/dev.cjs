const http = require('node:http');
const { spawn } = require('node:child_process');

const root = process.cwd();
const viteBin = require.resolve('vite/bin/vite.js');
const electronBin = require('electron');
const devUrl = 'http://127.0.0.1:5173';

const vite = spawn(process.execPath, [viteBin, '--host', '127.0.0.1'], {
  cwd: root,
  stdio: 'inherit',
});

let electron = null;
let stopped = false;

function stop(exitCode = 0) {
  if (stopped) return;
  stopped = true;
  electron?.kill();
  vite.kill();
  process.exitCode = exitCode;
}

function waitForVite(attempt = 0) {
  const request = http.get(devUrl, (response) => {
    response.resume();
    electron = spawn(electronBin, ['.'], {
      cwd: root,
      env: { ...process.env, VITE_DEV_SERVER_URL: devUrl },
      stdio: 'inherit',
    });
    electron.on('exit', (code) => stop(code ?? 0));
  });

  request.on('error', () => {
    if (attempt >= 80) return stop(1);
    setTimeout(() => waitForVite(attempt + 1), 150);
  });
}

vite.on('exit', (code) => {
  if (!stopped && code) stop(code);
});

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
waitForVite();
