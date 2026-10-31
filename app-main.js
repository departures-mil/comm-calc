// Comm Calc masaüstü ana süreci: pencere, veri dosyası, dosya içe/dışa aktarma ve uygulama içi güncelleme.
const { app, BrowserWindow, ipcMain, dialog, shell, net, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const JSZip = require('jszip');

const PKG = require('./package.json');
const SHELL = global.__ccShell || {
  dir: __dirname, version: PKG.version, shell: PKG.ccShell || 1,
  updDir: path.join(app.getPath('appData'), 'Comm Calc', 'guncelleme'),
  code: v => { const p = String(v || '0').split('.').map(n => parseInt(n, 10) || 0); return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0); }
};
const USER = path.join(app.getPath('appData'), 'Comm Calc');
const DATA = path.join(USER, 'veri.json');
const REPO = 'departures-mil/comm-calc';
fs.mkdirSync(USER, { recursive: true });

let win;
function createWindow() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 980, minHeight: 640, backgroundColor: '#0d1520',
    title: 'Comm Calc v' + shortVer(PKG.version),
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  // Dış bağlantılar varsayılan tarayıcıda açılır
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F12') win.webContents.toggleDevTools();
    if (i.type === 'keyDown' && i.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}
function shortVer(v) { const p = String(v).split('.'); return p[0] + '.' + (p[1] || 0) + (p[2] && p[2] !== '0' ? '.' + p[2] : ''); }

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

// ---- Veri (projeler, kütüphane, ayarlar): tek JSON dosyası; yazma önce geçici dosyaya yapılır
ipcMain.handle('app:info', () => ({ version: PKG.version, short: shortVer(PKG.version), shell: SHELL.shell, dataDir: USER, repo: REPO, platform: 'desktop' }));
ipcMain.handle('store:load', () => { try { return JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch { return null; } });
ipcMain.handle('store:save', (e, obj) => {
  const tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj));
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

// ---- Uygulama içi güncelleme (GitHub sürümleri): imzalı guncelleme.zip indirilir, doğrulanır, kurulur
const UPD_ACTIVE = path.join(SHELL.updDir, 'aktif.json');
async function getJson(url) {
  const r = await net.fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'CommCalc/' + PKG.version } });
  if (r.status === 404) return { assets: [] }; // henüz yayınlanmış sürüm yok
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function getBuf(url) {
  const r = await net.fetch(url, { headers: { 'User-Agent': 'CommCalc/' + PKG.version } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}
ipcMain.handle('update:check', async () => {
  try {
    const rel = await getJson(`https://api.github.com/repos/${REPO}/releases/latest`);
    const asset = n => (rel.assets || []).find(a => a.name === n);
    const meta = asset('guncelleme.json');
    if (!meta) return { ok: true, available: false, current: PKG.version };
    const info = JSON.parse((await getBuf(meta.browser_download_url)).toString('utf8'));
    const exe = (rel.assets || []).find(a => /\.exe$/i.test(a.name));
    return {
      ok: true, current: PKG.version, version: info.version, notes: rel.body || '', name: rel.name || rel.tag_name,
      available: SHELL.code(info.version) > SHELL.code(PKG.version),
      needsFull: (info.minShell || 1) > SHELL.shell, exeUrl: exe && exe.browser_download_url, pageUrl: rel.html_url
    };
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});
const signed = (version, sha256, sig) => crypto.verify('sha256', Buffer.from(`CC-GUNCELLEME\n${version}\n${sha256}`),
  { key: require('./lib/update-key'), dsaEncoding: 'der' }, Buffer.from(sig, 'base64'));
ipcMain.handle('update:install', async () => {
  try {
    const rel = await getJson(`https://api.github.com/repos/${REPO}/releases/latest`);
    const asset = n => (rel.assets || []).find(a => a.name === n);
    if (!asset('guncelleme.json') || !asset('guncelleme.zip')) return { ok: false, error: 'Sürümde güncelleme paketi yok' };
    const info = JSON.parse((await getBuf(asset('guncelleme.json').browser_download_url)).toString('utf8'));
    if ((info.minShell || 1) > SHELL.shell) return { ok: false, error: 'full' };
    const buf = await getBuf(asset('guncelleme.zip').browser_download_url);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    if (sha !== info.sha256 || !signed(info.version, sha, info.sig)) return { ok: false, error: 'İmza doğrulanamadı' };
    const zip = await JSZip.loadAsync(buf);
    const name = 'v' + info.version, tmp = path.join(SHELL.updDir, name + '.tmp'), dst = path.join(SHELL.updDir, name);
    fs.rmSync(tmp, { recursive: true, force: true });
    for (const f of Object.values(zip.files)) {
      if (f.dir) continue;
      const out = path.resolve(tmp, f.name);
      if (!out.startsWith(tmp + path.sep)) continue;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, await f.async('nodebuffer'));
    }
    if (!fs.existsSync(path.join(tmp, 'app-main.js'))) return { ok: false, error: 'Paket eksik' };
    fs.rmSync(dst, { recursive: true, force: true });
    fs.renameSync(tmp, dst);
    fs.writeFileSync(UPD_ACTIVE, JSON.stringify({ version: info.version, dir: name, tries: 0 }));
    for (const n of fs.readdirSync(SHELL.updDir)) if (/^v\d/.test(n) && n !== name) try { fs.rmSync(path.join(SHELL.updDir, n), { recursive: true, force: true }); } catch {}
    return { ok: true, version: info.version };
  } catch (err) { return { ok: false, error: String(err.message || err) }; }
});
ipcMain.handle('update:restart', () => { app.relaunch(); app.exit(0); });
// Arayüz sorunsuz açıldı: güncellemenin deneme sayacı sıfırlanır
ipcMain.handle('update:ok', () => {
  try { const a = JSON.parse(fs.readFileSync(UPD_ACTIVE, 'utf8')); if (a.tries) { a.tries = 0; fs.writeFileSync(UPD_ACTIVE, JSON.stringify(a)); } } catch {}
});
