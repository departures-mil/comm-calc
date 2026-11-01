// Platform: desktop (Electron), android (APK) veya web (tarayıcı)
const PLAT = window.api ? window.api.platform || 'desktop' : 'web';
// Ayarlar: güncelleme, çevrimiçi tanıma yapılandırması, görünüm, yedekleme.
const Updater = (() => {
  let last = null;
  async function check() {
    if (window.api) last = await window.api.checkUpdate();
    else {
      // Tarayıcı sürümü: yalnızca yeni sürüm bilgisini gösterir
      try {
        const r = await fetch(`https://api.github.com/repos/${App.repo}/releases/latest`);
        const j = await r.json();
        const v = String(j.tag_name || '').replace(/^v/, '');
        last = { ok: r.ok, version: v, current: App.version, available: r.ok && verCode(v) > verCode(App.version), notes: j.body || '', pageUrl: j.html_url, web: true };
      } catch (e) { last = { ok: false, error: e.message }; }
    }
    App.setUpdateBadge(last && last.ok && last.available);
    return last;
  }
  const verCode = v => { const p = String(v || '0').split('.').map(n => parseInt(n, 10) || 0); return p[0] * 10000 + (p[1] || 0) * 100 + (p[2] || 0); };
  async function install() {
    const r = await window.api.installUpdate();
    if (r.ok) { toast(t('v{v} kuruldu, yeniden başlatılıyor…', { v: short(r.version) })); await Store.flush(); setTimeout(() => window.api.restart(), 900); }
    else if (r.error === 'full') toast('Bu sürüm yeni program dosyası gerektiriyor; indirme sayfası açılıyor', 'err');
    return r;
  }
  const short = v => { const p = String(v).split('.'); return p[0] + '.' + (p[1] || 0) + (p[2] && p[2] !== '0' ? '.' + p[2] : ''); };
  return { check, install, get last() { return last; }, short, verCode };
})();

