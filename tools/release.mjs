// Yeni sürüm yayınlar: imzalı uygulama içi güncelleme paketini hazırlar, sürüm notunu yazar, etiketleyip GitHub'a gönderir.
// GitHub Actions (release.yml) etiketi görünce Windows'ta taşınabilir exe ve RAR üretir, hepsini sürüme ekler.
// Kullanım: node tools/release.mjs --notes "Yenilikler (Türkçe, satır satır)" [--min-shell 1] [--no-push]
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const KEY = '/mnt/project-files/comm-calc-guncelleme-imza/guncelleme-ozel.pem';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const [ma, mi, pa] = pkg.version.split('.');
const short = ma + '.' + mi + (pa && pa !== '0' ? '.' + pa : '');
const tag = 'v' + short;
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim();
if (git('tag', '-l', tag)) { console.error(`${tag} zaten var; package.json sürümünü yükseltin.`); process.exit(1); }

execFileSync(process.execPath, [path.join(ROOT, 'web/build.mjs')], { stdio: 'inherit' });
const zip = new JSZip();
const add = rel => {
  const abs = path.join(ROOT, rel);
  if (fs.statSync(abs).isDirectory()) { for (const n of fs.readdirSync(abs).sort()) add(path.join(rel, n)); return; }
  zip.file(rel.split(path.sep).join('/'), fs.readFileSync(abs), { date: new Date(0) });
};
for (const r of ['app-main.js', 'preload.js', 'package.json', 'lib', 'src', 'assets']) add(r);
const data = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
const sha256 = crypto.createHash('sha256').update(data).digest('hex');
const sig = crypto.sign('sha256', Buffer.from(`CC-GUNCELLEME\n${pkg.version}\n${sha256}`), { key: fs.readFileSync(KEY, 'utf8'), dsaEncoding: 'der' }).toString('base64');
fs.mkdirSync(path.join(ROOT, 'release'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'release/guncelleme.zip'), data);
fs.writeFileSync(path.join(ROOT, 'release/guncelleme.json'), JSON.stringify({ version: pkg.version, sha256, sig, minShell: +arg('min-shell', pkg.ccShell || 1) }, null, 1));
const notes = String(arg('notes', '') === true ? '' : arg('notes', ''));
fs.writeFileSync(path.join(ROOT, 'release/NOTLAR.md'), `## Comm Calc ${tag}\n\n${notes}\n\n**Kurulum:** \`Comm-Calc-${tag}-Tasinabilir.exe\` dosyasını indirip çalıştırın (kurulum gerekmez) veya \`Comm-Calc-${tag}.rar\` arşivini açın.\nYüklü programda: Ayarlar → Güncellemeleri denetle → Güncelle (tek tık).\n`);
console.log(`${tag}: paket ${(data.length / 1024).toFixed(0)} KB, sha256 ${sha256.slice(0, 12)}…`);
git('add', '-A');
try { git('commit', '-m', `Comm Calc ${tag}\n\n${notes}` + (process.env.CC_TRAILER ? '\n\n' + process.env.CC_TRAILER : '')); } catch {}
git('tag', tag);
if (!arg('no-push')) { execFileSync('git', ['push', '-u', 'origin', 'main', '--tags'], { cwd: ROOT, stdio: 'inherit' }); console.log(`${tag} gönderildi; GitHub Actions exe + RAR üretip sürümü yayınlayacak.`); }
