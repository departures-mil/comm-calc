const { contextBridge, ipcRenderer } = require('electron');
const call = ch => (...a) => ipcRenderer.invoke(ch, ...a);

contextBridge.exposeInMainWorld('api', {
  platform: 'desktop',
  info: call('app:info'),
  load: call('store:load'),
  save: call('store:save'),
  saveText: call('file:saveText'),
  openText: call('file:openText'),
  openUrl: call('shell:open'),
  openDataDir: call('shell:dataDir'),
  checkUpdate: call('update:check'),
  installUpdate: call('update:install'),
  restart: call('update:restart'),
  updateOk: call('update:ok'),
  onUpdateProgress: cb => ipcRenderer.on('update:progress', (e, p) => cb(p)),
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