Views.settings = (() => {
  function render(el) {
    const s = Store.data.settings;
    el.innerHTML = `
    <section class="card"><h3 data-notr>Dil / Language / اللغة / Gjuha</h3>
      <div class="row-btns">${Object.entries(I18N.LANGS).map(([k, l]) => `<button class="btn${k === I18N.lang ? ' primary' : ''}" data-lang="${k}">${l.name}</button>`).join('')}</div>
    </section>
    <section class="card" id="upd-card"><h3>Güncelleme</h3>
      <p>Yüklü sürüm: <b>Comm Calc v${App.short}</b></p>
      <label class="chk"><input type="checkbox" id="s-auto"${s.autoUpdate ? ' checked' : ''}> Program açılırken güncellemeleri denetle</label>
      <p class="muted small">Yeni sürüm çıkınca ekranda bildirim penceresi açılır.</p>
      <div class="row-btns"><button class="btn primary" id="s-check">Güncellemeleri denetle</button></div>
      <div id="upd-out"></div>
    </section>
    <section class="card"><h3>Çevrimiçi ürün tanıma</h3>
      <p class="muted small">Ürün görseli veya teknik metinden bilgileri otomatik çıkarmak için Google Gemini kullanılır. Program kendi Firebase projesiyle (Comm Calc) hazır gelir; aşağıdakileri yalnızca başka bir proje veya kendi anahtarınızı kullanmak isterseniz doldurun.</p>
      <label class="full"><span><b>Başka Firebase projesi (isteğe bağlı)</b> — Firebase konsolu → Proje ayarları → Web uygulaması → <code>firebaseConfig</code> bloğunu olduğu gibi yapıştırın (AI Logic → Gemini Developer API etkin olmalı)</span>
        <textarea id="s-fb" rows="6" placeholder="const firebaseConfig = { apiKey: '...', authDomain: '...', projectId: '...', appId: '...' };">${esc(s.firebase)}</textarea></label>
      <label class="full"><span><b>veya kendi Gemini API anahtarınız (isteğe bağlı)</b> — <a href="#" data-url="https://aistudio.google.com/apikey">aistudio.google.com/apikey</a></span><input id="s-key" type="password" value="${esc(s.geminiKey)}" placeholder="AIza…"></label>
      <label><span>Model</span><input id="s-model" value="${esc(s.aiModel)}"></label>
      <div class="row-btns"><button class="btn" id="s-test">Bağlantıyı test et</button><span id="s-test-out" class="muted small"></span></div>
    </section>
    <section class="card"><h3>Görünüm</h3>
      <div class="row-btns">${[['dark', 'Koyu'], ['light', 'Açık']].map(([k, l]) => `<button class="btn${s.theme === k ? ' primary' : ''}" data-theme="${k}">${l}</button>`).join('')}</div>
    </section>
    <section class="card"><h3>Veri ve yedek</h3>
      <p class="muted small">${PLAT === 'android' ? t('Projeler, kütüphane ve ayarlar telefonda, uygulamanın kendi klasöründe saklanır; güncellemeler bu verilere dokunmaz.') : window.api ? t('Projeler, kütüphane ve ayarlar bilgisayarda {f} dosyasında saklanır; güncellemeler bu verilere dokunmaz.', { f: '<code>%APPDATA%\\Comm Calc\\veri.json</code>' }) : t('Projeler, kütüphane ve ayarlar tarayıcıda saklanır; güncellemeler bu verilere dokunmaz.')}</p>
      <div class="row-btns"><button class="btn" id="s-bak">Tüm verileri yedekle</button><button class="btn" id="s-res">Yedekten geri yükle</button>${PLAT === 'desktop' ? '<button class="btn" id="s-dir">Veri klasörünü aç</button>' : ''}</div>
    </section>
    <section class="card" id="contact"><h3>Yöneticiye mesaj gönder</h3>
      <p class="muted small">Öneri, hata bildirimi veya sorunuzu yazın; mesaj doğrudan program yöneticisine iletilir. Size dönüş yapılmasını istiyorsanız e-posta veya telefon bırakın.</p>
      <div class="form">
        <label><span>Adınız (isteğe bağlı)</span><input id="c-name" maxlength="100" value="${esc(s.contactName || '')}"></label>
        <label><span>E-posta / telefon (isteğe bağlı)</span><input id="c-reply" maxlength="200" value="${esc(s.contactReply || '')}"></label>
        <label><span>Konu</span><select id="c-subj">${['Öneri', 'Hata bildirimi', 'Soru', 'Diğer'].map(k => `<option value="${k}">${k}</option>`).join('')}</select></label>
        <label class="full"><span>Mesajınız</span><textarea id="c-msg" rows="5" maxlength="4000"></textarea></label>
      </div>
      <div class="row-btns"><button class="btn primary" id="c-send">Gönder</button><span id="c-st" class="muted small"></span></div>
    </section>
    <section class="card"><h3>Hakkında</h3>
      <p><b>Comm Calc v${App.short}</b> — İHA alıcı/verici link bütçesi, anten ve RF araçları.</p>
      <p class="muted small">Kaynak ve sürümler: <a href="#" data-url="https://github.com/${App.repo}/releases">github.com/${App.repo}</a> ${PLAT === 'desktop' ? ' · Kısayollar: F11 tam ekran, F12 geliştirici araçları.' : ''}</p>
    </section>`;
    const save = () => Store.save();
    $('#s-auto', el).onchange = e => { s.autoUpdate = e.target.checked; save(); };
    $('#s-fb', el).oninput = e => { s.firebase = e.target.value; save(); };
    $('#s-key', el).oninput = e => { s.geminiKey = e.target.value.trim(); save(); };
    $('#s-model', el).oninput = e => { s.aiModel = e.target.value.trim(); save(); };
    $$('[data-lang]', el).forEach(b => b.onclick = () => App.setLang(b.dataset.lang));
    $$('[data-url]', el).forEach(a => a.onclick = e => { e.preventDefault(); openUrl(a.dataset.url); });
    $$('[data-theme]', el).forEach(b => b.onclick = () => { s.theme = b.dataset.theme; App.applyTheme(); save(); render(el); });
    $('#s-check', el).onclick = () => showUpdate(el, true);
    $('#s-test', el).onclick = async () => {
      const o = $('#s-test-out', el); o.textContent = 'Deneniyor…';
      try { const r = await AI.recognize({ text: 'Test: 5.8G VTX 600mW MMCX' }); o.textContent = '✓ ' + t('Çalışıyor:') + ' ' + JSON.stringify(r).slice(0, 120); }
      catch (e) { o.textContent = '✕ ' + e.message; }
    };
    $('#s-bak', el).onclick = () => downloadText('comm-calc-yedek-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(Object.assign({ commcalcBackup: 1 }, Store.data), null, 1));
    $('#s-res', el).onclick = async () => {
      const t = await pickTextFile(); if (!t) return;
      try { const o = JSON.parse(t); if (!o.commcalcBackup || !o.projects) throw 0; if (!await confirmBox('Mevcut tüm veriler yedektekiyle değiştirilsin mi?', 'Geri yükle')) return; delete o.commcalcBackup; Store.data = o; await Store.flush(); location.reload(); }
      catch { toast('Geçersiz yedek dosyası', 'err'); }
    };
    $('#c-send', el).onclick = () => sendContact(el);
    if ($('#s-dir', el)) $('#s-dir', el).onclick = () => window.api.openDataDir();
    if (Updater.last) showUpdate(el, false);
  }
  // Mesaj Firebase (Firestore) üzerinden yalnızca yöneticiye gider: kurallar yalnızca yeni mesaj yazmaya izin verir, kimse okuyamaz
  async function sendContact(el) {
    const s = Store.data.settings, st = $('#c-st', el), btn = $('#c-send', el);
    const msg = $('#c-msg', el).value.trim();
    if (!msg) { st.textContent = t('Lütfen mesajınızı yazın.'); st.className = 'warn-t small'; $('#c-msg', el).focus(); return; }
    s.contactName = $('#c-name', el).value.trim(); s.contactReply = $('#c-reply', el).value.trim(); Store.save();
    const F = v => ({ stringValue: String(v).slice(0, 4000) });
    const fields = { mesaj: F(msg), konu: F($('#c-subj', el).value), dil: F(I18N.lang), surum: F(App.version), platform: F(PLAT), zaman: { timestampValue: new Date().toISOString() } };
    if (s.contactName) fields.ad = F(s.contactName.slice(0, 100));
    if (s.contactReply) fields.iletisim = F(s.contactReply.slice(0, 200));
    btn.disabled = true; st.textContent = t('Gönderiliyor…'); st.className = 'muted small';
    try {
      const c = AI.BUILTIN;
      const r = await fetch(`https://firestore.googleapis.com/v1/projects/${c.projectId}/databases/(default)/documents/mesajlar?key=${c.apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      st.textContent = '✓ ' + t('Mesajınız yöneticiye gönderildi. Teşekkürler!'); st.className = 'ok-t small';
      $('#c-msg', el).value = '';
    } catch (e) { st.textContent = t('Gönderilemedi; internet bağlantısını kontrol edip tekrar deneyin.'); st.className = 'warn-t small'; }
    finally { btn.disabled = false; }
  }
  async function showUpdate(el, force) {
    const out = $('#upd-out', el);
    if (force) out.innerHTML = '<p class="muted">Denetleniyor…</p>';
    const r = force ? await Updater.check() : Updater.last;
    if (!out.isConnected) return;
    if (!r || !r.ok) { out.innerHTML = `<p class="warn-t">${t('Denetlenemedi: {e}. İnternet bağlantısını kontrol edin.', { e: esc((r && r.error) || t('bilinmeyen hata')) })}</p>`; return; }
    if (!r.available) { out.innerHTML = `<p class="ok-t">✓ En güncel sürümü kullanıyorsunuz (v${Updater.short(r.current)}).</p>`; return; }
    out.innerHTML = `<div class="upd-box"><p><b>Yeni sürüm: v${Updater.short(r.version)}</b></p>${News.clean(r.notes) ? `<pre class="notes">${esc(News.clean(r.notes))}</pre>` : ''}
      <div class="row-btns">${r.web ? `<button class="btn primary" data-go="${esc(r.pageUrl)}">Sürüm sayfasını aç</button>`
        : r.needsFull ? `<button class="btn primary" data-go="${esc(r.exeUrl || r.pageUrl)}">Yeni programı indir</button><span class="muted small">Bu sürüm program dosyasının yenilenmesini gerektiriyor.</span>`
        : '<button class="btn primary" id="u-inst">Güncelle ve yeniden başlat</button>'}</div><p class="muted small" id="u-st"></p></div>`;
    $$('[data-go]', out).forEach(b => b.onclick = () => openUrl(b.dataset.go));
    const ib = $('#u-inst', out);
    if (ib) ib.onclick = async () => { ib.disabled = true; $('#u-st', out).textContent = 'İndiriliyor ve doğrulanıyor…'; const x = await Updater.install(); if (!x.ok) { ib.disabled = false; $('#u-st', out).textContent = t('Hata:') + ' ' + x.error; } };
  }
  return { title: 'Ayarlar', render };
})();
