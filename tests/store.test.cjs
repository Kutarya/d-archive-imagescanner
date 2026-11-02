'use strict';
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {Store}=require('../src/lib/store.cjs');
async function withStore(task){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'imagescanner-store-'));
  try{await task(await new Store(root).open(),root);}
  finally{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('imagescanner-store-'));await fs.rm(root,{recursive:true,force:true});}
}
test('new collection opens with correct defaults',()=>withStore(async store=>{
  assert.equal(store.data.version,1);assert.equal(store.data.library.length,0);assert.equal(store.data.settings.threshold,88);
}));
test('index survives restart and does not expose fingerprints to the renderer',()=>withStore(async(store,root)=>{
  store.upsert('library',[{id:'a'.repeat(24),name:'test.png',variants:[{gray:'private index'}]}]);
  await store.save();const reopened=await new Store(root).open();
  assert.equal(reopened.data.library.length,1);assert.equal(reopened.snapshot().library[0].variants,undefined);
  assert.equal(reopened.snapshot().library[0].thumbUrl,`scanner://image/${'a'.repeat(24)}/thumb`);
}));
test('reimport updates the existing entry instead of duplicating it',()=>withStore(async store=>{
  store.upsert('library',[{id:'1',name:'before'}]);store.upsert('library',[{id:'1',name:'after'}]);
  assert.equal(store.data.library.length,1);assert.equal(store.data.library[0].name,'after');
}));
test('corrupt database is preserved and its previous backup recovered',()=>withStore(async(store,root)=>{
  store.upsert('library',[{id:'1',name:'safe'}]);await store.save();
  store.upsert('library',[{id:'2',name:'later'}]);await store.save();
  await fs.writeFile(store.file,'broken JSON');const recovered=await new Store(root).open();
  assert.equal(recovered.data.library.length,1);assert.match(recovered.warning,/yedek kurtarıldı/);
  assert.ok((await fs.readdir(root)).some(name=>name.includes('.corrupt-')));
  await recovered.save();assert.equal(JSON.parse(await fs.readFile(store.file,'utf8')).library.length,1);
}));
test('corrupt file without a backup opens cleanly and preserves evidence',()=>withStore(async(store,root)=>{
  await fs.writeFile(store.file,'{"version":900}');const recovered=await new Store(root).open();
  assert.equal(recovered.data.library.length,0);assert.match(recovered.warning,/boş bir koleksiyon/);
  assert.ok((await fs.readdir(root)).some(name=>name.includes('.corrupt-')));
}));
