// Anten ışıma diyagramı (radiation pattern) modelleri ve kutupsal çizim.
// Her model iki düzlem için normalize güç (dB, tepe = 0) döndürür:
//   az(φ): yatay düzlem, φ = 0° ön (hüzme yönü)
//   el(θ): dikey düzlem, θ = 0° ufuk/ön, +90° zenit
const PAT = (() => {
  const D = Math.PI / 180;
  const db = p => 10 * Math.log10(Math.max(p, 1e-6));
  const wrap = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };

  // Bessel J1 (sayısal integral) - parabolik çanak için
  function j1(x) {
    let s = 0; const n = 200;
    for (let i = 0; i <= n; i++) { const t = Math.PI * i / n; const w = (i === 0 || i === n) ? 0.5 : 1; s += w * Math.cos(t - x * Math.sin(t)); }
    return s / n;
  }
  // Hüzme genişliğinden cos^q üssü
  const qFor = hpbw => Math.log(0.5) / (2 * Math.log(Math.cos(Math.min(hpbw, 170) / 2 * D)));
  // Genel yönlü anten: ana hüzme cos^q, arka yarıda ön/arka oranı kadar zemin, hafif yan loblar
  function directional(angle, hpbw, fb, sll) {
    const a = Math.abs(wrap(angle));
    if (hpbw >= 175) return 0;
    const q = qFor(hpbw);
    let p = a < 90 ? Math.pow(Math.cos(a * D), 2 * q) : 0;
    const side = Math.pow(10, -(sll || 18) / 10) * Math.pow(Math.sin(a * D * 3) , 2) * (a > hpbw * 0.8 && a < 120 ? 1 : 0);
    const back = Math.pow(10, -(fb || 20) / 10) * (a > 90 ? Math.pow(Math.abs(Math.cos(a * D)), 1.5) : 0);
    return db(Math.max(p, side, back, 1e-4));
  }
  // Dipol (dikey): dikey düzlemde klasik çörek
  const dipoleEl = th => { const c = Math.cos(th * D); if (Math.abs(c) < 1e-6) return -40; const f = Math.cos(Math.PI / 2 * Math.sin(th * D)) / c; return db(f * f); };
  // Dikey dizilim (collinear): eleman × dizi faktörü (aralık d·λ, eş fazlı)
  function arrayEl(th, n, d) {
    const psi = 2 * Math.PI * d * Math.sin(th * D);
    const af = Math.abs(Math.sin(psi / 2)) < 1e-9 ? 1 : Math.sin(n * psi / 2) / (n * Math.sin(psi / 2));
    return dipoleEl(th) + db(af * af);
  }
  // Uç-ateşlemeli dizi (Yagi yaklaşımı) - n eleman, aralık d·λ, Hansen-Woodyard fazı
  function endfire(a, n, d) {
    const k = 2 * Math.PI * d;
    const delta = k + Math.PI / n;
    const psi = k * Math.cos(a * D) - delta;
    const af = Math.abs(Math.sin(psi / 2)) < 1e-9 ? 1 : Math.sin(n * psi / 2) / (n * Math.sin(psi / 2));
    return af * af;
  }
  function endfireNorm(a, n, d) { return db(endfire(a, n, d) / endfire(0, n, d)); }
  // Parabolik çanak: Airy diyagramı, D/λ oranı
  function dish(a, dl) {
    const x = Math.abs(wrap(a));
    if (x > 90) return Math.max(-35, -30 - (x - 90) / 30);
    const u = Math.PI * dl * Math.sin(x * D);
    const f = u < 1e-6 ? 1 : 2 * j1(u) / u;
    return Math.max(db(f * f), -35 + 10 * Math.cos(x * D));
  }
  // Faz dizisi (yatay düzlemde n eleman, λ/2 aralık, yönlendirme açısı)
  function phased(a, n, steer) {
    const x = wrap(a);
    if (Math.abs(x) > 90) return -25;
    const psi = Math.PI * (Math.sin(x * D) - Math.sin(steer * D));
    const af = Math.abs(Math.sin(psi / 2)) < 1e-9 ? 1 : Math.sin(n * psi / 2) / (n * Math.sin(psi / 2));
    return db(af * af * Math.pow(Math.cos(x * D), 1.2));
  }

  // Model fabrikası: (tip, parametreler) → {az, el}
  function model(kind, o) {
    o = o || {};
    switch (kind) {
      case 'isotropic': return { az: () => 0, el: () => 0 };
      case 'dipole': return { az: () => 0, el: th => dipoleEl(th) };
      case 'monopole': return { az: () => 0, el: th => th >= 0 ? dipoleEl(th) + db(Math.pow(Math.cos(th * D * 0.25), 2)) : dipoleEl(th) - 6 - Math.abs(th) / 6 };
      case 'groundplane': return { az: () => 0, el: th => th >= -10 ? dipoleEl(th) : dipoleEl(th) - (Math.abs(th) - 10) / 8 };
      case 'collinear': return { az: () => 0, el: th => arrayEl(th, o.n || 4, o.d || 0.75) };
      case 'omniCP': return { az: a => -0.8 + 0.8 * Math.cos(3 * a * D), el: th => dipoleEl(th * 0.92) - (th < 0 ? 1 : 0) };
      case 'skew': return { az: a => -1.2 + 1.2 * Math.cos(4 * a * D), el: th => dipoleEl(th * 0.9) - (th < 0 ? 1.5 : 0) };
      case 'turnstile': return { az: a => -0.5 + 0.5 * Math.cos(2 * a * D), el: th => db(Math.pow((1 + Math.sin(th * D)) / 2, 1.3)) };
      case 'qha': return { az: () => 0, el: th => db(Math.max(Math.pow((1 + Math.sin(th * D)) / 2, 1.0), 0.005)) };
      case 'yagi': return { az: a => endfireNorm(a, o.n || 8, o.d || 0.25), el: a => endfireNorm(a, o.n || 8, o.d || 0.25) + db(Math.pow(Math.max(Math.cos(a * D), 0.08), 2)) };
      case 'dish': return { az: a => dish(a, o.dl || 10), el: a => dish(a, o.dl || 10) };
      case 'phased': return { az: a => phased(a, o.n || 8, o.steer || 0), el: a => directional(a, o.v || 60, o.fb || 20, 20) };
      case 'sector': return { az: a => { const x = Math.abs(wrap(a)); const h = o.h || 90; return x < h / 2 * 0.6 ? 0 : directional(x - h / 2 * 0.6, h * 0.55, o.fb || 25, 22) - 0.5; }, el: th => arrayEl(th - (o.tilt || 0), o.n || 6, 0.75) };
      default: // directional (patch, panel, helix, horn, LPDA, biquad...)
        return { az: a => directional(a, o.h || 60, o.fb || 20, o.sll || 18), el: a => directional(a, o.v || o.h || 60, o.fb || 20, o.sll || 18) };
    }
  }

  // -3 dB hüzme genişliği (sayısal), tepe noktası 0°'de varsayılır; yönsüz ise null
  function beamwidth(fn) {
    let min = 0; for (let a = -180; a <= 180; a += 2) min = Math.min(min, fn(a));
    if (min > -3) return null;
    let peak = -999, pa = 0; for (let a = -180; a <= 180; a += 0.5) { const v = fn(a); if (v > peak) { peak = v; pa = a; } }
    let l = pa, r = pa;
    while (r < pa + 180 && fn(r) > peak - 3) r += 0.25;
    while (l > pa - 180 && fn(l) > peak - 3) l -= 0.25;
    return r - l;
  }

  // Kutupsal çizim (SVG). angle0: ekranda yukarı bakan yön (0 = ön yukarı); mode 'az' | 'el'
  function polarSvg(fn, opt) {
    opt = opt || {};
    const S = opt.size || 300, R = S / 2 - 26, cx = S / 2, cy = S / 2, floor = opt.floor || -30;
    const rOf = v => R * Math.max(0, (Math.max(v, floor) - floor) / -floor);
    // Ekran açısı: el düzleminde 0° sağ (ufuk), 90° yukarı; az düzleminde 0° yukarı (ön)
    const pt = (ang, v) => {
      const r = rOf(v);
      const t = opt.mode === 'el' ? -ang * D : (ang - 90) * D;
      return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
    };
    let g = '';
    for (const lv of [0, -3, -10, -20, -30].filter(x => x >= floor)) {
      const r = rOf(lv);
      g += `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" class="pg-ring${lv === -3 ? ' pg-ring3' : ''}"/>`;
      g += `<text x="${cx + 3}" y="${(cy - r + 11).toFixed(1)}" class="pg-lbl">${lv}</text>`;
    }
    for (let a = 0; a < 360; a += 30) {
      const [x, y] = pt(a, 0);
      g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="pg-spoke"/>`;
      const [tx, ty] = (() => { const r = R + 14; const t = opt.mode === 'el' ? -a * D : (a - 90) * D; return [cx + r * Math.cos(t), cy + r * Math.sin(t)]; })();
      const lab = opt.mode === 'el' ? (a > 180 ? a - 360 : a) : a;
      g += `<text x="${tx.toFixed(1)}" y="${(ty + 4).toFixed(1)}" text-anchor="middle" class="pg-deg">${lab}°</text>`;
    }
    let d = '';
    for (let a = -180; a <= 180; a += 1) { const [x, y] = pt(a, fn(a)); d += (a === -180 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1); }
    g += `<path d="${d}Z" class="pg-curve"/>`;
    return `<svg viewBox="0 0 ${S} ${S}" class="polar" role="img" aria-label="${opt.title || 'Işıma diyagramı'}">${g}</svg>`;
  }

  return { model, beamwidth, polarSvg, directional };
})();
