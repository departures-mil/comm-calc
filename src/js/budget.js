// Link bütçesi ekranı: girişler, aç/kapa ve yeniden adlandırılabilir kalemler, sonuçlar ve diyagramlar.
Views.budget = (() => {
  const SIDES = { tx: 'Verici tarafı', path: 'Yol (yayılım)', rx: 'Alıcı tarafı' };
  const AUTO_LABEL = { fspl: 'FSPL otomatik', cable: 'Kablo', conn: 'Konnektör', vswr: 'VSWR', foliage: 'Bitki örtüsü', rain: 'Yağmur', pol: 'Polarizasyon', point: 'Yönlendirme' };
  const TEMPLATES = [
    { label: 'Manuel kazanç (+dB)', make: () => ({ kind: 'gain', name: 'Yeni kazanç', value: 3 }) },
    { label: 'Manuel kayıp (−dB)', make: () => ({ kind: 'loss', name: 'Yeni kayıp', value: 1 }) },
    { label: 'Kablo (tip + uzunluk)', make: () => ({ kind: 'loss', name: 'Kablo kaybı', auto: 'cable', p: { cable: 'RG316', len: 0.2 } }) },
    { label: 'Konnektör / adaptör', make: () => ({ kind: 'loss', name: 'Konnektör kaybı', auto: 'conn', p: { type: 'SMA', n: 1 } }) },
    { label: 'VSWR uyumsuzluk kaybı', make: () => ({ kind: 'loss', name: 'VSWR uyumsuzluğu', auto: 'vswr', p: { vswr: 1.5 } }) },
    { label: 'Amplifikatör (PA / LNA)', make: () => ({ kind: 'gain', name: 'Amplifikatör', value: 10 }) },
    { label: 'Bölücü / diversity (3 dB)', make: () => ({ kind: 'loss', name: 'Güç bölücü', value: 3.5 }) },
    { label: 'Filtre / yıldırım koruyucu', make: () => ({ kind: 'loss', name: 'Filtre kaybı', value: 1 }) },
    { label: 'Engel (bina, duvar, ağaç)', make: () => ({ kind: 'loss', name: 'Engel kaybı', value: 6 }) },
    { label: 'Bitki örtüsü (Weissberger)', make: () => ({ kind: 'loss', name: 'Bitki örtüsü', auto: 'foliage', p: { depth: 20 } }) },
    { label: 'Yağmur (ITU-R P.838)', make: () => ({ kind: 'loss', name: 'Yağmur kaybı', auto: 'rain', p: { rate: 25 } }) },
    { label: 'Polarizasyon uyumsuzluğu', make: () => ({ kind: 'loss', name: 'Polarizasyon kaybı', auto: 'pol', p: { mode: 'type', a: 'V', b: 'H', angle: 0 } }) },
    { label: 'Yönlendirme (sapma) kaybı', make: () => ({ kind: 'loss', name: 'Yönlendirme kaybı', auto: 'point', p: { off: 10, hpbw: 30 } }) },
    { label: 'Serbest uzay kaybı (FSPL)', make: () => ({ kind: 'loss', name: 'Serbest uzay kaybı', auto: 'fspl' }) }
  ];
  let root, P;

  const distKm = () => P.dist.unit === 'm' ? num(P.dist.value) / 1000 : P.dist.unit === 'mi' ? num(P.dist.value) * 1.609344 : num(P.dist.value);
  const budgetObj = () => ({ txDbm: RF.toDbm(num(P.tx.power), P.tx.unit), fMHz: Math.max(1, num(P.tx.fMHz, 1)), dKm: Math.max(1e-6, distKm()), sens: num(P.rx.sens), fade: num(P.fade), items: P.items });

  function render(el) {
    root = el; P = Store.project;
    const projOpts = Store.data.projects.map(p => `<option value="${p.id}"${p.id === P.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
    el.innerHTML = `
    <div class="toolbar">
      <label class="proj-sel">Proje <select id="b-proj">${projOpts}</select></label>
      <button class="btn sm" data-a="new">＋ Yeni</button>
      <button class="btn sm" data-a="dup">Kopyala</button>
      <button class="btn sm" data-a="ren">Yeniden adlandır</button>
      <button class="btn sm" data-a="del">Sil</button>
      <span class="grow"></span>
      <button class="btn sm" data-a="exp">Dışa aktar</button>
      <button class="btn sm" data-a="imp">İçe aktar</button>
      <button class="btn sm" data-a="reset">Kalemleri sıfırla</button>
    </div>
    <div class="budget-grid">
      <div class="col-in">
        <section class="card">
          <h3><span class="dot tx"></span>Verici (Tx)</h3>
          <div class="dev-line"><input id="tx-name" placeholder="Verici cihaz adı" value="${esc(P.tx.name)}"><button class="btn sm" data-lib="tx">Kütüphaneden</button></div>
          <div class="frow"><label>Çıkış gücü</label><div class="ig"><input id="tx-power" type="number" step="any" value="${P.tx.power}"><select id="tx-unit">${['mW', 'W', 'dBm', 'dBW'].map(u => `<option${u === P.tx.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></div><output id="tx-conv"></output></div>
          <div class="frow"><label>Frekans</label><div class="ig"><input id="tx-f" type="number" step="any" value="${P.tx.fMHz}"><span class="unit">MHz</span></div><output id="f-lambda"></output></div>
          <div class="chips">${[433, 868, 915, 1280, 2450, 5800].map(f => `<button class="chip" data-f="${f}">${f >= 1000 ? (f / 1000).toString().replace('.', ',') + ' GHz' : f + ' MHz'}</button>`).join('')}</div>
        </section>
        <section class="card">
          <h3><span class="dot path"></span>Mesafe ve yükseklik</h3>
          <div class="frow"><label>Mesafe</label><div class="ig"><input id="d-val" type="number" step="any" value="${P.dist.value}"><select id="d-unit">${['km', 'm', 'mi'].map(u => `<option${u === P.dist.unit ? ' selected' : ''}>${u}</option>`).join('')}</select></div></div>
          <input id="d-range" type="range" min="0" max="1000" step="1" aria-label="Mesafe kaydırıcı">
          <div class="frow two"><label>Verici yüksekliği</label><div class="ig"><input id="h-tx" type="number" step="any" value="${P.heights.tx}"><span class="unit">m</span></div>
          <label>Alıcı yüksekliği</label><div class="ig"><input id="h-rx" type="number" step="any" value="${P.heights.rx}"><span class="unit">m</span></div></div>
        </section>
        <section class="card">
          <h3><span class="dot rx"></span>Alıcı (Rx)</h3>
          <div class="dev-line"><input id="rx-name" placeholder="Alıcı cihaz adı" value="${esc(P.rx.name)}"><button class="btn sm" data-lib="rx">Kütüphaneden</button></div>
          <div class="frow"><label>Hassasiyet (sensitivity)</label><div class="ig"><input id="rx-sens" type="number" step="any" value="${P.rx.sens}"><span class="unit">dBm</span></div><output id="rx-conv"></output></div>
          <div class="frow"><label>İstenen sönümlenme payı</label><div class="ig"><input id="fade" type="number" step="any" value="${P.fade}"><span class="unit">dB</span></div><output class="muted">güvenli menzil için</output></div>
        </section>
        <section class="card">
          <h3>Kazanç ve kayıp kalemleri <span class="muted small">— aç/kapa, isim değiştir, sırala</span></h3>
          <div id="items"></div>
        </section>
      </div>
      <div class="col-out">
        <section class="card result" id="res-hero"></section>
        <section class="card"><h3>Blok diyagram</h3><div id="block" class="svgbox"></div></section>
        <section class="card"><h3>Sinyal seviyesi diyagramı <span class="muted small">— her kalemden sonra sinyal gücü</span></h3><div id="level" class="svgbox"></div></section>
        <section class="card"><h3>Mesafe – alınan güç grafiği</h3><div id="range" class="svgbox"></div></section>
        <section class="card"><h3>Görüş hattı ve Fresnel</h3><div id="los"></div></section>
      </div>
    </div>`;
    bind();
    renderItems();
    update();
  }

  function bind() {
    const on = (id, ev, fn) => $('#' + id, root).addEventListener(ev, fn);
    on('b-proj', 'change', e => { Store.data.currentId = e.target.value; Store.save(); render(root); });
    on('tx-name', 'input', e => { P.tx.name = e.target.value; changed(); });
    on('tx-power', 'input', e => { P.tx.power = num(e.target.value); changed(); });
    on('tx-unit', 'change', e => {
      // Birim değişince aynı gücü koru
      const dbm = RF.toDbm(num(P.tx.power), P.tx.unit), u = e.target.value;
      const v = u === 'dBm' ? dbm : u === 'dBW' ? dbm - 30 : u === 'W' ? RF.dbmToW(dbm) : RF.dbmToMw(dbm);
      P.tx.unit = u; P.tx.power = +v.toPrecision(5); $('#tx-power', root).value = P.tx.power; changed();
    });
    on('tx-f', 'input', e => { P.tx.fMHz = num(e.target.value); changed(); });
    on('d-val', 'input', e => { P.dist.value = num(e.target.value); syncSlider(); changed(); });
    on('d-unit', 'change', e => {
      const km = distKm(); P.dist.unit = e.target.value;
      P.dist.value = +(P.dist.unit === 'm' ? km * 1000 : P.dist.unit === 'mi' ? km / 1.609344 : km).toPrecision(5);
      $('#d-val', root).value = P.dist.value; changed();
    });
    on('d-range', 'input', e => {
      // Logaritmik kaydırıcı: 10 m – 200 km
      const km = Math.pow(10, -2 + (+e.target.value / 1000) * (Math.log10(200) + 2));
      P.dist.value = +(P.dist.unit === 'm' ? km * 1000 : P.dist.unit === 'mi' ? km / 1.609344 : km).toPrecision(3);
      $('#d-val', root).value = P.dist.value; changed();
    });
    on('h-tx', 'input', e => { P.heights.tx = num(e.target.value); changed(); });
    on('h-rx', 'input', e => { P.heights.rx = num(e.target.value); changed(); });
    on('rx-name', 'input', e => { P.rx.name = e.target.value; changed(); });
    on('rx-sens', 'input', e => { P.rx.sens = num(e.target.value); changed(); });
    on('fade', 'input', e => { P.fade = num(e.target.value); changed(); });
    $$('[data-f]', root).forEach(b => b.onclick = () => { P.tx.fMHz = +b.dataset.f; $('#tx-f', root).value = P.tx.fMHz; changed(); renderItems(); });
    $$('[data-lib]', root).forEach(b => b.onclick = () => pickDevice(b.dataset.lib));
    $$('[data-a]', root).forEach(b => b.onclick = () => projectAction(b.dataset.a));
    syncSlider();
  }
  function syncSlider() {
    const km = Math.min(200, Math.max(0.01, distKm()));
    $('#d-range', root).value = Math.round((Math.log10(km) + 2) / (Math.log10(200) + 2) * 1000);
  }
  function changed() { P.updated = Date.now(); Store.save(); update(); }

  async function projectAction(a) {
    const D = Store.data;
    if (a === 'new') { const p = DATA.defaultProject('Yeni link ' + (D.projects.length + 1)); D.projects.push(p); D.currentId = p.id; }
    if (a === 'dup') { const p = JSON.parse(JSON.stringify(P)); p.id = 'p' + Date.now().toString(36); p.name = P.name + ' (kopya)'; D.projects.push(p); D.currentId = p.id; }
    if (a === 'ren') {
      const m = modal('Projeyi yeniden adlandır', `<input id="ren-in" class="wide" value="${esc(P.name)}">`, [{ label: 'Vazgeç' }, { label: 'Kaydet', cls: 'primary', onClick: () => { P.name = $('#ren-in').value.trim() || P.name; Store.save(); render(root); } }]);
      setTimeout(() => $('#ren-in', m.el).select(), 30); return;
    }
    if (a === 'del') {
      if (D.projects.length < 2) return toast('Son proje silinemez', 'err');
      if (!await confirmBox(`"${P.name}" silinsin mi?`, 'Sil')) return;
      D.projects = D.projects.filter(p => p.id !== P.id); D.currentId = D.projects[0].id;
    }
    if (a === 'exp') { await downloadText((P.name || 'link').replace(/[^\wçğıöşüÇĞİÖŞÜ -]/g, '') + '.commcalc.json', JSON.stringify({ commcalc: 1, project: P }, null, 2)); return; }
    if (a === 'imp') {
      const t = await pickTextFile(); if (!t) return;
      try { const o = JSON.parse(t); const p = o.project || o; if (!p.items || !p.tx) throw 0; p.id = 'p' + Date.now().toString(36); D.projects.push(p); D.currentId = p.id; toast('Proje içe aktarıldı'); }
      catch { return toast('Dosya Comm Calc projesi değil', 'err'); }
    }
    if (a === 'reset') { if (!await confirmBox('Tüm kalemler varsayılan listeye dönsün mü?', 'Sıfırla')) return; P.items = DATA.defaultItems(); }
    Store.save(); render(root);
  }

  // ---- Kütüphaneden cihaz/anten seçimi
  function pickDevice(kind) {
    const lib = Store.data.library;
    const want = kind === 'tx' ? ['tx'] : kind === 'rx' ? ['rx'] : ['antenna'];
    const list = lib.filter(x => want.includes(x.type));
    const box = document.createElement('div');
    box.innerHTML = list.length ? `<div class="pick-list">${list.map(x => `<button class="pick" data-id="${x.id}"><b>${esc(x.name)}</b><span>${esc(libSummary(x))}</span></button>`).join('')}</div>`
      : '<p class="muted">Kütüphanede bu türde kayıt yok. Kütüphane sekmesinden ekleyebilirsiniz.</p>';
    const m = modal(kind === 'tx' ? 'Verici seç' : kind === 'rx' ? 'Alıcı seç' : 'Anten seç', box, [{ label: 'Kapat' }]);
    $$('.pick', box).forEach(b => b.onclick = () => { applyLib(lib.find(x => x.id === b.dataset.id), kind); m.close(); });
  }
  function applyLib(x, kind) {
    if (!x) return;
    if (kind === 'tx') {
      P.tx.name = x.name;
      if (x.power) { P.tx.power = x.power; P.tx.unit = x.powerUnit || 'mW'; }
      if (x.fMin && x.fMax && (P.tx.fMHz < x.fMin || P.tx.fMHz > x.fMax)) P.tx.fMHz = Math.round((x.fMin + x.fMax) / 2);
    } else if (kind === 'rx') {
      P.rx.name = x.name;
      if (x.sens !== undefined && x.sens !== null && x.sens !== '') P.rx.sens = x.sens;
    } else {
      const it = P.items.find(i => i.id === kind);
      if (it) {
        it.value = num(x.gain); it.kind = 'gain'; it.auto = undefined; it.on = true;
        it.name = (it.side === 'tx' ? 'Verici anten: ' : 'Alıcı anten: ') + x.name;
        it.ant = { id: x.id, pol: x.pol, bwH: x.bwH, bwV: x.bwV, fMin: x.fMin, fMax: x.fMax };
        // Yönlendirme ve polarizasyon kalemlerini antene göre güncelle
        const pt = P.items.find(i => i.auto === 'point');
        if (pt && x.bwH && x.bwH < 360) pt.p.hpbw = Math.min(x.bwH, x.bwV || x.bwH);
        const pol = P.items.find(i => i.auto === 'pol');
        if (pol && x.pol) { if (it.side === 'tx') pol.p.a = x.pol; else pol.p.b = x.pol; }
      }
    }
    Store.save(); render(root);
  }
  function libSummary(x) {
    const f = x.fMin && x.fMax ? `${x.fMin}–${x.fMax} MHz` : '';
    if (x.type === 'tx') return [x.power ? x.power + ' ' + (x.powerUnit || 'mW') : '', f].filter(Boolean).join(' · ');
    if (x.type === 'rx') return [x.sens != null && x.sens !== '' ? x.sens + ' dBm' : '', f].filter(Boolean).join(' · ');
    if (x.type === 'antenna') return [x.gain != null ? x.gain + ' dBi' : '', x.bwH ? `H ${x.bwH}° × V ${x.bwV || '?'}°` : '', x.pol || '', f].filter(Boolean).join(' · ');
    return f;
  }

  // ---- Kalem listesi
  function renderItems() {
    const box = $('#items', root);
    box.innerHTML = Object.entries(SIDES).map(([side, label]) => `
      <div class="grp grp-${side}"><div class="grp-h"><span class="dot ${side}"></span>${label}<span class="grow"></span><span class="grp-sum" data-sum="${side}"></span>
        <button class="btn xs" data-add="${side}">＋ Kalem</button></div>
        ${P.items.filter(i => i.side === side).map(itemRow).join('') || '<div class="muted small pad">Kalem yok</div>'}
      </div>`).join('');
    $$('.item', box).forEach(row => bindRow(row));
    $$('[data-add]', box).forEach(b => b.onclick = e => addMenu(b, b.dataset.add));
  }
  function itemRow(it) {
    const auto = it.auto;
    const isAnt = it.role === 'txAnt' || it.role === 'rxAnt' || it.ant;
    return `<div class="item${it.on ? '' : ' off'}" data-id="${it.id}">
      <label class="sw" title="Aç / kapat"><input type="checkbox" data-k="on"${it.on ? ' checked' : ''}><span></span></label>
      <button class="sign ${it.kind}" data-k="kind" title="Kazanç / kayıp değiştir">${it.kind === 'gain' ? '+' : '−'}</button>
      <input class="iname" data-k="name" value="${esc(it.name)}" aria-label="Kalem adı">
      ${auto ? `<button class="btn xs ghost" data-k="cfg">${AUTO_LABEL[auto]} ⚙</button>` : `<input class="ival" data-k="value" type="number" step="any" value="${it.value}" aria-label="Değer dB">`}
      <span class="iout" data-out>—</span>
      <span class="iacts">${isAnt ? `<button class="icon-btn" data-k="lib" title="Kütüphaneden anten seç">⌁</button>` : ''}<button class="icon-btn" data-k="up" title="Yukarı">▲</button><button class="icon-btn" data-k="down" title="Aşağı">▼</button><button class="icon-btn" data-k="del" title="Sil">✕</button></span>
      ${auto && auto !== 'fspl' ? `<div class="icfg" hidden>${cfgHtml(it)}</div>` : ''}
      ${auto === 'fspl' ? `<div class="icfg" hidden><span class="muted small">FSPL = 20·log₁₀(d km) + 20·log₁₀(f MHz) + 32,44 — mesafe ve frekanstan otomatik.</span></div>` : ''}
    </div>`;
  }
  function cfgHtml(it) {
    const p = it.p || (it.p = {});
    const sel = (k, opts, v) => `<select data-p="${k}">${opts.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    const inp = (k, v, unit, step) => `<span class="ig sm"><input data-p="${k}" type="number" step="${step || 'any'}" value="${v}"><span class="unit">${unit}</span></span>`;
    switch (it.auto) {
      case 'cable': return `<label>Kablo ${sel('cable', Object.keys(RF.CABLES), p.cable)}</label><label>Uzunluk ${inp('len', p.len, 'm')}</label><span class="muted small" data-hint></span>`;
      case 'conn': return `<label>Tip ${sel('type', Object.keys(RF.CONNECTORS), p.type)}</label><label>Adet ${inp('n', p.n, 'ad', 1)}</label>`;
      case 'vswr': return `<label>VSWR ${inp('vswr', p.vswr, ': 1')}</label><span class="muted small" data-hint></span>`;
      case 'foliage': return `<label>Bitki içinden geçen yol ${inp('depth', p.depth, 'm')}</label>`;
      case 'rain': return `<label>Yağış ${inp('rate', p.rate, 'mm/sa')}</label><span class="muted small">5 hafif · 25 şiddetli · 50 sağanak · 100 tropikal</span>`;
      case 'pol': return `<label>Yöntem ${sel('mode', ['type', 'angle'], p.mode)}</label>` + (p.mode === 'angle'
        ? `<label>Lineer antenler arası açı ${inp('angle', p.angle, '°')}</label>`
        : `<label>Verici ${sel('a', RF.POL, p.a)}</label><label>Alıcı ${sel('b', RF.POL, p.b)}</label>`);
      case 'point': return `<label>Hedeften sapma ${inp('off', p.off, '°')}</label><label>Anten hüzme genişliği ${inp('hpbw', p.hpbw, '°')}</label>`;
      default: return '';
    }
  }
  function bindRow(row) {
    const it = P.items.find(i => i.id === row.dataset.id);
    row.addEventListener('input', e => {
      const k = e.target.dataset.k, pk = e.target.dataset.p;
      if (k === 'name') it.name = e.target.value;
      else if (k === 'value') it.value = num(e.target.value);
      else if (k === 'on') { it.on = e.target.checked; row.classList.toggle('off', !it.on); }
      else if (pk) {
        it.p[pk] = e.target.type === 'number' ? num(e.target.value) : e.target.value;
        if (pk === 'mode') { $('.icfg', row).innerHTML = cfgHtml(it); }
      }
      changed();
    });
    row.addEventListener('click', e => {
      const k = e.target.dataset.k; if (!k || e.target.tagName === 'INPUT') return;
      const idx = P.items.indexOf(it);
      if (k === 'kind') { it.kind = it.kind === 'gain' ? 'loss' : 'gain'; }
      else if (k === 'cfg') { const c = $('.icfg', row); c.hidden = !c.hidden; return; }
      else if (k === 'lib') { pickDevice(it.id); return; }
      else if (k === 'del') { P.items.splice(idx, 1); }
      else if (k === 'up' || k === 'down') {
        // Aynı taraf içinde bir üst/alt kaleme taşı
        const same = P.items.filter(i => i.side === it.side), j = same.indexOf(it) + (k === 'up' ? -1 : 1);
        if (j < 0 || j >= same.length) return;
        const other = P.items.indexOf(same[j]);
        [P.items[idx], P.items[other]] = [P.items[other], P.items[idx]];
      } else return;
      changed(); renderItems(); update();
    });
  }
  function addMenu(btn, side) {
    $$('.menu').forEach(m => m.remove());
    const m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = TEMPLATES.map((t, i) => `<button data-i="${i}">${esc(t.label)}</button>`).join('');
    const r = btn.getBoundingClientRect();
    m.style.top = (r.bottom + 4 + window.scrollY) + 'px';
    m.style.left = Math.max(8, r.right - 260) + 'px';
    document.body.appendChild(m);
    m.onclick = e => {
      const i = e.target.dataset.i; if (i === undefined) return;
      const it = Object.assign({ id: DATA.newId(), on: true, side }, TEMPLATES[i].make());
      if (it.value === undefined && !it.auto) it.value = 0;
      // Taraf grubunun sonuna ekle
      let last = -1; P.items.forEach((x, j) => { if (x.side === side) last = j; });
      P.items.splice(last + 1, 0, it);
      m.remove(); changed(); renderItems(); update();
    };
    setTimeout(() => document.addEventListener('mousedown', function h(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('mousedown', h); } }), 0);
  }

  // ---- Hesap ve sonuç
  function update() {
    if (!root || !root.isConnected) return;
    const b = budgetObj();
    const r = RF.compute(b);
    // Satır değerleri
    for (const row of r.rows) {
      const el = $(`.item[data-id="${row.it.id}"]`, root); if (!el) continue;
      $('[data-out]', el).textContent = (row.it.kind === 'gain' ? '+' : '−') + fmt(row.value, 2) + ' dB';
      const hint = $('[data-hint]', el);
      if (hint && row.it.auto === 'cable') hint.textContent = `${fmt(RF.cableDbPerM(row.it.p.cable, b.fMHz), 3)} dB/m @ ${fmt(b.fMHz, 0)} MHz — ${RF.CABLES[row.it.p.cable] ? RF.CABLES[row.it.p.cable].d : ''}`;
      if (hint && row.it.auto === 'vswr') { const v = RF.vswrInfo(Math.max(1, num(row.it.p.vswr, 1))); hint.textContent = `Γ ${fmt(v.gamma, 3)} · geri dönüş kaybı ${fmt(v.rl, 1)} dB · yansıyan %${fmt(v.reflPct, 1)}`; }
    }
    for (const side of Object.keys(SIDES)) {
      const s = r.rows.filter(x => x.it.side === side && x.it.on).reduce((a, x) => a + x.signed, 0);
      const el = $(`[data-sum="${side}"]`, root); if (el) el.textContent = (s >= 0 ? '+' : '−') + fmt(Math.abs(s), 2) + ' dB';
    }
    $('#tx-conv', root).textContent = `= ${fmt(b.txDbm, 2)} dBm · ${fmtPower(b.txDbm)}`;
    $('#rx-conv', root).textContent = `= ${fmtPower(b.sens)} · ${fmt(RF.dbmToUv(b.sens), 2)} µV (50 Ω)`;
    $('#f-lambda', root).textContent = `λ = ${fmt(RF.lambda(b.fMHz) * 100, 2)} cm · λ/4 = ${fmt(RF.lambda(b.fMHz) * 25, 2)} cm`;

    const q = r.quality;
    const warn = warnings(b, r);
    $('#res-hero', root).innerHTML = `
      <div class="hero" style="--q:${q.color}">
        <div class="hero-main"><div class="big">${fmt(r.prx, 1)}<small> dBm</small></div><div class="muted">Alınan güç · ${fmtPower(r.prx)}</div></div>
        <div class="hero-main"><div class="big" style="color:${q.color}">${r.margin >= 0 ? '+' : ''}${fmt(r.margin, 1)}<small> dB</small></div><div class="muted">Link payı (hassasiyete göre)</div></div>
        <div class="hero-q"><span class="qbadge" style="background:${q.color}">${q.label}</span><div class="small">${q.note}</div>
          <div class="meter" title="Sinyal kalitesi"><span style="width:${r.pct}%;background:${q.color}"></span></div><div class="muted small">Sinyal kalitesi %${fmt(r.pct, 0)} (30 dB pay = %100)</div></div>
      </div>
      <div class="stats">
        ${stat('EIRP', fmt(r.eirp, 1) + ' dBm', fmtPower(r.eirp))}
        ${stat('Serbest uzay kaybı', fmt(r.fsplDb, 1) + ' dB', `${fmtDist(b.dKm)} @ ${fmt(b.fMHz, 0)} MHz`)}
        ${stat('Toplam kazanç', '+' + fmt(r.gains, 1) + ' dB', 'açık kalemler')}
        ${stat('Toplam kayıp', '−' + fmt(r.losses, 1) + ' dB', 'açık kalemler')}
        ${stat('Maksimum menzil', fmtDist(r.maxRange), 'pay = 0 dB (sınır)')}
        ${stat('Güvenli menzil', fmtDist(r.safeRange), `pay ≥ ${fmt(b.fade, 0)} dB`)}
      </div>
      ${warn.length ? `<ul class="warns">${warn.map(w => `<li class="${w[0]}">${w[1]}</li>`).join('')}</ul>` : ''}`;
    $('#block', root).innerHTML = blockSvg(b, r);
    $('#level', root).innerHTML = levelSvg(b, r);
    $('#range', root).innerHTML = rangeSvg(b, r);
    $('#los', root).innerHTML = losHtml(b);
  }
  const stat = (k, v, s) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>`;

  function warnings(b, r) {
    const w = [];
    const hz = RF.radioHorizon(num(P.heights.tx), num(P.heights.rx));
    if (b.dKm > hz) w.push(['err', `Mesafe (${fmtDist(b.dKm)}) radyo ufkunun (${fmtDist(hz)}) ötesinde: Dünya eğriliği görüş hattını keser. Anten yüksekliklerini artırın.`]);
    const f1 = RF.fresnel(1, b.fMHz, b.dKm / 2, b.dKm / 2), bulge = RF.earthBulge(b.dKm);
    const clear = Math.min(num(P.heights.tx), num(P.heights.rx)) - bulge;
    if (clear < 0.6 * f1 && b.dKm <= hz) w.push(['warn', `Fresnel bölgesinin %60\'ı açık olmayabilir (gereken ≈${fmt(0.6 * f1, 1)} m, alçak uçta ≈${fmt(clear, 1)} m). Yerden yansıma/engel nedeniyle ek 3–10 dB kayıp olabilir.`]);
    for (const it of P.items) if (it.on && it.ant && it.ant.fMin && it.ant.fMax && (b.fMHz < it.ant.fMin || b.fMHz > it.ant.fMax))
      w.push(['warn', `"${esc(it.name)}" ${it.ant.fMin}–${it.ant.fMax} MHz için; ${fmt(b.fMHz, 0)} MHz bu aralığın dışında.`]);
    const tx = P.items.find(i => i.on && i.role === 'txAnt' && i.ant), rx = P.items.find(i => i.on && i.role === 'rxAnt' && i.ant);
    const pol = P.items.find(i => i.auto === 'pol');
    if (tx && rx && tx.ant.pol && rx.ant.pol && RF.polMismatch(tx.ant.pol, rx.ant.pol) > 0 && !(pol && pol.on))
      w.push(['warn', `Antenlerin polarizasyonu farklı (${tx.ant.pol} ↔ ${rx.ant.pol}): ≈${RF.polMismatch(tx.ant.pol, rx.ant.pol)} dB kayıp. "Polarizasyon uyumsuzluğu" kalemini açın.`]);
    if (!P.items.some(i => i.on && i.auto === 'fspl')) w.push(['warn', 'Serbest uzay kaybı kalemi kapalı; menzil hesaplanamaz.']);
    return w;
  }

  // ---- Blok diyagram (Tx → kablo → anten → yol → anten → kablo → Rx)
  function blockSvg(b, r) {
    const on = r.rows.filter(x => x.it.on);
    const sum = f => on.filter(f).reduce((a, x) => a + x.signed, 0);
    const txAnt = sum(x => x.it.side === 'tx' && x.it.kind === 'gain');
    const txLoss = sum(x => x.it.side === 'tx' && x.it.kind === 'loss');
    const path = sum(x => x.it.side === 'path');
    const rxAnt = sum(x => x.it.side === 'rx' && x.it.kind === 'gain');
    const rxLoss = sum(x => x.it.side === 'rx' && x.it.kind === 'loss');
    const sg = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v), 1) + ' dB';
    const ant = (x, y, flip) => `<g transform="translate(${x},${y})" class="b-ant"><line x1="0" y1="0" x2="0" y2="-46"/><line x1="0" y1="-46" x2="-14" y2="-66"/><line x1="0" y1="-46" x2="14" y2="-66"/><line x1="0" y1="-46" x2="0" y2="-68"/></g>`;
    const waves = [0, 1, 2].map(i => `<path d="M${400 + i * 22},70 q 12,-14 0,-28" class="b-wave" style="animation-delay:${i * 0.3}s"/>`).join('')
      + [0, 1, 2].map(i => `<path d="M${530 - i * 22},70 q -12,-14 0,-28" class="b-wave" style="animation-delay:${i * 0.3}s"/>`).join('');
    return `<svg viewBox="0 0 900 200" class="block-svg">
      <rect x="10" y="100" width="130" height="56" rx="8" class="b-box tx"/><text x="75" y="124" class="b-t" text-anchor="middle">Verici (Tx)</text><text x="75" y="144" class="b-v" text-anchor="middle">${fmt(b.txDbm, 1)} dBm</text>
      <path d="M140,128 H260 V114" class="b-cable"/>
      <text x="200" y="150" class="b-l" text-anchor="middle">Kablo/konn.</text><text x="200" y="168" class="b-n loss" text-anchor="middle">${sg(txLoss)}</text>
      ${ant(260, 114)}
      <text x="260" y="30" class="b-l" text-anchor="middle">Anten kazancı</text><text x="260" y="186" class="b-n gain" text-anchor="middle">${sg(txAnt)}</text>
      <text x="272" y="96" class="b-s">EIRP ${fmt(r.eirp, 1)} dBm</text>
      ${waves}
      <line x1="300" y1="56" x2="600" y2="56" class="b-path"/>
      <text x="450" y="30" class="b-l" text-anchor="middle">Yol kaybı (${fmtDist(b.dKm)})</text><text x="450" y="100" class="b-n loss" text-anchor="middle">${sg(path)}</text>
      <text x="450" y="120" class="b-s" text-anchor="middle">FSPL ${fmt(r.fsplDb, 1)} dB</text>
      ${ant(640, 114)}
      <text x="640" y="30" class="b-l" text-anchor="middle">Anten kazancı</text><text x="640" y="186" class="b-n gain" text-anchor="middle">${sg(rxAnt)}</text>
      <path d="M640,114 V128 H760" class="b-cable"/>
      <text x="700" y="150" class="b-l" text-anchor="middle">Kablo/konn.</text><text x="700" y="168" class="b-n loss" text-anchor="middle">${sg(rxLoss)}</text>
      <rect x="760" y="100" width="130" height="56" rx="8" class="b-box rx"/><text x="825" y="124" class="b-t" text-anchor="middle">Alıcı (Rx)</text><text x="825" y="144" class="b-v" text-anchor="middle">${fmt(r.prx, 1)} dBm</text>
      <text x="825" y="186" class="b-s" text-anchor="middle">hassasiyet ${fmt(b.sens, 0)} dBm</text>
    </svg>`;
  }

  // ---- Seviye diyagramı
  function levelSvg(b, r) {
    const pts = [{ name: 'Tx çıkışı', level: b.txDbm, side: 'tx', v: null }].concat(r.rows.filter(x => x.it.on).map(x => ({ name: x.it.name, level: x.level, side: x.it.side, v: x.signed })));
    const W = 900, H = 330, L = 56, R = 20, T = 24, B = 120;
    const ys = pts.map(p => p.level).concat([b.sens, b.sens + b.fade]);
    let ymax = Math.ceil((Math.max(...ys) + 8) / 10) * 10, ymin = Math.floor((Math.min(...ys) - 8) / 10) * 10;
    const step = (W - L - R) / Math.max(1, pts.length);
    const X = i => L + step * (i + 0.5), Y = v => T + (ymax - v) / (ymax - ymin) * (H - T - B);
    let g = '';
    // Taraf bantları
    for (let i = 0; i < pts.length; i++) g += `<rect x="${(L + step * i).toFixed(1)}" y="${T}" width="${step.toFixed(1)}" height="${H - T - B}" class="lv-band ${pts[i].side}"/>`;
    const gs = (ymax - ymin) > 120 ? 20 : 10;
    for (let v = ymin; v <= ymax; v += gs) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v}</text>`;
    g += `<text x="14" y="${T + (H - T - B) / 2}" class="ax" transform="rotate(-90 14 ${T + (H - T - B) / 2})" text-anchor="middle">dBm</text>`;
    g += `<line x1="${L}" x2="${W - R}" y1="${Y(b.sens)}" y2="${Y(b.sens)}" class="sens"/><text x="${W - R - 4}" y="${Y(b.sens) - 5}" text-anchor="end" class="sens-t">Hassasiyet ${fmt(b.sens, 0)} dBm</text>`;
    if (b.fade > 0) g += `<line x1="${L}" x2="${W - R}" y1="${Y(b.sens + b.fade)}" y2="${Y(b.sens + b.fade)}" class="fade"/><text x="${W - R - 4}" y="${Y(b.sens + b.fade) - 5}" text-anchor="end" class="fade-t">+${fmt(b.fade, 0)} dB pay</text>`;
    let d = '';
    pts.forEach((p, i) => { const x0 = L + step * i, x1 = x0 + step; d += (i ? 'L' : 'M') + x0.toFixed(1) + ',' + Y(p.level).toFixed(1) + 'L' + x1.toFixed(1) + ',' + Y(p.level).toFixed(1); });
    g += `<path d="${d}" class="lv-line"/>`;
    pts.forEach((p, i) => {
      g += `<circle cx="${X(i)}" cy="${Y(p.level)}" r="3.5" class="lv-pt"/>`;
      g += `<text x="${X(i)}" y="${Y(p.level) - 8}" text-anchor="middle" class="lv-val">${fmt(p.level, 1)}</text>`;
      if (p.v !== null) g += `<text x="${X(i)}" y="${H - B + 16}" text-anchor="middle" class="lv-d ${p.v >= 0 ? 'gain' : 'loss'}">${p.v >= 0 ? '+' : '−'}${fmt(Math.abs(p.v), 1)}</text>`;
      const nm = p.name.length > 24 ? p.name.slice(0, 23) + '…' : p.name;
      g += `<text x="${X(i)}" y="${H - B + 30}" transform="rotate(-38 ${X(i)} ${H - B + 30})" text-anchor="end" class="lv-name">${esc(nm)}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" class="chart">${g}</svg>`;
  }

  // ---- Menzil grafiği (log mesafe ekseni)
  function rangeSvg(b, r) {
    const W = 900, H = 300, L = 56, R = 20, T = 20, B = 40;
    const dmax = Math.max(b.dKm * 3, (r.maxRange || 1) * 2.5, 1), dmin = Math.min(0.01, b.dKm / 3);
    const lx = Math.log10(dmin), hx = Math.log10(Math.min(dmax, 1e4));
    const X = d => L + (Math.log10(d) - lx) / (hx - lx) * (W - L - R);
    const vals = []; for (let i = 0; i <= 160; i++) { const d = Math.pow(10, lx + (hx - lx) * i / 160); vals.push([d, r.prxAt(d)]); }
    let ymax = Math.ceil((Math.max(vals[0][1], b.sens + 20) + 5) / 10) * 10, ymin = Math.floor((Math.min(b.sens - 15, vals[vals.length - 1][1]) - 5) / 10) * 10;
    ymin = Math.max(ymin, b.sens - 60);
    const Y = v => T + (ymax - Math.max(ymin, Math.min(ymax, v))) / (ymax - ymin) * (H - T - B);
    let g = '';
    for (let v = ymin; v <= ymax; v += 10) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" class="ax">${v}</text>`;
    for (let e = Math.ceil(lx); e <= hx; e++) for (const m of [1, 2, 5]) {
      const d = m * Math.pow(10, e); if (d < dmin || d > Math.pow(10, hx)) continue;
      g += `<line y1="${T}" y2="${H - B}" x1="${X(d)}" x2="${X(d)}" class="grid${m === 1 ? '' : ' minor'}"/><text x="${X(d)}" y="${H - B + 16}" text-anchor="middle" class="ax">${fmtDist(d)}</text>`;
    }
    // Kalite bölgeleri
    for (const q of RF.QUALITY) {
      const top = q === RF.QUALITY[0] ? ymax : b.sens + RF.QUALITY[RF.QUALITY.indexOf(q) - 1].min;
      const bot = q.min === -Infinity ? ymin : b.sens + q.min;
      if (bot >= ymax || top <= ymin) continue;
      g += `<rect x="${L}" width="${W - L - R}" y="${Y(top)}" height="${Math.max(0, Y(bot) - Y(top))}" fill="${q.color}" opacity=".07"/>`;
    }
    g += `<line x1="${L}" x2="${W - R}" y1="${Y(b.sens)}" y2="${Y(b.sens)}" class="sens"/><text x="${W - R - 4}" y="${Y(b.sens) - 5}" text-anchor="end" class="sens-t">Hassasiyet</text>`;
    if (b.fade > 0) g += `<line x1="${L}" x2="${W - R}" y1="${Y(b.sens + b.fade)}" y2="${Y(b.sens + b.fade)}" class="fade"/>`;
    g += `<path d="${vals.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join('')}" class="rg-line"/>`;
    g += `<line x1="${X(b.dKm)}" x2="${X(b.dKm)}" y1="${T}" y2="${H - B}" class="rg-now"/><circle cx="${X(b.dKm)}" cy="${Y(r.prx)}" r="5" class="rg-dot"/>`;
    g += `<text x="${X(b.dKm) + 6}" y="${T + 12}" class="rg-t">${fmtDist(b.dKm)}: ${fmt(r.prx, 1)} dBm</text>`;
    if (r.maxRange && r.maxRange < Math.pow(10, hx)) g += `<line x1="${X(r.maxRange)}" x2="${X(r.maxRange)}" y1="${T}" y2="${H - B}" class="rg-max"/><text x="${X(r.maxRange) - 6}" y="${H - B - 8}" text-anchor="end" class="sens-t">maks. ${fmtDist(r.maxRange)}</text>`;
    return `<svg viewBox="0 0 ${W} ${H}" class="chart">${g}</svg>`;
  }

  // ---- Görüş hattı / Fresnel
  function losHtml(b) {
    const h1 = num(P.heights.tx), h2 = num(P.heights.rx);
    const f1 = RF.fresnel(1, b.fMHz, b.dKm / 2, b.dKm / 2), bulge = RF.earthBulge(b.dKm), hz = RF.radioHorizon(h1, h2);
    // Basit kesit çizimi
    const W = 900, H = 170, L = 20, R = 20, base = 140;
    const maxH = Math.max(h1, h2, f1 + bulge, 5) * 1.25;
    const Y = h => base - h / maxH * (base - 20);
    const X = t => L + t * (W - L - R);
    let earth = '', top = '';
    for (let i = 0; i <= 60; i++) {
      const t = i / 60, d1 = t * b.dKm, d2 = b.dKm - d1;
      const e = (d1 * d2) / (12.74 * 1.333); // m (4/3 Dünya)
      const los = h1 + (h2 - h1) * t;
      const fr = (d1 > 0 && d2 > 0) ? RF.fresnel(1, b.fMHz, d1, d2) : 0;
      earth += (i ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(e).toFixed(1);
      top += (i ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(los + fr).toFixed(1);
    }
    const svg = `<svg viewBox="0 0 ${W} ${H}" class="chart los">
      <path d="${earth}L${X(1)},${H}L${X(0)},${H}Z" class="los-earth"/>
      <path d="${top}" class="los-fr"/><path d="${botPath()}" class="los-fr"/>
      <line x1="${X(0)}" y1="${Y(h1)}" x2="${X(1)}" y2="${Y(h2)}" class="los-line"/>
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(h1)}" class="los-mast"/><line x1="${X(1)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(h2)}" class="los-mast"/>
      <text x="${X(0) + 6}" y="${Y(h1) - 6}" class="ax">Tx ${fmt(h1, 0)} m</text><text x="${X(1) - 6}" y="${Y(h2) - 6}" text-anchor="end" class="ax">Rx ${fmt(h2, 0)} m</text>
      <text x="${X(0.5)}" y="${H - 6}" text-anchor="middle" class="ax">${fmtDist(b.dKm)} — Dünya eğriliği (4/3) ve 1. Fresnel bölgesi</text></svg>`;
    function botPath() {
      let d = '';
      for (let i = 0; i <= 60; i++) { const t = i / 60, d1 = t * b.dKm, d2 = b.dKm - d1; const fr = (d1 > 0 && d2 > 0) ? RF.fresnel(1, b.fMHz, d1, d2) : 0; d += (i ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(h1 + (h2 - h1) * t - fr).toFixed(1); }
      return d;
    }
    return svg + `<div class="stats">
      ${stat('1. Fresnel yarıçapı (orta)', fmt(f1, 2) + ' m', '%60 açıklık: ' + fmt(0.6 * f1, 2) + ' m')}
      ${stat('Dünya eğriliği (orta)', fmt(bulge, 2) + ' m', 'k = 4/3')}
      ${stat('Radyo ufku', fmtDist(hz), `Tx ${fmt(h1, 0)} m + Rx ${fmt(h2, 0)} m`)}
      ${stat('Gereken min. yükseklik', fmt(bulge + 0.6 * f1, 1) + ' m', 'orta noktada engelsiz hat için')}
    </div>`;
  }

  return { title: 'Link Bütçesi', render, refresh: () => root && root.isConnected && render(root) };
})();
