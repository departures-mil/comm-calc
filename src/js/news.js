// Sürüm yenilikleri: güncellemeden sonraki ilk açılışta ekranda gösterilir.
// Her yeni sürümde en üste bir kayıt eklenir (tr, en, ar, sq; her biri madde listesi).
const NEWS = [
  { v: '1.6', tr: ['Her güncellemede ekrana bildirim gelir: yeni sürüm çıkınca program açılışta haber verir, tek tıkla güncellenir.', 'Güncellemeden sonra bu "Yenilikler" penceresi gösterilir.'],
    en: ['A notification appears on screen for every update: when a new version is out, the program tells you at startup and updates with one click.', 'After an update, this "What\'s new" window is shown.'],
    ar: ['يظهر إشعار على الشاشة مع كل تحديث: عند صدور إصدار جديد يُعلمك البرنامج عند التشغيل ويُحدَّث بنقرة واحدة.', 'بعد التحديث تظهر نافذة «ما الجديد» هذه.'],
    sq: ['Për çdo përditësim shfaqet një njoftim në ekran: kur del një version i ri, programi ju njofton në nisje dhe përditësohet me një klikim.', 'Pas përditësimit shfaqet kjo dritare "Çfarë ka të re".'] },
  { v: '1.5', tr: ['Arnavutça (Shqip) dil seçeneği eklendi.'], en: ['Albanian (Shqip) language option added.'], ar: ['أُضيف خيار اللغة الألبانية (Shqip).'], sq: ['U shtua gjuha shqipe.'] },
  { v: '1.4', tr: ['Android uygulaması (APK).', 'Ayarlar → Yöneticiye mesaj gönder.'], en: ['Android app (APK).', 'Settings → Send a message to the admin.'], ar: ['تطبيق أندرويد (APK).', 'الإعدادات ← إرسال رسالة إلى المسؤول.'], sq: ['Aplikacioni Android (APK).', 'Cilësimet → Dërgo mesazh administratorit.'] },
  { v: '1.3', tr: ['Türkçe, English ve العربية dil seçenekleri.'], en: ['Turkish, English and Arabic language options.'], ar: ['خيارات اللغة التركية والإنجليزية والعربية.'], sq: ['Gjuhët turqisht, anglisht dhe arabisht.'] }
];
const News = (() => {
  const num = v => { const p = String(v).split('.'); return (+p[0] || 0) * 1000 + (+p[1] || 0); };
  const items = n => n[I18N.lang] || n.en || n.tr;
  // Güncellemeden sonraki ilk açılışta yenilikleri göster
  function afterUpdate() {
    const s = Store.data.settings, seen = s.seenVersion;
    if (seen === App.short) return;
    s.seenVersion = App.short; Store.save();
    // seen yoksa (v1.5 ve öncesinden gelen ya da ilk kurulum) yalnızca bu sürümün yenilikleri gösterilir
    const from = seen ? num(seen) : num(App.short) - 1;
    const list = NEWS.filter(n => num(n.v) > from && num(n.v) <= num(App.short));
    if (!list.length) return;
    const body = list.map(n => `<h4>v${n.v}</h4><ul>${items(n).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('');
    modal(t('Program güncellendi: v{v}', { v: App.short }), `<p class="muted">${t('Yenilikler')}</p><div class="news" data-notr>${body}</div>`, [{ label: t('Tamam'), cls: 'primary' }]);
  }
  // Yeni sürüm çıkınca ekranda bildirim
  function clean(notes) {
    return String(notes || '').split('\n').filter(l => !/^\s*##|^\s*\*\*(Güncelleme|Android)/.test(l)).join('\n').replace(/\*\*/g, '').trim();
  }
  function available(r) {
    if (document.querySelector('.modal-wrap[data-upd]')) return;
    // Başka bir pencere (ör. yenilikler) açıksa kapanınca göster
    if (document.querySelector('.modal-wrap')) return setTimeout(() => available(r), 600);
    const v = Updater.short(r.version), notes = clean(r.notes);
    const btns = [{ label: t('Sonra') }];
    if (r.web) btns.push({ label: t('Sürüm sayfasını aç'), cls: 'primary', onClick: () => openUrl(r.pageUrl) });
    else if (r.needsFull) btns.push({ label: t('Yeni programı indir'), cls: 'primary', onClick: () => openUrl(r.exeUrl || r.pageUrl) });
    else btns.push({ label: t('Şimdi güncelle'), cls: 'primary', onClick: async (close, w) => {
      $$('.modal-f .btn', w).forEach(b => b.disabled = true);
      $('.upd-st', w).textContent = t('İndiriliyor ve doğrulanıyor…');
      const x = await Updater.install();
      if (!x.ok) { $$('.modal-f .btn', w).forEach(b => b.disabled = false); $('.upd-st', w).textContent = t('Hata:') + ' ' + (x.error || ''); }
      return false;
    } });
    const m = modal(t('Yeni sürüm hazır: v{v}', { v }), `<p>${t('Kullandığınız sürüm: v{c}', { c: App.short })}</p>${notes ? `<pre class="notes">${esc(notes)}</pre>` : ''}<p class="muted small upd-st"></p>`, btns);
    m.el.setAttribute('data-upd', '');
  }
  return { afterUpdate, available };
})();
