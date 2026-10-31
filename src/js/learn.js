// Eğitim: adım adım RF ve link bütçesi dersleri (Türkçe).
Views.learn = (() => {
  const F = s => `<div class="formula">${s}</div>`;
  const LESSONS = [
    { t: '1. Desibel (dB) mantığı', b: `
      <p>Radyo dünyasında güçler milyarlarca kat farklı olabilir (verici 1 W, alıcıya ulaşan 0,000000000001 W). Bu yüzden çarpma/bölme yerine <b>logaritmik</b> ölçek kullanılır: desibel.</p>
      ${F('dB = 10 · log₁₀(P₂ / P₁)')}
      <ul><li><b>+3 dB</b> ≈ gücün 2 katı, <b>−3 dB</b> ≈ yarısı</li><li><b>+10 dB</b> = 10 kat, <b>+20 dB</b> = 100 kat, <b>+30 dB</b> = 1000 kat</li><li>Kazanç ve kayıplar <b>toplanıp çıkarılır</b>: 20 dB kazanç − 3 dB kablo = 17 dB.</li></ul>
      <div class="mini" data-mini="db"><label>dB: <input type="range" min="-30" max="30" step="1" value="3"> <b></b></label><div class="out"></div></div>` },
    { t: '2. dBm, dBW, dBi, dBd, dBc', b: `
      <table class="tbl small"><tr><th>Birim</th><th>Referans</th><th>Örnek</th></tr>
      <tr><td>dBm</td><td>1 mW</td><td>0 dBm = 1 mW, 30 dBm = 1 W, −90 dBm = 1 pW</td></tr>
      <tr><td>dBW</td><td>1 W</td><td>0 dBW = 30 dBm</td></tr>
      <tr><td>dBi</td><td>İzotropik anten</td><td>Dipol = 2,15 dBi</td></tr>
      <tr><td>dBd</td><td>Yarım dalga dipol</td><td>0 dBd = 2,15 dBi</td></tr>
      <tr><td>dBc</td><td>Taşıyıcı sinyal</td><td>Harmonik −40 dBc</td></tr></table>
      <p>Alıcı hassasiyeti (sensitivity) dBm ile verilir ve <b>negatiftir</b>: −90 dBm, −115 dBm\'den <b>daha az</b> hassastır. NB20 (−115 dBm) alıcısı, FS5808M\'ye (−90 dBm) göre 25 dB (≈316 kat) daha zayıf sinyali çözebilir.</p>` },
    { t: '3. Link bütçesi nedir?', b: `
      <p>Vericiden çıkan gücün alıcıya ulaşana kadar kazandığı ve kaybettiği her şeyin dB cinsinden toplamıdır. Sonuç alıcı hassasiyetiyle karşılaştırılır.</p>
      ${F('P<sub>rx</sub> = P<sub>tx</sub> − L<sub>kablo,tx</sub> + G<sub>tx</sub> − L<sub>yol</sub> − L<sub>diğer</sub> + G<sub>rx</sub> − L<sub>kablo,rx</sub>')}
      ${F('Link payı = P<sub>rx</sub> − Hassasiyet')}
      <p><b>Örnek:</b> 600 mW (27,8 dBm) 5,8 GHz VTX, 2 dBi anten → 5 km → 17 dBi Maple panel → FS5808M (−90 dBm).<br>
      FSPL(5 km, 5800 MHz) = 121,7 dB. P<sub>rx</sub> ≈ 27,8 − 0,5 + 2 − 121,7 + 17 − 0,6 = <b>−76 dBm</b>. Pay = −76 − (−90) = <b>14 dB</b> → "Çok iyi".</p>
      <p>Link Bütçesi sekmesi tam olarak bunu yapar; her kalemi açıp kapatarak etkisini görebilirsiniz.</p>` },
    { t: '4. Serbest uzay yol kaybı (FSPL)', b: `
      <p>Enerji küre yüzeyine yayıldığı için mesafeyle azalır. Ayrıca alıcı antenin "yakaladığı alan" dalga boyuyla küçüldüğünden yüksek frekansta kayıp artar.</p>
      ${F('FSPL (dB) = 20·log₁₀(d km) + 20·log₁₀(f MHz) + 32,44')}
      <ul><li>Mesafe <b>2 katına</b> çıkınca kayıp <b>+6 dB</b>; 10 katına çıkınca +20 dB.</li><li>Frekans 2,4 → 5,8 GHz olunca kayıp ≈ <b>+7,7 dB</b>.</li><li>Menzili 2 katına çıkarmak için 6 dB gerekir: gücü 4 kat artırmak veya her iki antene 3\'er dB kazanç eklemek.</li></ul>` },
    { t: '5. Görüş hattı ve Fresnel bölgesi', b: `
      <p>Sinyal, iki anten arasındaki düz çizgiden değil, etrafındaki elips şeklindeki bir hacimden taşınır: <b>1. Fresnel bölgesi</b>. Bu bölgenin en az <b>%60</b>\'ı engelsiz olmalıdır; aksi halde yerden yansıma ve kırınım ek kayıp getirir.</p>
      ${F('r₁ = 17,32 · √(d₁·d₂ / (f·D))   [r m, d km, f GHz]')}
      <p>Orta noktada: 5 km, 5,8 GHz → r₁ ≈ 8 m. Yani 2 m yükseklikteki yer anteni ile alçak uçan İHA arasında hat "görünse" bile Fresnel bölgesi yere değer. Çözüm: yer antenini yükseltmek (direk, tepe).</p>` },
    { t: '6. Radyo ufku ve Dünya eğriliği', b: `
      ${F('d (km) ≈ 4,12 · (√h₁ + √h₂)   [h metre]')}
      <p>İHA 120 m, yer anteni 2 m ise radyo ufku ≈ 51 km. Bunun ötesinde Dünya\'nın kendisi engeldir; güç ne olursa olsun bağlantı kopar. Uzun menzilde irtifa, güçten daha etkilidir.</p>` },
    { t: '7. VSWR, yansıma ve geri dönüş kaybı', b: `
      <p>Anten, kablo ve verici empedansları (50 Ω) tam uyumlu değilse gücün bir kısmı geri yansır. VSWR bunu ölçer.</p>
      ${F('Γ = (VSWR − 1)/(VSWR + 1) · RL = −20·log₁₀ Γ · Uyumsuzluk kaybı = −10·log₁₀(1 − Γ²)')}
      <ul><li>VSWR 1,5 → yansıyan %4, kayıp 0,18 dB (iyi)</li><li>VSWR 2,0 → yansıyan %11, kayıp 0,51 dB (kabul edilebilir)</li><li>VSWR 3,0 → yansıyan %25, kayıp 1,25 dB (kötü; verici ısınır)</li></ul>
      <p>Anten olmadan verici çalıştırmak VSWR\'ı sonsuz yapar ve VTX\'i yakabilir.</p>` },
    { t: '8. Kablo ve konnektör kayıpları', b: `
      <p>Koaksiyel kablo kaybı frekansla yaklaşık √f oranında artar. 5,8 GHz\'te 1 m RG174 ≈ 2,7 dB yani gücün <b>yarısından fazlası</b> kaybolur.</p>
      <ul><li>Hava aracında kabloyu olabildiğince kısa tutun; anten doğrudan VTX\'e takılabiliyorsa takın.</li><li>Yer istasyonunda uzun kablo gerekiyorsa LMR-400 gibi kalın kablo veya alıcıyı antenin yanına taşıyın.</li><li>Her konnektör/adaptör ≈ 0,1–0,4 dB. SMA ile RP-SMA\'yı karıştırmayın (merkez pin yoksa bağlantı yoktur!).</li></ul>` },
    { t: '9. Polarizasyon', b: `
      <p>Elektrik alanın titreşim yönüdür. Lineer (dikey V / yatay H) veya dairesel (RHCP sağ el / LHCP sol el) olabilir.</p>
      <ul><li>V ↔ H: teoride sonsuz, pratikte ≈20 dB kayıp.</li><li>Lineer ↔ dairesel: her zaman 3 dB.</li><li>RHCP ↔ LHCP: 15–25 dB. Verici ve alıcı aynı yönde olmalı.</li><li>İHA yattıkça lineer antenlerde açı farkı oluşur; 45°\'de 3 dB kayıp. FPV\'de dairesel antenlerin tercih nedeni budur. Ayrıca yansıyan sinyal ters yöne döndüğünden çok yol bozulması azalır.</li></ul>` },
    { t: '10. Anten kazancı ve hüzme genişliği', b: `
      <p>Anten enerji üretmez; enerjiyi belli yönlere toplar. Kazanç arttıkça hüzme daralır.</p>
      ${F('G ≈ 29000 / (θ<sub>H</sub> · θ<sub>V</sub>)   (doğrusal; dBi için 10·log₁₀)')}
      <p>Maple 17 dBi plate: H 16° × V 40° → 29000 / 640 ≈ 45 kat ≈ 16,6 dBi ✓. Dar hüzme, aracın hüzme dışına çıkınca hızla sinyal kaybı demektir: hüzme kenarında −3 dB, iki katı açıda ≈ −12 dB. Bunun için "Yönlendirme kaybı" kalemini kullanın.</p>
      <p>Omni antenlerde kazanç dikey hüzmeyi daraltır: yüksek kazançlı omni, tepeye yakın uçan aracı göremeyebilir.</p>` },
    { t: '11. Hassasiyet, gürültü ve sönümlenme payı', b: `
      ${F('Gürültü tabanı = −174 dBm/Hz + 10·log₁₀(BW Hz) + NF')}
      <p>Hassasiyet, alıcının hata oranı kabul edilebilir kalacak şekilde çözebildiği en zayıf sinyaldir. Bant genişliği daraldıkça hassasiyet artar; bu yüzden LoRa (ELRS, NB20 gibi) −115 dBm\'e inerken 20 MHz video −90 dBm civarındadır.</p>
      <p><b>Sönümlenme payı (fade margin):</b> çok yol, araç dönüşleri, gövde gölgesi, parazit için ayrılan güvenlik payı. Öneriler: görüş hattında 10 dB, banliyö/ağaçlık alanda 15–20 dB, kritik kontrol linki için 20 dB+.</p>` },
    { t: '12. Çok yollu yayılım ve engeller', b: `
      <p>Sinyal yerden, binalardan, sudan yansıyarak alıcıya farklı zamanlarda ulaşır; dalgalar birbirini güçlendirir veya söndürür (10–20 dB ani düşüşler). Çözümler: dairesel polarizasyon, çeşitleme (diversity) alıcı, anteni yükseltmek, dijital sistemlerde OFDM.</p>
      <p>Engeller frekansa bağlıdır: 900 MHz ağaç ve binaları 5,8 GHz\'ten çok daha iyi aşar. Tablolar sekmesinde tipik engel kayıpları var.</p>` },
    { t: '13. İHA için pratik ipuçları', b: `
      <ul>
        <li><b>Frekans seçimi:</b> kumanda için 900 MHz (menzil, engel geçişi), video için 5,8 GHz (bant genişliği). Aynı frekansta iki sistem kullanmayın.</li>
        <li><b>Antenleri ayırın:</b> GPS, kumanda ve video antenleri arasında mesafe bırakın; 1,2 GHz video GPS\'i bozabilir.</li>
        <li><b>Gövde gölgesi:</b> karbon fiber RF\'i keser; antenleri gövdeden dışarı, birbirine dik konumlandırın.</li>
        <li><b>Yer istasyonu:</b> omni + yönlü (patch/panel) diversity en iyi kombinasyondur. Yüksek kazanç için tracker kullanın.</li>
        <li><b>Güç yerine kazanç:</b> +6 dB anten kazancı vericiyi 4 kat güçlendirmekle aynı menzili verir, pil tüketmez ve yasal sınırlara takılmaz (EIRP sınırına dikkat).</li>
        <li><b>Yasal sınırlar:</b> Türkiye/AB\'de 2,4 GHz için 100 mW EIRP, 5,8 GHz SRD için 25 mW EIRP genel sınırlardır; amatör lisans ve askerî/kurumsal kullanımda kurallar farklıdır.</li>
        <li><b>Test:</b> uçuştan önce yerde menzil testi yapın (ELRS\'de range test modu), RSSI/LQ değerlerini izleyin.</li>
      </ul>` }
  ];
  let open = 0;
  function render(el) {
    el.innerHTML = `<div class="learn">${I18N.content('lessons', LESSONS).map((l, i) => `<details class="card lesson"${i === open ? ' open' : ''} data-i="${i}"><summary>${l.t}</summary><div class="lesson-b">${l.b}</div></details>`).join('')}</div>`;
    $$('details', el).forEach(d => d.addEventListener('toggle', () => { if (d.open) open = +d.dataset.i; }));
    const mini = $('[data-mini="db"]', el);
    if (mini) {
      const r = $('input', mini), upd = () => { const d = +r.value; $('b', mini).textContent = (d > 0 ? '+' : '') + d + ' dB'; $('.out', mini).textContent = `Güç ×${fmt(Math.pow(10, d / 10), d < 0 ? 4 : 2)} · ${d < 0 ? 'gücün %' + fmt(RF.dbToPowerLossPct(-d), 1) + '\'i kaybolur' : 'gücün ' + fmt(Math.pow(10, d / 10), 1) + ' katı'}`; };
      r.oninput = upd; upd();
    }
  }
  return { title: 'Eğitim', render };
})();
