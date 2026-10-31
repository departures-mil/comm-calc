# Comm Calc

İHA alıcı/verici link bütçesi masaüstü programı (Electron, Türkçe). Arayüz `src/` (düz JS, derleyicisiz; `src/js/*.js` sırayla `index.html`'den yüklenir), ana süreç `app-main.js`, değişmeyen başlatıcı kabuk `main.js`.

## Kurallar (Milen)
- Milen "BAŞLA" demeden yeni iş başlatma. Arayüz ve yazışma dili Türkçe.
- Her güncellemede sürüm yükselir: `package.json` version `1.0.0 → 1.1.0 → 1.2.0` (etiket `v1.1`, `v1.2`). `src/index.html` başlığı ve `App.version` varsayılanı da güncellenir.
- Yayın onay beklemeden yapılır: `npm ci` sonra `node tools/release.mjs --notes "…"`. Bu, imzalı uygulama içi güncelleme paketini (`release/guncelleme.zip` + `.json`) üretir, etiketler ve gönderir; `.github/workflows/release.yml` Windows'ta taşınabilir exe + RAR üretip GitHub sürümünü yayınlar.
- Programdaki "Güncelle" düğmesi en son sürümdeki `guncelleme.zip`'i indirir, imzayı doğrular, `%APPDATA%\Comm Calc\guncelleme\` altına kurar. `main.js` veya yerel modül değişirse `ccShell` artırılır ve `--min-shell` verilir (kullanıcı yeni exe'yi indirir).
- İmza anahtarı depoda değildir: `/mnt/project-files/comm-calc-guncelleme-imza/guncelleme-ozel.pem`.
- APK yalnızca Milen isteyince yapılır.

## Test
- Tarayıcı: depo kökünü yerel sunucuyla sunup `src/index.html` açılır (Playwright).
- Electron: `xvfb-run -a node_modules/electron/dist/electron --no-sandbox .`
- RF formülleri: `src/js/rf.js` Node'da `require` edilebilir.
