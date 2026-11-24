// Uygulama kabuğu: gezinme, dil ve açılış. Üst çubuk, tema, güncelleme, "neler yeni", ayarlar düzeni ortak çekirdekten
// (src/js/kabuk.js → FC.*). Sürüm tek kaynaktan gelir: package.json → tools/surum.js → src/js/surum.js (window.APP_RELEASE).
const App = {
  version: (window.APP_RELEASE || {}).version || '0.0.0', repo: 'departures-mil/comm-calc', current: null, legacy: false,
  NAV: [['budget', 'Link Bütçesi'], ['tools', 'Araçlar'], ['tables', 'Tablolar'], ['antennas', 'Antenler'], ['library', 'Kütüphane'], ['learn', 'Eğitim'], ['settings', 'Ayarlar']],
  get short() { return this.version; },
  async start() {
    let info = null;
    if (window.api) { try { info = await window.api.info(); } catch {} }
    this.legacy = !!(info && info.legacy);
    await Store.init();
    Kabuk.init(info);
    const lang = Kabuk.initialLang(Store.data.settings.lang);
    Store.data.settings.lang = lang;
    I18N.set(lang);
    Kabuk.langChanged(lang);
    this.renderShell();
    Kabuk.topbar();
    LanSync.init();
    this.go(localStorage.getItem('cc-view') || 'budget');
    if (window.api && window.api.updateOk) window.api.updateOk();   // eski kabuk: açılış başarılı (deneme sayacı sıfırlanır)
    Kabuk.started();
  },
  // Dil değişince yeniden çizilen kabuk: menü, alt bilgi
  renderShell() {
    $('#ver').textContent = 'v' + this.version;
    document.title = 'Comm Calc v' + this.version;
    $('#nav').innerHTML = this.NAV.map(([k, l]) => `<button type="button" class="nav-item" data-v="${k}">${Kabuk.icon(k)}<span>${t(l)}</span>${k === 'settings' ? '<span class="upd-dot" hidden></span>' : ''}</button>`).join('');
    $$('#nav .nav-item').forEach(b => b.onclick = () => { this.go(b.dataset.v); Kabuk.closeDrawer(); });
    $('#side-f').textContent = t('İHA link bütçesi');
    if (this.current) $$('#nav .nav-item').forEach(b => b.classList.toggle('active', b.dataset.v === this.current));
    this.setUpdateBadge(this._upd);
  },
  setLang(code) {
    if (!I18N.LANGS[code]) return;
    if (Store.data.settings.lang === code && I18N.lang === code) return;
    Store.data.settings.lang = code; Store.save();
    I18N.set(code); Kabuk.langChanged(code); this.renderShell(); this.go(this.current || 'budget');
  },
  go(view, arg) {
    if (!Views[view]) view = 'budget';
    if (view === 'antennas' && arg) Views.antennas.select && Views.antennas.select(arg);
    this.current = view;
    try { localStorage.setItem('cc-view', view); } catch {}
    $$('#nav .nav-item').forEach(b => b.classList.toggle('active', b.dataset.v === view));
    $('#title').textContent = t(Views[view].title);
    const main = $('#view');
    main.scrollTop = 0;
    Views[view].render(main);
  },
  setUpdateBadge(on) { this._upd = !!on; $$('.upd-dot').forEach(d => d.hidden = !on); }
};
window.addEventListener('DOMContentLoaded', () => App.start().catch(e => { console.error(e); document.body.innerHTML = '<pre style="padding:20px;color:#e5484d">Error: ' + esc(e.stack || e) + '</pre>'; }));
