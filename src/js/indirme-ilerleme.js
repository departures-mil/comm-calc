/* İndirme ilerlemesi — ortak modül (tüm uygulamalar).
   Yüzde + inen/toplam MB + kalan MB + hız. Türkçe / English / العربية.

   Kullanım:
     const buf = await IndirmeIlerleme.indir(url, {
       toplam: 1234567,               // biliniyorsa (Content-Length yoksa)
       ilerleme: p => el.textContent = IndirmeIlerleme.yazi(p)
     });                              // → Uint8Array
     IndirmeIlerleme.metin(buf) / IndirmeIlerleme.json(buf)
   p = { inen, toplam, yuzde, hiz (bayt/sn), kalan, bitti }  */
(function (g) {
  'use strict';

  var S = {
    tr: { mb: 'MB', kb: 'KB', sn: '/sn', kalan: 'kalan', indiriliyor: 'İndiriliyor', bitti: 'İndirildi', hesap: 'hesaplanıyor…' },
    en: { mb: 'MB', kb: 'KB', sn: '/s', kalan: 'left', indiriliyor: 'Downloading', bitti: 'Downloaded', hesap: 'calculating…' },
    ar: { mb: 'م.ب', kb: 'ك.ب', sn: '/ث', kalan: 'متبقٍ', indiriliyor: 'جارٍ التنزيل', bitti: 'تم التنزيل', hesap: 'جارٍ الحساب…' }
  };

  function dil(d) {
    d = d || g.IndirmeDili ||
        (g.document && g.document.documentElement && g.document.documentElement.lang) || 'tr';
    d = String(d).slice(0, 2).toLowerCase();
    return S[d] ? d : 'tr';
  }

  function sayi(n, d, ondalik) {
    var yer = d === 'ar' ? 'ar' : d === 'en' ? 'en-US' : 'tr-TR';
    try { return n.toLocaleString(yer, { minimumFractionDigits: ondalik, maximumFractionDigits: ondalik }); }
    catch (e) { return n.toFixed(ondalik); }
  }

  function mb(b, d) { return sayi(b / 1048576, d, b >= 104857600 ? 0 : 1) + ' ' + S[d].mb; }

  function hizYazi(bps, d) {
    if (!bps || !isFinite(bps)) return S[d].hesap;
    if (bps >= 1048576) return sayi(bps / 1048576, d, 1) + ' ' + S[d].mb + S[d].sn;
    return sayi(Math.max(1, Math.round(bps / 1024)), d, 0) + ' ' + S[d].kb + S[d].sn;
  }

  /* "%42 · 1,2 MB / 3,0 MB · 1,8 MB kalan · 450 KB/sn" */
  function yazi(p, d) {
    d = dil(d);
    var s = S[d];
    if (p.bitti) return s.bitti + (p.toplam ? ' · ' + mb(p.toplam, d) : '');
    var parca = [];
    if (p.toplam) {
      parca.push('%' + Math.floor(p.yuzde));
      parca.push(mb(p.inen, d) + ' / ' + mb(p.toplam, d));
      parca.push(d === 'tr' ? mb(p.kalan, d) + ' ' + s.kalan : s.kalan + ' ' + mb(p.kalan, d));
    } else {
      parca.push(s.indiriliyor + ' ' + mb(p.inen, d));
    }
    parca.push(hizYazi(p.hiz, d));
    return parca.join(' · ');
  }

  async function indir(url, o) {
    o = o || {};
    var cevap = await fetch(url, o.fetch || { cache: 'no-store' });
    if (!cevap.ok) throw new Error('HTTP ' + cevap.status);
    /* gzip'li yanıtta Content-Length sıkışık boyuttur; çağıran gerçek boyutu bilirse onu kullan */
    var basliktan = +cevap.headers.get('content-length') || 0;
    var sikisik = /gzip|br|deflate/i.test(cevap.headers.get('content-encoding') || '');
    var toplam = o.toplam || (sikisik ? 0 : basliktan);
    var bildir = typeof o.ilerleme === 'function' ? o.ilerleme : function () {};

    var parcalar = [], inen = 0, bas = Date.now(), sonBildirim = 0;
    var ornekler = [{ t: bas, b: 0 }];

    function durum(bitti) {
      var simdi = Date.now();
      ornekler.push({ t: simdi, b: inen });
      while (ornekler.length > 2 && simdi - ornekler[0].t > 3000) ornekler.shift();   // son ~3 sn
      var ilk = ornekler[0], sure = (simdi - ilk.t) / 1000;
      var hiz = sure > 0.25 ? (inen - ilk.b) / sure : 0;
      var t = toplam && inen <= toplam ? toplam : 0;
      return { inen: inen, toplam: t, yuzde: t ? inen / t * 100 : 0,
               kalan: t ? t - inen : 0, hiz: hiz, bitti: !!bitti };
    }

    if (!cevap.body || !cevap.body.getReader) {
      var hepsi = new Uint8Array(await cevap.arrayBuffer());
      inen = hepsi.length; toplam = toplam || inen;
      bildir(durum(true));
      return hepsi;
    }

    var okuyucu = cevap.body.getReader();
    bildir(durum(false));
    for (;;) {
      var r = await okuyucu.read();
      if (r.done) break;
      parcalar.push(r.value);
      inen += r.value.length;
      var simdi = Date.now();
      if (simdi - sonBildirim > 200) { sonBildirim = simdi; bildir(durum(false)); }
    }
    var sonuc = new Uint8Array(inen), k = 0;
    for (var i = 0; i < parcalar.length; i++) { sonuc.set(parcalar[i], k); k += parcalar[i].length; }
    if (!toplam) toplam = inen;
    bildir(durum(true));
    return sonuc;
  }

  function metin(buf) { return new TextDecoder('utf-8').decode(buf); }
  function json(buf) { return JSON.parse(metin(buf)); }

  g.IndirmeIlerleme = { indir: indir, yazi: yazi, metin: metin, json: json, mb: function (b, d) { return mb(b, dil(d)); } };
  if (typeof module !== 'undefined' && module.exports) module.exports = g.IndirmeIlerleme;
})(typeof window !== 'undefined' ? window : globalThis);
