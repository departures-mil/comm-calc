#!/usr/bin/env node
// Tek sürüm kaynağı: package.json "version" (semver X.Y.Z; etiket vX.Y.Z — KISALTMA YOK).
//   node tools/surum.js            → src/js/surum.js, index.html <title> ve release-notes.json'u yeniden yazar
//   node tools/surum.js 1.13.0     → önce package.json (+ package-lock) sürümünü 1.13.0 yapar, sonra yazar
//   node tools/surum.js --check    → hepsi güncel mi (npm test)
// release-notes.json (GitHub sürüm metni + latest.json notes) src/js/news.js'teki NEWS dizisinin EN ÜSTTEKİ kaydından gelir;
// o kaydın v'si package.json sürümüyle aynı olmalı (yeni sürümde önce NEWS'e tr/en/ar/sq kaydı eklenir).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = (...a) => path.join(ROOT, ...a);
const SEMVER = /^\d+\.\d+\.\d+$/;

function outputs() {
  const pkg = JSON.parse(fs.readFileSync(P('package.json'), 'utf8'));
  if (!SEMVER.test(pkg.version)) throw new Error('package.json version X.Y.Z olmalı: ' + pkg.version);
  delete require.cache[require.resolve('../src/js/news.js')];
  const { NEWS, News } = require('../src/js/news.js');
  if (News.norm(NEWS[0].v) !== pkg.version || NEWS[0].v !== pkg.version) throw new Error('src/js/news.js: NEWS[0].v "' + NEWS[0].v + '" ≠ package.json ' + pkg.version + ' (önce yeni sürümün yeniliklerini ekleyin)');
  const n = News.notes(pkg.version);
  for (const l of ['tr', 'en', 'ar', 'sq']) if (!n[l]) throw new Error('NEWS[0] "' + l + '" eksik');
  const surum = '/* OTOMATİK: node tools/surum.js (kaynak: package.json). Elle düzenlemeyin. */\nwindow.APP_RELEASE = ' + JSON.stringify({ version: pkg.version }) + ';\n';
  const notes = JSON.stringify({ tr: n.tr, en: n.en, ar: n.ar }, null, 2) + '\n';
  const html = fs.readFileSync(P('src/index.html'), 'utf8').replace(/<title>[^<]*<\/title>/, '<title>Comm Calc v' + pkg.version + '</title>');
  return { version: pkg.version, files: { 'src/js/surum.js': surum, 'release-notes.json': notes, 'src/index.html': html } };
}
module.exports = { outputs };
if (require.main === module) {
  const arg = process.argv[2];
  if (arg && arg !== '--check') {
    if (!SEMVER.test(arg)) { console.error('Sürüm X.Y.Z olmalı'); process.exit(1); }
    const pkg = JSON.parse(fs.readFileSync(P('package.json'), 'utf8')); pkg.version = arg;
    fs.writeFileSync(P('package.json'), JSON.stringify(pkg, null, 2) + '\n');
    try { const lock = JSON.parse(fs.readFileSync(P('package-lock.json'), 'utf8')); lock.version = arg; if (lock.packages && lock.packages['']) lock.packages[''].version = arg; fs.writeFileSync(P('package-lock.json'), JSON.stringify(lock, null, 2) + '\n'); } catch (e) { }
  }
  const o = outputs();
  if (arg === '--check') {
    const bad = Object.entries(o.files).filter(([f, c]) => !fs.existsSync(P(f)) || fs.readFileSync(P(f), 'utf8') !== c).map(([f]) => f);
    if (bad.length) { console.error('güncel değil: ' + bad.join(', ') + ' → node tools/surum.js'); process.exit(1); }
    console.log('sürüm dosyaları güncel (' + o.version + ')'); process.exit(0);
  }
  for (const [f, c] of Object.entries(o.files)) fs.writeFileSync(P(f), c);
  console.log('Sürüm ' + o.version + ' → ' + Object.keys(o.files).join(', '));
}
