// Node duman testi (bağımlılıksız): sürüm, gömülü ortak çekirdek, güncelleme planı, eski kanal köprüsü, Wi‑Fi birleştirme kuralı,
// çeviriler, paketleme ve iş akışı ayarları, dosya bütünlüğü.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const zlib = require('zlib');
const ROOT = path.join(__dirname, '..');
const R = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const pkg = JSON.parse(R('package.json'));

test('tek semver sürüm (etiket vX.Y.Z, kısaltma yok): package.json = surum.js = index.html = NEWS[0] = release-notes', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
  const { outputs } = require('../tools/surum.js');
  const o = outputs();
  for (const [f, c] of Object.entries(o.files)) assert.strictEqual(R(f), c, f + ' eski: node tools/surum.js');
  const { NEWS } = require('../src/js/news.js');
  assert.strictEqual(NEWS[0].v, pkg.version);
  for (const l of ['tr', 'en', 'ar', 'sq']) assert.ok(NEWS[0][l] && NEWS[0][l].length >= 1, 'NEWS[0].' + l);
  for (const f of ['src/js/app.js', 'src/js/android.js', 'src/js/kabuk.js']) assert.ok(!/p\[2\] !== '0'/.test(R(f)), f + ': kısaltılmış sürüm (v1.12) yok');
  assert.strictEqual(pkg.ccShell, 3);
});

