/* Comm Calc — ortak çekirdek kabuğu (src/cekirdek/fc-core.js, ortak-cekirdek 87f42f8).
   Burada: sağ üst sıra (Duyurular · Eşitle · Wi‑Fi · Güncelle · Tema · Dil | Küçült · Orta · Tam ekran · Kapat), menü simgeleri,
   "klasik" renk şeması (v1.11'in renkleri), dört dil köprüsü (çekirdek tr/en/ar; Arnavutça uygulamada kalır, çekirdek metinleri
   sq sözlüğüyle gösterilir), ayarlar düzeni (Admin ile iletişim EN SON, Hakkında ondan önce), Kullanım Limitleri, ilk açılış
   rehberi, "neler yeni" (NEWS'ten), açılışta yeni sürüm penceresi ve ESKİ KABUK KÖPRÜLERİ:

   - Eski masaüstü (taşınabilir exe, ccShell 1–2): eski main.js bu arayüzü imzalı guncelleme.zip'ten %APPDATA%\Comm Calc\guncelleme
     altına kurup açar. app-main.js bunu anlar (info.legacy) ve güncelleme kanalını 'win-setup' yapar → burada "Yeni kurulum gerekli"
     penceresi; "Kur" düğmesi kurulum programını indirir (yüzde/MB/hız), SHA-256 ile doğrular ve çalıştırır. Veriler aynı yerde kalır.
   - Eski Android APK (SHELL ≤ 2, updateBegin yok): güncelleme eski imzalı guncelleme.zip kanalından (window.api.checkUpdate /
     installUpdate) sürer; FC.updater yerine aynı arayüzü sunan küçük bir uyarlayıcı kullanılır. Yeni APK'da (updateBegin) çekirdek
     güncelleyicisi 'android' kanalını (yama → yeni APK) kullanır.
   app.js'ten ÖNCE yüklenir; App / Store / I18N / LanSync'e yalnız çağrı anında erişir. */
