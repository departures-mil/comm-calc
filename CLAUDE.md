# Comm Calc

İHA alıcı/verici link bütçesi masaüstü programı (Electron, Türkçe). Arayüz `src/` (düz JS, derleyicisiz; `src/js/*.js` sırayla `index.html`'den yüklenir), ana süreç `app-main.js`, değişmeyen başlatıcı kabuk `main.js`.

## Kurallar (Milen)
- Milen "BAŞLA" demeden yeni iş başlatma. Yazışma dili Türkçe.
- Arayüz üç dilli (Türkçe / English / العربية, v1.3+). Kaynak metinler Türkçe yazılır; `src/js/i18n.js` ekrana gelen metin düğümlerini ve placeholder/title'ı sözlükten otomatik çevirir (sayılar değişken). Yeni metin eklenince `src/js/i18n-ui.js` (veya `i18n-ant.js`) içine `[tr, en, ar]` satırı eklenir; ad gibi değişken içeren metinler `t('… {n} …', { n })` ile yazılır. Dersler `i18n-learn.js` içinde dil başına tam metindir. Arapça sağdan sola (dir=rtl).
- Her güncellemede sürüm yükselir: `package.json` version `1.0.0 → 1.1.0 → 1.2.0` (etiket `v1.1`, `v1.2`). `src/index.html` başlığı ve `App.version` varsayılanı da güncellenir.
- Yayın onay beklemeden yapılır: `npm ci` sonra `node tools/release.mjs --notes "…"`. Bu, imzalı uygulama içi güncelleme paketini (`release/guncelleme.zip` + `.json`) üretir ve main dalına gönderir; `.github/workflows/release.yml` (yalnızca GitHub MCP `create_or_update_file` ile değiştirilebilir, git ile workflow gönderimi engelli) yalnızca bu paketle GitHub sürümünü yayınlar. Milen exe/RAR istemiyor (2026-10-31): yalnızca uygulama içi güncelleme; exe/RAR'ı sadece isterse üret (eski workflow v1.2 commit'inde).
- Programdaki "Güncelle" düğmesi en son sürümdeki `guncelleme.zip`'i indirir, imzayı doğrular, `%APPDATA%\Comm Calc\guncelleme\` altına kurar. `main.js` veya yerel modül değişirse `ccShell` artırılır ve `--min-shell` verilir (kullanıcı yeni exe'yi indirir; bundan kaçının, çünkü artık exe yayınlanmıyor).
- İmza anahtarı depoda değildir: `/mnt/project-files/comm-calc-guncelleme-imza/guncelleme-ozel.pem`.
- APK yalnızca Milen isteyince yapılır.

## Test
- Tarayıcı: depo kökünü yerel sunucuyla sunup `src/index.html` açılır (Playwright).
- Electron: `xvfb-run -a node_modules/electron/dist/electron --no-sandbox .`
- RF formülleri: `src/js/rf.js` Node'da `require` edilebilir.