test('gömülü ortak çekirdek: sürüm kaydı, modüller, kurulum kanalı düzeltmesi', () => {
  for (const f of ['cekirdek/VERSION', 'src/cekirdek/VERSION']) assert.match(R(f), /^ortak-cekirdek [0-9a-f]{40}\n/);
  delete globalThis.FC;
  require('../src/cekirdek/fc-core.js');
  const FC = globalThis.FC;
  for (const m of ['updater', 'topbar', 'settings', 'contact', 'crash', 'look', 'onboarding', 'whatsnew', 'announcements', 'progress', 'host', 'lanMerge', 'usage']) assert.ok(FC[m], 'FC.' + m);
  const main = R('cekirdek/electron/fc-electron-main.js');
  assert.match(main, /if \(isSetup\(meta\)\) \{/, 'win-setup exe app.asar yerine yazılmamalı');
  assert.ok(main.includes('ELECTRON_RUN_AS_NODE') && !/tasklist \/FI/.test(main), 'güncelleme penceresiz (konsol betiği yok)');
  for (const f of fs.readdirSync(path.join(ROOT, 'src/cekirdek/fonts')).filter(f => f.endsWith('.woff2'))) assert.ok(fs.statSync(path.join(ROOT, 'src/cekirdek/fonts', f)).size > 1000);
  for (const m of R('src/cekirdek/css/tokens.css').matchAll(/url\(([^)]+)\)/g)) assert.ok(fs.existsSync(path.join(ROOT, 'src/cekirdek/css', m[1].replace(/["']/g, ''))), m[1]);
});

test('güncelleme planı: win-app yaması, eski kabukta win-setup (köprü)', () => {
  const FC = globalThis.FC;
  const H = b => crypto.createHash('sha256').update(b).digest('hex');
  const man = { schema: 1, app: 'comm-calc', version: '1.13.0', minVersion: '1.0.0', assets: {
    'win-app': { file: 'CommCalc-1.13.0-win-app.asar', size: 100, sha256: H('a'), patches: { '1.12.0': { file: 'CommCalc-win-app.patch-from-1.12.0.bin', size: 10, sha256: H('b') } } },
    'win-setup': { file: 'CommCalc-1.13.0-win-setup.exe', size: 200, sha256: H('c') } } };
  const o = { repo: 'comm-calc', app: 'comm-calc', version: '1.12.0', channel: 'win-app', setupChannel: 'win-setup' };
  const p = FC.updater.plan(man, o);
  assert.strictEqual(p.mode, 'patch');
  assert.strictEqual(p.url, 'https://github.com/departures-mil/comm-calc/releases/download/v1.13.0/CommCalc-win-app.patch-from-1.12.0.bin');
  // eski taşınabilir exe: kabuk.js sürümü 0.0.0 verip win-setup kanalını ister → her zaman tam kurulum
  const q = FC.updater.plan(Object.assign({}, man, { version: '1.12.0' }), { repo: 'comm-calc', app: 'comm-calc', version: '0.0.0', channel: 'win-setup' });
  assert.strictEqual(q.channel, 'win-setup'); assert.strictEqual(q.mode, 'full');
  assert.strictEqual(FC.updater.plan(man, Object.assign({}, o, { version: '1.13.0' })), null);
  // kabuk.js: eski masaüstünde kurulum köprüsü, eski APK'da guncelleme.zip uyarlayıcısı; aralıklı denetim pratikte kapalı
  const k = R('src/js/kabuk.js');
  assert.match(k, /version: '0\.0\.0', channel: 'win-setup'/);
  assert.match(k, /intervalHours: 500/);
  assert.ok(500 * 3600000 < 2 ** 31 - 1, 'setInterval taşmasın');
  assert.match(R('src/index.html'), /cekirdek\/fc-core\.js/);
});

test('FCD1 yama uygulayıcı (Electron ana süreç) — FORMAT.md test vektörü', () => {
  const { applyFcd1 } = require('../cekirdek/electron/fcd1.js');
  const sha = b => crypto.createHash('sha256').update(b).digest();
  const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; };
  const src = Buffer.alloc(0), dst = Buffer.from('abc');
  const patch = Buffer.concat([Buffer.from('FCD1'), Buffer.from([1]), u64(0), sha(src), u64(3), sha(dst), zlib.deflateSync(Buffer.from([2, 3, 0x61, 0x62, 0x63, 0]))]);
  assert.strictEqual(applyFcd1(src, patch).toString(), 'abc');
  assert.throws(() => applyFcd1(Buffer.from('x'), patch));
});

// Tarayıcı betiklerini bir vm bağlamında yükler (DOM'suz, en küçük taklitlerle)
function browserCtx() {
  const ctx = { console, setTimeout, clearTimeout, Date, JSON, Math, Object, Array, Set, Map, Promise, String, Number, Error };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  const run = f => vm.runInContext(R(f) + '\n;this.__x = 1;', ctx, { filename: f });
  run('src/cekirdek/fc-core.js');
  return { ctx, run };
}

test('Wi‑Fi eşitleme: hiçbir kayıt silinmez (uzak silme → arşiv, çakışma → yedek), eski cihaza tomb gönderilmez', () => {
  const { ctx } = browserCtx();
  vm.runInContext(R('src/js/data.js') + '\nthis.DATA = DATA;', ctx);
  vm.runInContext(`var t = (s, v) => s.replace(/\\{(\\w+)\\}/g, (m, k) => v && v[k] !== undefined ? v[k] : m); var toast = () => {}; var App = { current: null, go() {} };
    var Store = { data: null, flush: async () => {}, save() {} };`, ctx);
  vm.runInContext(R('src/js/lan.js') + '\nthis.LanSync = LanSync;', ctx);
  const T = 1700000000000;
  ctx.Store.data = { projects: [{ id: 'p1', name: 'A', updatedAt: T }, { id: 'p2', name: 'B', updatedAt: T }, { id: 'p3', name: 'C', updatedAt: T }], library: [{ id: 'l1', name: 'L', updatedAt: T }], tomb: {}, currentId: 'p1' };
  // uzak: p1 silindi (sonra), p2 daha yeni, p3 aynı zamanda farklı (çakışma), yeni p4; eski sürüm cihaz gibi "tomb"
  const remote = { app: 'commcalc', projects: [{ id: 'p2', name: 'B2', updatedAt: T + 10 }, { id: 'p3', name: 'C-other', updatedAt: T }, { id: 'p4', name: 'D', updatedAt: T + 5 }], library: [{ id: 'l1', name: 'L', updatedAt: T }], tomb: { p1: T + 20 } };
  const res = ctx.LanSync.merge(remote);
  const d = ctx.Store.data;
  const ids = JSON.parse(JSON.stringify(d.projects.map(p => p.id).sort()));
  assert.deepStrictEqual(ids, ['p2', 'p3', 'p4']);
  assert.strictEqual(d.projects.find(p => p.id === 'p2').name, 'B2');
  assert.strictEqual(d.arsiv.length, 1); assert.strictEqual(d.arsiv[0].kayit.id, 'p1'); assert.strictEqual(d.arsiv[0].kayit.name, 'A');
  assert.strictEqual(res.archived, 1);
  // p2'nin eski hâli ve p3'ün kaybeden hâli çakışma yedeğinde
  const lost = d.cakisma.map(c => c.kayit.id + ':' + c.kayit.name).sort();
  assert.ok(lost.includes('p2:B'), JSON.stringify(lost));
  assert.strictEqual(lost.filter(x => x.startsWith('p3:')).length, 1);
  assert.strictEqual(d.currentId, 'p2');
  // ikinci kez aynı eşitleme arşive/yedeğe kopya eklemez
  ctx.LanSync.merge(remote);
  assert.strictEqual(d.arsiv.length, 1);
  // gönderilen paket: eski (≤1.11) cihazlar için tomb boş, silme izleri "silinen"de
  const pl = ctx.LanSync.payload();
  assert.strictEqual(Object.keys(pl.tomb).length, 0); assert.ok(pl.silinen.p1); assert.strictEqual(pl.v, 2);
  assert.ok(!/splice\(/.test(R('src/js/lan.js')), 'lan.js kayıt silmemeli (splice yok)');
});

test('tüm arayüz ve ana süreç dosyaları sözdizimi olarak geçerli; eski kopya modüller kaldırıldı', () => {
  const files = ['main.js', 'app-main.js', 'preload.js', 'lib/lan-sync.js', 'cekirdek/electron/fc-electron-main.js', 'cekirdek/electron/fc-preload.js', 'cekirdek/electron/fcd1.js']
    .concat(fs.readdirSync(path.join(ROOT, 'src/js')).filter(f => f.endsWith('.js')).map(f => 'src/js/' + f));
  for (const f of files) assert.doesNotThrow(() => new vm.Script(R(f), { filename: f }), f);
  for (const f of ['src/js/duyuru.js', 'src/js/kullanim.js', 'src/js/indirme-ilerleme.js', 'tools/release.mjs']) assert.ok(!fs.existsSync(path.join(ROOT, f)), f + ' çekirdekle değişti');
  const am = R('app-main.js');
  assert.ok(!/update:install|update:check|jszip/i.test(am), 'eski imzalı zip güncelleyicisi ana süreçten kaldırıldı');
  assert.match(am, /fc\.install\(win, LEGACY \? \{ channel: 'win-setup'/);
  assert.match(am, /ipcMain\.handle\('update:ok'/, 'eski başlatıcının deneme sayacı sıfırlanmalı');
  assert.ok(!/AIza/.test(R('src/js/ai.js')), 'sahibin anahtarı uygulamada yok');
});

test('index.html: başvurulan her dosya var, sıra doğru', () => {
  const html = R('src/index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"#:]+)"/g)].map(m => m[1]).filter(r => r !== 'vendor/firebase-ai.js');
  assert.ok(refs.length > 20);
  for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, 'src', r)), 'eksik: ' + r);
  const pos = s => html.indexOf(s);
  assert.ok(pos('cekirdek/css/tokens.css') < pos('cekirdek/css/core.css') && pos('cekirdek/css/core.css') < pos('styles.css'));
  assert.ok(pos('cekirdek/fc-core.js') < pos('js/kabuk.js') && pos('js/lan.js') < pos('js/kabuk.js') && pos('js/kabuk.js') < pos('js/app.js'));
  assert.ok(!/<script>/.test(html), 'CSP: satır içi betik yok');
});

test('çeviriler: yeni metinlerin en/ar (i18n-ui) ve sq (i18n-sq) karşılığı var; çekirdek metinleri için sq sözlüğü', () => {
  const ui = R('src/js/i18n-ui.js'), sq = R('src/js/i18n-sq.js');
  const keys = new Set([...ui.matchAll(/^\s*\["((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\]/gm)].map(m => JSON.parse('"' + m[1] + '"')));
  const en = {}; for (const m of ui.matchAll(/^\s*\["((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"/gm)) en[JSON.parse('"' + m[1] + '"')] = JSON.parse('"' + m[2] + '"');
  const missing = [];
  for (const f of ['src/js/kabuk.js', 'src/js/settings.js', 'src/js/lan.js']) {
    for (const m of R(f).matchAll(/(?<![.\w])t\('((?:[^'\\]|\\.)+)'/g)) {
      const k = m[1].replace(/\\'/g, "'");
      if (!keys.has(k)) missing.push(f + ': ' + k);
      else if (!sq.includes(JSON.stringify(en[k]))) missing.push('sq ' + f + ': ' + en[k]);
    }
  }
  assert.deepStrictEqual(missing, []);
  const { ctx } = browserCtx();
  const k = R('src/js/kabuk.js'), sqBlock = k.slice(k.indexOf('var SQ = {'), k.indexOf('var EN0'));
  const sqKeys = [...sqBlock.matchAll(/'(fc\.[\w.-]+)':/g)].map(m => m[1]);
  assert.ok(sqKeys.length > 80);
  for (const key of sqKeys) assert.notStrictEqual(ctx.FC.t(key, null, 'en'), key, 'çekirdekte yok: ' + key);
  assert.ok(sqBlock.includes("'fc.update.patchMode': 'vetëm pjesët e ndryshuara'"));
});

test('paketleme: NSIS (kullanıcı başına, tek tık, tr/en/ar), veri klasörü adı korunur, app.asar ayrı yayınlanır', () => {
  const b = pkg.build;
  assert.strictEqual(b.productName, 'Comm Calc', 'productName değişirse %APPDATA%\\Comm Calc veri klasörü değişir!');
  assert.strictEqual(pkg.name, 'comm-calc');
  assert.strictEqual(pkg.productName, 'Comm Calc');
  assert.strictEqual(b.appId, 'com.departuresmil.commcalc');
  assert.strictEqual(b.win.target[0].target, 'nsis');
  assert.strictEqual(b.win.icon, 'assets/icon.ico'); assert.strictEqual(b.win.signAndEditExecutable, true, 'exe simgesi uygulamanın .ico\'su olsun');
  assert.strictEqual(b.nsis.oneClick, true); assert.strictEqual(b.nsis.perMachine, false);
  assert.strictEqual(b.nsis.createDesktopShortcut, true); assert.strictEqual(b.nsis.createStartMenuShortcut, true);
  assert.deepStrictEqual(b.nsis.installerLanguages, ['tr_TR', 'en_US', 'ar_SA']);
  assert.strictEqual(b.nsis.deleteAppDataOnUninstall, false);
  for (const f of ['cekirdek/**/*', 'src/**/*', 'lib/**/*', 'assets/**/*', 'main.js', 'app-main.js', 'preload.js']) assert.ok(b.files.includes(f), f);
  assert.ok(!b.asarUnpack, 'asarUnpack yama kapsamı dışında kalır');
  assert.ok(!pkg.dependencies || !Object.keys(pkg.dependencies).length, 'app.asar içinde node_modules yok');
  // .github/workflows'a yazma izni gelene kadar etkin olmayan kopya ci/workflows/ altındadır
  const wfPath = /reusable-release/.test(R('.github/workflows/release.yml')) ? '.github/workflows' : 'ci/workflows';
  const wf = R(wfPath + '/release.yml');
  assert.match(wf, /win-app=app\.asar/); assert.match(wf, /win-setup=\*Setup\*\.exe/);
  assert.match(wf, /reusable-release\.yml@main/); assert.match(wf, /needs: \[test, build\]/);
  assert.match(R(wfPath + '/eski-kanal.yml'), /guncelleme\.zip/);
});
