'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');
async function invoke(name, ...args) {
  const result = await ipcRenderer.invoke(`scanner:${name}`, ...args);
  if (!result.ok) throw new Error(result.error);
  return result.value;
}
contextBridge.exposeInMainWorld('scanner', {
  state: () => invoke('state'),
  choose: (kind, folder) => invoke('pick', kind, Boolean(folder)),
  drop: (files, kind) => invoke('drop', Array.from(files).map(file => webUtils.getPathForFile(file)).filter(Boolean), kind),
  scan: threshold => invoke('scan', threshold), cancel: () => invoke('cancel'), demo: () => invoke('demo'),
  remove: (kind, ids) => invoke('remove', kind, ids), settings: settings => invoke('settings', settings),
  export: (id, format) => invoke('export', id, format), clear: () => invoke('clear'),
  reveal: id => invoke('reveal', id), window: action => invoke('window', action),
  onProgress: callback => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on('scanner:progress', handler);
    return () => ipcRenderer.removeListener('scanner:progress', handler);
  }
});
