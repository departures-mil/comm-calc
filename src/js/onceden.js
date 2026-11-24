// Görünümü ilk boyamadan önce uygular (yanıp sönmesin): ortak çekirdeğin kayıtlı şema / tema / dil seçimi.
// CSP satır içi betiğe izin vermediği için ayrı dosyadadır. Arnavutça (sq) çekirdekte yok; uygulama dili ayrıca tutulur.
(function () {
  try {
    var g = function (k) { try { return JSON.parse(localStorage.getItem('fc.' + k)); } catch (e) { return null; } };
    var d = document.documentElement, th = g('theme'), sc = g('scheme'), l = localStorage.getItem('cc-lang') || g('lang');
    if (sc) d.setAttribute('data-scheme', sc);
    if (th === 'light' || (th === 'auto' && matchMedia('(prefers-color-scheme: light)').matches)) d.classList.add('theme-light');
    if (l) { d.lang = l; d.dir = l === 'ar' ? 'rtl' : 'ltr'; }
    var fs = g('fontScale'); if (fs) d.style.setProperty('--font-scale', fs);
  } catch (e) { }
})();
