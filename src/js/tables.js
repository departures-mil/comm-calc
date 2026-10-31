// Tablolar: VSWR, güç, FSPL, kablo, bant, FPV kanal, engel, kalite tabloları.
Views.tables = (() => {
  const VSWR_LIST = [1.0, 1.01, 1.02, 1.03, 1.04, 1.05, 1.06, 1.07, 1.08, 1.09, 1.1, 1.12, 1.14, 1.16, 1.18, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 6.0, 7.0, 8.0, 9.0, 10, 15, 20, 30, 50];
  const TABLES = [
    { id: 'vswr', title: 'VSWR / geri dönüş kaybı / iletilen güç', note: 'Menace RC ve VSWR–Γ tablolarının birleşimi; değerler formülden hesaplanır.',
      head: ['VSWR', 'Geri dönüş kaybı (dB)', 'Uyumsuzluk kaybı (dB)', 'Γ (s11)', 'İletilen güç %', 'Yansıyan güç %', 'Yansıyan güç (dB)'],
      rows: () => VSWR_LIST.map(s => { const v = RF.vswrInfo(s); return [fmt(s, 2), s === 1 ? '∞' : fmt(v.rl, 1), fmt(v.ml, 3), fmt(v.gamma, 3), fmt(v.transPct, 1), fmt(v.reflPct, 1), s === 1 ? '−∞' : fmt(v.reflDb, 2)]; }),
      rowCls: r => { const s = num(r[0]); return s <= 1.5 ? 'ok' : s <= 2 ? 'mid' : 'bad'; } },
    { id: 'power', title: 'dBm ↔ güç', head: ['dBm', 'Güç', 'dBW', 'Not'],
      rows: () => [[-120, 'tipik alıcı gürültüsüne yakın'], [-115, 'LoRa/ELRS hassasiyeti'], [-100, 'iyi dijital alıcı'], [-90, 'analog 5.8G video alıcı hassasiyeti'], [-80, ''], [-70, 'iyi Wi-Fi sinyali'], [-60, ''], [-50, 'çok güçlü sinyal'], [-30, ''], [0, '1 mW'], [10, '10 mW'], [14, 'AB 5.8 GHz EIRP sınırı (25 mW)'], [20, '100 mW (AB 2.4 GHz EIRP sınırı)'], [23, '200 mW'], [25, '316 mW'], [26, '400 mW'], [27.8, '600 mW'], [29, '800 mW'], [30, '1 W'], [33, '2 W'], [36, '4 W (ABD 2.4 GHz EIRP)'], [40, '10 W'], [50, '100 W']]
        .map(([d, n]) => [fmt(d, 1), fmtPower(d), fmt(d - 30, 1), n]) },
    { id: 'dbratio', title: 'dB → oran ve yüzde kayıp', head: ['dB', 'Güç oranı', 'Gerilim oranı', 'Güç kaybı % (kayıp ise)', 'Kalan güç %'],
      rows: () => [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40].map(d => [fmt(d, 2), '×' + fmt(Math.pow(10, d / 10), 3), '×' + fmt(Math.pow(10, d / 20), 3), fmt(RF.dbToPowerLossPct(d), 1), fmt(100 - RF.dbToPowerLossPct(d), 2)]) },
    { id: 'fspl', title: 'Serbest uzay kaybı (dB)', note: 'Satır: mesafe, sütun: frekans. İzotropik antenler.',
      head: ['Mesafe', '433 MHz', '915 MHz', '1,3 GHz', '2,45 GHz', '5,8 GHz'],
      rows: () => [0.1, 0.5, 1, 2, 3, 5, 10, 20, 30, 50, 100].map(d => [fmtDist(d)].concat([433, 915, 1300, 2450, 5800].map(f => fmt(RF.fspl(d, f), 1)))) },
    { id: 'cable', title: 'Kablo kaybı (dB/m)', note: 'Katalog değerlerinden yaklaşık; üreticiye göre ±%15 değişebilir.',
      head: ['Kablo', '433 MHz', '915 MHz', '1,3 GHz', '2,45 GHz', '5,8 GHz', 'Açıklama'],
      rows: () => Object.keys(RF.CABLES).map(c => [c].concat([433, 915, 1300, 2450, 5800].map(f => fmt(RF.cableDbPerM(c, f), 3)), [RF.CABLES[c].d])) },
    { id: 'conn', title: 'Konnektör kayıpları (tipik)', head: ['Konnektör', 'Kayıp / adet (dB)', 'Not'],
      rows: () => Object.entries(RF.CONNECTORS).map(([k, v]) => [k, fmt(v, 2), { 'U.FL / IPEX': 'Hassas; sık sök-tak ile kayıp artar', 'MMCX': 'VTX\'lerde yaygın', 'SMA': '6 GHz\'e kadar düşük kayıp', 'RP-SMA': 'Ters polarite; SMA ile karıştırma!', 'N': 'Yer istasyonu, dayanıklı' }[k] || '']) },
    { id: 'bands', title: 'İHA frekans bantları', head: ['Bant', 'Aralık', 'Dalga boyu', 'Kullanım', 'Özellik'], rows: () => DATA.BANDS },
    { id: 'fpv', title: '5,8 GHz FPV kanal tablosu (MHz)', head: ['Bant', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'],
      rows: () => Object.entries(DATA.FPV58).map(([k, v]) => [k].concat(v)) },
    { id: 'obst', title: 'Tipik engel kayıpları (dB)', note: 'Yaklaşık değerler; malzeme ve açıya göre değişir.', head: ['Engel', '2,4 GHz', '5,8 GHz'],
      rows: () => DATA.OBSTACLES.map(r => [r[0], fmt(r[1], 0), fmt(r[2], 0)]) },
    { id: 'pol', title: 'Polarizasyon uyumsuzluk kaybı', head: ['Verici', 'Alıcı', 'Kayıp (dB)'],
      rows: () => [['V', 'V', 0], ['V', 'H', '20+ (teoride ∞)'], ['V', '45° eğik', 3], ['Lineer', 'RHCP/LHCP', 3], ['RHCP', 'RHCP', 0], ['RHCP', 'LHCP', '15–25'], ['LHCP', 'LHCP', 0]] },
    { id: 'margin', title: 'Link payı ve bağlantı kalitesi', head: ['Pay (dB)', 'Kalite', 'Açıklama'],
      rows: () => RF.QUALITY.map((q, i) => [q.min === -Infinity ? '< 0' : (i ? `${q.min} – ${RF.QUALITY[i - 1].min}` : `≥ ${q.min}`), q.label, q.note]),
      rowCls: r => ({ 'Mükemmel': 'ok', 'Çok iyi': 'ok', 'İyi': 'mid', 'Sınırda': 'mid', 'Kritik': 'bad', 'Çalışmaz': 'bad' })[r[1]] },
    { id: 'antbw', title: 'Anten türleri: kazanç ve hüzme genişlikleri (H / V)', note: 'Tipik −3 dB hüzme genişlikleri; anten dikey konumda takılı varsayılır. Gerçek değer için ürün etiketine bakın.',
      head: ['Anten', 'Grup', 'Tipik kazanç', 'Yatay (H)', 'Dikey (V)', 'Polarizasyon'],
      rows: () => DATA.ANTENNAS.map(a => [a.name, a.group, a.gain, a.bwH || a.bw, a.bwV || '', a.pol])
        .concat(Store.data.library.filter(x => x.type === 'antenna').map(x => [x.name + ' (kütüphane)', 'Kütüphane', x.gain != null ? x.gain + ' dBi' : '—', x.bwH ? x.bwH + '°' : '—', x.bwV ? x.bwV + '°' : '—', x.pol || '—'])) },
    { id: 'gainbw', title: 'Kazanç ↔ hüzme genişliği (simetrik, yaklaşık)', head: ['Kazanç (dBi)', 'Hüzme (°)', 'Tipik anten'],
      rows: () => [[3, 'dipol/omni'], [6, 'geniş patch'], [8, 'patch'], [10, 'biquad / küçük helis'], [12, 'helis'], [14, 'panel'], [17, 'plate / Yagi'], [20, 'büyük panel'], [24, 'çanak'], [30, 'büyük çanak']].map(([g, t]) => [g, fmt(RF.beamFromGain(g), 0), t]) }
  ];
  let active = 'vswr';
  function render(el) {
    el.innerHTML = `<div class="tabs">${TABLES.map(t => `<button class="tab${t.id === active ? ' on' : ''}" data-t="${t.id}">${t.title.split(' (')[0]}</button>`).join('')}</div><div id="tbl"></div>`;
    $$('.tab', el).forEach(b => b.onclick = () => { active = b.dataset.t; render(el); });
    const t = TABLES.find(x => x.id === active);
    $('#tbl', el).innerHTML = `<section class="card"><h3>${t.title}</h3>${t.note ? `<p class="muted small">${t.note}</p>` : ''}
      <div class="tbl-wrap"><table class="tbl"><thead><tr>${t.head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${t.rows().map(r => `<tr class="${t.rowCls ? t.rowCls(r) || '' : ''}">${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`;
  }
  return { title: 'Tablolar', render };
})();
