// İnternetsiz eşitleme (aynı Wi-Fi modemi). Üst çubuktaki Wi‑Fi / Eşitle düğmeleri (ortak çekirdek) bu pencereyi açar.
// Birleştirme kuralı ortak çekirdekten (FC.lanMerge): projeler ve kütüphane kimliğe göre birleşir; aynı kayıtta en son
// değiştirilen kalır, eskisi çakışma yedeğine; öbür cihazda silinen kayıt burada ARŞİVE taşınır (kalıcı silme yok).
const LanSync = (() => {
  const LISTS = ['projects', 'library'];
  let snap = null;                                    // oturum başındaki kayıt izleri
  let hostingNow = false;                             // bu bilgisayar eşitlemeye açık mı (üst çubuktaki Wi‑Fi düğmesi)
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

  // Gönderilen paket. v2: silme izleri "silinen" alanında; "tomb" eski (≤1.11) cihazlar için BOŞ gönderilir, çünkü onların
  // eski birleştirmesi tomb'daki kayıtları kalıcı olarak silerdi. Eski cihazdan gelen tomb burada yalnızca arşivlemeye yol açar.
  function payload() {
    stamp(Store.data);
    const d = Store.data;
    return { app: 'commcalc', v: 2, projects: d.projects, library: d.library, tomb: {}, silinen: d.tomb || {} };
  }

  // Ortak çekirdek kuralı (FC.lanMerge, SPEC "Eşitleme kuralı"): hiçbir kayıt silinmez ya da sessizce ezilmez.
  //  - yalnız bir tarafta olan kayıt eklenir; iki tarafta farklıysa yeni olan kalır, öbürü d.cakisma'ya (çakışma yedeği) yazılır;
  //  - öbür cihazda silinen kayıt burada silinmez: d.arsiv'e (arşiv) taşınır, Ayarlar → Veri ve yedek'ten geri alınabilir.
  function merge(r) {
    if (!r || r.app !== 'commcalc') throw new Error(t('Bu veri Comm Calc verisi değil'));
    const d = Store.data; d.tomb = d.tomb || {}; d.arsiv = d.arsiv || []; d.cakisma = d.cakisma || [];
    const theirTomb = Object.assign({}, r.tomb || {}, r.silinen || {});
    const now = Date.now();
    let added = 0, updated = 0, archived = 0, conflicts = 0;
    const withTombs = (list, tomb) => {
      const out = (list || []).filter(x => x && x.id);
      const ids = new Set(out.map(x => x.id));
      for (const [id, tm] of Object.entries(tomb || {})) if (!ids.has(id)) out.push({ id, deleted: true, deletedAt: tm });
      return out;
    };
    for (const k of LISTS) {
      const mine = d[k] = d[k] || [];
      const before = new Map(mine.map(x => [x.id, sig(x)]));
      const res = FC.lanMerge.merge(withTombs(mine, d.tomb), withTombs(r[k], theirTomb), { idKey: 'id', updatedKey: 'updatedAt' });
      const live = [];
      for (const rec of res.records) {
        if (rec.archived) continue;                      // arşivlenenler listeden çıkar, d.arsiv'de korunur
        live.push(rec);
        if (!before.has(rec.id)) added++; else if (before.get(rec.id) !== sig(rec)) updated++;
      }
      // aynı kaydın aynı hâli ikinci kez arşive / yedeğe yazılmaz (eski cihazla her eşitlemede tekrar gelebilir)
      const has = (list, rec) => list.some(x => x.tur === k && x.kayit && x.kayit.id === rec.id && sig(x.kayit) === sig(rec));
      for (const a of res.archived) {
        const rec = Object.assign({}, a.record); delete rec.archived; delete rec.archivedAt;
        if (has(d.arsiv, rec)) continue;
        d.arsiv.push({ tur: k, zaman: now, silinme: a.deletedAt, kaynak: a.from === 'remote' ? 'diger-cihaz' : 'bu-cihaz', kayit: rec });
        if (a.from === 'remote') archived++;
      }
      for (const c of res.conflicts) { if (has(d.cakisma, c.lost)) continue; d.cakisma.push({ tur: k, zaman: now, kalan: c.keptFrom === 'local' ? 'bu-cihaz' : 'diger-cihaz', kayit: c.lost }); conflicts++; }
      d[k] = live;
    }
    for (const [id, tm] of Object.entries(theirTomb)) if (!d.tomb[id] || d.tomb[id] < tm) d.tomb[id] = tm;
    if (!d.projects.length) { const p = DATA.defaultProject(t('Örnek: 5.8G video linki')); d.projects.push(p); }
    if (!d.projects.find(p => p.id === d.currentId)) d.currentId = d.projects[0].id;
    snap = null; stamp(d);                               // birleşmiş hâl yeni başlangıç
    Store.flush();
    if (App.current) App.go(App.current);
    return { added, updated, archived, conflicts };
  }
  const resultText = res => t('Eşitlendi: {a} yeni, {u} güncellendi, {r} arşive taşındı, {c} çakışma yedeklendi', { a: res.added, u: res.updated, r: res.archived, c: res.conflicts });

  // Başka cihaz bize bağlandığında (masaüstü sunucu)
  function init() {
    const of = Store.flush.bind(Store);
    Store.flush = async function () { try { stamp(this.data); } catch {} return of(); };
    stamp(Store.data);
    const L = window.api && window.api.lan;
    if (L && L.onIncoming) L.onIncoming(theirs => {
      const mine = payload();                            // önce kendi verimizi ayır
      const res = merge(theirs);
      toast(resultText(res));
      return mine;
    });
  }

  // Arşiv (öbür cihazda silinenler, geri yükleme öncesi hâl) ve çakışma yedekleri: görüntüle, geri al
  function archiveDialog() {
    const d = Store.data; d.arsiv = d.arsiv || []; d.cakisma = d.cakisma || [];
    const body = document.createElement('div');
    const name = x => (x.kayit && (x.kayit.name || x.kayit.id)) || (x.tur === 'yedek' ? t('Geri yükleme öncesi tüm veriler') : '?');
    const kind = x => x.tur === 'projects' ? t('Proje') : x.tur === 'library' ? t('Kütüphane') : t('Yedek');
    function draw() {
      const rows = [...d.arsiv.map((x, i) => ({ x, i, src: 'arsiv' })), ...d.cakisma.map((x, i) => ({ x, i, src: 'cakisma' }))].sort((a, b) => b.x.zaman - a.x.zaman);
      body.innerHTML = `<p class="muted small">${esc(t('Wi‑Fi eşitlemesinde öbür cihazda silinen kayıtlar ve çakışmada geride kalan eski sürümler burada saklanır. "Geri al" kaydı kopya olarak listesine ekler.'))}</p>` +
        (rows.length ? '<div class="cc-list">' + rows.map(r => `<div class="cc-it"><div><b>${esc(name(r.x))}</b><span class="muted small">${esc(kind(r.x))} · ${esc(r.src === 'arsiv' ? t('Arşiv') : t('Çakışma yedeği'))} · ${esc(new Date(r.x.zaman).toLocaleString(I18N.locale))}</span></div>${r.x.tur === 'projects' || r.x.tur === 'library' ? `<button class="btn xs" data-r="${r.src}:${r.i}">${esc(t('Geri al'))}</button>` : ''}</div>`).join('') + '</div>'
        : `<p>${esc(t('Arşivde kayıt yok.'))}</p>`);
      $$('[data-r]', body).forEach(b => b.onclick = () => {
        const [src, i] = b.dataset.r.split(':'); const x = (src === 'arsiv' ? d.arsiv : d.cakisma)[+i];
        const list = d[x.tur] = d[x.tur] || [];
        const rec = JSON.parse(JSON.stringify(x.kayit));
        if (list.some(y => y.id === rec.id)) { rec.id = rec.id + '-' + Math.random().toString(36).slice(2, 7); if (rec.name) rec.name += ' ' + t('(geri alındı)'); }
        rec.updatedAt = Date.now(); delete d.tomb[rec.id];
        list.push(rec); Store.save(); toast(t('Geri alındı: {n}', { n: name(x) }));
        b.disabled = true;
      });
    }
    draw();
    return modal(t('Arşiv ve çakışma yedekleri'), body, [{ label: t('Kapat') }]);
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
        try { const st = await L.state(); if (st.hosting) await L.stop(); else await L.start(); hostingNow = !st.hosting; if (window.Kabuk) Kabuk.setLan(hostingNow ? 'on' : 'off'); }
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
        out.textContent = resultText(res);
      } catch (e) {
        const c = String(e.message || e);
        out.textContent = c === 'pin' ? t('Kod yanlış.') : c === 'unreachable' || /fetch|network|timeout/i.test(c)
          ? t('Cihaza ulaşılamadı. İkisi de aynı Wi‑Fi\'de mi, öbür cihazda "Bekle" açık mı?') : t('Hata:') + ' ' + c;
      } finally { b.disabled = false; }
    };
    return m;
  }

  // Telefon (APK) istemcisi: bilgisayardaki sunucuya bağlanır. Yeni APK'da istek yerel taraftan (Java) gider; https sayfasından
  // http://<ip> isteği karışık içerik olarak engellendiği için eski APK'da yalnızca fetch denenir.
  async function webSync(host, pin) {
    if (window.api && window.api.lanSync) {
      const r = await window.api.lanSync(host, pin, JSON.stringify(payload()));
      if (r && r.ok && typeof r.data === 'string') { try { r.data = JSON.parse(r.data); } catch { return { ok: false, error: 'json' }; } }
      return r;
    }
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 60000);
    try {
      const r = await fetch(`http://${host}:47821/cc-esitle`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-pin': pin }, body: JSON.stringify(payload()), signal: ctl.signal });
      if (r.status === 403) return { ok: false, error: 'pin' };
      if (!r.ok) return { ok: false, error: 'http ' + r.status };
      return { ok: true, data: await r.json() };
    } catch { return { ok: false, error: 'unreachable' }; } finally { clearTimeout(tm); }
  }

  return { init, merge, payload, stamp, dialog, archiveDialog, hosting: () => hostingNow };
})();
