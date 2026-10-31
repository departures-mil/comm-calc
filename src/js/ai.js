// Ürün tanıma: çevrimdışı metin ayrıştırıcı + çevrimiçi yapay zekâ (Firebase AI Logic veya Gemini API anahtarı).
const AI = (() => {
  const ANT_TYPES = ['dipole', 'monopole', 'collinear', 'cloverleaf', 'skew', 'patch', 'panel', 'helical', 'yagi', 'lpda', 'sector', 'dish', 'horn', 'biquad', 'qha', 'other'];
  const PROMPT = `Sen bir RF mühendisisin. Verilen ürün görselinden, metinden veya ürün adından İHA haberleşme cihazının teknik bilgilerini çıkar.
Yalnızca JSON döndür, açıklama yazma. Bilinmeyen alanlar null olsun; uydurma değer yazma.
Alanlar:
{"type": "tx" | "rx" | "antenna" | "cable" | "other",
 "name": "ürün adı/modeli", "brand": "marka",
 "fMin": MHz sayı, "fMax": MHz sayı,
 "power": sayı (verici çıkış gücü; birden fazla seçenek varsa en yükseği), "powerUnit": "mW" | "W" | "dBm",
 "sens": alıcı hassasiyeti dBm (negatif sayı),
 "gain": anten kazancı dBi, "bwH": yatay hüzme genişliği derece, "bwV": dikey hüzme genişliği derece,
 "pol": "V" | "H" | "RHCP" | "LHCP" | null, "antType": ${JSON.stringify(ANT_TYPES)} içinden biri veya null,
 "connector": "SMA" | "RP-SMA" | "MMCX" | "MCX" | "U.FL / IPEX" | "N" | ... ,
 "channels": "kanal bilgisi metni",
 "notes": "diğer önemli teknik bilgilerin Türkçe kısa özeti (gerilim, akım, boyut, ağırlık, modülasyon, menzil vb.)",
 "confidence": 0-1 arası güven}
Not: "5.8G" 5725–5875 MHz civarı, "2.4G" 2400–2483 MHz demektir; açık aralık yazıyorsa onu kullan. "V40 H16" gibi ifadeler dikey/yatay hüzme genişliğidir.`;

  // ---- Çevrimdışı ayrıştırıcı (yapıştırılan teknik metin)
  function parseText(t) {
    const s = ' ' + String(t || '').replace(/−|–|—/g, '-').replace(/,(\d)/g, '.$1') + ' ';
    const o = {};
    let m;
    if ((m = s.match(/(sensitivity|hassasiyet|duyarl[ıi]l[ıi]k|rx sens\w*)[^\d-]{0,20}(-\s?\d{2,3}(\.\d+)?)\s*dBm/i)) || (m = s.match(/()(-\s?(?:8|9|1[0-4])\d(\.\d+)?)\s*dBm/))) o.sens = parseFloat(m[2].replace(/\s/g, ''));
    if ((m = s.match(/(\d{1,2}(\.\d+)?)\s*dBi/i))) o.gain = parseFloat(m[1]);
    else if ((m = s.match(/(gain|kazan[çc])[^\d]{0,10}(\d{1,2}(\.\d+)?)\s*dB\b/i))) o.gain = parseFloat(m[2]);
    else if ((m = s.match(/(\d{1,2}(\.\d+)?)\s*dBd/i))) o.gain = +(parseFloat(m[1]) + 2.15).toFixed(2);
    const pw = [...s.matchAll(/(\d+(\.\d+)?)\s*(mW|W)\b/g)].map(x => ({ v: parseFloat(x[1]), u: x[3], mw: x[3] === 'W' ? parseFloat(x[1]) * 1000 : parseFloat(x[1]) }));
    if (pw.length) { const b = pw.sort((a, c) => c.mw - a.mw)[0]; o.power = b.v; o.powerUnit = b.u; }
    else if ((m = s.match(/(output|çıkış|tx)\s*(power|gücü)?[^\d]{0,12}(\d{1,2}(\.\d+)?)\s*dBm/i))) { o.power = parseFloat(m[3]); o.powerUnit = 'dBm'; }
    if ((m = s.match(/(\d{3,4}(\.\d+)?)\s*(?:MHz)?\s*[-~]\s*(\d{3,4}(\.\d+)?)\s*MHz/i))) { o.fMin = parseFloat(m[1]); o.fMax = parseFloat(m[3]); }
    else if ((m = s.match(/(\d(\.\d+)?)\s*(?:GHz)?\s*[-~]\s*(\d(\.\d+)?)\s*GHz/i))) { o.fMin = parseFloat(m[1]) * 1000; o.fMax = parseFloat(m[3]) * 1000; }
    else if ((m = s.match(/\b(5\.8|5\.7|2\.4|1\.2|1\.3|0\.9)\s*G(Hz)?\b/i))) {
      const c = { '5.8': [5725, 5875], '5.7': [5650, 5850], '2.4': [2400, 2483], '1.2': [1080, 1360], '1.3': [1080, 1360], '0.9': [868, 928] }[m[1]]; o.fMin = c[0]; o.fMax = c[1];
    } else if ((m = s.match(/\b(433|868|900|915)\s*MHz/i))) { const c = { 433: [433, 435], 868: [863, 870], 900: [868, 928], 915: [902, 928] }[m[1]]; o.fMin = c[0]; o.fMax = c[1]; }
    if ((m = s.match(/\bV\s*:?\s*(\d{1,3})\s*°?\s*[,/ ]*\s*H\s*:?\s*(\d{1,3})/i))) { o.bwV = +m[1]; o.bwH = +m[2]; }
    else if ((m = s.match(/\bH\s*:?\s*(\d{1,3})\s*°?\s*[,/ ]*\s*V\s*:?\s*(\d{1,3})/i))) { o.bwH = +m[1]; o.bwV = +m[2]; }
    else if ((m = s.match(/(beam\s*width|hüzme)[^\d]{0,15}(\d{1,3})\s*°?/i))) { o.bwH = o.bwV = +m[2]; }
    if (/\bRHCP\b/i.test(s)) o.pol = 'RHCP'; else if (/\bLHCP\b/i.test(s)) o.pol = 'LHCP';
    else if (/vertical|dikey polar/i.test(s)) o.pol = 'V'; else if (/horizontal|yatay polar/i.test(s)) o.pol = 'H';
    if ((m = s.match(/\b(RP-SMA|SMA|MMCX|MCX|U\.FL|IPEX|N-type|TNC|BNC)\b/i))) o.connector = /u\.fl|ipex/i.test(m[1]) ? 'U.FL / IPEX' : m[1].toUpperCase().replace('N-TYPE', 'N');
    if ((m = s.match(/(\d{1,3})\s*(CH|kanal|channels?)\b/i))) o.channels = m[1] + ' kanal';
    if (/plate|panel/i.test(s)) o.antType = 'panel'; else if (/patch/i.test(s)) o.antType = 'patch'; else if (/yagi/i.test(s)) o.antType = 'yagi';
    else if (/helical|helix/i.test(s)) o.antType = 'helical'; else if (/clover|pagoda|lollipop/i.test(s)) o.antType = 'cloverleaf'; else if (/dipole|dipol/i.test(s)) o.antType = 'dipole';
    if ((m = s.match(/\b(PN|P\/N|Model)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i))) o.name = m[2];
    // Tür tahmini
    o.type = o.gain !== undefined || o.antType ? 'antenna' : o.sens !== undefined ? 'rx' : o.power !== undefined ? 'tx' : 'other';
    if (/receiver|alıcı|\brx\b/i.test(s) && o.sens !== undefined) o.type = 'rx';
    if (o.bwH && o.bwH >= 360) o.bwH = 360;
    return o;
  }

  // Programla gelen Firebase projesi (web yapılandırması herkese açık olacak şekilde tasarlanmıştır)
  const BUILTIN = { apiKey: 'AIzaSyB12RFS6ENPpmnnPsETfjedNH-3hmNWQvA', authDomain: 'comm-calc-103111111.firebaseapp.com', projectId: 'comm-calc-103111111',
    storageBucket: 'comm-calc-103111111.firebasestorage.app', messagingSenderId: '16916427114', appId: '1:16916427114:web:789decedfd76923200b513' };
  const MODELS = ['gemini-3.8-flash', 'gemini-flash-latest'];
  // ---- Yapılandırma: kullanıcının yapıştırdığı firebaseConfig bloğunu esnek biçimde okur; yoksa programla gelen proje
  function firebaseConfig() {
    const raw = (Store.data.settings.firebase || '').trim();
    if (!raw) return BUILTIN;
    try { return JSON.parse(raw); } catch {}
    const o = {};
    for (const k of ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId']) {
      const m = raw.match(new RegExp(k + '\\s*:\\s*["\']([^"\']+)["\']'));
      if (m) o[k] = m[1];
    }
    return o.apiKey && o.projectId ? o : null;
  }
  const available = () => true;
  const extractJson = t => { const m = String(t).match(/\{[\s\S]*\}/); if (!m) throw new Error('Yanıtta JSON yok'); return JSON.parse(m[0]); };

  // Yoğunluk veya kullanımdan kalkmış model hatasında sıradaki modelle tekrar denenir
  const retryable = e => /high demand|overloaded|unavailable|no longer available|not found|503|429|RESOURCE_EXHAUSTED/i.test(String(e && e.message));
  async function generate(parts) {
    const s = Store.data.settings;
    const list = [...new Set([(s.aiModel || '').trim(), ...MODELS].filter(Boolean))];
    let err;
    for (const model of list) {
      for (let i = 0; i < 2; i++) {
        try { return await generateWith(model, parts); }
        catch (e) { err = e; if (!retryable(e)) throw e; if (/no longer available|not found/i.test(e.message)) break; await new Promise(r => setTimeout(r, 1500)); }
      }
    }
    throw err;
  }
  // parts: [{text}] veya [{inlineData:{mimeType,data}}]
  async function generateWith(model, parts) {
    const s = Store.data.settings;
    const key = (s.geminiKey || '').trim();
    // Kullanıcı kendi Gemini anahtarını girdiyse o, yoksa Firebase AI Logic kullanılır
    const cfg = key ? null : firebaseConfig();
    if (cfg && window.CCFirebase) return window.CCFirebase.generate(cfg, model, parts);
    if (!key) throw new Error('Çevrimiçi tanıma modülü yüklenemedi.');
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts: parts.map(p => p.inlineData ? { inline_data: { mime_type: p.inlineData.mimeType, data: p.inlineData.data } } : p) }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
    return ((j.candidates || [])[0] || {}).content.parts.map(p => p.text || '').join('');
  }
  // images: dataURL dizisi; text: teknik metin; query: ürün adı
  async function recognize({ images, text, query }) {
    const parts = [{ text: PROMPT }];
    for (const d of images || []) { const m = d.match(/^data:([^;]+);base64,(.*)$/); if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } }); }
    if (text) parts.push({ text: 'Teknik metin:\n' + text });
    if (query) parts.push({ text: 'Ürün adı/modeli: ' + query + '\nBu ürünü biliyorsan bilinen teknik değerlerini doldur; emin olmadığın değerleri null bırak ve notes alanında "doğrulanmalı" yaz.' });
    const out = extractJson(await generate(parts));
    for (const k of Object.keys(out)) if (out[k] === null || out[k] === '') delete out[k];
    return out;
  }
  return { parseText, recognize, available, firebaseConfig, ANT_TYPES };
})();
