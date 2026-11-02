'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const sharp=require('sharp');
const {Worker}=require('node:worker_threads');
const {analyzeFile}=require('../src/lib/analyze.cjs');
async function withTemp(task){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'imagescanner-worker-'));
  try{await task(root);}finally{assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('imagescanner-worker-'));await fs.rm(root,{recursive:true,force:true});}
}
async function runWorker(data,onMessage){
  const worker=new Worker(path.join(__dirname,'..','src','worker.cjs'),{workerData:data});
  return new Promise((resolve,reject)=>{let result;worker.on('message',message=>{onMessage?.(message,worker);if(message.type==='done')result=message.result;if(message.type==='failure')reject(new Error(message.error));});worker.on('error',reject);worker.on('exit',()=>result?resolve(result):reject(new Error('Worker result missing')));});
}
test('cancelled import retains completed results and stops before all files',()=>withTemp(async root=>{
  const data=await sharp(path.join(__dirname,'..','assets','coast.svg')).resize(900,675).png().toBuffer();
  const paths=[];
  for(let i=0;i<16;i++){const p=path.join(root,`${i}.png`);await fs.writeFile(p,data);paths.push(p);}
  let completed=0;
  const result=await runWorker({task:'import',paths,existing:[],limit:100,cacheDir:path.join(root,'cache')},(message,worker)=>{if(message.type==='image'&&++completed===2)worker.postMessage('cancel');});
  assert.equal(result.cancelled,true);assert.ok(completed>=2&&completed<16,`completed=${completed}`);
}));
test('comparison can be cancelled without returning partial groups as final results',()=>withTemp(async root=>{
  const p=path.join(root,'image.png');await sharp(path.join(__dirname,'..','assets','coast.svg')).resize(400).png().toFile(p);
  const stat=await fs.stat(p),image=await analyzeFile({path:p,size:stat.size,mtimeMs:stat.mtimeMs},path.join(root,'cache'));
  const library=Array.from({length:600},(_,i)=>({...image,id:`candidate-${i}`,path:`candidate-${i}`}));
  const queries=Array.from({length:30},(_,i)=>({...image,id:`query-${i}`,path:`query-${i}`}));
  const result=await runWorker({task:'scan',library,queries,threshold:88},(message,worker)=>{if(message.type==='progress')worker.postMessage('cancel');});
  assert.equal(result.cancelled,true);assert.equal(result.groups,undefined);
}));
