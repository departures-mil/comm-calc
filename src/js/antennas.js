// Antenler: tür ansiklopedisi, ışıma diyagramları ve kendi antenini çizdirme.
Views.antennas = (() => {
  let sel = 'dipole', custom = { h: 40, v: 16, fb: 20, omni: false };
  function render(el) {
    const groups = {};
    for (const a of DATA.ANTENNAS) (groups[a.group] = groups[a.group] || []).push(a);
    const libAnts = Store.data.library.filter(x => x.type === 'antenna');
    el.innerHTML = `<div class="ant-layout">
      <nav class="ant-list">${Object.entries(groups).map(([g, list]) => `<div class="ant-g">${g}</div>` + list.map(a => `<button class="ant-i${a.id === sel ? ' on' : ''}" data-id="${a.id}">${a.name}</button>`).join('')).join('')}
        <div class="ant-g">Kütüphanedeki antenlerim</div>${libAnts.map(a => `<button class="ant-i${'lib:' + a.id === sel ? ' on' : ''}" data-id="lib:${a.id}">${esc(a.name)}</button>`).join('') || '<div class="muted small pad">Yok</div>'}
        <div class="ant-g">Deneme</div><button class="ant-i${sel === 'custom' ? ' on' : ''}" data-id="custom">Kendi antenini çiz</button>
      </nav>
      <div class="ant-detail" id="ant-d"></div></div>`;
    $$('.ant-i', el).forEach(b => b.onclick = () => { sel = b.dataset.id; render(el); });
    detail($('#ant-d', el));
  }
  function patternFor(x) {
    // Kütüphane anteni: türü varsa o model, yoksa hüzme genişliklerinden genel model
    if (x.bwH >= 360 || ['dipole', 'monopole', 'collinear', 'cloverleaf', 'skew', 'groundplane'].includes(x.antType)) {
      const n = x.bwV ? Math.max(1, Math.round(78 / x.bwV)) : 1;
      if (['cloverleaf', 'skew'].includes(x.antType)) return PAT.model(x.antType === 'skew' ? 'skew' : 'omniCP');
      return n > 1 ? PAT.model('collinear', { n, d: 0.75 }) : PAT.model('dipole');
    }
    return PAT.model('directional', { h: x.bwH || 60, v: x.bwV || x.bwH || 60, fb: 22 });
  }
  function plots(m, extra) {
    const bwA = PAT.beamwidth(m.az), bwE = PAT.beamwidth(m.el);
    return `<div class="plots">
      <figure><figcaption>Yatay düzlem (azimut, H) <span class="muted small">· 0° = ön</span></figcaption>${PAT.polarSvg(m.az, { mode: 'az', title: 'Yatay düzlem' })}<div class="muted small">−3 dB hüzme: ${bwA ? fmt(bwA, 0) + '°' : 'çok yönlü (360°)'}</div></figure>
      <figure><figcaption>Dikey düzlem (elevasyon, E) <span class="muted small">· 0° = ufuk, 90° = zenit</span></figcaption>${PAT.polarSvg(m.el, { mode: 'el', title: 'Dikey düzlem' })}<div class="muted small">−3 dB hüzme: ${bwE ? fmt(bwE, 0) + '°' : '—'}</div></figure>
    </div>${extra || ''}<p class="muted small">Diyagramlar normalize edilmiştir (tepe = 0 dB); halkalar 0 / −3 / −10 / −20 / −30 dB. Modeller öğretici yaklaşımlardır, üretici ölçümünün yerini tutmaz.</p>`;
  }
  function detail(box) {
    if (sel === 'custom') {
      box.innerHTML = `<section class="card"><h2>Kendi antenini çiz</h2><p class="muted">Hüzme genişliklerini girin; tahmini kazanç ve ışıma diyagramı çizilir.</p>
        <div class="calc-in">
          <label><span>Yatay hüzme (H)</span><span class="ig sm"><input type="number" id="c-h" value="${custom.h}"><span class="unit">°</span></span></label>
          <label><span>Dikey hüzme (V)</span><span class="ig sm"><input type="number" id="c-v" value="${custom.v}"><span class="unit">°</span></span></label>
          <label><span>Ön/arka oranı</span><span class="ig sm"><input type="number" id="c-fb" value="${custom.fb}"><span class="unit">dB</span></span></label>
          <label class="chk"><input type="checkbox" id="c-omni"${custom.omni ? ' checked' : ''}> Çok yönlü (yatay 360°)</label>
        </div><div id="c-out"></div></section>`;
      const draw = () => {
        custom = { h: num($('#c-h', box).value, 40), v: num($('#c-v', box).value, 16), fb: num($('#c-fb', box).value, 20), omni: $('#c-omni', box).checked };
        const m = custom.omni ? PAT.model('collinear', { n: Math.max(1, Math.round(78 / custom.v)), d: 0.75 }) : PAT.model('directional', { h: custom.h, v: custom.v, fb: custom.fb });
        const g = custom.omni ? 2.15 + 10 * Math.log10(Math.max(1, 78 / custom.v)) : RF.gainFromBeam(custom.h, custom.v);
        $('#c-out', box).innerHTML = `<div class="stats">${`<div class="stat"><div class="k">Tahmini kazanç</div><div class="v">${fmt(g, 1)} dBi</div><div class="s">G ≈ 29000 / (θH·θV)</div></div>`}</div>` + plots(m);
      };
      box.oninput = draw; draw(); return;
    }
    if (sel.startsWith('lib:')) {
      const x = Store.data.library.find(a => 'lib:' + a.id === sel);
      if (!x) { sel = 'dipole'; return detail(box); }
      const est = x.bwH && x.bwV && x.bwH < 360 ? RF.gainFromBeam(x.bwH, x.bwV) : null;
      box.innerHTML = `<section class="card"><h2>${esc(x.name)}</h2>
        <div class="kv"><div><span>Kazanç</span><b>${x.gain != null ? x.gain + ' dBi' : '—'}</b></div><div><span>Hüzme</span><b>H ${x.bwH || '?'}° × V ${x.bwV || '?'}°</b></div><div><span>Polarizasyon</span><b>${esc(x.pol || '—')}</b></div><div><span>Frekans</span><b>${x.fMin ? x.fMin + '–' + x.fMax + ' MHz' : '—'}</b></div></div>
        ${est ? `<p class="muted small">Hüzme genişliğinden tahmini kazanç: ${fmt(est, 1)} dBi ${x.gain ? `(etiket ${x.gain} dBi${Math.abs(est - x.gain) > 3 ? ' — fark büyük, etiketi kontrol edin' : ' — tutarlı'})` : ''}</p>` : ''}
        ${x.notes ? `<p>${esc(x.notes)}</p>` : ''}${plots(patternFor(x))}</section>`;
      return;
    }
    const a = DATA.ANTENNAS.find(x => x.id === sel) || DATA.ANTENNAS[0];
    const m = PAT.model(a.model, a.params);
    let extra = '';
    if (a.id === 'collinear' || a.id === 'yagi' || a.id === 'dish' || a.id === 'phased') {
      const lab = { collinear: ['n', 'Eleman sayısı', 1, 12, 1], yagi: ['n', 'Eleman sayısı', 2, 20, 1], dish: ['dl', 'Çap / dalga boyu (D/λ)', 2, 40, 1], phased: ['steer', 'Yönlendirme açısı (°)', -60, 60, 1] }[a.id];
      const val = (a.params || {})[lab[0]];
      extra = `<label class="slider">${lab[1]}: <b id="sl-v">${val}</b><input type="range" id="sl" min="${lab[2]}" max="${lab[3]}" step="${lab[4]}" value="${val}"></label>`;
    }
    box.innerHTML = `<section class="card"><div class="ant-head"><h2>${a.name}</h2><span class="tag">${a.group}</span></div>
      <div class="kv"><div><span>Tipik kazanç</span><b>${a.gain}</b></div><div><span>Hüzme genişliği</span><b>${a.bw}</b></div><div><span>Polarizasyon</span><b>${a.pol}</b></div></div>
      <p>${a.desc}</p><div class="callout"><b>İHA\'da kullanım:</b> ${a.uav}</div>
      <div class="pc"><div><h4>Artıları</h4><ul>${a.pros.map(x => `<li>${x}</li>`).join('')}</ul></div><div><h4>Eksileri</h4><ul>${a.cons.map(x => `<li>${x}</li>`).join('')}</ul></div></div>
      ${extra}<div id="pl">${plots(m)}</div></section>`;
    const sl = $('#sl', box);
    if (sl) sl.oninput = () => {
      const key = { collinear: 'n', yagi: 'n', dish: 'dl', phased: 'steer' }[a.id];
      a.params = Object.assign({}, a.params, { [key]: +sl.value });
      $('#sl-v', box).textContent = sl.value;
      $('#pl', box).innerHTML = plots(PAT.model(a.model, a.params));
    };
  }
  return { title: 'Antenler', render, select: id => { sel = id; } };
})();
