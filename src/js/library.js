// Kütüphane: verici, alıcı, anten, kablo kayıtları; görsel/metin/ürün adından tanıma ile ekleme.
Views.library = (() => {
  const TYPES = { tx: 'Verici', rx: 'Alıcı', antenna: 'Anten', cable: 'Kablo', other: 'Diğer' };
  let filter = 'all', q = '', images = [], root;

  function render(el) {
    root = el;
    const L = Store.data.library;
    const list = L.filter(x => (filter === 'all' || x.type === filter) && (!q || (x.name + ' ' + (x.brand || '') + ' ' + (x.notes || '')).toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))));
    el.innerHTML = `
      <section class="card recog">
        <h3>Görselden / teknik bilgiden ekle</h3>
        <div class="recog-grid">
          <div class="drop" id="drop" tabindex="0"><div class="drop-in">${images.length ? images.map((d, i) => `<span class="thumb"><img src="${d}" alt=""><button class="icon-btn" data-rm="${i}" title="Kaldır">✕</button></span>`).join('') : '<b>Ürün görselini buraya sürükleyin</b><br><span class="muted small">veya tıklayıp seçin · Ctrl+V ile yapıştırın</span>'}</div><input type="file" id="img-in" accept="image/*" multiple hidden></div>
          <div class="recog-r">
            <textarea id="spec" rows="5" placeholder="Teknik bilgileri buraya yapıştırın (ör. 'Sensitivity: -90dBm, 5.8G, 8CH' veya 'Gain 17dBi V40 H16 5150-5950MHz')"></textarea>
            <input id="pname" placeholder="veya ürün adı / modeli (ör. TBS Unify Pro32 HV)">
            <div class="row-btns">
              <button class="btn" id="b-parse">Metinden çıkar (çevrimdışı)</button>
              <button class="btn primary" id="b-ai">Yapay zekâ ile tanı (çevrimiçi)</button>
              <span class="muted small" id="ai-st">İnternet bağlantısı gerekir</span>
            </div>
          </div>
        </div>
      </section>
      <div class="toolbar">
        <div class="tabs inline">${Object.entries(Object.assign({ all: 'Tümü' }, TYPES)).map(([k, v]) => `<button class="tab${filter === k ? ' on' : ''}" data-f="${k}">${v} <span class="cnt">${k === 'all' ? L.length : L.filter(x => x.type === k).length}</span></button>`).join('')}</div>
        <span class="grow"></span>
        <input id="lib-q" type="search" placeholder="Ara…" value="${esc(q)}">
        <button class="btn sm" id="b-new">＋ Elle ekle</button>
        <button class="btn sm" id="b-exp">Dışa aktar</button>
        <button class="btn sm" id="b-imp">İçe aktar</button>
      </div>
      <div class="lib-grid">${list.map(card).join('') || '<p class="muted">Kayıt yok.</p>'}</div>`;
    bind();
  }
  function card(x) {
    const f = x.fMin && x.fMax ? `${x.fMin}–${x.fMax} MHz` : (x.fMin ? x.fMin + ' MHz' : '');
    const kv = [];
    if (x.type === 'tx' && x.power != null) kv.push(['Güç', `${x.power} ${x.powerUnit || 'mW'} (${fmt(RF.toDbm(+x.power, x.powerUnit || 'mW'), 1)} dBm)`]);
    if (x.type === 'rx' && x.sens != null && x.sens !== '') kv.push(['Hassasiyet', x.sens + ' dBm']);
    if (x.type === 'antenna') { if (x.gain != null) kv.push(['Kazanç', x.gain + ' dBi']); if (x.bwH) kv.push(['Hüzme', `H ${x.bwH}° × V ${x.bwV || '?'}°`]); if (x.pol) kv.push(['Polarizasyon', x.pol]); }
    if (f) kv.push(['Frekans', f]);
    if (x.connector) kv.push(['Konnektör', x.connector]);
    if (x.channels) kv.push(['Kanal', x.channels]);
    const use = x.type === 'tx' ? [['tx', 'Verici olarak kullan']] : x.type === 'rx' ? [['rx', 'Alıcı olarak kullan']] : x.type === 'antenna' ? [['txAnt', 'Verici anteni yap'], ['rxAnt', 'Alıcı anteni yap']] : [];
    return `<article class="card lib-card t-${x.type}" data-id="${x.id}">
      <div class="lib-top">${x.img ? `<img src="${x.img}" alt="" class="lib-img">` : `<div class="lib-ico">${{ tx: '📡', rx: '📶', antenna: '⌁', cable: '〰', other: '◇' }[x.type] || '◇'}</div>`}
        <div><span class="tag">${TYPES[x.type] || x.type}</span><h4>${esc(x.name)}</h4>${x.brand ? `<div class="muted small">${esc(x.brand)}</div>` : ''}</div></div>
      <div class="kv sm">${kv.map(([k, v]) => `<div><span>${k}</span><b>${esc(v)}</b></div>`).join('')}</div>
      ${x.notes ? `<p class="small">${esc(x.notes)}</p>` : ''}${x.src ? `<p class="muted xsmall">Kaynak: ${esc(x.src)}</p>` : ''}
      <div class="row-btns">${use.map(([k, l]) => `<button class="btn xs primary" data-use="${k}">${l}</button>`).join('')}
        ${x.type === 'antenna' ? '<button class="btn xs" data-pat>Diyagram</button>' : ''}
        <button class="btn xs" data-edit>Düzenle</button><button class="btn xs ghost" data-del>Sil</button></div>
    </article>`;
  }
  function bind() {
    const el = root;
    $$('[data-f]', el).forEach(b => b.onclick = () => { filter = b.dataset.f; render(el); });
    $('#lib-q', el).oninput = e => { q = e.target.value; const pos = e.target.selectionStart; render(el); const n = $('#lib-q', el); n.focus(); n.setSelectionRange(pos, pos); };
    $('#b-new', el).onclick = () => edit({ type: filter === 'all' ? 'antenna' : filter });
    $('#b-exp', el).onclick = () => downloadText('comm-calc-kutuphane.json', JSON.stringify({ commcalcLibrary: 1, items: Store.data.library }, null, 2));
    $('#b-imp', el).onclick = async () => {
      const t = await pickTextFile(); if (!t) return;
      try {
        const o = JSON.parse(t), items = o.items || o; if (!Array.isArray(items)) throw 0;
        let n = 0; for (const it of items) if (it && it.name && !Store.data.library.find(x => x.id === it.id)) { Store.data.library.push(it); n++; }
        Store.save(); render(el); toast(n + ' kayıt eklendi');
      } catch { toast('Geçersiz kütüphane dosyası', 'err'); }
    };
    $$('.lib-card', el).forEach(c => {
      const x = Store.data.library.find(i => i.id === c.dataset.id);
      c.onclick = async e => {
        const t = e.target;
        if (t.dataset.use) return useIn(x, t.dataset.use);
        if (t.hasAttribute('data-edit')) return edit(x);
        if (t.hasAttribute('data-pat')) { App.go('antennas', 'lib:' + x.id); return; }
        if (t.hasAttribute('data-del')) { if (await confirmBox(`"${x.name}" silinsin mi?`, 'Sil')) { Store.data.library = Store.data.library.filter(i => i !== x); Store.save(); render(el); } }
      };
    });
    // Görsel ekleme
    const drop = $('#drop', el), inp = $('#img-in', el);
    drop.onclick = e => { if (e.target.dataset.rm !== undefined) { images.splice(+e.target.dataset.rm, 1); render(el); return; } inp.click(); };
    drop.onkeydown = e => { if (e.key === 'Enter') inp.click(); };
    inp.onchange = () => addFiles(inp.files);
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
    drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); };
    $('#b-parse', el).onclick = () => {
      const t = $('#spec', el).value + ' ' + $('#pname', el).value;
      if (!t.trim()) return toast('Önce teknik metni yapıştırın', 'err');
      const o = AI.parseText(t);
      if (!o.name) o.name = $('#pname', el).value.trim() || '';
      edit(Object.assign(o, { notes: $('#spec', el).value.trim().slice(0, 400), src: 'Metinden çıkarıldı' }), true);
    };
    $('#b-ai', el).onclick = async () => {
      const text = $('#spec', el).value.trim(), query = $('#pname', el).value.trim();
      if (!images.length && !text && !query) return toast('Görsel, metin veya ürün adı girin', 'err');
      if (!AI.available()) { toast('Ayarlar\'dan Firebase yapılandırması veya Gemini anahtarı girin', 'err'); App.go('settings'); return; }
      const st = $('#ai-st', el), btn = $('#b-ai', el);
      btn.disabled = true; st.textContent = 'Tanınıyor…';
      try {
        const o = await AI.recognize({ images: await Promise.all(images.map(d => shrink(d, 1600, 0.85))), text, query });
        st.textContent = 'Tanındı' + (o.confidence ? ` (güven %${Math.round(o.confidence * 100)})` : '') + ' — kaydetmeden önce kontrol edin';
        delete o.confidence;
        o.src = 'Yapay zekâ tanıma' + (images.length ? ' (görsel)' : '') + (query ? ' — ' + query : '');
        edit(o, true);
      } catch (e) { st.textContent = 'Hata: ' + e.message; toast('Tanıma başarısız: ' + e.message, 'err'); }
      finally { btn.disabled = false; }
    };
  }
  function addFiles(files) {
    const arr = Array.from(files || []).filter(f => f.type.startsWith('image/'));
    if (!arr.length) return;
    let left = arr.length;
    for (const f of arr) { const r = new FileReader(); r.onload = () => { images.push(r.result); if (--left === 0) render(root); }; r.readAsDataURL(f); }
  }
  // Panodan görsel yapıştırma (kütüphane açıkken)
  document.addEventListener('paste', e => {
    if (!root || !root.isConnected || App.current !== 'library') return;
    const files = Array.from(e.clipboardData.items || []).filter(i => i.type.startsWith('image/')).map(i => i.getAsFile());
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  // Görseli küçült (kayıt küçük resmi ve yükleme boyutu için)
  function shrink(dataUrl, max, qual) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', qual || 0.8));
      };
      img.onerror = () => res(dataUrl);
      img.src = dataUrl;
    });
  }

  function useIn(x, role) {
    const P = Store.project;
    if (role === 'tx') { P.tx.name = x.name; if (x.power) { P.tx.power = +x.power; P.tx.unit = x.powerUnit || 'mW'; } if (x.fMin && x.fMax && (P.tx.fMHz < x.fMin || P.tx.fMHz > x.fMax)) P.tx.fMHz = Math.round((x.fMin + x.fMax) / 2); }
    if (role === 'rx') { P.rx.name = x.name; if (x.sens != null && x.sens !== '') P.rx.sens = +x.sens; }
    if (role === 'txAnt' || role === 'rxAnt') {
      let it = P.items.find(i => i.role === role);
      if (!it) { it = { id: DATA.newId(), side: role === 'txAnt' ? 'tx' : 'rx', role, kind: 'gain' }; P.items.push(it); }
      Object.assign(it, { on: true, kind: 'gain', auto: undefined, value: +x.gain || 0, name: (role === 'txAnt' ? 'Verici anten: ' : 'Alıcı anten: ') + x.name, ant: { id: x.id, pol: x.pol, bwH: x.bwH, bwV: x.bwV, fMin: x.fMin, fMax: x.fMax } });
      const pt = P.items.find(i => i.auto === 'point'); if (pt && x.bwH && x.bwH < 360) pt.p.hpbw = Math.min(x.bwH, x.bwV || x.bwH);
      const pol = P.items.find(i => i.auto === 'pol'); if (pol && x.pol) pol.p[role === 'txAnt' ? 'a' : 'b'] = x.pol;
    }
    P.updated = Date.now(); Store.save();
    toast(`"${x.name}" link bütçesine eklendi (${Store.project.name})`);
  }

  // Kayıt düzenleme formu
  function edit(x, isNew) {
    const o = Object.assign({}, x);
    if (isNew && images[0]) o._img = images[0];
    const F = (k, l, type, extra) => `<label><span>${l}</span><input data-k="${k}" type="${type || 'text'}" step="any" value="${esc(o[k] == null ? '' : o[k])}" ${extra || ''}></label>`;
    const S = (k, l, opts) => `<label><span>${l}</span><select data-k="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(o[k] || '') === String(v) ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
    const body = document.createElement('div');
    const draw = () => {
      body.innerHTML = `<div class="form">
        ${S('type', 'Tür', Object.entries(TYPES))}
        ${F('name', 'Ad / model')}${F('brand', 'Marka')}
        ${F('fMin', 'Frekans alt (MHz)', 'number')}${F('fMax', 'Frekans üst (MHz)', 'number')}
        ${o.type === 'tx' ? F('power', 'Çıkış gücü', 'number') + S('powerUnit', 'Güç birimi', [['mW', 'mW'], ['W', 'W'], ['dBm', 'dBm']]) : ''}
        ${o.type === 'rx' ? F('sens', 'Hassasiyet (dBm)', 'number') : ''}
        ${o.type === 'antenna' ? F('gain', 'Kazanç (dBi)', 'number') + F('bwH', 'Yatay hüzme H (°)', 'number') + F('bwV', 'Dikey hüzme V (°)', 'number')
          + S('pol', 'Polarizasyon', [['', '—'], ['V', 'Dikey (V)'], ['H', 'Yatay (H)'], ['RHCP', 'RHCP'], ['LHCP', 'LHCP']])
          + S('antType', 'Anten tipi', [['', '—']].concat(AI.ANT_TYPES.map(t => [t, t]))) : ''}
        ${o.type === 'cable' ? F('loss', 'Kayıp (dB/m @ frekans)', 'number') : ''}
        ${F('connector', 'Konnektör')}${F('channels', 'Kanal')}
        <label class="full"><span>Notlar</span><textarea data-k="notes" rows="3">${esc(o.notes || '')}</textarea></label>
        ${o._img || o.img ? `<label class="chk full"><input type="checkbox" data-k="keepImg" checked> Görseli kayda ekle <img src="${o._img || o.img}" class="mini-img" alt=""></label>` : ''}
      </div>`;
      $('[data-k="type"]', body).onchange = e => { collect(); o.type = e.target.value; draw(); };
    };
    const collect = () => $$('[data-k]', body).forEach(i => { o[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (i.value === '' ? null : num(i.value)) : i.value; });
    draw();
    modal(isNew ? 'Yeni kayıt — kontrol edip kaydedin' : 'Kaydı düzenle', body, [{ label: 'Vazgeç' }, { label: 'Kaydet', cls: 'primary', onClick: async () => {
      collect();
      if (!o.name || !o.name.trim()) { toast('Ad gerekli', 'err'); return false; }
      const img = o.keepImg === false ? null : (o._img ? await shrink(o._img, 320, 0.8) : o.img || null);
      delete o._img; delete o.keepImg;
      for (const k of Object.keys(o)) if (o[k] === '' || o[k] === null || o[k] === undefined) delete o[k];
      if (img) o.img = img;
      if (!o.id) { o.id = 'u' + Date.now().toString(36); Store.data.library.unshift(o); }
      else { const i = Store.data.library.findIndex(z => z.id === o.id); Store.data.library[i] = o; }
      if (isNew) images = [];
      Store.save(); render(root); toast('Kaydedildi');
    } }]);
  }
  return { title: 'Kütüphane', render };
})();
