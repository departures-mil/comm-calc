// İnternetsiz eşitleme (aynı Wi-Fi modemi) + sağ üst Güncelle / Eşitle düğmeleri + indirme ilerlemesi.
// Birleştirme kuralı: projeler ve kütüphane kimliğe göre birleşir; aynı kayıtta en son
// değiştirilen kazanır; zamanı bilinmeyen çakışmada karşıdaki kopya ayrı kayıt olarak eklenir
// (hiçbir şey üzerine yazılıp kaybolmaz). Silinen kayıt "silindi" işaretiyle öbür cihaza da gider.
const LanSync = (() => {
  const LISTS = ['projects', 'library'];
  let snap = null;                                    // oturum başındaki kayıt izleri
  const sig = o => { const c = Object.assign({}, o); delete c.updatedAt; return JSON.stringify(c); };

  // Her kaydetmede değişen kayda zaman damgası, silinene "silindi" işareti koyar.
  function stamp(d) {
    if (!d) return;
    d.tomb = d.tomb || {};
    const now = Date.now(), cur = {};
    for (const k of LISTS) for (const it of d[k] || []) if (it && it.id) {
      const s = sig(it); cur[it.id] = s;
      if (snap && snap[it.id] !== undefined && snap[it.id] !== s) it.updatedAt = now;
      if (snap && snap[it.id] === undefined && !it.updatedAt) it.updatedAt = now;   // bu oturumda eklendi
    }
    if (snap) for (const id of Object.keys(snap)) if (cur[id] === undefined && !d.tomb[id]) d.tomb[id] = now;
    snap = cur;
  }

  function payload() {
    stamp(Store.data);
    const d = Store.data;
    return { app: 'commcalc', v: 1, projects: d.projects, library: d.library, tomb: d.tomb || {} };
  }

  function merge(r) {
    if (!r || r.app !== 'commcalc') throw new Error(t('Bu veri Comm Calc verisi değil'));
    const d = Store.data; d.tomb = d.tomb || {};
    let added = 0, updated = 0, removed = 0;
    for (const [id, tm] of Object.entries(r.tomb || {})) if (!d.tomb[id] || d.tomb[id] < tm) d.tomb[id] = tm;
    for (const k of LISTS) {
      const mine = d[k] = d[k] || [];
      const sigs = new Set(mine.map(sig));
      for (const it of r[k] || []) {
        if (!it || !it.id) continue;
        const tomb = d.tomb[it.id];
        if (tomb && tomb >= (it.updatedAt || 0)) continue;           // burada daha sonra silinmiş
        const i = mine.findIndex(x => x.id === it.id);
        if (i < 0) { if (!sigs.has(sig(it))) { mine.push(it); added++; } continue; }
        const a = mine[i];
        if (sig(a) === sig(it)) continue;
        if ((it.updatedAt || 0) > (a.updatedAt || 0)) { mine[i] = it; updated++; }
        else if (!a.updatedAt && !it.updatedAt && !sigs.has(sig(it))) {
          // iki tarafta da zamanı bilinmeyen farklı sürüm: karşıdakini kopya olarak koru
          const copy = Object.assign({}, it, { id: it.id + '-' + Math.random().toString(36).slice(2, 7) });
          if (copy.name) copy.name += ' ' + t('(diğer cihaz)');
          mine.push(copy); sigs.add(sig(it)); added++;
        }
      }
      // karşıda daha sonra silinenler
      for (let i = mine.length - 1; i >= 0; i--) {
        const tm = d.tomb[mine[i].id];
        if (tm && tm > (mine[i].updatedAt || 0)) { mine.splice(i, 1); removed++; }
      }
    }
    if (!d.projects.length) { const p = DATA.defaultProject(t('Örnek: 5.8G video linki')); d.projects.push(p); }
    if (!d.projects.find(p => p.id === d.currentId)) d.currentId = d.projects[0].id;
    snap = null; stamp(d);                               // birleşmiş hâl yeni başlangıç
    Store.flush();
    if (App.current) App.go(App.current);
    return { added, updated, removed };
  }

  // Başka cihaz bize bağlandığında (masaüstü sunucu)
  function init() {
    const of = Store.flush.bind(Store);
    Store.flush = async function () { try { stamp(this.data); } catch {} return of(); };
    stamp(Store.data);
    const L = window.api && window.api.lan;
    if (L && L.onIncoming) L.onIncoming(theirs => {
      const mine = payload();                            // önce kendi verimizi ayır
      const res = merge(theirs);
      toast(t('Eşitlendi: {a} yeni, {u} güncellendi, {r} silindi', { a: res.added, u: res.updated, r: res.removed }));
      return mine;
    });
    if (window.api && window.api.onUpdateProgress) window.api.onUpdateProgress(p => {
      const s = IndirmeIlerleme.yazi(p, I18N.lang === 'sq' ? 'en' : I18N.lang);
      $$('.upd-st, #u-st').forEach(e => e.textContent = s);
      const pg = $('#top-prog'); if (pg) { pg.hidden = !!p.bitti; pg.textContent = s; }
    });
    topButtons();
  }

  // Sağ üst: Güncelle ve Eşitle
  function topButtons() {
    const h = $('header.top');
    if (!h || $('#top-acts')) return;
    const box = document.createElement('div');
    box.id = 'top-acts'; box.className = 'top-acts';
    box.innerHTML = `<span id="top-prog" class="muted small" hidden></span>
      <button class="icon-btn top-btn" id="top-upd"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg><i class="upd-dot" hidden></i></button>
      <button class="icon-btn top-btn" id="top-sync"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/></svg></button>`;
    if (window.api && window.api.minimize) {
      box.insertAdjacentHTML('beforeend', '<button class="icon-btn top-btn" id="top-min">—</button><button class="icon-btn top-btn" id="top-quit">✕</button>');
    }
    h.appendChild(box);
    titles();
    if ($('#top-min')) {
      $('#top-min').onclick = () => window.api.minimize();
      $('#top-quit').onclick = async () => { if (await confirmBox(t('Programdan çıkılsın mı?'))) { await Store.flush(); window.api.quit(); } };
    }
    $('#top-upd').onclick = async () => {
      const b = $('#top-upd'); b.classList.add('busy');
      try {
        const r = await Updater.check();
        if (r && r.ok && r.available) News.available ? News.available(r) : App.go('settings');
        else if (r && r.ok) toast(t('Program güncel'));
        else toast(t('Hata:') + ' ' + ((r && r.error) || ''), 'err');
      } finally { b.classList.remove('busy'); }
    };
    $('#top-sync').onclick = dialog;
  }
  function titles() {
    const u = $('#top-upd'), s = $('#top-sync');
    if (u) { u.title = t('Güncelle'); u.setAttribute('aria-label', u.title); }
    if (s) { s.title = t('Eşitle'); s.setAttribute('aria-label', s.title); }
    const mi = $('#top-min'), q = $('#top-quit');
    if (mi) { mi.title = t('Küçült'); mi.setAttribute('aria-label', mi.title); }
    if (q) { q.title = t('Kapat'); q.setAttribute('aria-label', q.title); }
  }

  function dialog() {
    const L = window.api && window.api.lan;
    const desk = PLAT === 'desktop';
    const body = document.createElement('div');
    body.className = 'lan-dlg';
    body.innerHTML = `
      <p class="muted small">${esc(t('İnternet gerekmez. İki cihaz aynı Wi‑Fi modemine bağlı olsun. Birinde "Bekle"ye basın, öbüründe adresi bulup kodu girin. Kayıtlar iki yönlü birleşir; hiçbir kayıt kaybolmaz ya da üzerine yazılmaz, aynı kayıtta en son değiştirilen kalır.'))}</p>
      ${desk ? `<section class="card"><h4>${esc(t('1) Bu bilgisayar beklesin'))}</h4>
        <div id="lan-host"></div>
        <div class="row-btns"><button class="btn primary" id="lan-start"></button></div></section>` : ''}
      <section class="card"><h4>${esc(t(desk ? '2) Öbür cihaza bağlan' : 'Bilgisayara bağlan'))}</h4>
        ${desk ? `<div class="row-btns"><button class="btn" id="lan-find">${esc(t('Ağda bul'))}</button></div><div id="lan-found" class="row-btns"></div>` : ''}
        <label class="full"><span>${esc(t('Adres'))}</span><input id="lan-ip" inputmode="decimal" placeholder="192.168.1.20"></label>
        <label class="full"><span>${esc(t('Kod'))}</span><input id="lan-pin" inputmode="numeric" maxlength="6" placeholder="123456"></label>
        <div class="row-btns"><button class="btn primary" id="lan-go">${esc(t('Şimdi eşitle'))}</button></div>
        <p class="small" id="lan-out"></p></section>`;
    const m = modal(t('Wi‑Fi ile eşitle (internetsiz)'), body, [{ label: t('Kapat') }]);
    const out = $('#lan-out', body);

    async function paintHost() {
      if (!desk) return;
      const st = await L.state();
      $('#lan-host', body).innerHTML = st.hosting
        ? `<p>${esc(t('Adres'))}: <b>${esc(st.ips.join(', ') || '—')}</b></p><p class="lan-pin">${esc(t('Kod'))}: <b>${esc(st.pin)}</b></p><p class="muted small">${esc(t('Eşitleme bitene kadar program açık kalsın.'))}</p>`
        : `<p class="muted small">${esc(t('Bu bilgisayarı eşitlemeye açar; adres ve kod burada görünür.'))}</p>`;
      $('#lan-start', body).textContent = st.hosting ? t('Beklemeyi durdur') : t('Bekle (eşitlemeye aç)');
    }
    if (desk) {
      paintHost();
      $('#lan-start', body).onclick = async () => {
        try { const st = await L.state(); if (st.hosting) await L.stop(); else await L.start(); }
        catch (e) { toast(t('Hata:') + ' ' + e.message, 'err'); }
        paintHost();
      };
      $('#lan-find', body).onclick = async () => {
        const b = $('#lan-find', body); b.disabled = true;
        L.onScan(v => { b.textContent = t('Aranıyor…') + ' %' + Math.round(v * 100); });
        const f = await L.discover();
        b.disabled = false; b.textContent = t('Ağda bul');
        $('#lan-found', body).innerHTML = f.map(h => `<button class="btn xs" data-h="${esc(h)}">${esc(h)}</button>`).join('') || `<span class="muted small">${esc(t('Bekleyen cihaz bulunamadı. Adresi elle yazabilirsiniz.'))}</span>`;
        $$('#lan-found [data-h]', body).forEach(x => x.onclick = () => { $('#lan-ip', body).value = x.dataset.h; });
        if (f.length === 1) $('#lan-ip', body).value = f[0];
      };
    }
    $('#lan-go', body).onclick = async () => {
      const host = $('#lan-ip', body).value.trim(), pin = $('#lan-pin', body).value.trim();
      if (!host || !/^\d{6}$/.test(pin)) { out.textContent = t('Adresi ve 6 haneli kodu girin.'); return; }
      const b = $('#lan-go', body); b.disabled = true; out.textContent = t('Eşitleniyor…');
      try {
        const r = desk ? await L.sync(host, pin, payload()) : await webSync(host, pin);
        if (!r.ok) throw new Error(r.error);
        const res = merge(r.data);
        out.textContent = t('Eşitlendi: {a} yeni, {u} güncellendi, {r} silindi', { a: res.added, u: res.updated, r: res.removed });
      } catch (e) {
        const c = String(e.message || e);
        out.textContent = c === 'pin' ? t('Kod yanlış.') : c === 'unreachable' || /fetch|network|timeout/i.test(c)
          ? t('Cihaza ulaşılamadı. İkisi de aynı Wi‑Fi\'de mi, öbür cihazda "Bekle" açık mı?') : t('Hata:') + ' ' + c;
      } finally { b.disabled = false; }
    };
    return m;
  }

  // Telefon (APK) istemcisi: bilgisayardaki sunucuya doğrudan bağlanır
  async function webSync(host, pin) {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 60000);
    try {
      const r = await fetch(`http://${host}:47821/cc-esitle`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': pin }, body: JSON.stringify(payload()), signal: ctl.signal });
      if (r.status === 403) return { ok: false, error: 'pin' };
      if (!r.ok) return { ok: false, error: 'http ' + r.status };
      return { ok: true, data: await r.json() };
    } catch { return { ok: false, error: 'unreachable' }; } finally { clearTimeout(tm); }
  }

  return { init, merge, payload, stamp, dialog, titles };
})();
