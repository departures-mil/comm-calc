// ESKİ GÜNCELLEME KANALI KÖPRÜSÜ (ccShell 1–2 taşınabilir exe'ler ve SHELL 2 Android APK'ları için).
//
// Eski kurulumlar api.github.com/repos/departures-mil/comm-calc/releases/latest'teki guncelleme.json + guncelleme.zip'i okur,
// ECDSA P-256 imzasını (lib/update-key.js'deki açık anahtar; özel anahtar YALNIZCA Milen'in bilgisayarında) doğrular ve
// zip'i %APPDATA%\Comm Calc\guncelleme\v<sürüm>\ (Android: files/guncelleme) altına açar. Eski main.js oradaki app-main.js'i
// yükler; yeni app-main.js eski kabukta olduğunu anlar ve kullanıcıyı tek tıkla yeni NSIS kurulumuna geçirir (src/js/kabuk.js → bridge).
// Android'de yeni arayüz eski APK'da çalışır ve sonraki imzalı paketleri aynı yoldan almaya devam eder.
//
// Akış (yeni sürüm GitHub Release olarak CI'da YAYINLANDIKTAN SONRA, Milen'in bilgisayarında, depo kökünde):
//     git pull && npm ci && node tools/eski-kanal.mjs
//   → release/guncelleme.zip + guncelleme.json (imzalı) üretilir, main'e gönderilir; .github/workflows/eski-kanal.yml
//     ikisini v<sürüm> release'ine ekler. Anahtar yolu: OZEL_ANAHTAR ortam değişkeni ya da aşağıdaki varsayılan.
//   --no-push: yalnızca dosyaları üretir.   --skip-release-check: GitHub'da release var mı denetlemez.
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import JSZip from 'jszip';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = process.env.OZEL_ANAHTAR || 'C:/Claude Programlarım/_Anahtarlar/CommCalc/guncelleme-ozel.pem';
const has = k => process.argv.includes('--' + k);
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const tag = 'v' + pkg.version;
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
const die = m => { console.error(m); process.exit(1); };

if (!fs.existsSync(KEY)) die(`Özel anahtar bulunamadı: ${KEY}\nOZEL_ANAHTAR=<yol> node tools/eski-kanal.mjs`);
if (!has('skip-release-check')) {
  const r = await fetch(`https://api.github.com/repos/departures-mil/comm-calc/releases/tags/${tag}`, { headers: { 'User-Agent': 'comm-calc-eski-kanal', Accept: 'application/vnd.github+json' } });
  if (!r.ok) die(`${tag} GitHub'da henüz yayınlanmamış (HTTP ${r.status}). Önce CI release'i tamamlanmalı (köprü release'ten SONRA yayınlanır).`);
  const rel = await r.json();
  if (!(rel.assets || []).some(a => a.name === 'latest.json')) die(`${tag} release'inde latest.json yok; CI yayını bitmemiş olabilir.`);
  if (!(rel.assets || []).some(a => /win-setup\.exe$/.test(a.name))) die(`${tag} release'inde kurulum dosyası (win-setup.exe) yok.`);
}
try { const old = JSON.parse(fs.readFileSync(path.join(ROOT, 'release/guncelleme.json'), 'utf8')); if (old.version === pkg.version && !has('force')) die(`${tag} köprüsü zaten üretilmiş (release/guncelleme.json). Yeniden üretmek için --force.`); } catch {}

execFileSync(process.execPath, [path.join(ROOT, 'web/build.mjs')], { stdio: 'inherit' });
const zip = new JSZip();
const add = rel => {
  const abs = path.join(ROOT, rel);
  if (fs.statSync(abs).isDirectory()) { for (const n of fs.readdirSync(abs).sort()) add(path.join(rel, n)); return; }
  zip.file(rel.split(path.sep).join('/'), fs.readFileSync(abs), { date: new Date(0) });
};
// Eski main.js zip'teki app-main.js'i yükler; yeni app-main.js ortak çekirdeğin Electron dosyalarını (cekirdek/) ister.
for (const r of ['app-main.js', 'preload.js', 'package.json', 'cekirdek', 'lib', 'src', 'assets']) add(r);
const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
const sha256 = crypto.createHash('sha256').update(data).digest('hex');
const sig = crypto.sign('sha256', Buffer.from(`CC-GUNCELLEME\n${pkg.version}\n${sha256}`), { key: fs.readFileSync(KEY, 'utf8'), dsaEncoding: 'der' }).toString('base64');
// İmza doğrulaması (depodaki açık anahtarla) — yanlış anahtarla imzalanmış paket gönderilmez
const pub = (await import('../lib/update-key.js')).default;
if (!crypto.verify('sha256', Buffer.from(`CC-GUNCELLEME\n${pkg.version}\n${sha256}`), { key: pub, dsaEncoding: 'der' }, Buffer.from(sig, 'base64'))) die('İmza lib/update-key.js açık anahtarıyla doğrulanamadı: yanlış özel anahtar.');
fs.mkdirSync(path.join(ROOT, 'release'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'release/guncelleme.zip'), data);
// minShell 2: ccShell 1 (kayıp eski anahtar) kurulumları "Yeni programı indir" der; o düğme release'teki .exe'ye (yeni kurulum) gider.
fs.writeFileSync(path.join(ROOT, 'release/guncelleme.json'), JSON.stringify({ version: pkg.version, sha256, sig, minShell: 2 }, null, 1));
console.log(`${tag}: köprü paketi ${(data.length / 1024).toFixed(0)} KB, sha256 ${sha256.slice(0, 12)}…, imza doğrulandı`);
if (has('no-push')) process.exit(0);
git('add', 'release/guncelleme.zip', 'release/guncelleme.json');
try { git('commit', '-m', `Eski kanal köprüsü: ${tag} imzalı guncelleme.zip`); } catch {}
execFileSync('git', ['push', 'origin', 'HEAD:main'], { cwd: ROOT, stdio: 'inherit' });
console.log(`Gönderildi. GitHub Actions (eski-kanal.yml) guncelleme.zip/json'u ${tag} release'ine ekleyecek.`);
