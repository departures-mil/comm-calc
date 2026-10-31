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
  updateOk: call('update:ok')
});
