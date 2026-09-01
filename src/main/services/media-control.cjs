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

function mediaStatus() {
  const command = String.raw`
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 })[0]
function Await($operation, $type) { $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation)); $task.Wait(); $task.Result }
$managerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType=WindowsRuntime]
$propertiesType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties, Windows.Media.Control, ContentType=WindowsRuntime]
$manager = Await ($managerType::RequestAsync()) $managerType
$session = $manager.GetCurrentSession()
if ($null -eq $session) { @{ available=$false } | ConvertTo-Json -Compress; exit 0 }
$properties = Await ($session.TryGetMediaPropertiesAsync()) $propertiesType
$timeline = $session.GetTimelineProperties()
$playback = $session.GetPlaybackInfo()
@{ available=$true; title=$properties.Title; artist=$properties.Artist; album=$properties.AlbumTitle; status=$playback.PlaybackStatus.ToString(); position=[math]::Round($timeline.Position.TotalSeconds); duration=[math]::Round($timeline.EndTime.TotalSeconds) } | ConvertTo-Json -Compress
`;
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    const timer = setTimeout(() => { child.kill(); resolve({ available: false, error: '媒体会话读取超时' }); }, 4000);
    child.stdout.on('data', (chunk) => { if (output.length < 64 * 1024) output += chunk.toString('utf8'); });
    child.once('error', (error) => { clearTimeout(timer); resolve({ available: false, error: error.message }); });
    child.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) return resolve({ available: false, error: '未找到活动媒体会话' });
      try { return resolve(JSON.parse(output.trim())); } catch { return resolve({ available: false }); }
    });
  });
}

module.exports = { MEDIA_KEYS, controlMedia, mediaStatus, resolveMediaKey };