(function () {
  'use strict';
  var OWNER = 'departures-mil', REPO = 'comm-calc', APP = 'comm-calc', PREFIX = 'CommCalc';
  var REL = window.APP_RELEASE || { version: '0.0.0' };
  var VER = REL.version;
  var ui = FC.ui;
  var api0 = window.api || null;
  var ANDROID = !!(api0 && api0.platform === 'android');
  var ANDROID_LEGACY = !!(ANDROID && api0.legacyUpdate);
  var LEGACY = false;                     // eski masaüstü kabuğu (App.start'ta info.legacy'den)
  window.__ccErrors = [];
  window.addEventListener('error', function (e) { if (e && e.message) window.__ccErrors.push(String(e.message)); });

  /* ---------- menü simgeleri ---------- */
  Object.assign(ui.icons, {
    budget: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/><path d="m4 10 6-6 6 9 5-4"/>',
    tools: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    antenna: '<path d="M12 12v10"/><path d="M8 22h8"/><circle cx="12" cy="10" r="2"/><path d="M7.8 5.8a6 6 0 0 0 0 8.4"/><path d="M16.2 5.8a6 6 0 0 1 0 8.4"/><path d="M4.9 2.9a10 10 0 0 0 0 14.2"/><path d="M19.1 2.9a10 10 0 0 1 0 14.2"/>',
    library: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 7h7M9 11h5"/>',
    learn: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>'
  });
  var ICON = { budget: 'budget', tools: 'tools', tables: 'table', antennas: 'antenna', library: 'library', learn: 'learn', settings: 'settings' };

  /* ---------- "klasik" şema: v1.11 styles.css renkleri (koyu = eski varsayılan, açık = eski data-theme=light) ---------- */
  FC.look.registerScheme('klasik', {
    label: { tr: 'Klasik (eski görünüm)', en: 'Classic (previous look)', ar: 'الكلاسيكي (المظهر السابق)' },
    dark: {
      '--bg': '#0b121b', '--bg-grid': '#0000', '--panel': '#131f2d', '--panel-solid': '#131f2d', '--panel-hover': '#182637',
      '--border': '#233548', '--border-strong': '#2d4259', '--border-w': '1px', '--text': '#e3ecf5', '--muted': '#8ba1b8', '--label': '#a9bccf',
      '--nav-text': '#8ba1b8', '--nav-title': '#6f87a0', '--accent': '#2ec5d3', '--accent-2': '#1a8f9a', '--on-accent': '#ffffff',
      '--primary-1': '#1a8f9a', '--primary-2': '#167b85', '--active-1': '#2ec5d329', '--active-2': '#2ec5d30f', '--active-line': '#2ec5d347',
      '--accent-soft': '#2ec5d314', '--accent-line': '#2ec5d359', '--focus': '#2ec5d3', '--focus-w': '2px', '--focus-ring': '#2ec5d31f',
      '--danger': '#e5484d', '--warn': '#f0b429', '--ok': '#34c77b', '--ok-text': '#5fd99a', '--danger-text': '#ff7a7e', '--warn-text': '#f5c85a',
      '--ok-soft': '#34c77b1a', '--ok-line': '#34c77b59', '--danger-soft': '#e5484d1a', '--danger-line': '#e5484d59', '--warn-soft': '#f0b4291a', '--warn-line': '#f0b42959',
      '--sidebar-bg': '#101a26', '--topbar-bg': '#0b121b', '--modal-bg': '#131f2d', '--modal-border': '#2d4259', '--backdrop': '#0000008c',
      '--toast-bg': '#182637', '--toast-text': '#e3ecf5', '--toast-line': '#2d4259', '--toast-err-bg': '#3a1416', '--toast-err-text': '#ffd7d8', '--toast-err-line': '#e5484d',
      '--badge-text': '#8ba1b8', '--badge-bg': '#182637', '--badge-line': '#2d4259', '--on-badge': '#ffffff',
      '--bar-track': '#101a26', '--scroll-thumb': '#2d425980', '--glow-1': '#0000', '--glow-2': '#0000',
      '--shadow-pop': '0 6px 24px #00000059', '--shadow-modal': '0 20px 60px #0000008c', '--shadow-toast': '0 6px 24px #00000059'
    },
    light: {
      '--bg': '#eef2f6', '--bg-grid': '#0000', '--panel': '#ffffff', '--panel-solid': '#ffffff', '--panel-hover': '#f5f8fb',
      '--border': '#d5dee8', '--border-strong': '#c3cfdc', '--border-w': '1px', '--text': '#15202c', '--muted': '#5b6c7e', '--label': '#33465a',
      '--nav-text': '#5b6c7e', '--nav-title': '#6f8093', '--accent': '#0d8f9c', '--accent-2': '#0b7480', '--on-accent': '#ffffff',
      '--primary-1': '#0b7480', '--primary-2': '#0a6670', '--active-1': '#0d8f9c24', '--active-2': '#0d8f9c0d', '--active-line': '#0d8f9c47',
      '--accent-soft': '#0d8f9c14', '--accent-line': '#0d8f9c59', '--focus': '#0d8f9c', '--focus-w': '2px', '--focus-ring': '#0d8f9c1f',
      '--danger': '#c9353a', '--warn': '#b7791f', '--ok': '#18995a', '--ok-text': '#127a47', '--danger-text': '#b42a2f', '--warn-text': '#8a5a12',
      '--ok-soft': '#18995a14', '--ok-line': '#18995a59', '--danger-soft': '#c9353a12', '--danger-line': '#c9353a59', '--warn-soft': '#b7791f14', '--warn-line': '#b7791f59',
      '--sidebar-bg': '#e3e9ef', '--topbar-bg': '#eef2f6', '--modal-bg': '#ffffff', '--modal-border': '#c3cfdc', '--backdrop': '#15202c66',
      '--toast-bg': '#15202c', '--toast-text': '#ffffff', '--toast-line': '#15202c', '--toast-err-bg': '#c9353a', '--toast-err-text': '#ffffff', '--toast-err-line': '#c9353a',
      '--badge-text': '#33465a', '--badge-bg': '#e3e9ef', '--badge-line': '#c3cfdc', '--on-badge': '#ffffff',
      '--bar-track': '#e3e9ef', '--scroll-thumb': '#9fb0c280', '--glow-1': '#0000', '--glow-2': '#0000',
      '--shadow-pop': '0 4px 16px #14283c14', '--shadow-modal': '0 20px 60px #14283c33', '--shadow-toast': '0 4px 16px #14283c26'
    }
  });

  /* ---------- Arnavutça: çekirdek yalnız tr/en/ar bilir. Uygulama dili sq iken çekirdek 'en' kalır ve İngilizce sözlüğü
     yerine aşağıdaki sq metinleri konur (eksik anahtarda İngilizcesi görünür). ---------- */
  var SQ = {
    'fc.ok': 'Në rregull', 'fc.cancel': 'Anulo', 'fc.close': 'Mbyll', 'fc.save': 'Ruaj', 'fc.next': 'Para', 'fc.back': 'Prapa', 'fc.skip': 'Kapërce', 'fc.done': 'U krye', 'fc.retry': 'Provo përsëri', 'fc.error': 'Gabim', 'fc.open': 'Hap', 'fc.lang': 'Gjuha',
    'fc.sync': 'Sinkronizo', 'fc.sync.idle': 'U sinkronizua', 'fc.sync.syncing': 'Duke sinkronizuar…', 'fc.sync.off': 'Sinkronizimi në re është i fikur', 'fc.sync.offline': 'Pa internet — ndryshimet ruhen në këtë pajisje',
    'fc.lan': 'Wi-Fi', 'fc.lan.on': 'Sinkronizimi Wi-Fi është i ndezur (pajisjet në të njëjtin rrjet)', 'fc.lan.off': 'Sinkronizimi Wi-Fi është i fikur', 'fc.lan.busy': 'Duke sinkronizuar me Wi-Fi…',
    'fc.update': 'Përditëso', 'fc.update.check': 'Kontrollo për përditësime', 'fc.update.checking': 'Duke kontrolluar…', 'fc.update.none': 'Programi është i përditësuar (v{v})', 'fc.update.avail': 'Version i ri gati: v{v}', 'fc.update.press': 'Shtyp një herë për të përditësuar. Të dhënat ruhen.',
    'fc.update.downloading': 'Duke shkarkuar…', 'fc.update.verifying': 'Duke verifikuar…', 'fc.update.installing': 'Duke instaluar…', 'fc.update.restarting': 'Programi po rinis…', 'fc.update.done': 'Përditësimi u instalua', 'fc.update.failed': 'Përditësimi dështoi: {e}', 'fc.update.fallback': 'Arna nuk u zbatua; po shkarkohet versioni i plotë…', 'fc.update.browser': 'Doli një version i ri; po hapet faqja e shkarkimit.', 'fc.update.patchMode': 'vetëm pjesët e ndryshuara', 'fc.update.fullMode': 'paketa e plotë', 'fc.update.offline': 'Pa internet; do të provohet përsëri kur të lidheni.', 'fc.update.bad': 'Skedari i shkarkuar nuk u verifikua (SHA-256 nuk përputhet).',
    'fc.p.left': 'mbeten {x}', 'fc.p.speed': 'MB/s', 'fc.p.calc': 'duke matur shpejtësinë…', 'fc.p.done': 'U shkarkua',
    'fc.theme': 'Tema', 'fc.theme.dark': 'E errët', 'fc.theme.light': 'E çelët', 'fc.theme.auto': 'Automatike', 'fc.theme.toggle': 'Tema e errët / e çelët', 'fc.font': 'Madhësia e tekstit', 'fc.font.smaller': 'Tekst më i vogël', 'fc.font.larger': 'Tekst më i madh', 'fc.font.reset': 'E parazgjedhur', 'fc.look': 'Pamja', 'fc.look.desc': 'Tema, madhësia e tekstit dhe gjuha ruhen në këtë pajisje.',
    'fc.scheme': 'Skema e ngjyrave', 'fc.scheme.falcon': 'Falcon (e parazgjedhur)', 'fc.scheme.zumrut': 'Smerald', 'fc.scheme.gunbatimi': 'Perëndim dielli', 'fc.scheme.mor': 'Vjollcë', 'fc.scheme.okyanus': 'Oqean', 'fc.scheme.grafit': 'Grafit', 'fc.scheme.yuksek-kontrast': 'Kontrast i lartë', 'fc.mode': 'Mënyra',
    'fc.win.minimize': 'Minimizo', 'fc.win.half': 'Gjysmë madhësie', 'fc.win.restore': 'Kthehu në ekran të plotë', 'fc.win.fullscreen': 'Ekran i plotë', 'fc.win.close': 'Mbyll',
    'fc.contact.title': 'Kontakt me administratorin', 'fc.contact.desc': 'Dërgoni sugjerime, kërkesa dhe raporte gabimesh; mesazhi shkon drejt e te administratori.', 'fc.contact.type': 'Tema', 'fc.contact.oneri': 'Sugjerim / kërkesë', 'fc.contact.hata': 'Raport gabimi', 'fc.contact.reach': 'Email ose telefon (për përgjigje, opsionale)', 'fc.contact.msg': 'Mesazhi juaj', 'fc.contact.send': 'Dërgo', 'fc.contact.empty': 'Ju lutemi shkruani mesazhin.', 'fc.contact.sending': 'Duke dërguar…', 'fc.contact.ok': 'Mesazhi iu dorëzua administratorit. Faleminderit!', 'fc.contact.queued': 'Pa internet; mesazhi u ruajt dhe do të dërgohet vetë kur të lidheni.', 'fc.contact.waiting': 'Mesazhe në pritje: {n}', 'fc.contact.privacy': 'Me mesazhin dërgohen vetëm emri i programit, versioni, platforma dhe gjuha. Të dhënat tuaja nuk dërgohen kurrë.',
    'fc.crash.title': 'Raporte automatike gabimesh', 'fc.crash.desc': 'Nëse programi has një gabim të papritur, administratorit i dërgohen vetëm teksti i gabimit, versioni dhe platforma. Përmbajtja e të dhënave tuaja nuk dërgohet kurrë. Më së shumti 5 raporte në ditë.', 'fc.crash.on': 'Njofto administratorin automatikisht kur ndodh një gabim', 'fc.crash.sent': 'Raporte të dërguara sot nga kjo pajisje: {n}',
    'fc.usage.title': 'Kufijtë e përdorimit', 'fc.usage.desc': 'Këta numërues tregojnë përdorimin në llogaritë TUAJA të Firebase dhe AI. Kuota e administratorit nuk përdoret; çdo kosto ose kufi i përket llogarisë suaj.', 'fc.usage.ai': 'Thirrje AI — sot', 'fc.usage.calls': '{n} thirrje', 'fc.usage.noAi': 'Asnjë thirrje AI sot.', 'fc.usage.limits': 'Kufijtë në llogarinë time', 'fc.usage.reset': 'Kufijtë rivendosen pas {t} (mesnatë sipas orës së Paqësorit).', 'fc.usage.device': 'Ky është vetëm numri i sotëm i kësaj pajisjeje; pajisjet e tjera në të njëjtën llogari ndajnë të njëjtin kufi.',
    'fc.ai.gemini.note': 'Ka nivel falas; kufiri ditor i kërkesave varet nga modeli.',
    'fc.ob.title': 'Konfigurimi', 'fc.ob.step': 'Hapi {i} nga {n}', 'fc.ob.welcome': 'Mirë se vini', 'fc.ob.langDesc': 'Zgjidhni gjuhën e programit. Mund ta ndryshoni kurdo nga shiriti i sipërm.', 'fc.ob.lookTitle': 'Pamja', 'fc.ob.lookDesc': 'Rregulloni temën dhe madhësinë e tekstit sipas syve tuaj.',
    'fc.ob.aiTitle': 'Çelësi i AI (opsional)', 'fc.ob.aiDesc': 'Shtoni çelësin tuaj për veçoritë e AI. Çelësi ruhet vetëm në këtë pajisje dhe dërgohet vetëm te ofruesi që zgjidhni.', 'fc.ob.aiProvider': 'Ofruesi', 'fc.ob.aiKey': 'Çelësi API', 'fc.ob.aiGet': 'Merrni një çelës këtu', 'fc.ob.aiOk': 'Çelësi funksionon.', 'fc.ob.aiBad': 'Çelësi u refuzua; sigurohuni që e keni kopjuar saktë.', 'fc.ob.aiUnk': 'Çelësi nuk u kontrollua; u ruajt gjithsesi.', 'fc.ob.test': 'Provo lidhjen', 'fc.ob.testing': 'Duke provuar…',
    'fc.ob.doneTitle': 'Gati', 'fc.ob.doneDesc': 'Mund ta rihapni këtë udhëzues nga Cilësimet në çdo kohë.', 'fc.ob.start': 'Fillo', 'fc.ob.reopen': 'Hap udhëzuesin e konfigurimit', 'fc.ob.saved': 'U ruajt',
    'fc.wn.title': 'Çfarë ka të re në këtë version', 'fc.wn.ver': 'Versioni {v}', 'fc.wn.none': 'Ky version sjell përmirësime dhe rregullime gabimesh.', 'fc.wn.safe': 'Të dhënat tuaja u ruajtën ashtu siç ishin.', 'fc.wn.show': 'Shfaq shënimet e versionit',
    'fc.ann.title': 'Njoftime', 'fc.ann.none': 'Ende nuk ka njoftime.', 'fc.ann.link': 'Hap lidhjen', 'fc.ann.important': 'E rëndësishme', 'fc.ann.update': 'Përditëso tani',
    'fc.settings.about': 'Rreth programit', 'fc.settings.version': 'Versioni'
  };
  var EN0 = null;   // çekirdeğin özgün İngilizce metinleri (sq'den dönünce geri konur)
  function coreLang(l) { return l === 'sq' ? 'en' : l; }
  function applyCoreDict(appLang) {
    if (!EN0) { EN0 = {}; Object.keys(SQ).forEach(function (k) { EN0[k] = FC.t(k, null, 'en'); }); }
    FC.i18n.add({ en: appLang === 'sq' ? SQ : EN0 });
  }
  var appLang = null, langNow = null, switching = false, sqBtns = [];
  // Üst çubuk / Görünüm kartındaki çekirdek dil seçicilere "SQ / Shqip" eklenir
  function addSq(box, kind) {
    if (!box || box.querySelector('[data-lang="sq"]')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.dataset.lang = 'sq'; b.setAttribute('lang', 'sq');
    if (kind === 'switch') { b.className = 'lang-btn'; b.textContent = 'SQ'; b.title = 'Shqip'; }
    else { b.className = 'lang-option'; b.innerHTML = '<span>Shqip</span>'; }
    b.addEventListener('click', function () { if (window.App) App.setLang('sq'); });
    box.appendChild(b); sqBtns.push({ box: box, b: b, kind: kind });
    syncSq();
  }
  function syncSq() {
    sqBtns = sqBtns.filter(function (x) { return x.box.isConnected || !x.box.parentNode; });
    sqBtns.forEach(function (x) {
      if (!x.b.isConnected && x.box.isConnected) x.box.appendChild(x.b);   // langOptions() kendini yeniden çizince
      var sq = appLang === 'sq';
      x.b.classList.toggle('active', sq); x.b.setAttribute('aria-pressed', String(sq));
      if (x.kind !== 'switch') x.b.innerHTML = '<span>Shqip</span>' + (sq ? ui.icon('check') : '');
      if (sq) Array.prototype.forEach.call(x.box.children, function (c) { if (c !== x.b && (c.dataset.lang || c.getAttribute('lang')) === 'en') { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); var ic = c.querySelector('svg'); if (ic) ic.remove(); } });
    });
  }
  /** Uygulama dilini (tr/en/ar/sq) çekirdeğe yansıtır */
  function langChanged(l) {
    appLang = l;
    try { localStorage.setItem('cc-lang', l); } catch (e) { }
    applyCoreDict(l);
    var c = coreLang(l), prev = langNow;
    langNow = l;
    if (FC.i18n.lang() !== c) FC.i18n.set(c);
    else if (prev && prev !== l) {   // en ↔ sq: çekirdek dili aynı kalır, sözlük değişti → çekirdek bileşenleri yeniden çizilsin
      switching = true;
      try { FC.i18n.set(c === 'tr' ? 'en' : 'tr'); FC.i18n.set(c); } finally { switching = false; }
    }
    document.documentElement.lang = l === 'sq' ? 'sq' : c;
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
    if (tb) tb.redraw();
    setTimeout(syncSq, 0);
  }
  /** Çekirdek dil düğmesine basıldı (tr/en/ar) → uygulama */
  FC.i18n.onChange(function (l) {
    if (switching) return;
    if (appLang && coreLang(appLang) === l) { setTimeout(syncSq, 0); return; }
    if (window.App && Store && Store.data) App.setLang(l);
  });
  /** Açılış dili: uygulama kaydı (Store.settings.lang, sq dahil) esas alınır */
  function initialLang(storeLang) {
    var l = storeLang || 'tr';
    if (!FC.storage.get('lang', null) && !storeLang) l = FC.i18n.lang();
    return l;
  }

  /* ---------- güncelleme ---------- */
  var OB = { firebase: false, onAi: function (v) { if (v && v.provider === 'gemini' && v.key) { Store.data.settings.geminiKey = v.key; Store.save(); } } };
  // Uygulama yalnızca Gemini kullanır (kendi anahtarı ya da kendi Firebase AI Logic projesi): sihirbazda başka sağlayıcı gösterilmez
  Object.keys(FC.onboarding.AI).forEach(function (k) { if (k !== 'gemini') delete FC.onboarding.AI[k]; });

  // Eski Android APK için FC.updater uyarlayıcısı (imzalı guncelleme.zip, Java tarafı indirir + ECDSA imzasını doğrular)
  function legacyAndroidUpdater() {
    var subs = [], st = { status: 'idle', current: VER, plan: null, progress: null, mode: 'full', error: null };
    function set(p) { for (var k in p) st[k] = p[k]; var s = Object.assign({}, st); subs.slice().forEach(function (f) { try { f(s); } catch (e) { } }); }
    var core = FC.updater;
    var a = {
      start: function () { return a; }, state: function () { return Object.assign({}, st); },
      subscribe: function (f) { subs.push(f); try { f(Object.assign({}, st)); } catch (e) { } return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
      errorText: core.errorText, cmp: core.cmp, parse: core.parse, plan: core.plan,
      check: async function (o) {
        o = o || {};
        if (!o.silent) set({ status: 'checking', error: null });
        try {
          var r = await api0.checkUpdate();
          if (!r || !r.ok) throw new Error((r && r.error) || 'ERR');
          if (r.available && !r.needsFull) { set({ status: 'available', plan: { version: r.version, notes: { tr: r.notes, en: r.notes, ar: r.notes }, mode: 'full', size: 0, legacy: true }, current: r.current }); return st.plan; }
          if (r.available && r.needsFull) { set({ status: 'available', plan: { version: r.version, notes: {}, mode: 'full', size: 0, legacy: true, apkUrl: r.exeUrl || r.pageUrl }, current: r.current }); return st.plan; }
          set({ status: 'none', plan: null, current: r.current }); return null;
        } catch (e) { set({ status: o.silent ? 'idle' : 'error', error: e.message || 'ERR' }); return null; }
      },
      run: async function () {
        var p = st.plan || (await a.check()); if (!p) return;
        if (p.apkUrl) { ui.openUrl(p.apkUrl); return 'browser'; }
        set({ status: 'installing', error: null });
        var r = await api0.installUpdate();
        if (r && r.ok) { set({ status: 'restarting' }); FC.storage.set('whatsnew.pending', { version: r.version, notes: {} }); try { await Store.flush(); } catch (e) { } setTimeout(function () { api0.restart(); }, 900); return 'full'; }
        set({ status: 'error', error: (r && r.error) || 'ERR' }); throw new Error(st.error);
      }
    };
    return a;
  }

  var shownFor = null;
  // Owner kuralı: açılışta yeni sürüm varsa ekranda bildirim penceresi (aralıklı denetim yok)
  function availableDialog(p) {
    if (!p || shownFor === p.version || LEGACY) return;
    if (document.querySelector('.modal-backdrop')) return setTimeout(function () { availableDialog(p); }, 800);
    shownFor = p.version;
    var body = ui.el('div');
    body.appendChild(ui.el('p', { text: FC.t('fc.update.avail', { v: p.version }) + ' · ' + t('Kullandığınız sürüm: v{c}', { c: VER }) }));
    var notes = window.News && News.notes(p.version);
    var txt = notes ? (notes[appLang] || notes.en) : FC.i18n.pick(p.notes);
    if (txt) body.appendChild(ui.el('pre.notes', { text: txt, dir: 'auto' }));
    if (p.size) body.appendChild(ui.el('p.muted.small', { text: FC.progress.mb(p.size) + (p.mode === 'patch' ? ' · ' + FC.t('fc.update.patchMode') : '') }));
    ui.modal({ title: FC.t('fc.update.avail', { v: p.version }), icon: 'download', body: body, buttons: [
      { label: t('Sonra'), cls: 'ghost' }, 'spacer',
      { label: FC.t('fc.update'), icon: 'download', cls: 'primary', onClick: function () { FC.updater.run().catch(function () { }); } }
    ] });
  }
  function startUpdater() {
    var s = Store.data.settings;
    var auto = s.autoUpdate !== false;
    // intervalHours 500 ≈ 3 hafta: pratikte yalnız açılışta denetlenir (Milen aralıklı denetim istemedi; setInterval sınırı 24,8 gün)
    var base = { repo: REPO, app: APP, version: VER, autoCheck: auto, intervalHours: 500, firstDelayMs: 2500 };
    if (ANDROID_LEGACY) { FC.updater = legacyAndroidUpdater(); if (auto) setTimeout(function () { FC.updater.check({ silent: true }); }, 2500); }
    else if (LEGACY) FC.updater.start({ repo: REPO, app: APP, version: '0.0.0', channel: 'win-setup', autoCheck: false });
    else if (ANDROID) FC.updater.start(Object.assign(base, { channel: 'android' }));
    else FC.updater.start(Object.assign(base, { setupChannel: 'win-setup' }));
    FC.updater.subscribe(function (st) { if (window.App) App.setUpdateBadge(st.status === 'available'); if (st.status === 'available' && st.plan && !userCheck) availableDialog(st.plan); });
  }
  var userCheck = false;
  function checkNow(fromUser) {
    if (LEGACY) { bridge(); return; }
    userCheck = !!fromUser;
    FC.updater.check().then(function (p) {
      userCheck = false;
      if (p) availableDialog(p);
      else ui.toast(FC.updater.state().error ? FC.updater.errorText(FC.updater.state().error) : FC.t('fc.update.none', { v: VER }), FC.updater.state().error ? 'error' : '');
    });
  }

  /* ---------- üst çubuk ---------- */
  var tb = null;
  function topbar() {
    var bar = document.getElementById('topbar'); if (!bar || tb) return;
    var mb = document.getElementById('menuBtn');
    if (mb) { mb.innerHTML = ui.icon('menu'); mb.onclick = function () { document.getElementById('appShell').classList.add('drawer-open'); }; }
    var back = document.getElementById('drawerBack'); if (back) back.onclick = closeDrawer;
    // Eski APK'da Kapat → arka plana al (eski köprüde moveTaskToBack yok, exit var)
    if (ANDROID && !FC.host.can.close && api0.minimize) { FC.host.can.close = true; FC.host.window.close = function () { return api0.minimize(); }; }
    tb = FC.topbar.mount(bar, { before: [FC.announcements.button()], sync: { state: 'off', onClick: syncMenu }, lan: { state: 'off', onClick: function () { LanSync.dialog(); } } });
    tb.el.setAttribute('data-notr', '');
    addSq(tb.el.querySelector('.lang-switch'), 'switch');
  }
  function setLan(s) { if (tb) tb.setLan(s); }
  function closeDrawer() { var s = document.getElementById('appShell'); if (s) s.classList.remove('drawer-open'); }
  // "Eşitle": Comm Calc bir hesaplama aracıdır; bulut (Firebase) veri eşitlemesi yoktur. Wi‑Fi eşitleme ve yedek buradan açılır.
  function syncMenu() {
    var m;
    var body = ui.el('div');
    body.appendChild(ui.el('p.muted', { text: t('Comm Calc bulut eşitlemesi kullanmaz; projeler ve kütüphane bu cihazda saklanır. Başka bir cihazla aynı Wi‑Fi üzerinden internetsiz eşitleyebilir ya da yedek alabilirsiniz.') }));
    body.appendChild(ui.el('div.fc-row', null, [
      ui.el('button.btn.primary', { type: 'button', html: ui.icon('wifi') + ui.esc(t('Wi‑Fi ile eşitle (internetsiz)')), onclick: function () { m.close(); LanSync.dialog(); } }),
      ui.el('button.btn', { type: 'button', html: ui.icon('save') + ui.esc(t('Tüm verileri yedekle')), onclick: function () { m.close(); downloadText('comm-calc-yedek-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(Object.assign({ commcalcBackup: 1 }, Store.data), null, 1)); } }),
      ui.el('button.btn', { type: 'button', html: ui.icon('archive') + ui.esc(t('Arşiv ve çakışma yedekleri')), onclick: function () { m.close(); LanSync.archiveDialog(); } })
    ]));
    m = ui.modal({ title: t('Eşitle'), icon: 'sync', cls: 'small', body: body, buttons: [{ label: t('Kapat'), cls: 'primary' }] });
  }

  /* ---------- ayarlar ---------- */
  function buildSettings(el, appCards) {
    var g = FC.settings.build(el, { cards: appCards, usage: { firebase: false, ai: true, providers: ['gemini'] }, about: { version: VER }, onboarding: OB });
    Array.prototype.forEach.call(g.el.children, function (c) { if (c.hasAttribute('data-fc-card')) c.setAttribute('data-notr', ''); });
    var look = g.el.querySelector('[data-fc-card="look"] .lang-options'); addSq(look, 'options');
    return g.el;
  }

  /* ---------- başlangıç ---------- */
  function init(info) {
    LEGACY = !!(info && info.legacy);
    var s = Store.data.settings;
    // v1.11'den geçiş: tema, "neler yeni" ve ilk açılış rehberi
    try {
      if (FC.storage.get('theme', null) == null && s.theme) FC.storage.set('theme', s.theme === 'light' ? 'light' : 'dark');
      if (FC.storage.get('whatsnew.seen', null) == null && s.seenVersion) FC.storage.set('whatsnew.seen', News.norm(s.seenVersion));
      if (FC.storage.get('onboarding.done', null) == null && (s.seenVersion || s.geminiKey || s.firebase)) FC.storage.set('onboarding.done', true);
      if (s.geminiKey && !FC.storage.get('ai', null)) FC.storage.set('ai', { provider: 'gemini', key: s.geminiKey });
    } catch (e) { }
    FC.init({ app: APP, repo: REPO, version: VER, update: false, whatsnew: false, onboarding: false, announcements: true });
    startUpdater();
    if (LEGACY || ANDROID_LEGACY) document.documentElement.classList.add('cc-legacy-shell');
  }
  function notes(v) {
    var n = window.News && News.notes(v); if (!n) return null;
    return { tr: n.tr, en: appLang === 'sq' ? n.sq || n.en : n.en, ar: n.ar };
  }
  function started() {
    if (LEGACY) { setTimeout(bridge, 900); return; }
    var wn = FC.whatsnew.start({ version: VER, notes: notes });
    if (!wn) setTimeout(function () { FC.onboarding.maybeStart(OB); }, 700);
  }

  /* ---------- eski masaüstü kabuğu köprüsü ---------- */
  function setupUrl() { return 'https://github.com/' + OWNER + '/' + REPO + '/releases/download/v' + VER + '/' + PREFIX + '-' + VER + '-win-setup.exe'; }
  function bridge() {
    if (document.querySelector('.cc-bridge')) return;
    var body = ui.el('div.cc-bridge');
    body.appendChild(ui.el('p', { text: t('Comm Calc {v} yeni bir kurulum programıyla gelir: tam ekran açılış, tek tuşla güncelleme (yalnızca değişen kısımlar indirilir) ve yeni görünüm. Bu sürümü bir kez kurun; sonraki güncellemeler kendiliğinden gelir.', { v: VER }) }));
    body.appendChild(ui.el('div.notice.ok', null, [ui.el('span', { html: ui.icon('check') }), ui.el('span', { text: t('Verileriniz korunur: projeler, kütüphane ve ayarlar aynı yerde kalır, yeni sürüm onları kendiliğinden açar.') })]));
    body.appendChild(ui.el('p.muted', { text: t('"Kur" düğmesi kurulum dosyasını indirir, doğrular ve açar; kurulum birkaç saniye sürer ve masaüstüne kısayol ekler. Sonra yeni kısayolu kullanın; bu eski taşınabilir dosyayı silebilirsiniz.'), style: 'margin-top:12px' }));
    ui.modal({ title: t('Yeni kurulum gerekli'), icon: 'download', body: body, buttons: [
      { label: t('Daha sonra'), cls: 'ghost' }, 'spacer',
      { label: t('Sürümler sayfası'), onClick: function () { ui.openUrl('https://github.com/' + OWNER + '/' + REPO + '/releases/latest'); return false; } },
      { label: t('Kur'), icon: 'download', cls: 'primary', onClick: function () { Store.flush().catch(function () { }); FC.updater.run().catch(function () { ui.openUrl(setupUrl()); }); } }
    ] });
  }

  window.Kabuk = { init: init, topbar: topbar, setLan: setLan, closeDrawer: closeDrawer, langChanged: langChanged, initialLang: initialLang, buildSettings: buildSettings, started: started, checkNow: checkNow, bridge: bridge, setupUrl: setupUrl, notes: notes, icon: function (v) { return ui.icon(ICON[v] || 'box'); }, get legacy() { return LEGACY; }, androidLegacy: ANDROID_LEGACY, SQ: SQ };
})();
