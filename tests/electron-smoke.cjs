'use strict';
const {_electron:electron}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const artifacts=path.join(root,'artifacts');
const dataRoot=path.join(root,'.test-data',`ui-${Date.now()}`);
let app;
async function main(){
  await fs.mkdir(artifacts,{recursive:true});await fs.mkdir(dataRoot,{recursive:true});
  const env={...process.env,NODE_ENV:'test',IMAGESCANNER_DATA_DIR:dataRoot};delete env.ELECTRON_RUN_AS_NODE;
  const executable=process.argv[2];
  const launchOptions={...(executable?{executablePath:path.resolve(executable),args:[]}:{args:[root]}),env,timeout:45000};
  app=await electron.launch(launchOptions);
  const page=await app.firstWindow();page.setDefaultTimeout(20000);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.locator('.scan-button').waitFor();
  await page.screenshot({path:path.join(artifacts,executable?'packaged-empty.png':'01-empty.png')});
  const prefs=await app.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return{sandbox:p.sandbox,nodeIntegration:p.nodeIntegration,contextIsolation:p.contextIsolation};});
  assert.deepEqual(prefs,{sandbox:true,nodeIntegration:false,contextIsolation:true});
  await page.locator('.demo-banner [data-action="demo"]').click();
  await page.waitForFunction(async()=>{const d=await window.scanner.state();return d.history.length===1;},null,{timeout:60000});
  await page.locator('.result-card').first().waitFor();
  let data=await page.evaluate(()=>window.scanner.state());
  assert.equal(data.library.length,8);assert.equal(data.queries.length,1);
  assert.equal(data.history[0].groups[0].matches.length,4,JSON.stringify(data.history[0].groups));
  assert.equal(data.history[0].groups[0].matches[0].kind,'exact');
  await page.screenshot({path:path.join(artifacts,executable?'packaged-results.png':'02-results.png')});
  await page.locator('[data-action="filter"][data-value="exact"]').click();assert.equal(await page.locator('.result-card').count(),1);
  await page.locator('[data-action="filter"][data-value="similar"]').click();assert.equal(await page.locator('.result-card').count(),3);
  await page.locator('[data-action="filter"][data-value="all"]').click();
  await page.locator('.result-card .result-image').first().click();await page.locator('dialog[open] .comparison-pair').waitFor();
  await page.locator('[data-action="comparison-mode"][data-value="overlay"]').click();
  await page.locator('#overlay-range').fill('70');
  assert.match(await page.locator('#overlay-top').getAttribute('style'),/30%/);
  await page.screenshot({path:path.join(artifacts,executable?'packaged-compare.png':'03-comparison.png')});
  await page.locator('[data-action="close-modal"]').click();
  for(const format of ['csv','json']){
    const destination=path.join(artifacts,`smoke-results${executable?'-packaged':''}.${format}`);
    await app.evaluate(({dialog},savePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:savePath});},destination);
    await page.locator('[data-action="export"]').click();await page.locator(`[data-action="export-format"][data-value="${format}"]`).click();
    await page.waitForFunction(()=>!document.querySelector('#modal').open);
    const body=await fs.readFile(destination,'utf8');
    if(format==='json')assert.equal(JSON.parse(body).results.length,4);else assert.equal(body.charCodeAt(0),0xfeff);
  }
  await page.locator('.sidebar [data-page="library"]').click();await page.locator('.library-card').first().waitFor();
  await page.locator('#library-search').fill('kiyi');assert.equal(await page.locator('.library-card').count(),4);
  await page.locator('#library-search').fill('');
  await page.screenshot({path:path.join(artifacts,executable?'packaged-library.png':'04-library.png')});
  // Real renderer -> preload -> main IPC -> worker, with a native picker stub.
  const original=path.join(dataRoot,'demo','koleksiyon','kiyi-ayni-kopya.png');
  await app.evaluate(({dialog},filePath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[filePath]});},original);
  await page.locator('.page-heading [data-action="add-library"]').click();
  await page.waitForFunction(()=>document.querySelector('#view').getAttribute('aria-busy')==='false');
  data=await page.evaluate(()=>window.scanner.state());assert.equal(data.library.length,8,'reimport must not duplicate');
  // Drag a real, disk-backed File across the context-isolated bridge.
  await page.evaluate(()=>{document.querySelector('#toasts').innerHTML='';const input=document.createElement('input');input.type='file';input.id='test-drop-file';input.hidden=true;document.body.append(input);});
  await page.locator('#test-drop-file').setInputFiles(original);
  await page.evaluate(()=>{const transfer=new DataTransfer();transfer.items.add(document.querySelector('#test-drop-file').files[0]);document.querySelector('#library-items').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:transfer}));});
  await page.getByText('Bu görseller zaten koleksiyonunuzda.',{exact:true}).waitFor();
  assert.equal((await page.evaluate(()=>window.scanner.state())).library.length,8);
  await page.locator('.sidebar [data-page="history"]').click();assert.equal(await page.locator('.history-card').count(),1);
  await page.locator('[data-action="open-history"]').click();assert.equal(await page.locator('.result-card').count(),4);
  await page.locator('.sidebar [data-page="settings"]').click();await page.locator('#reduced-motion').check();
  // Starting another job immediately must flush a pending preference write.
  await page.locator('.sidebar [data-page="library"]').click();
  await page.locator('.page-heading [data-action="add-library"]').click();
  await page.waitForFunction(()=>document.querySelector('#view').getAttribute('aria-busy')==='false');
  await page.waitForFunction(async()=>(await window.scanner.state()).settings.reducedMotion===true);
  await page.locator('.sidebar [data-page="settings"]').click();
  await page.screenshot({path:path.join(artifacts,executable?'packaged-settings.png':'05-settings.png')});
  const unknown=await app.evaluate(async({net})=>(await net.fetch('scanner://app/../main.cjs')).status);
  assert.equal(unknown,404,'arbitrary local source must not be served');
  const external=await app.evaluate(async({net})=>{try{await net.fetch('https://example.com');return'allowed';}catch{return'blocked';}});
  assert.equal(external,'blocked','runtime HTTP must be blocked');
  await page.locator('.sidebar .nav-item[data-page="compare"]').click();
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1060,760));
  await page.waitForTimeout(250);await page.screenshot({path:path.join(artifacts,executable?'packaged-compact.png':'06-compact.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.locator('.sidebar [data-page="library"]').click();
  const night=data.library.find(image=>image.name==='night.jpg');
  const beforeHash=crypto.createHash('sha256').update(await fs.readFile(night.path)).digest('hex');
  await page.locator(`[data-select="${night.id}"]`).check();
  await page.locator('[data-action="remove-selected"]').click();await page.locator('[data-action="confirm-remove"]').click();
  await page.waitForFunction(async()=>(await window.scanner.state()).library.length===7);
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(night.path)).digest('hex'),beforeHash);
  await app.close();app=null;
  const persisted=JSON.parse(await fs.readFile(path.join(dataRoot,'collection.json'),'utf8'));
  assert.equal(persisted.library.length,7);assert.equal(persisted.settings.reducedMotion,true);
  // Reopen the actual binary against the same isolated database, then clear it.
  app=await electron.launch(launchOptions);const reopened=await app.firstWindow();
  await reopened.locator('.scan-button').waitFor();
  const restored=await reopened.evaluate(()=>window.scanner.state());
  assert.equal(restored.library.length,7);assert.equal(restored.history.length,1);
  assert.equal(restored.settings.reducedMotion,true);
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});});
  await reopened.locator('.sidebar [data-page="settings"]').click();await reopened.locator('[data-action="clear"]').click();
  await reopened.waitForFunction(async()=>{const s=await window.scanner.state();return !s.library.length&&!s.queries.length&&!s.history.length;});
  await reopened.waitForFunction(()=>document.querySelector('#view').getAttribute('aria-busy')==='false');
  await assert.rejects(()=>fs.access(path.join(dataRoot,'thumbnails')));
  assert.equal(crypto.createHash('sha256').update(await fs.readFile(night.path)).digest('hex'),beforeHash);
  await fs.access(original);await app.close();app=null;
  await fs.writeFile(path.join(artifacts,executable?'packaged-verification.json':'verification.json'),JSON.stringify({
    passed:true,checkedAt:new Date().toISOString(),mode:executable?'packaged':'source',
    libraryCount:8,matches:4,checks:['demo','exact and near-copy filters','comparison slider','CSV and JSON export','search','reimport deduplication','disk-backed drag and drop','history','settings persistence','isolated sandbox','local file allowlist','outbound network block','compact viewport','bulk record removal','original SHA-256 preserved','restart restoration','data clearing'],pageErrors:errors
  },null,2));
  process.stdout.write('Electron kabul kontrolleri geçti: 8 görsel, 4 doğru eşleşme, CSV/JSON ve yerel kayıt doğrulandı.\n');
}
main().catch(async error=>{process.stderr.write(`${error.stack}\n`);if(app)await app.close().catch(()=>{});process.exitCode=1;});
