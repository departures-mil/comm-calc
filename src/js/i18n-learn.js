// Eğitim dersleri: İngilizce ve Arapça tam metinler (Türkçesi learn.js içinde).
(() => {
  const F = s => `<div class="formula" dir="ltr">${s}</div>`;
  I18N.addContent('en', 'lessons', [
    { t: '1. Decibel (dB) logic', b: `
      <p>In radio, powers can differ by billions of times (the transmitter sends 1 W, the receiver gets 0.000000000001 W). That is why a <b>logarithmic</b> scale is used instead of multiplying and dividing: the decibel.</p>
      ${F('dB = 10 · log₁₀(P₂ / P₁)')}
      <ul><li><b>+3 dB</b> ≈ twice the power, <b>−3 dB</b> ≈ half</li><li><b>+10 dB</b> = 10×, <b>+20 dB</b> = 100×, <b>+30 dB</b> = 1000×</li><li>Gains and losses are <b>simply added and subtracted</b>: 20 dB gain − 3 dB cable = 17 dB.</li></ul>
      <div class="mini" data-mini="db"><label>dB: <input type="range" min="-30" max="30" step="1" value="3"> <b></b></label><div class="out"></div></div>` },
    { t: '2. dBm, dBW, dBi, dBd, dBc', b: `
      <table class="tbl small"><tr><th>Unit</th><th>Reference</th><th>Example</th></tr>
      <tr><td>dBm</td><td>1 mW</td><td>0 dBm = 1 mW, 30 dBm = 1 W, −90 dBm = 1 pW</td></tr>
      <tr><td>dBW</td><td>1 W</td><td>0 dBW = 30 dBm</td></tr>
      <tr><td>dBi</td><td>Isotropic antenna</td><td>Dipole = 2.15 dBi</td></tr>
      <tr><td>dBd</td><td>Half-wave dipole</td><td>0 dBd = 2.15 dBi</td></tr>
      <tr><td>dBc</td><td>Carrier signal</td><td>Harmonic −40 dBc</td></tr></table>
      <p>Receiver sensitivity is given in dBm and is <b>negative</b>: −90 dBm is <b>less</b> sensitive than −115 dBm. The NB20 (−115 dBm) receiver can decode a signal 25 dB (≈316×) weaker than the FS5808M (−90 dBm).</p>` },
    { t: '3. What is a link budget?', b: `
      <p>It is the sum, in dB, of everything the transmitted power gains and loses on its way to the receiver. The result is compared with the receiver sensitivity.</p>
      ${F('P<sub>rx</sub> = P<sub>tx</sub> − L<sub>cable,tx</sub> + G<sub>tx</sub> − L<sub>path</sub> − L<sub>other</sub> + G<sub>rx</sub> − L<sub>cable,rx</sub>')}
      ${F('Link margin = P<sub>rx</sub> − Sensitivity')}
      <p><b>Example:</b> 600 mW (27.8 dBm) 5.8 GHz VTX, 2 dBi antenna → 5 km → 17 dBi Maple panel → FS5808M (−90 dBm).<br>
      FSPL(5 km, 5800 MHz) = 121.7 dB. P<sub>rx</sub> ≈ 27.8 − 0.5 + 2 − 121.7 + 17 − 0.6 = <b>−76 dBm</b>. Margin = −76 − (−90) = <b>14 dB</b> → "Very good".</p>
      <p>The Link Budget tab does exactly this; you can switch each item on and off to see its effect.</p>` },
    { t: '4. Free-space path loss (FSPL)', b: `
      <p>Energy spreads over the surface of a sphere, so it decreases with distance. Also, the "capture area" of the receiving antenna shrinks with wavelength, so loss is higher at higher frequencies.</p>
      ${F('FSPL (dB) = 20·log₁₀(d km) + 20·log₁₀(f MHz) + 32.44')}
      <ul><li>When distance <b>doubles</b>, loss rises by <b>+6 dB</b>; at 10× distance, +20 dB.</li><li>Going from 2.4 to 5.8 GHz adds about <b>+7.7 dB</b> of loss.</li><li>Doubling the range needs 6 dB: 4× the power, or 3 dB more gain on each antenna.</li></ul>` },
    { t: '5. Line of sight and the Fresnel zone', b: `
      <p>The signal is carried not by the straight line between the two antennas but by an ellipsoid-shaped volume around it: the <b>1st Fresnel zone</b>. At least <b>60%</b> of this zone must be clear; otherwise ground reflection and diffraction add extra loss.</p>
      ${F('r₁ = 17.32 · √(d₁·d₂ / (f·D))   [r m, d km, f GHz]')}
      <p>At the midpoint of 5 km at 5.8 GHz → r₁ ≈ 8 m. So even if a 2 m high ground antenna "sees" a low-flying UAV, the Fresnel zone touches the ground. Solution: raise the ground antenna (mast, hill).</p>` },
    { t: '6. Radio horizon and Earth curvature', b: `
      ${F('d (km) ≈ 4.12 · (√h₁ + √h₂)   [h in metres]')}
      <p>With the UAV at 120 m and the ground antenna at 2 m, the radio horizon is ≈ 51 km. Beyond it the Earth itself is the obstacle; the link drops no matter how much power you use. At long range, altitude matters more than power.</p>` },
    { t: '7. VSWR, reflection and return loss', b: `
      <p>If the antenna, cable and transmitter impedances (50 Ω) are not perfectly matched, part of the power is reflected back. VSWR measures this.</p>
      ${F('Γ = (VSWR − 1)/(VSWR + 1) · RL = −20·log₁₀ Γ · Mismatch loss = −10·log₁₀(1 − Γ²)')}
      <ul><li>VSWR 1.5 → 4% reflected, 0.18 dB loss (good)</li><li>VSWR 2.0 → 11% reflected, 0.51 dB loss (acceptable)</li><li>VSWR 3.0 → 25% reflected, 1.25 dB loss (bad; the transmitter heats up)</li></ul>
      <p>Running a transmitter without an antenna makes VSWR infinite and can burn the VTX.</p>` },
    { t: '8. Cable and connector losses', b: `
      <p>Coaxial cable loss rises roughly with √f. At 5.8 GHz, 1 m of RG174 ≈ 2.7 dB, which means <b>more than half</b> of the power is lost.</p>
      <ul><li>Keep cables on the aircraft as short as possible; mount the antenna directly on the VTX if you can.</li><li>If a long cable is needed at the ground station, use thick cable such as LMR-400, or move the receiver next to the antenna.</li><li>Each connector/adapter ≈ 0.1–0.4 dB. Do not mix up SMA and RP-SMA (no centre pin means no connection!).</li></ul>` },
    { t: '9. Polarization', b: `
      <p>Polarization is the direction in which the electric field oscillates. It can be linear (vertical V / horizontal H) or circular (RHCP right-hand / LHCP left-hand).</p>
      <ul><li>V ↔ H: infinite in theory, ≈20 dB loss in practice.</li><li>Linear ↔ circular: always 3 dB.</li><li>RHCP ↔ LHCP: 15–25 dB. Transmitter and receiver must have the same handedness.</li><li>As the UAV banks, linear antennas become misaligned; 3 dB loss at 45°. This is why circular antennas are preferred in FPV. Reflected signals also flip handedness, so multipath distortion is reduced.</li></ul>` },
    { t: '10. Antenna gain and beamwidth', b: `
      <p>An antenna does not create energy; it concentrates it in certain directions. The higher the gain, the narrower the beam.</p>
      ${F('G ≈ 29000 / (θ<sub>H</sub> · θ<sub>V</sub>)   (linear; 10·log₁₀ for dBi)')}
      <p>Maple 17 dBi plate: H 16° × V 40° → 29000 / 640 ≈ 45× ≈ 16.6 dBi ✓. A narrow beam means a fast signal drop when the aircraft leaves the beam: −3 dB at the beam edge, ≈ −12 dB at twice that angle. Use the "Pointing loss" item for this.</p>
      <p>On omni antennas, gain narrows the vertical beam: a high-gain omni may not see an aircraft flying close overhead.</p>` },
    { t: '11. Sensitivity, noise and fade margin', b: `
      ${F('Noise floor = −174 dBm/Hz + 10·log₁₀(BW Hz) + NF')}
      <p>Sensitivity is the weakest signal the receiver can decode while keeping the error rate acceptable. A narrower bandwidth gives better sensitivity; that is why LoRa (ELRS, NB20 and similar) reaches −115 dBm while 20 MHz video is around −90 dBm.</p>
      <p><b>Fade margin:</b> a safety margin for multipath, aircraft turns, airframe shadowing and interference. Recommendations: 10 dB with clear line of sight, 15–20 dB in suburban/wooded areas, 20 dB+ for a critical control link.</p>` },
    { t: '12. Multipath propagation and obstacles', b: `
      <p>The signal reflects off the ground, buildings and water and reaches the receiver at different times; the waves reinforce or cancel each other (sudden 10–20 dB drops). Solutions: circular polarization, a diversity receiver, raising the antenna, OFDM in digital systems.</p>
      <p>Obstacles depend on frequency: 900 MHz passes trees and buildings much better than 5.8 GHz. The Tables tab lists typical obstacle losses.</p>` },
    { t: '13. Practical tips for UAVs', b: `
      <ul>
        <li><b>Frequency choice:</b> 900 MHz for control (range, obstacle penetration), 5.8 GHz for video (bandwidth). Do not use two systems on the same frequency.</li>
        <li><b>Separate the antennas:</b> keep distance between GPS, control and video antennas; 1.2 GHz video can disturb GPS.</li>
        <li><b>Airframe shadowing:</b> carbon fibre blocks RF; place antennas outside the frame and perpendicular to each other.</li>
        <li><b>Ground station:</b> omni + directional (patch/panel) diversity is the best combination. Use a tracker for high gain.</li>
        <li><b>Gain instead of power:</b> +6 dB of antenna gain gives the same range as making the transmitter 4× stronger, without draining the battery or hitting legal limits (watch the EIRP limit).</li>
        <li><b>Legal limits:</b> in Türkiye/EU the general limits are 100 mW EIRP for 2.4 GHz and 25 mW EIRP for 5.8 GHz SRD; rules differ for amateur licences and military/institutional use.</li>
        <li><b>Test:</b> do a ground range test before flying (range test mode in ELRS) and watch the RSSI/LQ values.</li>
      </ul>` }
  ]);
  I18N.addContent('ar', 'lessons', [
    { t: '1. منطق الديسيبل (dB)', b: `
      <p>في عالم الراديو قد تختلف القدرات بمليارات المرات (المرسل يبث 1 W، ويصل إلى المستقبل 0.000000000001 W). لذلك يُستخدم مقياس <b>لوغاريتمي</b> بدلًا من الضرب والقسمة: الديسيبل.</p>
      ${F('dB = 10 · log₁₀(P₂ / P₁)')}
      <ul><li><b dir="ltr">+3 dB</b> ≈ ضعف القدرة، <b dir="ltr">−3 dB</b> ≈ نصفها</li><li><b dir="ltr">+10 dB</b> = 10 أضعاف، <b dir="ltr">+20 dB</b> = 100 ضعف، <b dir="ltr">+30 dB</b> = 1000 ضعف</li><li>الكسب والفقد <b>يُجمعان ويُطرحان</b> ببساطة: كسب 20 dB − كابل 3 dB = 17 dB.</li></ul>
      <div class="mini" data-mini="db"><label>dB: <input type="range" min="-30" max="30" step="1" value="3"> <b></b></label><div class="out"></div></div>` },
    { t: '2. dBm و dBW و dBi و dBd و dBc', b: `
      <table class="tbl small"><tr><th>الوحدة</th><th>المرجع</th><th>مثال</th></tr>
      <tr><td>dBm</td><td>1 mW</td><td dir="ltr">0 dBm = 1 mW, 30 dBm = 1 W, −90 dBm = 1 pW</td></tr>
      <tr><td>dBW</td><td>1 W</td><td dir="ltr">0 dBW = 30 dBm</td></tr>
      <tr><td>dBi</td><td>هوائي متناحٍ</td><td>ثنائي القطب = 2.15 dBi</td></tr>
      <tr><td>dBd</td><td>ثنائي قطب نصف موجي</td><td dir="ltr">0 dBd = 2.15 dBi</td></tr>
      <tr><td>dBc</td><td>إشارة الحامل</td><td>توافقية −40 dBc</td></tr></table>
      <p>تُعطى حساسية المستقبل بوحدة dBm وهي <b>سالبة</b>: القيمة −90 dBm <b>أقل</b> حساسية من −115 dBm. يستطيع المستقبل NB20 ‏(−115 dBm) فك إشارة أضعف بمقدار 25 dB (≈316 ضعفًا) من FS5808M ‏(−90 dBm).</p>` },
    { t: '3. ما هي ميزانية الوصلة؟', b: `
      <p>هي مجموع كل ما تكسبه القدرة المرسلة وما تفقده حتى تصل إلى المستقبل، مقدّرًا بالديسيبل. وتُقارن النتيجة بحساسية المستقبل.</p>
      ${F('P<sub>rx</sub> = P<sub>tx</sub> − L<sub>cable,tx</sub> + G<sub>tx</sub> − L<sub>path</sub> − L<sub>other</sub> + G<sub>rx</sub> − L<sub>cable,rx</sub>')}
      ${F('Margin = P<sub>rx</sub> − Sensitivity')}
      <p><b>مثال:</b> مرسل فيديو VTX ‏600 mW ‏(27.8 dBm) على 5.8 GHz، هوائي 2 dBi ← مسافة 5 km ← لوح Maple ‏17 dBi ← المستقبل FS5808M ‏(−90 dBm).<br>
      <span dir="ltr">FSPL(5 km, 5800 MHz) = 121.7 dB. P<sub>rx</sub> ≈ 27.8 − 0.5 + 2 − 121.7 + 17 − 0.6 = <b>−76 dBm</b></span>. الهامش = <span dir="ltr">−76 − (−90) = <b>14 dB</b></span> ← "جيد جدًا".</p>
      <p>يقوم تبويب ميزانية الوصلة بهذا بالضبط؛ ويمكنك تشغيل كل بند أو إيقافه لترى أثره.</p>` },
    { t: '4. فقد المسار في الفضاء الحر (FSPL)', b: `
      <p>تنتشر الطاقة على سطح كرة، فتتناقص مع المسافة. كما أن "مساحة الالتقاط" لهوائي الاستقبال تصغر مع الطول الموجي، لذا يزداد الفقد في الترددات العالية.</p>
      ${F('FSPL (dB) = 20·log₁₀(d km) + 20·log₁₀(f MHz) + 32.44')}
      <ul><li>عندما <b>تتضاعف</b> المسافة يزداد الفقد <b dir="ltr">+6 dB</b>؛ وعند 10 أضعاف المسافة +20 dB.</li><li>الانتقال من 2.4 إلى 5.8 GHz يضيف فقدًا ≈ <b dir="ltr">+7.7 dB</b>.</li><li>لمضاعفة المدى يلزم 6 dB: زيادة القدرة 4 أضعاف، أو إضافة 3 dB كسب لكل من الهوائيين.</li></ul>` },
    { t: '5. خط الرؤية ومنطقة فرينل', b: `
      <p>لا تنتقل الإشارة عبر الخط المستقيم بين الهوائيين فقط، بل عبر حجم إهليلجي حوله: <b>منطقة فرينل الأولى</b>. يجب أن تكون <b>60%</b> منها على الأقل خالية من العوائق؛ وإلا أضاف الانعكاس الأرضي والحيود فقدًا إضافيًا.</p>
      ${F('r₁ = 17.32 · √(d₁·d₂ / (f·D))   [r m, d km, f GHz]')}
      <p>عند منتصف مسافة 5 km على 5.8 GHz يكون r₁ ≈ 8 m. أي حتى لو "رأى" هوائي أرضي بارتفاع 2 m طائرة تحلّق على ارتفاع منخفض، فإن منطقة فرينل تلامس الأرض. الحل: رفع الهوائي الأرضي (سارية، تلّة).</p>` },
    { t: '6. الأفق الراديوي وانحناء الأرض', b: `
      ${F('d (km) ≈ 4.12 · (√h₁ + √h₂)   [h m]')}
      <p>إذا كانت الطائرة على ارتفاع 120 m والهوائي الأرضي على 2 m فالأفق الراديوي ≈ 51 km. بعد ذلك تصبح الأرض نفسها عائقًا؛ وتنقطع الوصلة مهما كانت القدرة. في المدى البعيد يكون الارتفاع أكثر تأثيرًا من القدرة.</p>` },
    { t: '7. ‏VSWR والانعكاس وفقد الارتداد', b: `
      <p>إذا لم تكن معاوقات الهوائي والكابل والمرسل (50 Ω) متوافقة تمامًا، ينعكس جزء من القدرة. ويقيس VSWR ذلك.</p>
      ${F('Γ = (VSWR − 1)/(VSWR + 1) · RL = −20·log₁₀ Γ · ML = −10·log₁₀(1 − Γ²)')}
      <ul><li>VSWR 1.5 ← انعكاس 4%، فقد 0.18 dB (جيد)</li><li>VSWR 2.0 ← انعكاس 11%، فقد 0.51 dB (مقبول)</li><li>VSWR 3.0 ← انعكاس 25%، فقد 1.25 dB (سيئ؛ يسخن المرسل)</li></ul>
      <p>تشغيل المرسل بدون هوائي يجعل VSWR لا نهائيًا وقد يحرق جهاز VTX.</p>` },
    { t: '8. فقد الكابلات والموصلات', b: `
      <p>يزداد فقد الكابل المحوري تقريبًا بنسبة √f. على 5.8 GHz يكون فقد 1 m من RG174 ≈ 2.7 dB، أي يُفقد <b>أكثر من نصف</b> القدرة.</p>
      <ul><li>اجعل الكابلات على الطائرة أقصر ما يمكن؛ وركّب الهوائي مباشرة على VTX إن أمكن.</li><li>إذا لزم كابل طويل في المحطة الأرضية فاستخدم كابلًا سميكًا مثل LMR-400 أو انقل المستقبل إلى جوار الهوائي.</li><li>كل موصل/محوّل ≈ 0.1–0.4 dB. لا تخلط بين SMA وRP-SMA (عدم وجود الدبوس المركزي يعني عدم وجود اتصال!).</li></ul>` },
    { t: '9. الاستقطاب', b: `
      <p>هو اتجاه اهتزاز المجال الكهربائي. قد يكون خطيًا (رأسي V / أفقي H) أو دائريًا (RHCP يميني / LHCP يساري).</p>
      <ul><li>V ↔ H: لا نهائي نظريًا، وعمليًا فقد ≈20 dB.</li><li>خطي ↔ دائري: دائمًا 3 dB.</li><li>RHCP ↔ LHCP: ‏15–25 dB. يجب أن يكون المرسل والمستقبل بالاتجاه نفسه.</li><li>عندما تميل الطائرة ينشأ فرق زاوية في الهوائيات الخطية؛ فقد 3 dB عند 45°. لهذا تُفضَّل الهوائيات الدائرية في FPV. كما أن الإشارة المنعكسة ينقلب اتجاهها فيقل تشوّه تعدد المسارات.</li></ul>` },
    { t: '10. كسب الهوائي وعرض الحزمة', b: `
      <p>الهوائي لا يولّد طاقة؛ بل يركّزها في اتجاهات معيّنة. كلما زاد الكسب ضاقت الحزمة.</p>
      ${F('G ≈ 29000 / (θ<sub>H</sub> · θ<sub>V</sub>)   (linear; dBi = 10·log₁₀ G)')}
      <p>لوح Maple ‏17 dBi: ‏<span dir="ltr">H 16° × V 40° → 29000 / 640 ≈ 45× ≈ 16.6 dBi ✓</span>. الحزمة الضيقة تعني فقدًا سريعًا للإشارة عندما تخرج الطائرة منها: −3 dB عند حافة الحزمة، و≈ −12 dB عند ضعف تلك الزاوية. استخدم بند "فقد التوجيه" لذلك.</p>
      <p>في الهوائيات الشاملة يضيّق الكسب الحزمة الرأسية: قد لا "يرى" هوائي شامل عالي الكسب طائرة تحلّق قريبًا فوقه.</p>` },
    { t: '11. الحساسية والضوضاء وهامش الخفوت', b: `
      ${F('Noise floor = −174 dBm/Hz + 10·log₁₀(BW Hz) + NF')}
      <p>الحساسية هي أضعف إشارة يستطيع المستقبل فكّها مع بقاء معدل الأخطاء مقبولًا. كلما ضاق عرض النطاق تحسّنت الحساسية؛ لذلك يصل LoRa ‏(ELRS وNB20 وأمثالهما) إلى −115 dBm بينما يكون فيديو 20 MHz حول −90 dBm.</p>
      <p><b>هامش الخفوت (fade margin):</b> هامش أمان لتعدد المسارات ودوران الطائرة وتظليل الهيكل والتداخل. التوصيات: 10 dB مع خط رؤية واضح، و15–20 dB في الضواحي/المناطق المشجرة، و20 dB+ لوصلة تحكم حرجة.</p>` },
    { t: '12. الانتشار متعدد المسارات والعوائق', b: `
      <p>تنعكس الإشارة عن الأرض والمباني والماء وتصل إلى المستقبل في أوقات مختلفة؛ فتقوّي الموجات بعضها أو تُلغي بعضها (انخفاضات مفاجئة 10–20 dB). الحلول: الاستقطاب الدائري، مستقبل التنوّع (diversity)، رفع الهوائي، وتقنية OFDM في الأنظمة الرقمية.</p>
      <p>تعتمد العوائق على التردد: يتجاوز 900 MHz الأشجار والمباني أفضل بكثير من 5.8 GHz. يحتوي تبويب الجداول على قيم فقد العوائق النموذجية.</p>` },
    { t: '13. نصائح عملية للطائرات المسيّرة', b: `
      <ul>
        <li><b>اختيار التردد:</b> 900 MHz للتحكم (المدى، اختراق العوائق)، و5.8 GHz للفيديو (عرض النطاق). لا تستخدم نظامين على التردد نفسه.</li>
        <li><b>افصل الهوائيات:</b> اترك مسافة بين هوائيات GPS والتحكم والفيديو؛ فيديو 1.2 GHz قد يشوّش على GPS.</li>
        <li><b>تظليل الهيكل:</b> ألياف الكربون تحجب الترددات الراديوية؛ ضع الهوائيات خارج الهيكل ومتعامدة على بعضها.</li>
        <li><b>المحطة الأرضية:</b> التنوّع بين هوائي شامل وآخر موجّه (patch/panel) هو أفضل تركيبة. استخدم نظام تتبّع (tracker) للكسب العالي.</li>
        <li><b>الكسب بدل القدرة:</b> كسب هوائي +6 dB يعطي المدى نفسه الذي يعطيه رفع قدرة المرسل 4 أضعاف، دون استهلاك البطارية أو تجاوز الحدود القانونية (انتبه لحد EIRP).</li>
        <li><b>الحدود القانونية:</b> في تركيا/الاتحاد الأوروبي الحدود العامة هي 100 mW EIRP لنطاق 2.4 GHz و25 mW EIRP لنطاق SRD ‏5.8 GHz؛ وتختلف القواعد لرخص الهواة والاستخدام العسكري/المؤسسي.</li>
        <li><b>الاختبار:</b> أجرِ اختبار مدى على الأرض قبل الطيران (وضع range test في ELRS)، وراقب قيم RSSI/LQ.</li>
      </ul>` }
  ]);
})();
