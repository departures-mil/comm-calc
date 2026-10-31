// Başlatıcı (kabuk): uygulama içinden indirilmiş bir güncelleme varsa onu, yoksa programla gelen sürümü çalıştırır.
// Güncellemeler %APPDATA%\Comm Calc\guncelleme\<sürüm> klasöründe durur; kayıtlı projeler ve kütüphane etkilenmez.
// Bu dosya güncellemeyle değişmez; bu yüzden küçük ve hatasız tutulur.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Comm Calc');
const BUILTIN = require('./package.json');
const code = v => { const p = String(v || '0').split('.').map(n => parseInt(n, 10) || 0); return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0); };
const UPD = path.join(app.getPath('appData'), 'Comm Calc', 'guncelleme');
const ACTIVE = path.join(UPD, 'aktif.json');
global.__ccShell = { dir: __dirname, version: BUILTIN.version, shell: BUILTIN.ccShell || 1, updDir: UPD, code };

function pick() {
  let a;
  try { a = JSON.parse(fs.readFileSync(ACTIVE, 'utf8')); } catch { return null; }
  const dir = path.join(UPD, String(a.dir || ''));
  if (!(code(a.version) > code(BUILTIN.version)) || !fs.existsSync(path.join(dir, 'app-main.js'))) return null;
  // Üst üste iki açılışta arayüz yüklenemediyse güncelleme bırakılır, programla gelen sürüme dönülür
  if ((a.tries || 0) >= 2) { try { fs.renameSync(ACTIVE, ACTIVE + '.bozuk'); } catch {} return null; }
  a.tries = (a.tries || 0) + 1;
  try { fs.writeFileSync(ACTIVE, JSON.stringify(a)); } catch {}
  return dir;
}

const dir = pick();
let loaded = false;
if (dir) {
  process.env.NODE_PATH = path.join(__dirname, 'node_modules');
  require('module').Module._initPaths();
  try { require(path.join(dir, 'app-main.js')); loaded = true; }
  catch (e) {
    try { fs.renameSync(ACTIVE, ACTIVE + '.bozuk'); } catch {}
    app.relaunch(); app.exit(0); loaded = true;
  }
}
if (!loaded) require('./app-main.js');
