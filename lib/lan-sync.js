// İnternetsiz eşitleme (aynı modem): masaüstü sunucu + istemci.
// Arayüz verisini birleştirmeyi arayüz yapar (src/js/lan.js); burası yalnızca taşır.
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const PORT = 47821;
let server = null, pin = null, waits = {}, onIncoming = null;

function localIps() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) {
    if (a.family === 'IPv4' && !a.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address)) out.push(a.address);
  }
  return out;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-pin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

function start(incoming) {
  stop();
  onIncoming = incoming;
  pin = String(100000 + crypto.randomInt(900000));
  server = http.createServer((req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (req.method === 'GET' && req.url === '/cc-ping') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ app: 'commcalc', name: os.hostname() }));
    }
    if (req.method === 'POST' && req.url === '/cc-esitle') {
      if (req.headers['x-pin'] !== pin) { res.writeHead(403); return res.end(); }
      const parts = []; let size = 0;
      req.on('data', c => { size += c.length; if (size > 50e6) req.destroy(); else parts.push(c); });
      req.on('end', async () => {
        try {
          const theirs = JSON.parse(Buffer.concat(parts).toString('utf8'));
          const mine = await onIncoming(theirs);       // arayüz birleştirir, kendi verisini döndürür
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(mine));
        } catch (e) { res.writeHead(500); res.end(String(e.message || e)); }
      });
      return;
    }
    res.writeHead(404); res.end();
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(PORT, '0.0.0.0', () => ok({ pin, ips: localIps(), port: PORT }));
  });
}

function stop() { if (server) try { server.close(); } catch {} server = null; pin = null; }

function request(host, path, { method = 'GET', body, pin: p, timeout = 900 } = {}) {
  return new Promise((ok, fail) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const rq = http.request({ host, port: PORT, path, method, timeout,
      headers: Object.assign({ 'content-type': 'application/json' }, p ? { 'x-pin': p } : {}, data ? { 'content-length': data.length } : {}) }, rs => {
      const parts = [];
      rs.on('data', c => parts.push(c));
      rs.on('end', () => ok({ status: rs.statusCode, text: Buffer.concat(parts).toString('utf8') }));
    });
    rq.on('timeout', () => rq.destroy(new Error('timeout')));
    rq.on('error', fail);
    if (data) rq.write(data);
    rq.end();
  });
}

async function discover(progress) {
  const found = [];
  for (const ip of localIps()) {
    const base = ip.slice(0, ip.lastIndexOf('.') + 1);
    const all = []; for (let i = 1; i < 255; i++) if (base + i !== ip) all.push(base + i);
    for (let i = 0; i < all.length; i += 48) {
      await Promise.all(all.slice(i, i + 48).map(async h => {
        try { const r = await request(h, '/cc-ping'); if (r.status === 200 && r.text.includes('commcalc')) found.push(h); } catch {}
      }));
      if (progress) progress(Math.min(1, (i + 48) / all.length));
    }
  }
  return found;
}

async function sync(host, p, mine) {
  let r;
  try { r = await request(String(host).trim(), '/cc-esitle', { method: 'POST', body: mine, pin: String(p).trim(), timeout: 60000 }); }
  catch { throw new Error('unreachable'); }
  if (r.status === 403) throw new Error('pin');
  if (r.status !== 200) throw new Error('http ' + r.status);
  return JSON.parse(r.text);
}

module.exports = { start, stop, discover, sync, localIps, get hosting() { return !!server; }, get pin() { return pin; }, PORT };
