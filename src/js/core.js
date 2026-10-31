// Ortak yardımcılar: veri deposu, DOM kısayolları, biçimlendirme, bildirim ve pencere (modal).
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d) => { const x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : (d === undefined ? 0 : d); };
// Sayı biçimlendirme (Türkçe ondalık virgül)
function fmt(x, d) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  if (x === Infinity) return '∞'; if (x === -Infinity) return '−∞';
  d = d === undefined ? 2 : d;
  if (Math.abs(x) < 0.5 * Math.pow(10, -d)) x = 0;
  return x.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
}
function fmtPower(dbm) {
  const mw = RF.dbmToMw(dbm);
  if (mw >= 1000) return fmt(mw / 1000, mw >= 10000 ? 1 : 2) + ' W';
  if (mw >= 1) return fmt(mw, mw >= 100 ? 0 : 1) + ' mW';
  if (mw >= 1e-3) return fmt(mw * 1000, 1) + ' µW';
  if (mw >= 1e-6) return fmt(mw * 1e6, 1) + ' nW';
  return fmt(mw * 1e9, 2) + ' pW';
}
function fmtDist(km) {
  if (km === null || km === undefined) return '—';
  if (km >= 1e5) return '> 100.000 km';
  return km >= 1 ? fmt(km, km >= 100 ? 0 : 2) + ' km' : fmt(km * 1000, 0) + ' m';
}

const Store = {
  data: null, timer: null,
  async init() {
    let d = null;
    try { d = window.api ? await window.api.load() : JSON.parse(localStorage.getItem('commcalc') || 'null'); } catch {}
    d = d || {};
    d.projects = d.projects || [];
    d.library = d.library || [];
    d.settings = Object.assign({ theme: 'dark', autoUpdate: true, aiModel: 'gemini-3.8-flash', firebase: '', geminiKey: '' }, d.settings || {});
    if (d.settings.aiModel === 'gemini-2.5-flash') d.settings.aiModel = 'gemini-3.8-flash';
    d.seeded = d.seeded || [];
    // Başlangıç kütüphanesi: bir kez eklenir; kullanıcı silerse geri gelmez
    for (const s of DATA.SEED) if (!d.seeded.includes(s.id)) { d.library.push(Object.assign({}, s)); d.seeded.push(s.id); }
    if (!d.projects.length) { const p = DATA.defaultProject('Örnek: 5.8G video linki'); d.projects.push(p); d.currentId = p.id; }
    if (!d.projects.find(p => p.id === d.currentId)) d.currentId = d.projects[0].id;
    this.data = d;
  },
  save() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 300);
  },
  async flush() {
    clearTimeout(this.timer);
    try { if (window.api) await window.api.save(this.data); else localStorage.setItem('commcalc', JSON.stringify(this.data)); }
    catch (e) { toast('Kaydedilemedi: ' + e.message, 'err'); }
  },
  get project() { return this.data.projects.find(p => p.id === this.data.currentId); }
};
window.addEventListener('beforeunload', () => { if (Store.timer) Store.flush(); });

function toast(msg, kind) {
  const t = document.createElement('div');
  t.className = 'toast ' + (kind || '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
}
// Basit modal; body HTML, buttons [{label, cls, onClick(close) -> false ise kapanmaz}]
function modal(title, body, buttons) {
  const w = document.createElement('div');
  w.className = 'modal-wrap';
  w.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-h"><h3>${esc(title)}</h3><button class="icon-btn" data-x aria-label="Kapat">✕</button></div><div class="modal-b"></div><div class="modal-f"></div></div>`;
  const b = $('.modal-b', w);
  if (typeof body === 'string') b.innerHTML = body; else b.appendChild(body);
  const close = () => w.remove();
  $('[data-x]', w).onclick = close;
  w.addEventListener('mousedown', e => { if (e.target === w) close(); });
  for (const bt of (buttons || [{ label: 'Kapat' }])) {
    const el = document.createElement('button');
    el.className = 'btn ' + (bt.cls || '');
    el.textContent = bt.label;
    el.onclick = async () => { if (bt.onClick) { const r = await bt.onClick(close, w); if (r === false) return; } close(); };
    $('.modal-f', w).appendChild(el);
  }
  document.body.appendChild(w);
  return { el: w, close };
}
function confirmBox(msg, okLabel) {
  return new Promise(res => modal('Onay', `<p>${esc(msg)}</p>`, [{ label: 'Vazgeç', onClick: () => res(false) }, { label: okLabel || 'Tamam', cls: 'primary', onClick: () => res(true) }]));
}
function openUrl(u) { if (window.api) window.api.openUrl(u); else window.open(u, '_blank', 'noopener'); }
async function downloadText(name, text, mime) {
  if (window.api) return window.api.saveText({ name, text });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime || 'application/json' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function pickTextFile() {
  if (window.api) return window.api.openText({});
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = () => { const f = i.files[0]; if (!f) return res(null); const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(f); };
    i.click();
  });
}
// Bölüm kayıt sistemi: her ekran Views[ad] = { title, render(root) }
const Views = {};
