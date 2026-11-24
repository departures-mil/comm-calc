// Comm Calc preload: window.fcHost (ortak çekirdek: pencere düğmeleri, güncelleme, indirme) + window.api (uygulama verisi, LAN).
// Eski update:check / update:install (imzalı guncelleme.zip) kanalları kaldırıldı; güncelleme ortak çekirdekte (FC.updater).
const { contextBridge, ipcRenderer } = require('electron');
require('./cekirdek/electron/fc-preload.js');
const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('api', {
  platform: 'desktop',
  shell: 'fc',
  info: call('app:info'),
  load: call('store:load'),
  save: call('store:save'),
  saveText: call('file:saveText'),
  openText: call('file:openText'),
  openUrl: call('shell:open'),
  openDataDir: call('shell:dataDir'),
  restart: call('app:restart'),
  updateOk: call('update:ok'),
  lan: {
    start: call('lan:start'), stop: call('lan:stop'), state: call('lan:state'),
    discover: call('lan:discover'), sync: (host, pin, data) => ipcRenderer.invoke('lan:sync', { host, pin, data }),
    onScan: cb => ipcRenderer.on('lan:scan', (e, v) => cb(v)),
    onIncoming: handler => ipcRenderer.on('lan:incoming', async (e, { id, data }) => {
      let r; try { r = await handler(data); } catch (err) { r = { error: String(err.message || err) }; }
      ipcRenderer.send('lan:reply', { id, data: r });
    })
  }
});
