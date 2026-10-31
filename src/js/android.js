// Android kabuğu (android/MainActivity.java) içinde çalışırken masaüstündeki window.api'nin aynısını sunar.
(() => {
  const B = window.AndroidBridge;
  if (!B || window.api) return;
  const waits = {};
  let seq = 0;
  window.__ccDone = (id, res) => { const f = waits[id]; delete waits[id]; if (f) f(JSON.parse(res)); };
  const later = fn => new Promise(res => { const id = 'c' + (++seq); waits[id] = res; fn(id); });
  const short = v => { const p = String(v).split('.'); return p[0] + '.' + (p[1] || 0) + (p[2] && p[2] !== '0' ? '.' + p[2] : ''); };
  window.api = {
    platform: 'android',
    info: async () => { const i = JSON.parse(B.info()); i.short = short(i.version); return i; },
    load: async () => JSON.parse(B.load()),
    save: async d => { if (!B.save(JSON.stringify(d))) throw new Error('veri.json'); },
    saveText: async ({ name, text }) => {
      const r = JSON.parse(B.saveText(name, /\.json$/i.test(name) ? 'application/json' : 'text/plain', text));
      if (r.ok) toast(t('Kaydedildi: {p}', { p: r.path })); else toast(t('Kaydedilemedi: ') + r.error, 'err');
      return r;
    },
    openText: () => new Promise(res => {
      const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
      i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(f); };
      i.click();
    }),
    openUrl: async u => B.openUrl(u),
    openDataDir: async () => {},
    checkUpdate: () => later(id => B.checkUpdate(id)),
    installUpdate: () => later(id => B.installUpdate(id)),
    restart: async () => B.restart(),
    updateOk: async () => B.updateOk()
  };
  // Geri tuşu: açık pencere kapanır, sonra Link Bütçesi'ne dönülür
  window.__onBack = () => {
    const m = document.querySelector('.modal-wrap:last-of-type [data-x]');
    if (m) { m.click(); return true; }
    if (typeof App !== 'undefined' && App.current && App.current !== 'budget') { App.go('budget'); return true; }
    return false;
  };
  document.documentElement.classList.add('android');
})();
