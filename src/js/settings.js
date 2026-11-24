// Platform: desktop (Electron), android (APK) veya web (tarayıcı)
const PLAT = window.api ? window.api.platform || 'desktop' : 'web';
// Ayarlar: ortak çekirdeğin ayarlar ızgarası (FC.settings.build). Sıra: Görünüm (tema, renk şeması, yazı boyutu, dil) ·
// uygulamanın kartları (çevrimiçi ürün tanıma, güncelleme, veri ve yedek) · Asistan Agent · Kullanım Limitleri ·
// Otomatik hata raporu · Hakkında · Admin ile iletişim (HER ZAMAN EN SONDA).
Views.settings = (() => {
  function card(id, title, html) {
    const c = document.createElement('section');
    c.className = 'card'; c.id = id; c.setAttribute('data-cc-card', id);
    c.innerHTML = `<h3>${esc(t(title))}</h3>` + html;
    return c;
  }
  function aiCard() {
    const s = Store.data.settings;
    const c = card('s-ai', 'Çevrimiçi ürün tanıma', `
      <p class="muted small">Ürün görseli veya teknik metinden bilgileri otomatik çıkarmak için Google Gemini kullanılır. Kendi ücretsiz Gemini API anahtarınızı ya da kendi Firebase projenizi girin; kullanım yalnızca sizin hesabınızdan düşer (Ayarlar'daki Kullanım Limitleri'nde görünür).</p>
      <p class="muted small">İnternet yokken ya da anahtar girilmemişse yapıştırılan teknik metin çevrimdışı ayrıştırıcıyla okunur.</p>
      <label class="full"><span><b>Kendi Firebase projeniz</b> — Firebase konsolu → Proje ayarları → Web uygulaması → <code>firebaseConfig</code> bloğunu olduğu gibi yapıştırın (AI Logic → Gemini Developer API etkin olmalı)</span>
        <textarea id="s-fb" rows="5" placeholder="const firebaseConfig = { apiKey: '...', authDomain: '...', projectId: '...', appId: '...' };">${esc(s.firebase)}</textarea></label>
      <label class="full"><span><b>veya kendi Gemini API anahtarınız</b> — <a href="#" data-url="https://aistudio.google.com/apikey">aistudio.google.com/apikey</a></span><input id="s-key" type="password" value="${esc(s.geminiKey)}" placeholder="AIza…"></label>
      <label class="full"><span>Model</span><input id="s-model" value="${esc(s.aiModel)}"></label>
      <div class="row-btns"><button class="btn" id="s-test">Bağlantıyı test et</button><span id="s-test-out" class="muted small"></span></div>`);
    $('#s-fb', c).oninput = e => { s.firebase = e.target.value; Store.save(); };
    $('#s-key', c).oninput = e => { s.geminiKey = e.target.value.trim(); Store.save(); };
    $('#s-model', c).oninput = e => { s.aiModel = e.target.value.trim(); Store.save(); };
    $('#s-test', c).onclick = async () => {
      const o = $('#s-test-out', c); o.textContent = t('Deneniyor…');
      try { const r = await AI.recognize({ text: 'Test: 5.8G VTX 600mW MMCX' }); o.textContent = '✓ ' + t('Çalışıyor:') + ' ' + JSON.stringify(r).slice(0, 120); }
      catch (e) { o.textContent = '✕ ' + e.message; }
    };
    return c;
  }
  function updCard() {
    const s = Store.data.settings;
    const c = card('s-upd', 'Güncelleme', `
      <p>${esc(t('Yüklü sürüm:'))} <b>Comm Calc v${esc(App.version)}</b></p>
      <label class="chk"><input type="checkbox" id="s-auto"${s.autoUpdate ? ' checked' : ''}> Program açılırken güncellemeleri denetle</label>
      <p class="muted small">Yeni sürüm çıkınca ekranda bildirim penceresi açılır.</p>
      <p class="muted small">Güncelleme GitHub sürümlerinden gelir; yalnızca değişen kısımlar indirilir ve SHA-256 ile doğrulanır.</p>
      <div class="row-btns"><button class="btn primary" id="s-check">Güncellemeleri denetle</button></div>`);
    $('#s-auto', c).onchange = e => { s.autoUpdate = e.target.checked; Store.save(); };
    $('#s-check', c).onclick = () => Kabuk.checkNow(true);
    return c;
  }
  function dataCard() {
    const d = Store.data, nA = (d.arsiv || []).length, nC = (d.cakisma || []).length;
    const c = card('s-data', 'Veri ve yedek', `
      <p class="muted small">${PLAT === 'android' ? t('Projeler, kütüphane ve ayarlar telefonda, uygulamanın kendi klasöründe saklanır; güncellemeler bu verilere dokunmaz.') : window.api ? t('Projeler, kütüphane ve ayarlar bilgisayarda {f} dosyasında saklanır; güncellemeler bu verilere dokunmaz.', { f: '<code>%APPDATA%\\Comm Calc\\veri.json</code>' }) : t('Projeler, kütüphane ve ayarlar tarayıcıda saklanır; güncellemeler bu verilere dokunmaz.')}</p>
      <div class="row-btns"><button class="btn" id="s-bak">Tüm verileri yedekle</button><button class="btn" id="s-res">Yedekten geri yükle</button>${PLAT === 'desktop' ? '<button class="btn" id="s-dir">Veri klasörünü aç</button>' : ''}</div>
      <p class="muted small" style="margin-top:12px">${esc(t('Wi‑Fi eşitlemesinde hiçbir kayıt silinmez: öbür cihazda silinen kayıt burada arşive taşınır, çakışan eski sürüm yedeklenir.'))}</p>
      <div class="row-btns"><button class="btn" id="s-arc">${esc(t('Arşiv ve çakışma yedekleri'))} (${nA + nC})</button></div>`);
    $('#s-bak', c).onclick = () => downloadText('comm-calc-yedek-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(Object.assign({ commcalcBackup: 1 }, Store.data), null, 1));
    $('#s-res', c).onclick = async () => {
      const txt = await pickTextFile(); if (!txt) return;
      try {
        const o = JSON.parse(txt); if (!o.commcalcBackup || !o.projects) throw 0;
        if (!await confirmBox(t('Mevcut tüm veriler yedektekiyle değiştirilsin mi?'), t('Geri yükle'))) return;
        // Mevcut hâl kaybolmasın: geri yüklemeden önce bir kopyası arşive alınır
        delete o.commcalcBackup;
        o.arsiv = (o.arsiv || []).concat((Store.data.arsiv || []), [{ tur: 'yedek', zaman: Date.now(), kayit: { projects: Store.data.projects, library: Store.data.library }, neden: 'geri-yukleme' }]);
        o.cakisma = (o.cakisma || []).concat(Store.data.cakisma || []);
        Store.data = o; await Store.flush(); location.reload();
      } catch { toast(t('Geçersiz yedek dosyası'), 'err'); }
    };
    if ($('#s-dir', c)) $('#s-dir', c).onclick = () => window.api.openDataDir();
    $('#s-arc', c).onclick = () => LanSync.archiveDialog();
    return c;
  }
  function aboutText(grid) {
    const ab = grid.querySelector('[data-fc-card="about"]');
    if (!ab || ab.querySelector('.cc-about')) return;
    const p = document.createElement('p');
    p.className = 'muted small cc-about';
    p.innerHTML = `${esc(t('İHA alıcı/verici link bütçesi, anten ve RF araçları.'))} <a href="#" data-url="https://github.com/${App.repo}/releases">github.com/${App.repo}</a>${PLAT === 'desktop' ? ' · ' + esc(t('Kısayollar: F11 tam ekran, F12 geliştirici araçları.')) : ''}`;
    ab.insertBefore(p, ab.children[2] || null);
  }
  function render(el) {
    el.innerHTML = '';
    const grid = Kabuk.buildSettings(el, [aiCard(), updCard(), dataCard()]);
    aboutText(grid);
    $$('[data-url]', el).forEach(a => a.onclick = e => { e.preventDefault(); openUrl(a.dataset.url); });
  }
  return { title: 'Ayarlar', render };
})();
