'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const fresh = () => ({ version: 1, library: [], queries: [], history: [],
  settings: { threshold: 88, reducedMotion: false } });

class Store {
  constructor(root) {
    this.root = root; this.file = path.join(root, 'collection.json');
    this.cacheDir = path.join(root, 'thumbnails'); this.data = fresh(); this.warning = null;
  }
  validate(data) {
    if (data?.version !== 1 || !Array.isArray(data.library) || !Array.isArray(data.queries) ||
        !Array.isArray(data.history) || typeof data.settings !== 'object' || !data.settings) {
      throw new Error('Geçersiz koleksiyon dosyası.');
    }
    return data;
  }
  async open() {
    await fs.mkdir(this.root, { recursive: true });
    try { this.data = this.validate(JSON.parse(await fs.readFile(this.file, 'utf8'))); }
    catch (error) {
      if (error.code === 'ENOENT') return this;
      const preserved = `${this.file}.corrupt-${Date.now()}`;
      await fs.copyFile(this.file, preserved);
      try {
        this.data = this.validate(JSON.parse(await fs.readFile(`${this.file}.bak`, 'utf8')));
        this.warning = 'Koleksiyon dosyası okunamadı. Önceki yedek kurtarıldı; sorunlu dosya korundu.';
      } catch {
        this.data = fresh();
        this.warning = 'Koleksiyon dosyası okunamadı. Sorunlu dosya korundu; boş bir koleksiyon açıldı.';
      }
    }
    return this;
  }
  async save() {
    // Only the main process writes, and all mutating IPC calls are serialized.
    const temporary = `${this.file}.tmp`;
    const handle = await fs.open(temporary, 'w');
    try { await handle.writeFile(JSON.stringify(this.data), 'utf8'); await handle.sync(); }
    finally { await handle.close(); }
    try {
      const old = await fs.readFile(this.file, 'utf8');
      this.validate(JSON.parse(old));
      await fs.writeFile(`${this.file}.bak`, old, 'utf8');
    } catch (error) { if (error.code !== 'ENOENT' && error.code !== undefined) throw error; }
    await fs.rename(temporary, this.file);
  }
  upsert(kind, images) {
    const map = new Map(this.data[kind].map(image => [image.id, image]));
    for (const image of images) map.set(image.id, image);
    this.data[kind] = [...map.values()];
  }
  find(id) { return this.data.library.find(image => image.id === id) || this.data.queries.find(image => image.id === id); }
  publicImage(image) {
    const { variants, ...metadata } = image;
    return { ...metadata, thumbUrl: `scanner://image/${image.id}/thumb`, originalUrl: `scanner://image/${image.id}/original` };
  }
  snapshot() {
    return { version: this.data.version, library: this.data.library.map(i => this.publicImage(i)),
      queries: this.data.queries.map(i => this.publicImage(i)), history: this.data.history,
      settings: this.data.settings, warning: this.warning, dataPath: this.root };
  }
}
module.exports = { Store, fresh };
