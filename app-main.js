// Comm Calc masaüstü ana süreci: pencere (ortak çekirdek: tam ekran, sağ üst pencere düğmeleri, GitHub Releases güncellemesi,
// ana süreç hata raporu), veri dosyası, dosya içe/dışa aktarma ve Wi-Fi (LAN) eşitleme taşıyıcısı.
//
// İki kabukta çalışır:
//  - Yeni kabuk (main.js, ccShell 3, NSIS kurulumu): güncelleme kanalı 'win-app' (app.asar yama / tam dosya), kurulum kanalı 'win-setup'.
//  - Eski kabuk (taşınabilir exe, ccShell 1–2): eski main.js bu dosyayı %APPDATA%\Comm Calc\guncelleme\v<sürüm>\ altından yükler
//    (eski imzalı guncelleme.zip köprüsü). Orada app.asar geçicidir, bu yüzden kanal 'win-setup': "Güncelle" yeni kurulum
//    programını indirir, SHA-256 ile doğrular ve çalıştırır. Veriler (%APPDATA%\Comm Calc\veri.json) iki kabukta da aynıdır.
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const fc = require('./cekirdek/electron/fc-electron-main');

const PKG = require('./package.json');
const SHELL = global.__ccShell || {
  dir: __dirname, version: PKG.version, shell: PKG.ccShell || 3, updDir: null,
  code: v => { const p = String(v || '0').split('.').map(n => parseInt(n, 10) || 0); return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0); }
};
const LEGACY = (SHELL.shell || 1) < 3;              // eski taşınabilir exe içinde mi?
const USER = path.join(app.getPath('appData'), 'Comm Calc');
const DATA = path.join(USER, 'veri.json');
const REPO = 'departures-mil/comm-calc';
const SMOKE = !!process.env.CC_SMOKE;
fs.mkdirSync(USER, { recursive: true });

// Tek kopya: ikinci açılış mevcut pencereyi öne getirir (iki pencere aynı veri dosyasına yazmasın)
const gotLock = SMOKE || app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

let win;
function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow(fc.windowOptions({
    minWidth: 980, minHeight: 640, backgroundColor: '#070b14',
    title: 'Comm Calc v' + PKG.version,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    // sandbox:false → preload ortak çekirdeğin fc-preload.js'ini require edebilir (contextIsolation açık kalır)
    webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: false }
  }));
  fc.install(win, LEGACY ? { channel: 'win-setup', cleanup: false } : { channel: 'win-app' });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // Dış bağlantılar varsayılan tarayıcıda açılır
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https:\/\//i.test(url)) shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F12') win.webContents.toggleDevTools();
    if (i.type === 'keyDown' && i.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
  if (SMOKE) smoke();
}

// Electron açılış testi (test/electron-smoke.test.js): pencere yüklendi mi, çekirdek başladı mı?
function smoke() {
  const out = o => process.stdout.write('CC_SMOKE ' + JSON.stringify(o) + '\n');
  const consoleErrors = [];
  win.webContents.on('console-message', (e, level, message) => { if (level >= 3) consoleErrors.push(String(message).slice(0, 300)); });
  const fail = setTimeout(() => { out({ ok: false, error: 'timeout' }); app.exit(2); }, 45000);
  win.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        const r = await win.webContents.executeJavaScript(`({
          fc: !!(window.FC && FC.updater && FC.topbar), host: window.FC && FC.host.kind, fcHost: !!window.fcHost, api: !!window.api,
          version: window.APP_RELEASE && APP_RELEASE.version, appVersion: typeof App !== 'undefined' && App.version, scheme: document.documentElement.dataset.scheme,
          topbar: !!document.querySelector('.topbar .topbar-actions'), winBtns: document.querySelectorAll('.topbar .win-controls button').length,
          nav: document.querySelectorAll('#nav .nav-item').length, view: !!document.querySelector('#view .card'),
          title: document.title, errors: (window.__ccErrors || []).slice(0, 5)
        })`);
        r.fullscreen = win.isFullScreen(); r.electronVersion = app.getVersion();
        r.errors = r.errors.concat(consoleErrors.filter(m => !/net::|Failed to load resource|ERR_/.test(m)));
        // Ayarlar: Admin ile iletişim EN SONDA, Hakkında ondan önce
        r.settings = await win.webContents.executeJavaScript(`(App.go('settings'), new Promise(res => setTimeout(() => {
          const cards = [...document.querySelectorAll('.settings-grid > *')].map(c => c.getAttribute('data-fc-card') || c.id || '');
          res(cards);
        }, 400)))`);
        clearTimeout(fail);
        out(Object.assign({ ok: r.fc && r.host === 'electron' && r.topbar && r.nav > 0 && !r.errors.length }, r));
        app.exit(0);
      } catch (e) { out({ ok: false, error: String(e && e.message || e) }); app.exit(3); }
    }, 2500);
  });
}

