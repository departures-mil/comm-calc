# Comm Calc

İHA alıcı/verici link bütçesi masaüstü programı (Electron, Türkçe). Arayüz `src/` (düz JS, derleyicisiz; `src/js/*.js` sırayla `index.html`'den yüklenir), ana süreç `app-main.js`, değişmeyen başlatıcı kabuk `main.js`.

## Kurallar (Milen)
- Milen "BAŞLA" demeden yeni iş başlatma. Yazışma dili Türkçe.
- Arayüz dört dilli (Türkçe / English / العربية v1.3+, Shqip v1.5+). Kaynak metinler Türkçe yazılır; `src/js/i18n.js` ekrana gelen metin düğümlerini ve placeholder/title'ı sözlükten otomatik çevirir (sayılar değişken). Yeni metin eklenince `src/js/i18n-ui.js` (veya `i18n-ant.js`) içine `[tr, en, ar]` satırı eklenir; ad gibi değişken içeren metinler `t('… {n} …', { n })` ile yazılır. Dersler `i18n-learn.js` içinde dil başına tam metindir. Arapça sağdan sola (dir=rtl). Arnavutça `src/js/i18n-sq.js` içinde İngilizce metne göre eşlenir (`I18N.fromEnglish`), dersleri de orada; yeni metin eklenince oraya da İngilizcesiyle bir satır eklenir (yoksa İngilizcesi görünür).
- Her güncellemede sürüm yükselir: `package.json` version `1.0.0 → 1.1.0 → 1.2.0` (etiket `v1.1`, `v1.2`). `src/index.html` başlığı ve `App.version` varsayılanı da güncellenir.
- Yayın onay beklemeden yapılır: `npm ci` sonra `node tools/release.mjs --notes "…"`. Bu, imzalı uygulama içi güncelleme paketini (`release/guncelleme.zip` + `.json`) üretir ve main dalına gönderir; `.github/workflows/release.yml` (yalnızca GitHub MCP `create_or_update_file` ile değiştirilebilir, git ile workflow gönderimi engelli) yalnızca bu paketle GitHub sürümünü yayınlar. Milen exe/RAR istemiyor (2026-10-31): yalnızca uygulama içi güncelleme; exe/RAR'ı sadece isterse üret (eski workflow v1.2 commit'inde).
- Her sürümde `src/js/news.js` içindeki `NEWS` dizisinin başına o sürümün yenilikleri (tr/en/ar/sq) eklenir: güncellemeden sonraki ilk açılışta "Yenilikler" penceresi olarak gösterilir. Yeni sürüm çıkınca program açılışta ekranda bildirim penceresi açar (Ayarlar'daki "açılırken denetle" açıkken; notlar GitHub sürüm metninden gelir).
- Programdaki "Güncelle" düğmesi en son sürümdeki `guncelleme.zip`'i indirir, imzayı doğrular, `%APPDATA%\Comm Calc\guncelleme\` altına kurar. `main.js` veya yerel modül değişirse `ccShell` artırılır ve `--min-shell` verilir (kullanıcı yeni exe'yi indirir; bundan kaçının, çünkü artık exe yayınlanmıyor).
- İmza anahtarı depoda değildir: `/mnt/project-files/comm-calc-guncelleme-imza/guncelleme-ozel.pem`.
- APK yalnızca Milen isteyince yapılır (ilk APK v1.4). Derleme: `android/build.sh` (Gradle'sız; gerekenler: `apt-get install android-sdk android-sdk-platform-23 zipalign apksigner dalvik-exchange`), anahtar `/mnt/project-files/comm-calc-android-imza/` (keystore + sifre.txt, alias commcalc). Sürüme eklemek için `release.mjs --apk`. Android kabuğu `android/java/.../MainActivity.java` + `src/js/android.js` (window.api'yi sağlar); kurulu APK sonraki sürümleri guncelleme.zip ile kendi içinden günceller (kabuk SHELL=1).
- Ayarlar → "Yöneticiye mesaj gönder": mesajlar Firestore `mesajlar` koleksiyonuna yazılır (kurallar yalnızca oluşturmaya izin verir, okuma yok). Okumak için Firebase konsolu → Firestore → mesajlar.

## Test
- Tarayıcı: depo kökünü yerel sunucuyla sunup `src/index.html` açılır (Playwright).
- Electron: `xvfb-run -a node_modules/electron/dist/electron --no-sandbox .`
- RF formülleri: `src/js/rf.js` Node'da `require` edilebilir.
