#!/usr/bin/env node
// Arayüz ekran görüntüleri (başsız Chromium, sahte Electron kabuğu): node tools/ekran.js <çıktı-klasörü>
// PLAYWRIGHT_CORE=/yol/playwright-core ve PLAYWRIGHT_BROWSERS_PATH ortamdan alınır. Ağ istekleri engellenir.
// Sayfa yerel bir HTTP sunucusundan sunulur (file:// altında CSP/yazı tipi davranışı Electron'dakinden farklı olmasın).
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const pw = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const ROOT = path.join(__dirname, '..');
const OUT = path.resolve(process.argv[2] || 'ekran');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };

const shots = [
  { name: 'tr-falcon-dark', lang: 'tr', theme: 'dark', scheme: 'falcon' },
  { name: 'ar-falcon-light', lang: 'ar', theme: 'light', scheme: 'falcon' },
  { name: 'tr-klasik', lang: 'tr', theme: 'dark', scheme: 'klasik' },
  { name: 'tr-klasik-light', lang: 'tr', theme: 'light', scheme: 'klasik' },
  { name: 'sq-falcon-dark', lang: 'sq', theme: 'dark', scheme: 'falcon' },
  { name: 'tr-falcon-dark-ayarlar', lang: 'tr', theme: 'dark', scheme: 'falcon', page: 'settings', h: 2200 },
  { name: 'ar-falcon-light-ayarlar', lang: 'ar', theme: 'light', scheme: 'falcon', page: 'settings', h: 2200 },
  { name: 'sq-falcon-dark-ayarlar', lang: 'sq', theme: 'dark', scheme: 'falcon', page: 'settings', h: 2200 },
  { name: 'tr-falcon-dark-antenler', lang: 'tr', theme: 'dark', scheme: 'falcon', page: 'antennas' },
  { name: 'tr-eski-kabuk-kopru', lang: 'tr', theme: 'dark', scheme: 'falcon', legacy: true },
  { name: 'tr-yeni-surum', lang: 'tr', theme: 'dark', scheme: 'falcon', dialog: 'wifi' },
  { name: 'tr-telefon', lang: 'tr', theme: 'dark', scheme: 'falcon', mobile: true }
];
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
server.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + server.address().port + '/src/index.html';
  const browser = await pw.chromium.launch();
  const errors = [];
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: s.mobile ? { width: 412, height: 860 } : { width: 1600, height: s.h || 960 }, deviceScaleFactor: 1 });
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(s.name + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|net::|Failed to load resource/.test(m.text())) errors.push(s.name + ' console: ' + m.text()); });
    await page.addInitScript(({ s }) => {
      const set = (k, v) => localStorage.setItem('fc.' + k, JSON.stringify(v));
      set('theme', s.theme); set('scheme', s.scheme); set('onboarding.done', true); set('whatsnew.seen', '1.12.0');
      const data = { settings: { lang: s.lang, theme: s.theme, autoUpdate: false, seenVersion: '1.12.0' } };
      let saved = data;
      const st = { fullscreen: true, half: false };
      window.fcHost = { kind: 'electron', platform: 'win32', version: '1.12.0', window: { minimize: async () => {}, half: async () => {}, toggleFullscreen: async () => {}, close: async () => {}, getState: async () => st, onState: () => () => {} },
        update: { channel: s.legacy ? 'win-setup' : 'win-app', applyPatch: async () => 'restarting', installFull: async () => 'restarting' } };
      window.api = { platform: 'desktop', shell: 'fc', info: async () => ({ version: '1.12.0', short: '1.12.0', shell: s.legacy ? 2 : 3, legacy: !!s.legacy, repo: 'departures-mil/comm-calc', platform: 'desktop' }),
        load: async () => JSON.parse(JSON.stringify(saved)), save: async d => { saved = d; return true; }, saveText: async () => null, openText: async () => null, openUrl: async () => {}, openDataDir: async () => {}, restart: async () => {}, updateOk: async () => {},
        lan: { start: async () => ({}), stop: async () => true, state: async () => ({ hosting: false, pin: null, ips: ['192.168.1.20'], port: 47821 }), discover: async () => [], sync: async () => ({ ok: false }), onScan: () => {}, onIncoming: () => {} } };
    }, { s });
    await page.goto(base);
    await page.waitForTimeout(1500);
    if (s.page) { await page.evaluate(p => App.go(p), s.page); await page.waitForTimeout(700); }
    if (s.dialog === 'wifi') { await page.evaluate(() => LanSync.dialog()); await page.waitForTimeout(400); }
    if (s.legacy) await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, s.name + '.png'), fullPage: !!s.page });
    await ctx.close();
    console.log('✓', s.name);
  }
  await browser.close(); server.close();
  if (errors.length) { console.error('HATALAR:\n' + errors.join('\n')); process.exitCode = 1; }
});
