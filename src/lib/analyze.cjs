'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { fingerprint } = require('./similarity.cjs');

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.tif', '.tiff']);
const MAX_BYTES = 128 * 1024 * 1024;
const MAX_FILES = 10000;
sharp.cache({ memory: 32, files: 0, items: 64 });
sharp.concurrency(2);

async function collectFiles(inputs, limit = MAX_FILES, shouldStop = () => false) {
  const found = [], errors = [], seen = new Set();
  const stack = [...inputs];
  let truncated = false;
  while (stack.length) {
    if (shouldStop()) break;
    const current = stack.pop();
    try {
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink()) continue;
      if (stat.isDirectory()) {
        const entries = await fs.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isSymbolicLink() && (entry.isDirectory() || EXTENSIONS.has(path.extname(entry.name).toLowerCase()))) {
            stack.push(path.join(current, entry.name));
          }
        }
      } else if (stat.isFile() && EXTENSIONS.has(path.extname(current).toLowerCase())) {
        const resolved = await fs.realpath(current);
        const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
        if (seen.has(key)) continue;
        seen.add(key);
        if (found.length >= limit) { truncated = true; break; }
        found.push({ path: resolved, size: stat.size, mtimeMs: stat.mtimeMs });
      }
    } catch { errors.push({ name: path.basename(current), message: 'Dosya veya klasör okunamadı.' }); }
  }
  return { files: found, errors, truncated };
}

async function analyzeFile(file, cacheDir) {
  if (file.size > MAX_BYTES) throw new Error('Dosya 128 MB sınırını aşıyor.');
  const bytes = await fs.readFile(file.path);
  const source = sharp(bytes, { limitInputPixels: 60000000, animated: false, failOn: 'error' });
  const meta = await source.metadata();
  if (!['jpeg', 'png', 'webp', 'gif', 'heif', 'avif', 'tiff'].includes(meta.format)) {
    throw new Error('Dosya desteklenen bir raster görsel biçiminde değil.');
  }
  const oriented = await source.autoOrient().flatten({ background: '#ffffff' })
    .toColourspace('srgb').png().toBuffer({ resolveWithObject: true });
  const { width, height } = oriented.info;
  const id = crypto.createHash('sha256').update(process.platform === 'win32' ? file.path.toLowerCase() : file.path)
    .digest('hex').slice(0, 24);
  const variants = [];
  for (const region of ['full', 'center85']) {
    let pipeline = sharp(oriented.data);
    let w = width, h = height;
    if (region !== 'full') {
      w = Math.max(1, Math.floor(width * 0.85)); h = Math.max(1, Math.floor(height * 0.85));
      pipeline = pipeline.extract({ left: Math.floor((width - w) / 2), top: Math.floor((height - h) / 2), width: w, height: h });
    }
    const gray = await pipeline.clone().resize(32, 32, { fit: 'fill' }).greyscale().raw().toBuffer();
    const rgb = await pipeline.clone().resize(12, 12, { fit: 'fill' }).removeAlpha().raw().toBuffer();
    variants.push(fingerprint(gray, rgb, region, w / h));
  }
  await fs.mkdir(cacheDir, { recursive: true });
  await sharp(oriented.data).resize(600, 600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 }).toFile(path.join(cacheDir, `${id}.webp`));
  return { id, path: file.path, name: path.basename(file.path), size: bytes.length, mtimeMs: file.mtimeMs,
    width, height, format: meta.format, animated: (meta.pages || 1) > 1,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'), variants,
    addedAt: new Date().toISOString() };
}

module.exports = { collectFiles, analyzeFile, EXTENSIONS, MAX_FILES };
