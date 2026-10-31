// Uygulama kabuğu: gezinme, tema, açılışta güncelleme denetimi.
const App = {
  version: '1.6.0', short: '1.6', repo: 'departures-mil/comm-calc', current: null,
  NAV: [['budget', 'Link Bütçesi', '⟿'], ['tools', 'Araçlar', '⚙'], ['tables', 'Tablolar', '▦'], ['antennas', 'Antenler', '⌁'], ['library', 'Kütüphane', '☰'], ['learn', 'Eğitim', '✎'], ['settings', 'Ayarlar', '⛭']],
  async start() {
    if (window.api) { const i = await window.api.info(); this.version = i.version; this.short = i.short; this.repo = i.repo; }
    await Store.init();
    I18N.set(Store.data.settings.lang);
    this.applyTheme();
    this.renderShell();
    $('#upd-banner-btn').onclick = () => this.go('settings');
    this.go(localStorage.getItem('cc-view') || 'budget');
    if (window.api) window.api.updateOk();
    if (Store.data.settings.autoUpdate) setTimeout(async () => {
      const r = await Updater.check();
      if (r && r.ok && r.available) { $('#upd-banner-v').textContent = 'v' + Updater.short(r.version); $('#upd-banner').hidden = false; News.available(r); }
    }, 1500);
    News.afterUpdate();
  },
  // Dil değişince yeniden çizilen kabuk: menü, alt bilgi, dil seçici
  renderShell() {
    $('#ver').textContent = 'v' + this.short;
    document.title = 'Comm Calc v' + this.short;
    $('#nav').innerHTML = this.NAV.map(([k, l, i]) => `<button class="nav-i" data-v="${k}"><span class="ni">${i}</span><span>${t(l)}</span>${k === 'settings' ? '<span class="upd-dot" hidden></span>' : ''}</button>`).join('');
    $$('#nav .nav-i').forEach(b => b.onclick = () => this.go(b.dataset.v));
    $('#side-f').textContent = t('İHA link bütçesi');
    $('#upd-banner-t').textContent = t('Yeni sürüm hazır:');
    $('#upd-banner-btn').textContent = t('Güncelle');
    $('#langs').innerHTML = Object.entries(I18N.LANGS).map(([k, l]) => `<button class="lang${k === I18N.lang ? ' on' : ''}" data-lang="${k}">${l.name}</button>`).join('');
    $$('#langs .lang').forEach(b => b.onclick = () => this.setLang(b.dataset.lang));
    if (this.current) $$('#nav .nav-i').forEach(b => b.classList.toggle('on', b.dataset.v === this.current));
  },
  setLang(code) {
    Store.data.settings.lang = code; Store.save();
    I18N.set(code); this.renderShell(); this.go(this.current || 'budget');
  },
  go(view, arg) {
    if (!Views[view]) view = 'budget';
    if (view === 'antennas' && arg) Views.antennas.select && Views.antennas.select(arg);
    this.current = view;
    try { localStorage.setItem('cc-view', view); } catch {}
    $$('#nav .nav-i').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    $('#title').textContent = t(Views[view].title);
    const main = $('#view');
    main.scrollTop = 0;
    Views[view].render(main);
  },
  applyTheme() { document.documentElement.dataset.theme = Store.data.settings.theme || 'dark'; },
  setUpdateBadge(on) { const d = $('.upd-dot'); if (d) d.hidden = !on; }
};
window.addEventListener('DOMContentLoaded', () => App.start().catch(e => { document.body.innerHTML = '<pre style="padding:20px;color:#e5484d">Error: ' + esc(e.stack || e) + '</pre>'; }));
