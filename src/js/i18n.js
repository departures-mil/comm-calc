// Dil desteği (Türkçe / English / العربية).
// Kaynak metinler Türkçedir. Sözlük anahtarı Türkçe metnin kendisidir; içindeki sayılar
// değişken kabul edilir (ör. "−3 dB hüzme: 40°" anahtarı "−3 dB hüzme: 72°" metnini de çevirir).
// Ekrana eklenen her metin düğümü ve placeholder/title/aria-label otomatik çevrilir.
const I18N = (() => {
  const LANGS = { tr: { name: 'Türkçe', dir: 'ltr', locale: 'tr-TR' }, en: { name: 'English', dir: 'ltr', locale: 'en-US' }, ar: { name: 'العربية', dir: 'rtl', locale: 'en-US' } };
  const NUM = /[-−+]?\d+(?:[.,]\d+)*/g;
  const packs = {};
  let lang = 'tr', obs = null;
  const skel = s => s.replace(NUM, '#');
  // Sözlüğü sayı iskeletine göre derle: çevirideki sayılar anahtardaki sırasına bağlanır
  const pack = code => packs[code] || (packs[code] = { map: new Map(), content: {} });
  function put(code, k, v) {
    if (!v) return;
    const kn = k.match(NUM) || [], used = [];
    const tpl = kn.length ? v.replace(NUM, m => { const i = kn.findIndex((x, j) => x === m && !used[j]); if (i < 0) return m; used[i] = 1; return '{' + i + '}'; }) : v;
    pack(code).map.set(skel(k.trim()), { tpl, n: kn.length });
  }
  // rows: [[türkçe, english, arabic], ...]
  function rows(list) { for (const [k, en, ar] of list) { put('en', k, en); put('ar', k, ar); } }
  function addContent(code, key, val) { pack(code).content[key] = val; }
  function lookup(s) {
    const p = packs[lang]; if (!p) return null;
    const core = s.trim(); if (!core || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(core)) return null;
    const e = p.map.get(skel(core)); if (!e) return null;
    const nums = core.match(NUM) || [];
    const out = e.n ? e.tpl.replace(/\{(\d+)\}/g, (m, i) => nums[i] !== undefined ? nums[i] : m) : e.tpl;
    const lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0];
    return lead + out + tail;
  }
  function t(s, vars) {
    let r = lang !== 'tr' ? (lookup(String(s)) || s) : s;
    if (vars) r = r.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
    return r;
  }
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1 };
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  // Arapçada sayı + birim dizilerini soldan sağa yalıtır (ör. "−86.5 dBm" ters dönmesin)
  const ARAB = /[\u0600-\u06FF]/, RUN = /[-−+±≈~]?\d[\d.,]*(?:\s?(?:[A-Za-zµΩ°%][A-Za-zµΩ/²³₀-₉]*))?(?:\s?[@×]\s?[-−+]?\d[\d.,]*(?:\s?[A-Za-z]+)?)*/g;
  function isolate(s) {
    if (s.indexOf('\u2066') >= 0 || !/\d/.test(s)) return s;
    if (!ARAB.test(s)) { const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/); return m[1] + '\u2066' + m[2] + '\u2069' + m[3]; }
    return s.replace(RUN, x => '\u2066' + x + '\u2069');
  }
  function trText(n) {
    let r = lookup(n.data); if (r === null) r = n.data;
    if (lang === 'ar') r = isolate(r);
    if (r !== n.data) n.data = r;
  }
  function trEl(el) {
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const r = lookup(v); if (r !== null && r !== v) el.setAttribute(a, r); } }
  }
  function walk(root) {
    if (lang === 'tr' || !root) return;
    if (root.nodeType === 3) { if (!(root.parentNode && (SKIP[root.parentNode.nodeName] || root.parentNode.closest && root.parentNode.closest('[data-notr]')))) trText(root); return; }
    if (root.nodeType !== 1 || root.closest('[data-notr]')) return;
    if (SKIP[root.nodeName]) return trEl(root);
    trEl(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => { if (n.nodeType === 1 && (SKIP[n.nodeName] || n.hasAttribute('data-notr'))) { if (SKIP[n.nodeName]) trEl(n); return NodeFilter.FILTER_REJECT; } return NodeFilter.FILTER_ACCEPT; } });
    let n; while ((n = w.nextNode())) { if (n.nodeType === 3) trText(n); else trEl(n); }
  }
  function watch() {
    if (obs) return;
    obs = new MutationObserver(list => {
      if (lang === 'tr') return;
      for (const m of list) {
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') walk(m.target);
        else if (m.type === 'attributes') trEl(m.target);
      }
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  function set(code) {
    lang = LANGS[code] && (code === 'tr' || packs[code]) ? code : 'tr';
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGS[lang].dir;
    if (document.body) { watch(); walk(document.body); }
  }
  const content = (key, fallback) => (lang !== 'tr' && packs[lang] && packs[lang].content[key]) || fallback;
  return { LANGS, rows, addContent, set, t, content, walk, get lang() { return lang; }, get locale() { return LANGS[lang].locale; } };
})();
const t = I18N.t;
