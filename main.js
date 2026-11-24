// Başlatıcı (kabuk 3, v1.12.0+ NSIS kurulumu): programla gelen app-main.js'i çalıştırır.
// Güncellemeler artık ortak çekirdekle gelir (GitHub Releases latest.json → app.asar yama/tam dosya takası), bu yüzden
// eski %APPDATA%\Comm Calc\guncelleme\<sürüm> klasörü (ccShell 1–2'nin uygulama içi paketleri) BURADA KULLANILMAZ.
// Eski taşınabilir exe'ler (ccShell 1–2) kendi main.js'leriyle aynı app-main.js'i o klasörden yükler; app-main.js
// bunu global.__ccShell.shell < 3 ile anlar ve kullanıcıyı yeni kurulum dosyasına yönlendirir (köprü).
const { app } = require('electron');
app.setName('Comm Calc');
const BUILTIN = require('./package.json');
const code = v => { const p = String(v || '0').split('.').map(n => parseInt(n, 10) || 0); return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0); };
global.__ccShell = { dir: __dirname, version: BUILTIN.version, shell: BUILTIN.ccShell || 3, updDir: null, code };
require('./app-main.js');
