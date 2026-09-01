const { spawn } = require('node:child_process');

const MEDIA_KEYS = Object.freeze({
  previous: 0xB1,
  playPause: 0xB3,
  next: 0xB0,
  mute: 0xAD,
  volumeDown: 0xAE,
  volumeUp: 0xAF,
});

function resolveMediaKey(action) {
  if (!Object.hasOwn(MEDIA_KEYS, action)) throw new Error('不支持的媒体操作');
  return MEDIA_KEYS[action];
}

function controlMedia(action) {
  const virtualKey = resolveMediaKey(action);
  const command = `$signature='[DllImport("user32.dll")]public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);'; Add-Type -MemberDefinition $signature -Name NativeKeys -Namespace DesktopDock; [DesktopDock.NativeKeys]::keybd_event(${virtualKey},0,0,[UIntPtr]::Zero); [DesktopDock.NativeKeys]::keybd_event(${virtualKey},0,2,[UIntPtr]::Zero)`;
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, stdio: 'ignore' });
    child.once('error', (error) => resolve({ success: false, error: error.message }));
    child.once('exit', (code) => resolve(code === 0 ? { success: true } : { success: false, error: '系统媒体控制未响应' }));
  });
}

module.exports = { MEDIA_KEYS, controlMedia, resolveMediaKey };
