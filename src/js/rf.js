// RF hesap çekirdeği: birim çevirileri, yayılım kayıpları, VSWR, kablo, Fresnel, link bütçesi.
// Tüm fonksiyonlar saf (yan etkisiz); arayüz bu dosyadaki RF.* fonksiyonlarını kullanır.
const RF = (() => {
  const C = 299.792458; // ışık hızı, m·MHz
  const log10 = Math.log10;
  const db2lin = db => Math.pow(10, db / 10);
  const lin2db = x => 10 * log10(x);

  // ---- Güç
  const dbmToMw = dbm => Math.pow(10, dbm / 10);
  const mwToDbm = mw => 10 * log10(mw);
  const dbmToW = dbm => dbmToMw(dbm) / 1000;
  const wToDbm = w => mwToDbm(w * 1000);
  const toDbm = (v, unit) => unit === 'dBm' ? v : unit === 'dBW' ? v + 30 : unit === 'W' ? wToDbm(v) : unit === 'mW' ? mwToDbm(v) : NaN;
  // 50 Ω sistemde gerilim ↔ güç
  const uvToDbm = uv => 20 * log10(uv) - 106.99;
  const dbmToUv = dbm => Math.pow(10, (dbm + 106.99) / 20);

  // ---- Frekans / dalga boyu
  const lambda = fMHz => C / fMHz; // metre

  // ---- Yayılım
  // Serbest uzay yol kaybı (Friis): FSPL = 20log(d km) + 20log(f MHz) + 32.44
  const fspl = (dKm, fMHz) => 20 * log10(dKm) + 20 * log10(fMHz) + 32.44;
  // FSPL tersinden mesafe (km)
  const fsplDistance = (lossDb, fMHz) => Math.pow(10, (lossDb - 32.44 - 20 * log10(fMHz)) / 20);
  // n. Fresnel bölgesi yarıçapı (m); d1, d2 km cinsinden uç noktalara uzaklık
  const fresnel = (n, fMHz, d1Km, d2Km) => Math.sqrt(n * lambda(fMHz) * (d1Km * 1000) * (d2Km * 1000) / ((d1Km + d2Km) * 1000));
  // Radyo ufku (4/3 yer yarıçapı, km); yükseklikler metre
  const radioHorizon = (h1, h2) => 4.12 * (Math.sqrt(Math.max(0, h1)) + Math.sqrt(Math.max(0, h2 || 0)));
  // Optik ufuk (km)
  const opticalHorizon = h => 3.57 * Math.sqrt(Math.max(0, h));
  // Dünya eğriliği nedeniyle yol ortasındaki yükselme (m), k=4/3
  const earthBulge = dKm => (dKm * dKm) / (8 * 1.333 * 6371) * 1000;
  // İki ışın (yer yansımalı) model kaybı; mesafe kırılma mesafesinden büyükse geçerli
  const twoRay = (dKm, h1, h2) => 40 * log10(dKm * 1000) - 20 * log10(h1) - 20 * log10(h2);
  const twoRayBreak = (fMHz, h1, h2) => 4 * h1 * h2 / lambda(fMHz) / 1000; // km

  // Weissberger bitki örtüsü modeli (f GHz, d m bitki içinden geçen yol)
  const foliage = (fMHz, dM) => {
    const f = fMHz / 1000;
    if (dM <= 0) return 0;
    if (dM <= 14) return 0.45 * Math.pow(f, 0.284) * dM;
    return 1.33 * Math.pow(f, 0.284) * Math.pow(Math.min(dM, 400), 0.588);
  };
  // ITU-R P.838-3 yatay polarizasyon katsayıları (yaklaşık), özgül yağmur zayıflaması dB/km
  const RAIN = [[1, 0.0000259, 0.9691], [2, 0.0000847, 1.0664], [4, 0.0001071, 1.6009], [6, 0.0007056, 1.59], [8, 0.004115, 1.3905], [10, 0.01217, 1.2571], [12, 0.02386, 1.1825], [15, 0.04481, 1.1233], [20, 0.09164, 1.0568]];
  const rainSpecific = (fMHz, mmh) => {
    const f = Math.min(Math.max(fMHz / 1000, 1), 20);
    let i = 0; while (i < RAIN.length - 2 && RAIN[i + 1][0] < f) i++;
    const [f1, k1, a1] = RAIN[i], [f2, k2, a2] = RAIN[i + 1];
    const t = (log10(f) - log10(f1)) / (log10(f2) - log10(f1));
    const k = Math.pow(10, log10(k1) + t * (log10(k2) - log10(k1)));
    const a = a1 + t * (a2 - a1);
    return k * Math.pow(mmh, a);
  };

  // ---- VSWR / yansıma
  const vswrToGamma = s => (s - 1) / (s + 1);
  const gammaToVswr = g => (1 + g) / (1 - g);
  const gammaToRL = g => -20 * log10(g);
  const rlToGamma = rl => Math.pow(10, -rl / 20);
  const mismatchLoss = g => -10 * log10(1 - g * g);
  const vswrInfo = s => {
    const g = vswrToGamma(s);
    return { vswr: s, gamma: g, rl: g > 0 ? gammaToRL(g) : Infinity, ml: mismatchLoss(g), transPct: (1 - g * g) * 100, reflPct: g * g * 100, reflDb: g > 0 ? 10 * log10(g * g) : -Infinity };
  };

  // ---- dB ↔ yüzde
  const dbToPowerLossPct = db => (1 - Math.pow(10, -db / 10)) * 100;
  const dbToVoltLossPct = db => (1 - Math.pow(10, -db / 20)) * 100;
  const powerLossPctToDb = pct => -10 * log10(1 - pct / 100);

  // ---- Anten
  const dbdToDbi = d => d + 2.15;
  const dbiToDbd = d => d - 2.15;
  // Hüzme genişliğinden kazanç tahmini (Kraus, verim ~%70): G ≈ 29000 / (θH·θV)
  const gainFromBeam = (h, v) => lin2db(29000 / (h * v));
  const beamFromGain = gDbi => Math.sqrt(29000 / db2lin(gDbi)); // eşit H=V varsayımı
  // Hedeften sapma kaybı (Gauss hüzme yaklaşımı): L = 12·(θ/HPBW)² dB
  const pointingLoss = (offDeg, hpbw) => Math.min(40, 12 * Math.pow(offDeg / hpbw, 2));
  // Polarizasyon uyumsuzluğu
  const polLinearAngle = deg => { const c = Math.abs(Math.cos(deg * Math.PI / 180)); return c < 1e-3 ? 30 : Math.min(30, -20 * log10(c)); };
  const POL = ['V', 'H', 'RHCP', 'LHCP', 'Lineer (eğik)'];
  const polMismatch = (a, b) => {
    if (!a || !b) return 0;
    const lin = p => p === 'V' || p === 'H' || p === 'Lineer (eğik)';
    if (a === b) return 0;
    if (lin(a) && lin(b)) return (a === 'Lineer (eğik)' || b === 'Lineer (eğik)') ? 3 : 20;
    if (lin(a) !== lin(b)) return 3;
    return 20; // RHCP ↔ LHCP çapraz
  };

  // ---- Gürültü
  const noiseFloor = (bwHz, nf) => -174 + 10 * log10(bwHz) + (nf || 0);

  // ---- Kablolar: dB/m değerleri (yaklaşık katalog değerleri), frekans MHz
  const CABLES = {
    'RG174':   { f: [100, 400, 1000, 2400, 5800], a: [0.29, 0.57, 0.98, 1.6, 2.7], d: '2.8 mm, ince ve esnek' },
    'RG316':   { f: [100, 400, 1000, 2400, 5800], a: [0.26, 0.52, 0.86, 1.4, 2.3], d: '2.5 mm, PTFE, İHA içinde yaygın' },
    'RG178':   { f: [100, 400, 1000, 2400, 5800], a: [0.45, 0.9, 1.5, 2.4, 3.9], d: '1.8 mm, çok ince' },
    'RG58':    { f: [100, 400, 1000, 2400, 5800], a: [0.16, 0.36, 0.66, 1.06, 1.8], d: '5 mm, genel amaçlı' },
    'RG405 (.086)': { f: [100, 400, 1000, 2400, 5800], a: [0.2, 0.42, 0.68, 1.1, 1.75], d: 'yarı sert, 2.2 mm' },
    'RG402 (.141)': { f: [100, 400, 1000, 2400, 5800], a: [0.12, 0.25, 0.43, 0.68, 1.08], d: 'yarı sert, 3.6 mm' },
    'LMR-100': { f: [150, 450, 900, 2400, 5800], a: [0.3, 0.52, 0.75, 1.27, 2.07], d: '2.8 mm, RG174 muadili, düşük kayıp' },
    'LMR-195': { f: [150, 450, 900, 2400, 5800], a: [0.14, 0.25, 0.36, 0.62, 1.0], d: '4.9 mm' },
    'LMR-240': { f: [150, 450, 900, 2400, 5800], a: [0.1, 0.17, 0.25, 0.42, 0.69], d: '6.1 mm' },
    'LMR-400': { f: [150, 450, 900, 2400, 5800], a: [0.05, 0.09, 0.128, 0.217, 0.354], d: '10.3 mm, yer istasyonu' },
    'LMR-600': { f: [150, 450, 900, 2400, 5800], a: [0.032, 0.058, 0.083, 0.142, 0.235], d: '14.9 mm' },
    'RG213':   { f: [100, 400, 1000, 2400, 5800], a: [0.07, 0.15, 0.26, 0.45, 0.8], d: '10.3 mm, klasik kalın' },
    'Hyperflex 10': { f: [150, 450, 900, 2400, 5800], a: [0.06, 0.1, 0.15, 0.25, 0.4], d: '10 mm, esnek düşük kayıp' }
  };
  // Log-log ara değer bulma
  const cableDbPerM = (name, fMHz) => {
    const c = CABLES[name]; if (!c) return 0;
    const lf = log10(fMHz), F = c.f.map(log10), A = c.a.map(log10);
    let i = 0; while (i < F.length - 2 && F[i + 1] < lf) i++;
    const t = (lf - F[i]) / (F[i + 1] - F[i]);
    return Math.pow(10, A[i] + t * (A[i + 1] - A[i]));
  };
  const CONNECTORS = { 'SMA': 0.15, 'RP-SMA': 0.15, 'N': 0.1, 'TNC': 0.15, 'BNC': 0.2, 'MCX': 0.25, 'MMCX': 0.3, 'U.FL / IPEX': 0.4, 'Adaptör': 0.25 };

  // ---- Kalite
  const QUALITY = [
    { min: 20, key: 'mukemmel', label: 'Mükemmel', color: '#21c07a', note: 'Çok güçlü bağlantı; engel ve sönümlenmelere karşı geniş pay.' },
    { min: 12, key: 'cokiyi', label: 'Çok iyi', color: '#5ccf4a', note: 'Kararlı bağlantı; tipik İHA kullanımı için güvenli.' },
    { min: 6, key: 'iyi', label: 'İyi', color: '#b7d433', note: 'Çalışır; yönlenme ve engellerde zaman zaman kalite düşebilir.' },
    { min: 3, key: 'sinirda', label: 'Sınırda', color: '#f0b429', note: 'Görüntü/kontrol bozulmaları beklenir; pay artırılmalı.' },
    { min: 0, key: 'kritik', label: 'Kritik', color: '#f07b29', note: 'Hassasiyet sınırında; kesintiler olur.' },
    { min: -Infinity, key: 'calismaz', label: 'Çalışmaz', color: '#e5484d', note: 'Alınan sinyal alıcı hassasiyetinin altında.' }
  ];
  const quality = margin => QUALITY.find(q => margin >= q.min);
  // Sinyal yüzdesi: 0 dB pay = %0, 30 dB pay = %100
  const signalPct = margin => Math.max(0, Math.min(100, margin / 30 * 100));

  // ---- Link bütçesi
  // budget = { txDbm, fMHz, dKm, sens, fade, items:[{on, kind:'gain'|'loss', side:'tx'|'path'|'rx', value}] }
  // Otomatik kalemler (FSPL, kablo, ...) için değer `itemValue` ile hesaplanır.
  function itemValue(it, b) {
    const p = it.p || {};
    switch (it.auto) {
      case 'fspl': return fspl(Math.max(b.dKm, 1e-6), b.fMHz);
      case 'cable': return cableDbPerM(p.cable, b.fMHz) * (+p.len || 0);
      case 'conn': return (CONNECTORS[p.type] || 0) * (+p.n || 0);
      case 'vswr': return (+p.vswr > 1) ? mismatchLoss(vswrToGamma(+p.vswr)) : 0;
      case 'foliage': return foliage(b.fMHz, +p.depth || 0);
      case 'rain': return rainSpecific(b.fMHz, +p.rate || 0) * b.dKm;
      case 'pol': return p.mode === 'angle' ? polLinearAngle(+p.angle || 0) : polMismatch(p.a, p.b);
      case 'point': return pointingLoss(+p.off || 0, +p.hpbw || 30);
      default: return +it.value || 0;
    }
  }
  function compute(b) {
    const rows = [];
    let level = b.txDbm, gains = 0, losses = 0, eirp = null, pathLoss = 0;
    for (const it of b.items) {
      const v = it.on ? itemValue(it, b) : 0;
      const signed = it.kind === 'gain' ? v : -v;
      if (it.on) { if (it.kind === 'gain') gains += v; else losses += v; if (it.side === 'path') pathLoss += signed; }
      // EIRP: verici tarafının bittiği nokta
      if (eirp === null && it.side !== 'tx') eirp = level;
      level += signed;
      rows.push({ it, value: v, signed, level });
    }
    if (eirp === null) eirp = level;
    const prx = level;
    const margin = prx - b.sens;
    const fsplDb = fspl(Math.max(b.dKm, 1e-6), b.fMHz);
    // Mesafe bağımlı olmayan net değer: prx + fspl (FSPL dışındaki her şey)
    const fsplOn = b.items.some(it => it.on && it.auto === 'fspl');
    const rainItem = b.items.find(it => it.on && it.auto === 'rain');
    const rainPerKm = rainItem ? rainSpecific(b.fMHz, +(rainItem.p || {}).rate || 0) : 0;
    const fixed = prx + (fsplOn ? fsplDb : 0) + rainPerKm * b.dKm;
    const rangeFor = need => {
      if (!fsplOn) return null;
      // fixed − FSPL(d) − rain·d = need ; sayısal çözüm (ikiye bölme)
      let lo = 1e-4, hi = 1e5;
      const f = d => fixed - fspl(d, b.fMHz) - rainPerKm * d - need;
      if (f(lo) < 0) return 0;
      if (f(hi) > 0) return hi;
      for (let i = 0; i < 80; i++) { const m = Math.sqrt(lo * hi); if (f(m) > 0) lo = m; else hi = m; }
      return lo;
    };
    return {
      rows, eirp, prx, margin, gains, losses, pathLoss, fsplDb,
      quality: quality(margin), pct: signalPct(margin),
      maxRange: rangeFor(b.sens), safeRange: rangeFor(b.sens + (b.fade || 0)),
      prxAt: dKm => fixed - (fsplOn ? fspl(dKm, b.fMHz) : 0) - rainPerKm * dKm
    };
  }

  return {
    db2lin, lin2db, dbmToMw, mwToDbm, dbmToW, wToDbm, toDbm, uvToDbm, dbmToUv, lambda,
    fspl, fsplDistance, fresnel, radioHorizon, opticalHorizon, earthBulge, twoRay, twoRayBreak, foliage, rainSpecific,
    vswrToGamma, gammaToVswr, gammaToRL, rlToGamma, mismatchLoss, vswrInfo,
    dbToPowerLossPct, dbToVoltLossPct, powerLossPctToDb, dbdToDbi, dbiToDbd, gainFromBeam, beamFromGain, pointingLoss,
    polLinearAngle, polMismatch, POL, noiseFloor, CABLES, cableDbPerM, CONNECTORS, QUALITY, quality, signalPct, itemValue, compute
  };
})();
if (typeof module !== 'undefined') module.exports = RF;
