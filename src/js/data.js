// Sabit veriler: anten türleri ansiklopedisi, başlangıç kütüphanesi, frekans bantları, varsayılan link bütçesi.
const DATA = (() => {
  // ---- Anten türleri (sırasıyla: referans → omni → dairesel omni → yönlü → yüksek kazançlı → özel)
  const ANTENNAS = [
    { id: 'isotropic', group: 'Referans', name: 'İzotropik anten', model: 'isotropic', gain: '0 dBi (tanım gereği)', bw: 'Her yönde eşit (küre)', pol: '—',
      desc: 'Gerçekte var olmayan, her yöne eşit güç yayan hayali noktasal antendir. Tüm anten kazançları buna göre verilir: "dBi" = izotropiğe göre desibel.',
      uav: 'Hesaplarda referans noktasıdır. Bir antenin 5 dBi olması, en güçlü yönünde izotropiğe göre 5 dB (≈3.2 kat) daha fazla güç yolladığı anlamına gelir.',
      pros: ['Tüm kazanç değerlerinin ortak dili'], cons: ['Fiziksel olarak üretilemez'] },
    { id: 'dipole', group: 'Omni (çok yönlü)', name: 'Yarım dalga dipol (λ/2)', model: 'dipole', gain: '2.15 dBi', bw: 'Yatay 360°, dikey ≈78°', pol: 'Lineer (dikey takılırsa V)',
      desc: 'İki eşit koldan oluşan, toplam boyu yarım dalga boyu olan temel antendir. Ekseni boyunca yayın yapmaz; ekseni çevresinde "simit (donut)" şeklinde ışır. dBd birimi dipole göre kazançtır (0 dBd = 2.15 dBi).',
      uav: 'Kumanda alıcılarının (ör. NB20 ile gelen PCB dipoller), telemetri modüllerinin ve video vericilerinin standart antenidir. Hava aracında dikey takılır.',
      pros: ['Basit, ucuz, hafif', 'Yatayda her yöne eşit kapsama'], cons: ['Düşük kazanç', 'Tam altına/üstüne zayıf (ölü bölge)'] },
    { id: 'monopole', group: 'Omni (çok yönlü)', name: 'Monopol / kırbaç (λ/4 whip)', model: 'monopole', gain: '2–5 dBi (iyi toprak düzlemiyle)', bw: 'Yatay 360°, dikey ≈45°', pol: 'Lineer V',
      desc: 'Dipolün yarısıdır; diğer yarısını toprak düzlemi (metal yüzey, şasi) "ayna" gibi tamamlar. Toprak düzlemi büyüdükçe diyagram ufka doğru yoğunlaşır.',
      uav: 'Telsiz el cihazları, 433/868/915 MHz telemetri ve uzun menzil kumanda (ELRS 900, Crossfire) antenlerinde yaygın.',
      pros: ['Kısa boy (λ/4)', 'Montajı kolay'], cons: ['Toprak düzlemi olmadan verim düşer', 'Gövde yakınlığından etkilenir'] },
    { id: 'groundplane', group: 'Omni (çok yönlü)', name: 'Ground plane (radyalli λ/4)', model: 'groundplane', gain: '2–3 dBi', bw: 'Yatay 360°, dikey ≈50°', pol: 'Lineer V',
      desc: 'Dikey λ/4 elemanın altına 3–4 adet radyal tel eklenerek yapay toprak düzlemi oluşturulmuş antendir. Radyaller 45° aşağı eğilirse empedans 50 Ω\'a yaklaşır.',
      uav: 'Yer istasyonu direklerinde ve sabit telemetri istasyonlarında kullanılır.',
      pros: ['Toprak düzleminden bağımsız', 'Kolay yapılır'], cons: ['Mekanik olarak hantal'] },
    { id: 'collinear', group: 'Omni (çok yönlü)', name: 'Collinear (dikey dizi) omni', model: 'collinear', params: { n: 4, d: 0.75 }, gain: '5–12 dBi', bw: 'Yatay 360°, dikey 8–30°', pol: 'Lineer V',
      desc: 'Birden çok dipolün aynı eksende üst üste eş fazlı dizilmesiyle elde edilir. Yatayda yine 360° kapsar ama dikey hüzme daralır; enerji ufka toplanır, kazanç artar.',
      uav: 'Yer istasyonunda, aracın etrafında dolaştığı ama hep ufka yakın kaldığı uçuşlarda menzili artırır. Araç tepeye yakın gelince sinyal düşer (dar dikey hüzme).',
      pros: ['Yönlendirme gerektirmeden yüksek kazanç'], cons: ['Dar dikey hüzme: yakın/yüksek araçta zayıflama', 'Uzun boy'] },
    { id: 'cloverleaf', group: 'Dairesel polarize omni', name: 'Cloverleaf / Pagoda / Lollipop', model: 'omniCP', gain: '1–3 dBi', bw: 'Yatay ≈360°, dikey ≈100°+', pol: 'Dairesel (RHCP/LHCP)',
      desc: 'FPV dünyasında en çok kullanılan dairesel polarize omni antenlerdir. 3–4 yapraklı ışıma elemanları dairesel dalga üretir; çok yollu yansımalar ters polarizasyona döndüğü için büyük ölçüde reddedilir.',
      uav: '5.8 GHz analog/dijital video vericisi ve gözlük/alıcılarda standart. Verici ve alıcı aynı yönde (ikisi RHCP veya ikisi LHCP) olmalıdır; aksi halde ≈20 dB kayıp.',
      pros: ['Çok yol (multipath) bozulmasına dayanıklı', 'Araç yatarken polarizasyon kaybı yok'], cons: ['Düşük kazanç', 'RHCP/LHCP karışırsa büyük kayıp'] },
    { id: 'skew', group: 'Dairesel polarize omni', name: 'Skew-planar wheel', model: 'skew', gain: '1.5–2.5 dBi', bw: 'Yatay ≈360°, dikey ≈90°', pol: 'Dairesel',
      desc: 'Eğik yerleştirilmiş 3–4 halkalı tekerlek antendir. Cloverleaf\'e benzer, yer istasyonu tarafında biraz daha iyi eksen oranı ve geniş bant verir.',
      uav: 'Genellikle yer tarafında, alıcı/gözlükte kullanılır.', pros: ['İyi eksen oranı', 'Geniş bant'], cons: ['Kırılgan yapı'] },
    { id: 'turnstile', group: 'Dairesel polarize omni', name: 'Turnstile / çapraz dipol', model: 'turnstile', gain: '3–5 dBi (zenit)', bw: 'Üst yarı küre', pol: 'Dairesel (zenitte)',
      desc: 'İki dipolün 90° faz farkıyla çapraz beslenmesidir. Tepeye bakarken dairesel, ufka doğru lineer polarizasyon verir.',
      uav: 'Uydu (GNSS, hava durumu uydusu) alıcılarında ve tepeden geçen araçları izleyen yer istasyonlarında.', pros: ['Gökyüzünü geniş kapsar'], cons: ['Ufukta zayıf'] },
    { id: 'qha', group: 'Dairesel polarize omni', name: 'Quadrifilar helix (QHA)', model: 'qha', gain: '2–5 dBi', bw: 'Kardiyoid, ≈150°', pol: 'Dairesel',
      desc: 'Dört sarmal telden oluşan, gökyüzünü yarım küre şeklinde kapsayan dairesel antendir.',
      uav: 'GPS/GNSS antenlerinin yüksek kaliteli olanları ve uydu haberleşmesi. Araç üzerinde yukarı bakacak şekilde takılır.', pros: ['Mükemmel yarım küre kapsama', 'Düşük ufuk gürültüsü'], cons: ['Üretimi hassas'] },
    { id: 'patch', group: 'Yönlü (directional)', name: 'Patch (yama) anten', model: 'directional', params: { h: 70, v: 65, fb: 18 }, gain: '6–9 dBi', bw: '≈60–80° (H ve V)', pol: 'Lineer veya dairesel',
      desc: 'Bir toprak düzlemi üzerinde, yarım dalga boyutunda bakır yamadan oluşan düz antendir. Tek yöne (yamanın baktığı yöne) yayın yapar, arkası zayıftır.',
      uav: 'Yer istasyonunda aracın bulunduğu yöne çevrilerek menzili artırır. Omni ile birlikte "diversity" alıcıda çok kullanılır. Dairesel versiyonları FPV\'de yaygın.', pros: ['Kompakt, düz', 'Orta kazanç, geniş hüzme (yönlendirmesi kolay)'], cons: ['Arka tarafa yayın yok', 'Bant genişliği sınırlı'] },
    { id: 'panel', group: 'Yönlü (directional)', name: 'Panel / plate (dizi patch)', model: 'directional', params: { h: 40, v: 16, fb: 22 }, gain: '12–20 dBi', bw: 'ör. 40° × 16°', pol: 'Lineer V/H veya dairesel',
      desc: 'Birden çok patch elemanının bir panel üzerinde dizilmesiyle elde edilir. Elemanlar hangi eksende çoğalırsa o eksende hüzme daralır. Örnek: Maple Wireless 5.8G plate 17 dBi, V 40° × H 16°.',
      uav: 'Uzun menzil yer istasyonu, anten takip (tracker) sistemleri. Dar hüzme nedeniyle aracın yönü iyi takip edilmelidir.', pros: ['Yüksek kazanç, düz ve hafif', 'Rüzgâr yükü düşük'], cons: ['Dar hüzme: yönlendirme hatası hızla kayıp getirir'] },
    { id: 'helical', group: 'Yönlü (directional)', name: 'Helis (axial-mode helical)', model: 'directional', params: { h: 40, v: 40, fb: 15 }, gain: '10–16 dBi', bw: '30–50°', pol: 'Dairesel',
      desc: 'Bir reflektör önünde, çevresi yaklaşık bir dalga boyu olan sarmal telden oluşur. Sarım sayısı arttıkça kazanç artar, hüzme daralır. Sarım yönü RHCP/LHCP\'yi belirler.',
      uav: 'Uzun menzil FPV video alıcısında yüksek kazançlı dairesel anten olarak tercih edilir.', pros: ['Yüksek kazanç + dairesel polarizasyon', 'Geniş bant'], cons: ['Uzun ve hacimli'] },
    { id: 'yagi', group: 'Yönlü (directional)', name: 'Yagi-Uda', model: 'yagi', params: { n: 8, d: 0.25 }, gain: '7–17 dBi', bw: '25–60°', pol: 'Lineer',
      desc: 'Bir sürülen dipol, arkasında reflektör ve önünde çok sayıda yönlendirici (director) çubuktan oluşur. Eleman sayısı arttıkça kazanç artar, hüzme daralır. Yan loblar ve bir miktar arka lob vardır.',
      uav: '433/868/915 MHz ve 1.2/1.3 GHz uzun menzil telemetri ve video yer istasyonlarında.', pros: ['Yüksek kazanç / maliyet oranı', 'Hafif'], cons: ['Dar bant', 'Uzun boy (düşük frekansta)'] },
    { id: 'lpda', group: 'Yönlü (directional)', name: 'Log-periyodik (LPDA)', model: 'directional', params: { h: 65, v: 110, fb: 18 }, gain: '6–10 dBi', bw: 'E ≈65°, H ≈110°', pol: 'Lineer',
      desc: 'Boyları logaritmik olarak küçülen dipollerin çapraz beslenmesiyle oluşur. Çok geniş frekans aralığında (ör. 700–6000 MHz) aynı kazancı verir.',
      uav: 'Çoklu bant yer istasyonu, spektrum ölçümü, karıştırıcı/tespit sistemleri.', pros: ['Çok geniş bant'], cons: ['Aynı boyda Yagi\'ye göre düşük kazanç'] },
    { id: 'biquad', group: 'Yönlü (directional)', name: 'Biquad / double-biquad', model: 'directional', params: { h: 60, v: 55, fb: 20 }, gain: '10–13 dBi', bw: '≈55–60°', pol: 'Lineer',
      desc: 'İki kare halkanın bir reflektör önüne yerleştirilmesidir. Kendin-yap (DIY) projelerinde kolayca yapılabilen orta kazançlı yönlü antendir.',
      uav: 'Ucuz yer istasyonu çözümü (2.4/5.8 GHz).', pros: ['Basit yapım, iyi kazanç'], cons: ['Lineer polarizasyon'] },
    { id: 'cantenna', group: 'Yönlü (directional)', name: 'Cantenna (dalga kılavuzlu kutu)', model: 'directional', params: { h: 50, v: 50, fb: 20 }, gain: '8–12 dBi', bw: '≈50°', pol: 'Lineer',
      desc: 'Bir metal kutu içine λ/4 prob yerleştirilerek yapılan dairesel dalga kılavuzu antendir.', uav: 'Eğitim ve deneme amaçlı DIY yer istasyonu.', pros: ['Çok ucuz'], cons: ['Boyut frekansa sıkı bağlı'] },
    { id: 'moxon', group: 'Yönlü (directional)', name: 'Moxon dikdörtgen', model: 'directional', params: { h: 90, v: 120, fb: 30 }, gain: '5–6 dBi', bw: '≈90°', pol: 'Lineer',
      desc: 'İki elemanlı, uçları birbirine doğru katlanmış yönlü antendir. Ön/arka oranı çok yüksektir (≈30 dB).', uav: 'Geniş açılı yer istasyonu; arkadan gelen paraziti bastırmak için.', pros: ['Çok yüksek ön/arka oranı'], cons: ['Orta kazanç'] },
    { id: 'spiral', group: 'Yönlü (directional)', name: 'Spiral (Arşimet / logaritmik)', model: 'directional', params: { h: 75, v: 75, fb: 15 }, gain: '3–6 dBi', bw: '≈70–90°', pol: 'Dairesel',
      desc: 'Düzlemsel sarmal kollardan oluşur; çok geniş bantta dairesel polarizasyon sağlar.', uav: 'Elektronik harp, sinyal tespit, geniş bant ölçüm.', pros: ['Çok geniş bant + dairesel'], cons: ['Düşük kazanç'] },
    { id: 'horn', group: 'Yüksek kazançlı', name: 'Horn (boru) anten', model: 'directional', params: { h: 25, v: 25, fb: 30, sll: 25 }, gain: '10–25 dBi', bw: '10–40°', pol: 'Lineer',
      desc: 'Dalga kılavuzunun huni şeklinde genişletilmesiyle elde edilir. Yan lobları düşük, kazancı hesaplanabilir olduğu için ölçüm referansı olarak kullanılır.', uav: 'Mikrodalga bağlantılar, ölçüm, radar.', pros: ['Düşük yan lob, geniş bant'], cons: ['Hacimli (düşük frekansta)'] },
    { id: 'sector', group: 'Yüksek kazançlı', name: 'Sektör anten', model: 'sector', params: { h: 90, n: 6, tilt: 0 }, gain: '12–18 dBi', bw: 'Yatay 60/90/120°, dikey 6–15°', pol: 'Lineer V/H veya çift',
      desc: 'Yatayda belirli bir dilimi (sektör) düz bir şekilde kapsayan, dikeyde dar hüzmeli antendir. Birden çok sektör yan yana konarak 360° kapsanır.', uav: 'Belirli bir bölgede çalışan araçlar için yönlendirme gerektirmeyen yer istasyonu; baz istasyonları.', pros: ['Geniş yatay kapsama + yüksek kazanç'], cons: ['Dar dikey hüzme, eğim (tilt) ayarı önemli'] },
    { id: 'dish', group: 'Yüksek kazançlı', name: 'Parabolik çanak', model: 'dish', params: { dl: 10 }, gain: '20–40 dBi', bw: '2–10° (≈70·λ/D)', pol: 'Besleyiciye bağlı',
      desc: 'Parabolik yansıtıcı, odaktaki besleyiciden gelen dalgayı düz bir dalga cephesine çevirir. Kazanç çap/dalga boyu oranıyla büyür: G ≈ η·(πD/λ)².',
      uav: 'Çok uzun menzil noktadan noktaya bağlantılar, otomatik takipli yer istasyonları. Hüzme çok dar olduğundan mutlaka takip sistemi gerekir.', pros: ['Çok yüksek kazanç'], cons: ['Çok dar hüzme, ağır, rüzgâr yükü'] },
    { id: 'phased', group: 'Özel', name: 'Faz dizili / MIMO / akıllı anten', model: 'phased', params: { n: 8, steer: 20, v: 30 }, gain: '10–30 dBi', bw: 'Elektronik yönlendirmeli', pol: 'Değişken',
      desc: 'Çok sayıda elemanın her birinin fazı ayrı ayrı kontrol edilerek hüzmenin mekanik hareket olmadan yönlendirilmesidir. MIMO sistemler ise birden çok anteni aynı anda kullanarak veri hızını ve güvenilirliği artırır.',
      uav: 'Modern dijital video linkleri (DJI O3/O4, Walksnail), 4G/5G, askerî datalink ve radar sistemleri.', pros: ['Hareketsiz hızlı yönlendirme', 'Çok yol avantajı'], cons: ['Karmaşık ve pahalı'] }
  ];

  // Tipik yatay (H, azimut) ve dikey (V, elevasyon) −3 dB hüzme genişlikleri; anten dikey konumda takılı varsayılır
  const BW = {
    isotropic: ['360°', '360°'], dipole: ['360°', '≈78°'], monopole: ['360°', '≈45–60°'], groundplane: ['360°', '≈50–60°'],
    collinear: ['360°', '≈8–30° (5 dBi ≈30°, 8 dBi ≈15°, 12 dBi ≈7°)'], cloverleaf: ['360° (±1 dB dalgalanma)', '≈100–120°'], skew: ['360° (±1,5 dB)', '≈90–110°'],
    turnstile: ['360°', '≈140° (zenite bakar)'], qha: ['360°', '≈140–160° (yarım küre)'], patch: ['≈60–80°', '≈55–75°'],
    panel: ['≈15–60° (ör. Maple 16°)', '≈10–40° (ör. Maple 40°)'], helical: ['≈30–50°', '≈30–50°'], yagi: ['≈25–55°', '≈30–65°'],
    lpda: ['≈60–75° (E düzlemi)', '≈100–120° (H düzlemi)'], biquad: ['≈50–60°', '≈50–60°'], cantenna: ['≈45–60°', '≈45–60°'],
    moxon: ['≈80–100°', '≈120–140°'], spiral: ['≈70–90°', '≈70–90°'], horn: ['≈10–40°', '≈10–40°'],
    sector: ['60° / 90° / 120°', '≈6–15°'], dish: ['≈2–10° (≈70·λ/D)', '≈2–10° (≈70·λ/D)'], phased: ['≈10–30° (elektronik yönlenir)', '≈10–60°']
  };
  for (const a of ANTENNAS) if (BW[a.id]) { a.bwH = BW[a.id][0]; a.bwV = BW[a.id][1]; }

  // ---- Başlangıç kütüphanesi (Milen'in gönderdiği ürünler + yaygın jenerik ürünler)
  const SEED = [
    { id: 'seed-fs5808m', type: 'rx', name: 'FPVspeed FS5808M', brand: 'FPVspeed', fMin: 5645, fMax: 5945, sens: -90, channels: '8 CH', connector: '', notes: '5.8G geniş bant FM ses+video alıcı modül, SMD 28×23×3 mm, 5 V 170 mA, PLL, analog A/V çıkış.', src: 'Milen ürün görseli' },
    { id: 'seed-nb20', type: 'rx', name: 'NB20 alıcı', brand: '', fMin: null, fMax: null, sens: -115, channels: '20 kanal PWM / 18 SBUS / 14 PPM', connector: 'MCX', notes: 'Uzun menzil kumanda alıcısı; iki PCB dipol anten ve iki MCX bağlantı kablosu ile gelir. Frekans bandı görselde belirtilmemiş.', src: 'Milen ürün görseli (digitaltarget.com.tr)' },
    { id: 'seed-maple17', type: 'antenna', name: 'Maple Wireless 5.8G 17 dBi plate (MW-P007-SMA)', brand: 'Maple Wireless', fMin: 5150, fMax: 5950, gain: 17, bwH: 16, bwV: 40, pol: 'V', antType: 'panel', connector: 'SMA', notes: 'Yönlü düz panel anten. Etiket: V 40° H 16°, dikey polarizasyon.', src: 'Milen ürün görseli (unmannedtechshop.co.uk)' },
    { id: 'seed-vtx600', type: 'tx', name: '5.8G analog VTX 600 mW (jenerik)', brand: '', fMin: 5645, fMax: 5945, power: 600, powerUnit: 'mW', connector: 'MMCX', notes: 'Tipik FPV video verici; 25/200/400/600 mW seçilebilir.', src: 'Jenerik' },
    { id: 'seed-vtx25', type: 'tx', name: '5.8G VTX 25 mW (jenerik)', brand: '', fMin: 5645, fMax: 5945, power: 25, powerUnit: 'mW', connector: 'U.FL / IPEX', notes: 'Yarış/iç mekân gücü.', src: 'Jenerik' },
    { id: 'seed-elrs900', type: 'tx', name: 'ELRS 900 MHz TX modül 1 W (jenerik)', brand: '', fMin: 868, fMax: 928, power: 1, powerUnit: 'W', connector: 'SMA', notes: 'Uzun menzil kumanda verici modül.', src: 'Jenerik' },
    { id: 'seed-elrsrx', type: 'rx', name: 'ELRS 900 RX (jenerik, LoRa 50 Hz)', brand: '', fMin: 868, fMax: 928, sens: -117, connector: 'U.FL / IPEX', notes: 'Hassasiyet paket hızına göre değişir: 50 Hz ≈ -117 dBm, 200 Hz ≈ -112 dBm.', src: 'Jenerik' },
    { id: 'seed-dipole24', type: 'antenna', name: '2.4 GHz dipol 2 dBi (jenerik)', brand: '', fMin: 2400, fMax: 2500, gain: 2.15, bwH: 360, bwV: 78, pol: 'V', antType: 'dipole', connector: 'U.FL / IPEX', notes: '', src: 'Jenerik' },
    { id: 'seed-pagoda', type: 'antenna', name: '5.8 GHz Pagoda/Lollipop RHCP 1.6 dBi (jenerik)', brand: '', fMin: 5600, fMax: 6000, gain: 1.6, bwH: 360, bwV: 100, pol: 'RHCP', antType: 'cloverleaf', connector: 'SMA', notes: '', src: 'Jenerik' },
    { id: 'seed-patch58', type: 'antenna', name: '5.8 GHz patch RHCP 8 dBi (jenerik)', brand: '', fMin: 5600, fMax: 6000, gain: 8, bwH: 70, bwV: 65, pol: 'RHCP', antType: 'patch', connector: 'SMA', notes: '', src: 'Jenerik' },
    { id: 'seed-dipole900', type: 'antenna', name: '900 MHz T-dipol 2 dBi (jenerik)', brand: '', fMin: 868, fMax: 928, gain: 2.15, bwH: 360, bwV: 78, pol: 'V', antType: 'dipole', connector: 'U.FL / IPEX', notes: '', src: 'Jenerik' },
    { id: 'seed-yagi900', type: 'antenna', name: '900 MHz Yagi 9 dBi (jenerik)', brand: '', fMin: 860, fMax: 930, gain: 9, bwH: 55, bwV: 50, pol: 'V', antType: 'yagi', connector: 'SMA', notes: '', src: 'Jenerik' }
  ];

  // ---- Frekans bantları (İHA'da yaygın)
  const BANDS = [
    ['433 MHz', '433.05–434.79 MHz', '≈69 cm', 'Telemetri, LoRa, uzun menzil kumanda', 'Engelleri iyi aşar, antenler büyük, düşük veri hızı'],
    ['868 / 915 MHz', '863–870 (AB) / 902–928 (ABD)', '≈33–35 cm', 'ELRS 900, Crossfire, telemetri (SiK)', 'Uzun menzil kumandanın standardı; bitki örtüsünü iyi geçer'],
    ['1.2–1.3 GHz', '1080–1360 MHz', '≈23–25 cm', 'Analog uzun menzil video', 'GPS L2 bandına yakın; GPS\'i bozabilir, lisans gerektirebilir'],
    ['2.4 GHz', '2400–2483.5 MHz', '12.5 cm', 'Kumanda (ELRS 2.4, FrSky), Wi-Fi, dijital video', 'Kalabalık bant; orta menzil, küçük antenler'],
    ['5.8 GHz', '5650–5925 MHz', '5.2 cm', 'Analog/dijital FPV video', 'Yüksek veri hızı, kısa dalga; engellere ve bitkilere hassas'],
    ['GNSS L1', '1575.42 MHz', '19 cm', 'GPS / Galileo alıcı', 'Alınan sinyal ≈ -130 dBm; RHCP anten kullanılır'],
    ['4G/LTE', '700–2600 MHz', '—', 'Hücresel BVLOS bağlantı', 'Operatör kapsamasına bağlı']
  ];
  // 5.8 GHz FPV kanal tablosu (MHz)
  const FPV58 = {
    'A (Boscam A)': [5865, 5845, 5825, 5805, 5785, 5765, 5745, 5725],
    'B (Boscam B)': [5733, 5752, 5771, 5790, 5809, 5828, 5847, 5866],
    'E (Boscam E)': [5705, 5685, 5665, 5645, 5885, 5905, 5925, 5945],
    'F (Fatshark/IRC)': [5740, 5760, 5780, 5800, 5820, 5840, 5860, 5880],
    'R (Raceband)': [5658, 5695, 5732, 5769, 5806, 5843, 5880, 5917],
    'L (Lowband)': [5362, 5399, 5436, 5473, 5510, 5547, 5584, 5621]
  };
  // Tipik engel kayıpları (dB) - 2.4 GHz / 5.8 GHz yaklaşık değerler
  const OBSTACLES = [
    ['Cam pencere (düz)', 2, 3], ['Isıcamlı / kaplamalı cam', 10, 15], ['Alçıpan duvar', 3, 4], ['Ahşap kapı', 3, 6], ['Tuğla duvar', 6, 10],
    ['Beton duvar (15–20 cm)', 12, 20], ['Betonarme döşeme', 15, 25], ['Metal kapı / sac', 20, 30], ['Tek ağaç (yapraklı)', 6, 12],
    ['Yoğun orman (100 m)', 20, 30], ['İnsan vücudu', 3, 6], ['Araç kabini', 8, 12], ['İHA gövdesi (karbon, gölgede)', 5, 15], ['Asfalt/zeminden yansıma (çok yol)', 0, 6]
  ];

  // ---- Varsayılan link bütçesi (Milen'in diyagramındaki sıra: Tx → kablo → anten → yol → anten → kablo → Rx)
  let n = 0;
  const id = () => 'k' + Date.now().toString(36) + (n++).toString(36);
  function defaultItems() {
    return [
      { id: id(), on: true, side: 'tx', kind: 'loss', role: 'txCable', name: 'Verici kablo kaybı', auto: 'cable', p: { cable: 'RG316', len: 0.1 } },
      { id: id(), on: true, side: 'tx', kind: 'loss', role: 'txConn', name: 'Verici konnektör kaybı', auto: 'conn', p: { type: 'SMA', n: 1 } },
      { id: id(), on: true, side: 'tx', kind: 'gain', role: 'txAnt', name: 'Verici anten kazancı', value: 2 },
      { id: id(), on: false, side: 'tx', kind: 'loss', role: 'txVswr', name: 'Verici anten VSWR uyumsuzluğu', auto: 'vswr', p: { vswr: 1.5 } },
      { id: id(), on: true, side: 'path', kind: 'loss', role: 'fspl', name: 'Serbest uzay kaybı (FSPL)', auto: 'fspl' },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'obst', name: 'Engel kaybı (ağaç/bina)', value: 6 },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'foliage', name: 'Bitki örtüsü (Weissberger)', auto: 'foliage', p: { depth: 20 } },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'rain', name: 'Yağmur kaybı', auto: 'rain', p: { rate: 25 } },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'atm', name: 'Atmosfer / sis kaybı', value: 0.5 },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'pol', name: 'Polarizasyon uyumsuzluğu', auto: 'pol', p: { mode: 'type', a: 'V', b: 'V', angle: 0 } },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'point', name: 'Yönlendirme (hedeften sapma) kaybı', auto: 'point', p: { off: 10, hpbw: 40 } },
      { id: id(), on: false, side: 'path', kind: 'loss', role: 'body', name: 'Gövde gölgelemesi', value: 3 },
      { id: id(), on: true, side: 'rx', kind: 'gain', role: 'rxAnt', name: 'Alıcı anten kazancı', value: 2 },
      { id: id(), on: false, side: 'rx', kind: 'loss', role: 'rxVswr', name: 'Alıcı anten VSWR uyumsuzluğu', auto: 'vswr', p: { vswr: 1.5 } },
      { id: id(), on: true, side: 'rx', kind: 'loss', role: 'rxConn', name: 'Alıcı konnektör kaybı', auto: 'conn', p: { type: 'SMA', n: 1 } },
      { id: id(), on: true, side: 'rx', kind: 'loss', role: 'rxCable', name: 'Alıcı kablo kaybı', auto: 'cable', p: { cable: 'RG316', len: 0.2 } }
    ];
  }
  function defaultProject(name) {
    return {
      id: 'p' + Date.now().toString(36), name: name || 'Yeni link', updated: Date.now(),
      tx: { power: 600, unit: 'mW', fMHz: 5800, name: '' }, dist: { value: 3, unit: 'km' },
      rx: { sens: -90, name: '' }, fade: 10, heights: { tx: 100, rx: 2 },
      items: defaultItems()
    };
  }
  return { ANTENNAS, SEED, BANDS, FPV58, OBSTACLES, defaultItems, defaultProject, newId: id };
})();
