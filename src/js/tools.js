// Araçlar: program içi çeviriciler ve küçük hesaplayıcılar.
Views.tools = (() => {
  // Çift yönlü çeviriciler: hangi alan değişirse diğerleri ondan hesaplanır
  const CONVERTERS = [
    { id: 'power', title: 'Güç çevirici (dBm ↔ mW ↔ W ↔ dBW)', desc: 'dBm = 10·log₁₀(P mW). +3 dB ≈ 2 kat, +10 dB = 10 kat güç.',
      fields: [['dbm', 'dBm'], ['mw', 'mW'], ['w', 'W'], ['dbw', 'dBW'], ['uv', 'µV (50 Ω)']], start: ['dbm', 27],
      from: (k, v) => { const dbm = k === 'dbm' ? v : k === 'mw' ? RF.mwToDbm(v) : k === 'w' ? RF.wToDbm(v) : k === 'dbw' ? v + 30 : RF.uvToDbm(v); return { dbm, mw: RF.dbmToMw(dbm), w: RF.dbmToW(dbm), dbw: dbm - 30, uv: RF.dbmToUv(dbm) }; } },
    { id: 'vswr', title: 'VSWR / geri dönüş kaybı / yansıma', desc: 'Γ = (VSWR−1)/(VSWR+1) · RL = −20·log₁₀Γ · Uyumsuzluk kaybı = −10·log₁₀(1−Γ²)',
      fields: [['vswr', 'VSWR'], ['gamma', 'Γ (s11)'], ['rl', 'Geri dönüş kaybı dB'], ['ml', 'Uyumsuzluk kaybı dB'], ['trans', 'İletilen güç %'], ['refl', 'Yansıyan güç %']], start: ['vswr', 1.5],
      from: (k, v) => {
        let g;
        if (k === 'vswr') g = RF.vswrToGamma(Math.max(1, v)); else if (k === 'gamma') g = Math.min(0.9999, Math.max(0, v));
        else if (k === 'rl') g = RF.rlToGamma(v); else if (k === 'ml') g = Math.sqrt(1 - Math.pow(10, -v / 10));
        else if (k === 'trans') g = Math.sqrt(1 - v / 100); else g = Math.sqrt(v / 100);
        return { vswr: RF.gammaToVswr(g), gamma: g, rl: RF.gammaToRL(g), ml: RF.mismatchLoss(g), trans: (1 - g * g) * 100, refl: g * g * 100 };
      } },
    { id: 'dbpct', title: 'dB ↔ yüzde sinyal kaybı', desc: 'Güç kaybı % = (1 − 10^(−dB/10))·100 · Gerilim kaybı % = (1 − 10^(−dB/20))·100. 3 dB kayıp gücün yarısıdır.',
      fields: [['db', 'Kayıp dB'], ['ppct', 'Güç kaybı %'], ['premain', 'Kalan güç %'], ['vpct', 'Gerilim kaybı %'], ['ratio', 'Güç oranı (kat)']], start: ['db', 3],
      from: (k, v) => {
        const db = k === 'db' ? v : k === 'ppct' ? RF.powerLossPctToDb(Math.min(99.9999, v)) : k === 'premain' ? -10 * Math.log10(Math.max(1e-6, v / 100))
          : k === 'vpct' ? -20 * Math.log10(Math.max(1e-6, 1 - v / 100)) : 10 * Math.log10(v);
        return { db, ppct: RF.dbToPowerLossPct(db), premain: 100 - RF.dbToPowerLossPct(db), vpct: RF.dbToVoltLossPct(db), ratio: Math.pow(10, db / 10) };
      } },
    { id: 'gain', title: 'Anten kazancı (dBi ↔ dBd ↔ kat)', desc: 'dBi = dBd + 2,15. Kazanç enerji üretmez, enerjiyi belli yönlere toplar.',
      fields: [['dbi', 'dBi'], ['dbd', 'dBd'], ['lin', 'Kat (izotropiğe göre)'], ['bw', 'Tahmini hüzme (simetrik) °']], start: ['dbi', 8],
      from: (k, v) => { const dbi = k === 'dbi' ? v : k === 'dbd' ? v + 2.15 : k === 'lin' ? 10 * Math.log10(v) : RF.gainFromBeam(v, v); return { dbi, dbd: dbi - 2.15, lin: Math.pow(10, dbi / 10), bw: RF.beamFromGain(dbi) }; } }
  ];

  // Tek yönlü hesaplayıcılar
  const CALCS = [
    { id: 'fspl', title: 'Serbest uzay yol kaybı (FSPL)', desc: 'Pasternack FSPL hesaplayıcısı ile aynı formül: FSPL = 20·log₁₀(d) + 20·log₁₀(f) + 20·log₁₀(4π/c) − Gt − Gr',
      in: [['f', 'Frekans', 'MHz', 5800], ['d', 'Mesafe', 'km', 1], ['gt', 'Verici anten kazancı', 'dBi', 0], ['gr', 'Alıcı anten kazancı', 'dBi', 0]],
      out: v => { const L = RF.fspl(v.d, v.f); return [['FSPL (izotropik)', fmt(L, 2) + ' dB'], ['Kazançlar dahil yol kaybı', fmt(L - v.gt - v.gr, 2) + ' dB'], ['Dalga boyu', fmt(RF.lambda(v.f) * 100, 2) + ' cm'], ['Mesafe 2 katına çıkarsa', '+6,02 dB']]; } },
    { id: 'fsplinv', title: 'Kayıptan mesafe (ters FSPL)', desc: 'Belirli bir yol kaybına hangi mesafede ulaşılır?',
      in: [['f', 'Frekans', 'MHz', 5800], ['L', 'İzin verilen yol kaybı', 'dB', 120]],
      out: v => [['Mesafe', fmtDist(RF.fsplDistance(v.L, v.f))]] },
    { id: 'range', title: 'Hızlı maksimum menzil', desc: 'Pay = 0 olduğu mesafe (yalnızca serbest uzay).',
      in: [['p', 'Verici gücü', 'dBm', 27], ['gt', 'Tx anten', 'dBi', 2], ['gr', 'Rx anten', 'dBi', 2], ['l', 'Toplam kablo/diğer kayıp', 'dB', 2], ['s', 'Alıcı hassasiyeti', 'dBm', -90], ['m', 'İstenen pay', 'dB', 10], ['f', 'Frekans', 'MHz', 5800]],
      out: v => { const allow = v.p + v.gt + v.gr - v.l - v.s; return [['İzin verilen yol kaybı', fmt(allow, 1) + ' dB'], ['Maksimum menzil (pay 0)', fmtDist(RF.fsplDistance(allow, v.f))], [`Güvenli menzil (pay ${fmt(v.m, 0)} dB)`, fmtDist(RF.fsplDistance(allow - v.m, v.f))]]; } },
    { id: 'lambda', title: 'Dalga boyu ve anten boyu', desc: 'λ = c / f. Çubuk antenlerde gerçek boy, kısalma katsayısı (≈0,95) ile çarpılır.',
      in: [['f', 'Frekans', 'MHz', 2450], ['k', 'Kısalma katsayısı', '', 0.95]],
      out: v => { const l = RF.lambda(v.f); return [['λ', fmt(l * 100, 2) + ' cm'], ['λ/2 dipol (toplam)', fmt(l * 50 * v.k, 2) + ' cm'], ['λ/4 monopol / kol', fmt(l * 25 * v.k, 2) + ' cm'], ['5/8 λ', fmt(l * 62.5 * v.k, 2) + ' cm'], ['Helis çevresi (≈λ)', fmt(l * 100, 2) + ' cm · çap ' + fmt(l * 100 / Math.PI, 2) + ' cm']]; } },
    { id: 'fresnel', title: 'Fresnel bölgesi', desc: 'r = √(n·λ·d1·d2 / (d1+d2)). Bağlantı için ilk Fresnel bölgesinin en az %60\'ı engelsiz olmalı.',
      in: [['f', 'Frekans', 'MHz', 5800], ['d', 'Toplam mesafe', 'km', 5], ['p', 'Ölçüm noktası (Tx\'ten)', '%', 50]],
      out: v => { const d1 = v.d * v.p / 100, d2 = v.d - d1; const r1 = RF.fresnel(1, v.f, d1, d2); return [['1. Fresnel yarıçapı', fmt(r1, 2) + ' m'], ['%60 açıklık', fmt(0.6 * r1, 2) + ' m'], ['2. Fresnel', fmt(RF.fresnel(2, v.f, d1, d2), 2) + ' m'], ['Dünya eğriliği (bu noktada)', fmt(d1 * d2 / (12.74 * 1.333), 2) + ' m']]; } },
    { id: 'horizon', title: 'Radyo ufku', desc: 'd ≈ 4,12·(√h1 + √h2) km (k = 4/3 atmosfer kırılması dahil).',
      in: [['h1', 'Verici / İHA yüksekliği', 'm', 120], ['h2', 'Yer istasyonu anten yüksekliği', 'm', 2]],
      out: v => [['Radyo ufku', fmtDist(RF.radioHorizon(v.h1, v.h2))], ['Optik ufuk (yalnız h1)', fmtDist(RF.opticalHorizon(v.h1))], ['h1 tek başına', fmtDist(RF.radioHorizon(v.h1, 0))]] },
    { id: 'cable', title: 'Kablo kaybı', desc: 'Katalog değerlerinden log-log ara değer; konnektör başına tipik kayıp eklenir.',
      in: [['c', 'Kablo', 'sel:cables', 'RG316'], ['len', 'Uzunluk', 'm', 0.5], ['f', 'Frekans', 'MHz', 5800], ['n', 'Konnektör sayısı', 'ad', 2]],
      out: v => { const a = RF.cableDbPerM(v.c, v.f); const t = a * v.len + v.n * 0.15; return [['dB/m', fmt(a, 3)], ['Kablo kaybı', fmt(a * v.len, 2) + ' dB'], ['Konnektörler (≈0,15 dB/ad)', fmt(v.n * 0.15, 2) + ' dB'], ['Toplam', fmt(t, 2) + ' dB · gücün %' + fmt(RF.dbToPowerLossPct(t), 1) + '\'i kaybolur']]; } },
    { id: 'eirp', title: 'EIRP / ERP', desc: 'EIRP = Pt − kayıplar + Gant (dBi). ERP = EIRP − 2,15 dB. Yasal sınırlar EIRP ile verilir.',
      in: [['p', 'Verici gücü', 'mW', 600], ['l', 'Kablo/konnektör kaybı', 'dB', 0.5], ['g', 'Anten kazancı', 'dBi', 2]],
      out: v => { const e = RF.mwToDbm(v.p) - v.l + v.g; return [['EIRP', fmt(e, 2) + ' dBm · ' + fmtPower(e)], ['ERP', fmt(e - 2.15, 2) + ' dBm · ' + fmtPower(e - 2.15)], ['AB 5,8 GHz SRD sınırı', '25 mW EIRP (14 dBm)'], ['AB 2,4 GHz sınırı', '100 mW EIRP (20 dBm)']]; } },
    { id: 'noise', title: 'Gürültü tabanı ve SNR', desc: 'N = −174 dBm/Hz + 10·log₁₀(BW) + NF. Hassasiyet ≈ N + gerekli SNR.',
      in: [['bw', 'Bant genişliği', 'kHz', 500], ['nf', 'Alıcı gürültü sayısı (NF)', 'dB', 6], ['snr', 'Gereken SNR', 'dB', 10], ['prx', 'Alınan güç', 'dBm', -80]],
      out: v => { const n = RF.noiseFloor(v.bw * 1000, v.nf); return [['Gürültü tabanı', fmt(n, 1) + ' dBm'], ['Tahmini hassasiyet', fmt(n + v.snr, 1) + ' dBm'], ['SNR (alınan güçte)', fmt(v.prx - n, 1) + ' dB']]; } },
    { id: 'foliage', title: 'Bitki örtüsü kaybı (Weissberger)', desc: 'Ağaçlık alandan geçen yol için. 14 m\'ye kadar doğrusal, sonra üstel model (≤400 m).',
      in: [['f', 'Frekans', 'MHz', 2450], ['d', 'Bitki içinden geçen yol', 'm', 30]],
      out: v => [['Ek kayıp', fmt(RF.foliage(v.f, v.d), 1) + ' dB']] },
    { id: 'rain', title: 'Yağmur zayıflaması (ITU-R P.838)', desc: '10 GHz altında küçüktür; 5,8 GHz\'te uzun yollarda hesaba katılabilir.',
      in: [['f', 'Frekans', 'MHz', 5800], ['r', 'Yağış', 'mm/sa', 25], ['d', 'Yağmur içindeki yol', 'km', 5]],
      out: v => { const s = RF.rainSpecific(v.f, v.r); return [['Özgül zayıflama', fmt(s, 4) + ' dB/km'], ['Toplam', fmt(s * v.d, 2) + ' dB']]; } },
    { id: 'pol', title: 'Polarizasyon kaybı (açı)', desc: 'İki lineer anten arasındaki açı: L = −20·log₁₀|cos θ|. Lineer ↔ dairesel: 3 dB. RHCP ↔ LHCP: ≈20 dB+.',
      in: [['a', 'Antenler arası açı', '°', 45]],
      out: v => [['Kayıp', fmt(RF.polLinearAngle(v.a), 2) + ' dB'], ['Kalan güç', '%' + fmt(100 - RF.dbToPowerLossPct(RF.polLinearAngle(v.a)), 1)]] },
    { id: 'point', title: 'Yönlendirme (sapma) kaybı', desc: 'Gauss hüzme yaklaşımı: L ≈ 12·(θ/HPBW)² dB. Hüzme kenarında (θ = HPBW/2) 3 dB.',
      in: [['o', 'Hedeften sapma', '°', 10], ['h', 'Hüzme genişliği (−3 dB)', '°', 40]],
      out: v => [['Kayıp', fmt(RF.pointingLoss(v.o, v.h), 2) + ' dB']] },
    { id: 'tworay', title: 'İki ışın (yer yansıması) modeli', desc: 'Kırılma mesafesinden sonra kayıp 40 dB/dekad artar (FSPL\'de 20 dB/dekad).',
      in: [['f', 'Frekans', 'MHz', 2450], ['d', 'Mesafe', 'km', 3], ['h1', 'Tx yüksekliği', 'm', 50], ['h2', 'Rx yüksekliği', 'm', 2]],
      out: v => { const bk = RF.twoRayBreak(v.f, v.h1, v.h2), fs = RF.fspl(v.d, v.f); return [['Kırılma mesafesi', fmtDist(bk)], ['FSPL', fmt(fs, 1) + ' dB'], ['İki ışın kaybı', v.d > bk ? fmt(RF.twoRay(v.d, v.h1, v.h2), 1) + ' dB' : 'geçerli değil (d < kırılma) → FSPL kullan']]; } }
  ];

  function render(el) {
    el.innerHTML = `<p class="lead">Program içi çeviriciler: herhangi bir kutuya yazın, diğerleri anında hesaplanır.</p>
      <div class="tool-grid">${CONVERTERS.map(convHtml).join('')}${CALCS.map(calcHtml).join('')}</div>`;
    for (const c of CONVERTERS) bindConv(el, c);
    for (const c of CALCS) bindCalc(el, c);
  }
  function convHtml(c) {
    return `<section class="card tool" id="t-${c.id}"><h3>${c.title}</h3><p class="muted small">${c.desc}</p>
      <div class="conv">${c.fields.map(([k, l]) => `<label><span>${l}</span><input type="number" step="any" data-k="${k}"></label>`).join('')}</div></section>`;
  }
  function bindConv(el, c) {
    const box = $('#t-' + c.id, el);
    const set = (src, v) => {
      const r = c.from(src, v);
      for (const [k] of c.fields) if (k !== src) { const i = $(`[data-k="${k}"]`, box); const x = r[k]; i.value = isFinite(x) ? +x.toPrecision(6) : ''; }
    };
    box.addEventListener('input', e => { const k = e.target.dataset.k; const v = parseFloat(e.target.value); if (k && isFinite(v)) set(k, v); });
    $(`[data-k="${c.start[0]}"]`, box).value = c.start[1]; set(c.start[0], c.start[1]);
  }
  function calcHtml(c) {
    return `<section class="card tool" id="t-${c.id}"><h3>${c.title}</h3><p class="muted small">${c.desc}</p>
      <div class="calc-in">${c.in.map(([k, l, u, v]) => u === 'sel:cables'
        ? `<label><span>${l}</span><select data-k="${k}">${Object.keys(RF.CABLES).map(n => `<option${n === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`
        : `<label><span>${l}</span><span class="ig sm"><input type="number" step="any" data-k="${k}" value="${v}">${u ? `<span class="unit">${u}</span>` : ''}</span></label>`).join('')}</div>
      <div class="calc-out"></div></section>`;
  }
  function bindCalc(el, c) {
    const box = $('#t-' + c.id, el);
    const run = () => {
      const v = {};
      for (const [k, , u] of c.in) { const i = $(`[data-k="${k}"]`, box); v[k] = u === 'sel:cables' ? i.value : num(i.value); }
      let rows; try { rows = c.out(v); } catch { rows = [['Hata', 'geçersiz giriş']]; }
      $('.calc-out', box).innerHTML = rows.map(([k, x]) => `<div><span>${k}</span><b>${x}</b></div>`).join('');
    };
    box.addEventListener('input', run); box.addEventListener('change', run); run();
  }
  return { title: 'Araçlar', render };
})();
