'use strict';
const { parentPort, workerData } = require('node:worker_threads');
const { collectFiles, analyzeFile } = require('./lib/analyze.cjs');
const { prepare, comparePrepared } = require('./lib/similarity.cjs');
let cancelled = false;
parentPort.on('message', message => { if (message === 'cancel') cancelled = true; });
const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

async function run() {
  if (workerData.task === 'import') {
    parentPort.postMessage({ type: 'progress', phase: 'Dosyalar hazırlanıyor', current: 0, total: 0 });
    const collected = await collectFiles(workerData.paths, workerData.limit, () => cancelled);
    let skipped = 0, current = 0, overflow = 0;
    let remaining = workerData.limit - workerData.existing.length;
    const existing = new Map(workerData.existing.map(item => [item.path, item]));
    for (const file of collected.files) {
      if (cancelled) break;
      const prior = existing.get(file.path);
      if (prior && prior.size === file.size && prior.mtimeMs === file.mtimeMs) skipped++;
      else if (!prior && remaining <= 0) overflow++;
      else {
        try {
          parentPort.postMessage({ type: 'image', image: await analyzeFile(file, workerData.cacheDir) });
          if (!prior) remaining--;
        }
        catch (error) { collected.errors.push({ name: require('node:path').basename(file.path), message: error.message }); }
      }
      current++;
      parentPort.postMessage({ type: 'progress', phase: 'Görseller işleniyor', current, total: collected.files.length });
    }
    return { skipped, overflow, errors: collected.errors.slice(0, 50), errorCount: collected.errors.length,
      truncated: collected.truncated, cancelled };
  }
  if (workerData.task === 'scan') {
    const candidates = workerData.library.map(prepare);
    const groups = [];
    const total = workerData.queries.length * candidates.length;
    let current = 0;
    for (const rawQuery of workerData.queries) {
      const query = prepare(rawQuery), matches = [];
      for (let i = 0; i < candidates.length; i++) {
        if (cancelled) return { cancelled: true };
        const candidate = candidates[i];
        if (candidate.path !== query.path) {
          const match = comparePrepared(query, candidate);
          if (match && match.score >= workerData.threshold) matches.push({ imageId: candidate.id, ...match });
        }
        current++;
        if (i % 100 === 0 || current === total) {
          parentPort.postMessage({ type: 'progress', phase: 'Kopyalar karşılaştırılıyor', current, total });
          await yieldLoop();
        }
      }
      matches.sort((a, b) => b.score - a.score);
      groups.push({ queryId: query.id, totalMatches: matches.length, matches: matches.slice(0, 200) });
    }
    return { cancelled: false, groups };
  }
  throw new Error('Bilinmeyen iş türü.');
}
run().then(result => parentPort.postMessage({ type: 'done', result }))
  .catch(error => parentPort.postMessage({ type: 'failure', error: error.message }))
  .finally(() => parentPort.close());
