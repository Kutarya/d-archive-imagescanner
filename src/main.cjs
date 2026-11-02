'use strict';
const { app, BrowserWindow, ipcMain, dialog, protocol, session, shell, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker } = require('node:worker_threads');
const { Store } = require('./lib/store.cjs');

if (process.env.NODE_ENV === 'test' && process.env.IMAGESCANNER_DATA_DIR) app.setPath('userData', process.env.IMAGESCANNER_DATA_DIR);
protocol.registerSchemesAsPrivileged([{ scheme: 'scanner', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
app.setName('ImageScanner');
let win, store, activeJob = null, mutationLock = false;
let mutationComplete = Promise.resolve();
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
  app.whenReady().then(bootstrap).catch(error => {
    dialog.showErrorBox('ImageScanner açılamadı', error.message); app.quit();
  });
}

function send(channel, value) { if (win && !win.isDestroyed()) win.webContents.send(channel, value); }
function checkSender(event) {
  if (event.senderFrame?.url !== 'scanner://app/index.html') throw new Error('İstek kaynağı doğrulanamadı.');
}
function route(name, handler, mutating = false) {
  ipcMain.handle(`scanner:${name}`, async (event, ...args) => {
    try {
      checkSender(event);
      if (mutating) {
        if (mutationLock || activeJob) throw new Error('Devam eden işlemin tamamlanmasını bekleyin.');
        mutationLock = true;
      }
      let finishMutation;
      if (mutating) mutationComplete = new Promise(resolve => { finishMutation = resolve; });
      try { return { ok: true, value: await handler(...args) }; }
      finally { if (mutating) { mutationLock = false; finishMutation(); } }
    } catch (error) { return { ok: false, error: error.message }; }
  });
}
function validKind(kind) { if (kind !== 'library' && kind !== 'queries') throw new Error('Geçersiz koleksiyon.'); return kind; }
function validPaths(paths) {
  if (!Array.isArray(paths) || paths.length > 10000 || paths.some(p => typeof p !== 'string' || !path.isAbsolute(p))) {
    throw new Error('Geçersiz dosya seçimi.');
  }
  return paths;
}

async function workerTask(data, onImage) {
  const worker = new Worker(path.join(__dirname, 'worker.cjs'), { workerData: data });
  activeJob = { worker, task: data.task };
  send('progress', { phase: 'Hazırlanıyor', current: 0, total: 0, task: data.task });
  try {
    return await new Promise((resolve, reject) => {
      let settled = false;
      worker.on('message', message => {
        if (message.type === 'image') onImage?.(message.image);
        if (message.type === 'progress') send('progress', { ...message, task: data.task });
        if (message.type === 'done') { settled = true; resolve(message.result); }
        if (message.type === 'failure') { settled = true; reject(new Error(message.error)); }
      });
      worker.on('error', reject);
      worker.on('exit', code => { if (!settled) reject(new Error(`İşlem beklenmedik şekilde durdu (${code}).`)); });
    });
  } finally { activeJob = null; send('progress', null); }
}

async function importImages(paths, kind) {
  validKind(kind); validPaths(paths);
  if (!paths.length) return { cancelled: true, added: 0, state: store.snapshot() };
  const limit = kind === 'library' ? 10000 : 100;
  const images = [], ids = new Set(store.data[kind].map(i => i.id));
  let overflow = 0;
  const result = await workerTask({ task: 'import', paths, cacheDir: store.cacheDir,
    existing: store.data[kind].map(({ path, size, mtimeMs }) => ({ path, size, mtimeMs })), limit }, image => {
    if (ids.has(image.id) || ids.size < limit) { ids.add(image.id); images.push(image); }
    else overflow++;
  });
  store.upsert(kind, images);
  await store.save();
  return { ...result, added: images.length, overflow: overflow + (result.overflow || 0), state: store.snapshot() };
}

async function pick(kind, folder = false) {
  validKind(kind);
  const selected = await dialog.showOpenDialog(win, {
    title: kind === 'library' ? 'Koleksiyonunuza görsel ekleyin' : 'Karşılaştırılacak görselleri seçin',
    properties: folder ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections'],
    filters: folder ? [] : [{ name: 'Görseller', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'tif', 'tiff'] }]
  });
  if (selected.canceled) return { cancelled: true, added: 0, state: store.snapshot() };
  return importImages(selected.filePaths, kind);
}

async function scan(threshold) {
  threshold = Number(threshold);
  if (!Number.isFinite(threshold) || threshold < 80 || threshold > 100) throw new Error('Eşik 80–100 arasında olmalıdır.');
  if (!store.data.library.length || !store.data.queries.length) throw new Error('Önce koleksiyon ve sorgu görsellerini ekleyin.');
  const started = Date.now();
  const result = await workerTask({ task: 'scan', library: store.data.library, queries: store.data.queries, threshold });
  if (result.cancelled) return { cancelled: true, state: store.snapshot() };
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), threshold,
    libraryCount: store.data.library.length, queryCount: store.data.queries.length,
    durationMs: Date.now() - started, groups: result.groups };
  store.data.history.unshift(record);
  store.data.history = store.data.history.slice(0, 20);
  store.data.settings.threshold = threshold;
  await store.save();
  return { record, state: store.snapshot() };
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
async function exportResults(recordId, format) {
  if (!['csv', 'json'].includes(format)) throw new Error('Geçersiz dışa aktarma biçimi.');
  const record = store.data.history.find(h => h.id === recordId);
  if (!record) throw new Error('Önce bir karşılaştırma çalıştırın.');
  const rows = record.groups.flatMap(group => group.matches.map(match => ({
    query: store.find(group.queryId)?.path || '(kaldırılmış)',
    candidate: store.find(match.imageId)?.path || '(kaldırılmış)',
    score: match.score, kind: match.kind, reason: match.reason
  })));
  const selected = await dialog.showSaveDialog(win, {
    title: 'Karşılaştırma sonuçlarını kaydet', defaultPath: `ImageScanner-${record.createdAt.slice(0, 10)}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }]
  });
  if (selected.canceled || !selected.filePath) return { cancelled: true };
  const content = format === 'json' ? JSON.stringify({ application: 'ImageScanner', version: '1.0.0',
    scan: record, note: 'Puan görsel kopya benzerliğidir; olasılık veya kişi kimliği değildir.', results: rows }, null, 2) :
    '\ufeff' + [['Sorgu', 'Eşleşen dosya', 'Benzerlik puanı', 'Tür', 'Açıklama'],
      ...rows.map(r => [r.query, r.candidate, r.score, r.kind, r.reason])]
      .map(row => row.map(csvCell).join(';')).join('\r\n');
  await fs.writeFile(selected.filePath, content, 'utf8');
  return { path: selected.filePath, count: rows.length };
}

async function demo() {
  const demoRoot = path.join(store.root, 'demo');
  const collectionRoot = path.join(demoRoot, 'koleksiyon');
  const queryRoot = path.join(demoRoot, 'sorgu');
  await fs.mkdir(collectionRoot, { recursive: true });
  await fs.mkdir(queryRoot, { recursive: true });
  const sharp = require('sharp');
  const svg = await fs.readFile(path.join(__dirname, '..', 'assets', 'coast.svg'));
  const base = await sharp(svg).resize(1200, 900).png().toBuffer();
  const queryFile = path.join(queryRoot, 'kiyi-orijinal.png');
  await fs.writeFile(queryFile, base);
  await fs.writeFile(path.join(collectionRoot, 'kiyi-ayni-kopya.png'), base);
  await sharp(base).resize(640).jpeg({ quality: 64 }).toFile(path.join(collectionRoot, 'kiyi-kucuk.jpg'));
  await sharp(base).modulate({ brightness: 1.08, saturation: 0.92 }).webp({ quality: 78 })
    .toFile(path.join(collectionRoot, 'kiyi-renk-duzenleme.webp'));
  await sharp(base).extract({ left: 90, top: 67, width: 1020, height: 765 }).resize(816, 612)
    .jpeg({ quality: 80 }).toFile(path.join(collectionRoot, 'kiyi-hafif-kirpma.jpg'));
  for (const name of ['architecture', 'botanical', 'dunes', 'night']) {
    await sharp(await fs.readFile(path.join(__dirname, '..', 'assets', `${name}.svg`))).resize(1200, 900)
      .jpeg({ quality: 90 }).toFile(path.join(collectionRoot, `${name}.jpg`));
  }
  const imported = await importImages([collectionRoot], 'library');
  if (imported.cancelled) return imported;
  const queries = await importImages([queryFile], 'queries');
  return { ...queries, added: imported.added + queries.added, demo: true };
}

async function bootstrap() {
  app.setAppUserModelId('local.imagescanner.desktop');
  store = await new Store(app.getPath('userData')).open();
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] },
    (_details, callback) => callback({ cancel: true }));
  protocol.handle('scanner', async request => {
    try {
      const url = new URL(request.url);
      if (url.host === 'app') {
        const requested = url.pathname.slice(1);
        if (!['index.html', 'styles.css', 'renderer.js'].includes(requested)) return new Response('Not found', { status: 404 });
        const types = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8' };
        return new Response(await fs.readFile(path.join(__dirname, 'ui', requested)), { headers: {
          'Content-Type': types[requested.split('.').pop()], 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src scanner: data:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
        } });
      }
      if (url.host === 'assets') {
        const requested = url.pathname.slice(1);
        if (!['coast.svg', 'architecture.svg', 'botanical.svg', 'dunes.svg', 'night.svg'].includes(requested)) {
          return new Response('Not found', { status: 404 });
        }
        return new Response(await fs.readFile(path.join(__dirname, '..', 'assets', requested)), {
          headers: { 'Content-Type': 'image/svg+xml', 'X-Content-Type-Options': 'nosniff' }
        });
      }
      if (url.host === 'image') {
        const matched = /^\/([a-f0-9]{24})\/(thumb|original)$/.exec(url.pathname);
        if (!matched) return new Response('Not found', { status: 404 });
        const item = store.find(matched[1]);
        if (!item) return new Response('Not found', { status: 404 });
        const isThumb = matched[2] === 'thumb';
        const mime = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
          avif: 'image/avif', tiff: 'image/tiff', bmp: 'image/bmp' };
        // Display uses the decoded first frame for animated files and TIFF.
        const useCache = isThumb || item.animated || item.format === 'tiff';
        return new Response(await fs.readFile(useCache ? path.join(store.cacheDir, `${item.id}.webp`) : item.path), {
          headers: { 'Content-Type': useCache ? 'image/webp' : mime[item.format] || 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }
        });
      }
      return new Response('Not found', { status: 404 });
    } catch { return new Response('Görsel bulunamadı', { status: 404 }); }
  });

  route('state', async () => {
    if (mutationLock) await mutationComplete;
    return store.snapshot();
  });
  route('pick', pick, true);
  route('drop', (paths, kind) => importImages(paths, kind), true);
  route('scan', scan, true);
  route('cancel', () => { activeJob?.worker.postMessage('cancel'); return true; });
  route('demo', demo, true);
  route('export', exportResults);
  route('settings', async settings => {
    const threshold = Number(settings?.threshold);
    if (!Number.isFinite(threshold) || threshold < 80 || threshold > 100) throw new Error('Geçersiz eşik.');
    store.data.settings = { threshold, reducedMotion: Boolean(settings.reducedMotion) };
    await store.save(); return store.snapshot();
  }, true);
  route('remove', async (kind, ids) => {
    validKind(kind);
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new Error('Geçersiz seçim.');
    const selected = new Set(ids);
    store.data[kind] = store.data[kind].filter(i => !selected.has(i.id));
    // Historical results are pruned, so removed thumbnails can be discarded.
    for (const record of store.data.history) {
      record.groups = record.groups.filter(g => !selected.has(g.queryId) || store.find(g.queryId));
      for (const group of record.groups) group.matches = group.matches.filter(m => !selected.has(m.imageId) || store.find(m.imageId));
    }
    await store.save();
    for (const id of selected) {
      if (/^[a-f0-9]{24}$/.test(id) && !store.find(id)) await fs.unlink(path.join(store.cacheDir, `${id}.webp`)).catch(() => {});
    }
    return store.snapshot();
  }, true);
  route('clear', async () => {
    const selected = await dialog.showMessageBox(win, { type: 'question', title: 'Yerel kayıtları temizle',
      message: 'Koleksiyon, sorgular, küçük resimler ve karşılaştırma geçmişi temizlensin mi?',
      detail: 'Eklediğiniz orijinal dosyalara dokunulmaz.', buttons: ['Vazgeç', 'Kayıtları temizle'], defaultId: 0, cancelId: 0 });
    if (selected.response !== 1) return { cancelled: true };
    const { fresh } = require('./lib/store.cjs');
    const settings = store.data.settings;
    store.data = { ...fresh(), settings }; await store.save();
    const cachePath = path.resolve(store.cacheDir), expected = path.resolve(store.root, 'thumbnails');
    if (cachePath !== expected || path.dirname(cachePath) !== path.resolve(store.root)) throw new Error('Önbellek yolu doğrulanamadı.');
    await fs.rm(cachePath, { recursive: true, force: true });
    await fs.writeFile(`${store.file}.bak`, JSON.stringify(store.data), 'utf8');
    for (const name of await fs.readdir(store.root)) {
      if (/^collection\.json\.corrupt-\d+$/.test(name)) await fs.unlink(path.join(store.root, name));
    }
    return { state: store.snapshot() };
  }, true);
  route('reveal', async id => {
    const image = store.find(id);
    if (!image) throw new Error('Görsel kaydı bulunamadı.');
    await fs.access(image.path).catch(() => { throw new Error('Orijinal dosya taşınmış veya silinmiş.'); });
    shell.showItemInFolder(image.path); return true;
  });
  route('window', action => {
    if (action === 'minimize') win.minimize();
    else if (action === 'maximize') win.isMaximized() ? win.unmaximize() : win.maximize();
    else if (action === 'close') win.close();
  });

  win = new BrowserWindow({ width: 1440, height: 960, minWidth: 1060, minHeight: 720,
    title: 'ImageScanner', backgroundColor: '#f5f6f8', frame: false,
    icon: nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png')),
    show: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (url !== 'scanner://app/index.html') event.preventDefault(); });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.once('ready-to-show', () => win.show());
  let closing = false;
  win.on('close', async event => {
    if (closing) return;
    if (!activeJob && !mutationLock) return;
    event.preventDefault();
    if (activeJob) {
      const selected = await dialog.showMessageBox(win, { type: 'question', title: 'İşlem sürüyor',
        message: 'Devam eden işlemi durdurup çıkmak istiyor musunuz?',
        buttons: ['İşleme devam et', 'Çık'], defaultId: 0, cancelId: 0 });
      if (selected.response !== 1) return;
      activeJob?.worker.postMessage('cancel');
    }
    // Finish cancellation / the atomic disk commit before destroying the app.
    await mutationComplete;
    closing = true;
    win.close();
  });
  await win.loadURL('scanner://app/index.html');
}
app.on('window-all-closed', () => app.quit());
