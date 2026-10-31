// Uygulama kabuğu: gezinme, tema, açılışta güncelleme denetimi.
const App = {
  version: '1.2.0', short: '1.2', repo: 'departures-mil/comm-calc', current: null,
  NAV: [['budget', 'Link Bütçesi', '⟿'], ['tools', 'Araçlar', '⚙'], ['tables', 'Tablolar', '▦'], ['antennas', 'Antenler', '⌁'], ['library', 'Kütüphane', '☰'], ['learn', 'Eğitim', '✎'], ['settings', 'Ayarlar', '⛭']],
  async start() {
    if (window.api) { const i = await window.api.info(); this.version = i.version; this.short = i.short; this.repo = i.repo; }
    await Store.init();
    this.applyTheme();
    $('#ver').textContent = 'v' + this.short;
    document.title = 'Comm Calc v' + this.short;
    $('#nav').innerHTML = this.NAV.map(([k, l, i]) => `<button class="nav-i" data-v="${k}"><span class="ni">${i}</span><span>${l}</span>${k === 'settings' ? '<span class="upd-dot" hidden></span>' : ''}</button>`).join('');
    $$('#nav .nav-i').forEach(b => b.onclick = () => this.go(b.dataset.v));
    $('#upd-banner-btn').onclick = () => this.go('settings');
    this.go(localStorage.getItem('cc-view') || 'budget');
    if (window.api) window.api.updateOk();
    if (Store.data.settings.autoUpdate) setTimeout(async () => {
      const r = await Updater.check();
      if (r && r.ok && r.available) { $('#upd-banner-v').textContent = 'v' + Updater.short(r.version); $('#upd-banner').hidden = false; }
    }, 1500);
  },
  go(view, arg) {
    if (!Views[view]) view = 'budget';
    if (view === 'antennas' && arg) Views.antennas.select && Views.antennas.select(arg);
    this.current = view;
    try { localStorage.setItem('cc-view', view); } catch {}
    $$('#nav .nav-i').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    $('#title').textContent = Views[view].title;
    const main = $('#view');
    main.scrollTop = 0;
    Views[view].render(main);
  },
  applyTheme() { document.documentElement.dataset.theme = Store.data.settings.theme || 'dark'; },
  setUpdateBadge(on) { const d = $('.upd-dot'); if (d) d.hidden = !on; }
};
window.addEventListener('DOMContentLoaded', () => App.start().catch(e => { document.body.innerHTML = '<pre style="padding:20px;color:#e5484d">Başlatma hatası: ' + esc(e.stack || e) + '</pre>'; }));