app.whenReady().then(() => { if (gotLock) createWindow(); });
app.on('window-all-closed', () => app.quit());

// ---- Veri (projeler, kütüphane, ayarlar): tek JSON dosyası. Yazma atomik: önce .tmp, önceki dosya .yedek olarak kalır.
ipcMain.handle('app:info', () => ({ version: PKG.version, short: PKG.version, shell: SHELL.shell, legacy: LEGACY, dataDir: USER, repo: REPO, platform: 'desktop' }));
ipcMain.handle('store:load', () => {
  for (const f of [DATA, DATA + '.yedek']) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {} }
  return null;
});
ipcMain.handle('store:save', (e, obj) => {
  const s = JSON.stringify(obj), tmp = DATA + '.tmp';
  const fd = fs.openSync(tmp, 'w'); try { fs.writeSync(fd, s); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  try { if (fs.existsSync(DATA)) fs.copyFileSync(DATA, DATA + '.yedek'); } catch {}
  fs.renameSync(tmp, DATA);
  return true;
});
ipcMain.handle('file:saveText', async (e, { name, text, filters }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: filters || [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text);
  return r.filePath;
});
ipcMain.handle('file:openText', async (e, { filters }) => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: filters || [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return fs.readFileSync(r.filePaths[0], 'utf8');
});
ipcMain.handle('shell:open', (e, url) => { if (/^https?:\/\//.test(String(url))) shell.openExternal(url); });
ipcMain.handle('shell:dataDir', () => shell.openPath(USER));
ipcMain.handle('app:restart', () => { app.relaunch(); app.exit(0); });

// Eski kabuk: arayüz sorunsuz açıldı → eski başlatıcının deneme sayacı sıfırlanır (yoksa iki açılıştan sonra eski sürüme döner)
ipcMain.handle('update:ok', () => {
  if (!SHELL.updDir) return;
  const f = path.join(SHELL.updDir, 'aktif.json');
  try { const a = JSON.parse(fs.readFileSync(f, 'utf8')); if (a.tries) { a.tries = 0; fs.writeFileSync(f, JSON.stringify(a)); } } catch {}
});

// ---- İnternetsiz eşitleme (aynı Wi-Fi / modem): ana süreç yalnızca taşır, birleştirmeyi arayüz yapar (src/js/lan.js)
const LAN = require('./lib/lan-sync');
const lanWaits = {};
ipcMain.on('lan:reply', (e, { id, data }) => { const f = lanWaits[id]; delete lanWaits[id]; if (f) f(data); });
ipcMain.handle('lan:start', async () => LAN.start(theirs => new Promise((ok, fail) => {
  const id = crypto.randomUUID();
  lanWaits[id] = ok;
  setTimeout(() => { if (lanWaits[id]) { delete lanWaits[id]; fail(new Error('timeout')); } }, 30000);
  win.webContents.send('lan:incoming', { id, data: theirs });
})));
ipcMain.handle('lan:stop', () => { LAN.stop(); return true; });
ipcMain.handle('lan:state', () => ({ hosting: LAN.hosting, pin: LAN.pin, ips: LAN.localIps(), port: LAN.PORT }));
ipcMain.handle('lan:discover', () => LAN.discover(v => { try { win.webContents.send('lan:scan', v); } catch {} }));
ipcMain.handle('lan:sync', async (e, { host, pin, data }) => {
  try { return { ok: true, data: await LAN.sync(host, pin, data) }; }
  catch (err) { return { ok: false, error: String(err.message || err) }; }
});
