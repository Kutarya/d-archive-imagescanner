'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { analyzeFile, collectFiles } = require('../src/lib/analyze.cjs');
const { prepare, comparePrepared, hamming } = require('../src/lib/similarity.cjs');
let root, images;
async function analyze(name) {
  const filePath = path.join(root, name), stat = await fs.stat(filePath);
  return prepare(await analyzeFile({ path:filePath, size:stat.size, mtimeMs:stat.mtimeMs }, path.join(root,'thumbs')));
}
before(async()=>{
  root=await fs.mkdtemp(path.join(os.tmpdir(),'imagescanner-engine-'));
  const base=await sharp(path.join(__dirname,'..','assets','coast.svg')).resize(1200,900).png().toBuffer();
  await fs.writeFile(path.join(root,'base.png'),base);
  await fs.writeFile(path.join(root,'copy.png'),base);
  await sharp(base).resize(470).jpeg({quality:50}).toFile(path.join(root,'small.jpg'));
  await sharp(base).modulate({brightness:1.08,saturation:.92}).webp({quality:78}).toFile(path.join(root,'color.webp'));
  await sharp(base).extract({left:90,top:67,width:1020,height:765}).resize(700).jpeg({quality:75}).toFile(path.join(root,'crop.jpg'));
  await sharp(base).rotate(90).png().toFile(path.join(root,'rotated.png'));
  await sharp(base).rotate(90).withMetadata({orientation:8}).jpeg({quality:90}).toFile(path.join(root,'exif.jpg'));
  for(const name of ['architecture','botanical','night','dunes'])await sharp(path.join(__dirname,'..','assets',`${name}.svg`)).resize(1200,900).png().toFile(path.join(root,`${name}.png`));
  await fs.writeFile(path.join(root,'broken.jpg'),'not an image');
  await fs.writeFile(path.join(root,'notes.txt'),'not an image');
  const names=['base.png','copy.png','small.jpg','color.webp','crop.jpg','rotated.png','exif.jpg','architecture.png','botanical.png','night.png','dunes.png'];
  images=Object.fromEntries(await Promise.all(names.map(async name=>[name,await analyze(name)])));
});
after(async()=>{
  const target=path.resolve(root);
  assert.equal(path.dirname(target),path.resolve(os.tmpdir()));
  assert.ok(path.basename(target).startsWith('imagescanner-engine-'));
  await fs.rm(target,{recursive:true,force:true});
});
test('SHA-256 identifies an identical file',()=>{
  assert.deepEqual(comparePrepared(images['base.png'],images['copy.png']),{score:100,kind:'exact',reason:'Dosya içeriği birebir aynı (SHA-256).'});
});
test('resized, heavily compressed copy matches',()=>{
  const result=comparePrepared(images['base.png'],images['small.jpg']);
  assert.ok(result&&result.score>=88,JSON.stringify(result));assert.equal(result.kind,'similar');
});
test('brightness and saturation changes match',()=>{
  const result=comparePrepared(images['base.png'],images['color.webp']);
  assert.ok(result&&result.score>=88,JSON.stringify(result));
  assert.equal(result.kind,'similar');
});
test('a center crop matches the original center variant',()=>{
  const result=comparePrepared(images['base.png'],images['crop.jpg']);
  assert.ok(result&&result.score>=88,JSON.stringify(result));assert.equal(result.kind,'edited');
});
test('EXIF orientation is normalized',()=>{
  const result=comparePrepared(images['base.png'],images['exif.jpg']);
  assert.ok(result&&result.score>=88,JSON.stringify(result));
  assert.equal(images['exif.jpg'].width,1200);assert.equal(images['exif.jpg'].height,900);
});
test('different compositions are rejected',()=>{
  for(const name of ['architecture.png','botanical.png','night.png','dunes.png'])assert.equal(comparePrepared(images['base.png'],images[name]),null,name);
});
test('a quarter-turn is not falsely reported as a supported near-copy',()=>{
  assert.equal(comparePrepared(images['base.png'],images['rotated.png']),null);
});
test('hash distances count all 64 bits',()=>{
  assert.equal(hamming('0000000000000000','ffffffffffffffff'),64);
  assert.equal(hamming('0123456789abcdef','0123456789abcdef'),0);
});
test('collected file paths are deduplicated and unsupported extensions ignored',async()=>{
  const result=await collectFiles([path.join(root,'base.png'),path.join(root,'base.png'),path.join(root,'notes.txt')]);
  assert.equal(result.files.length,1);assert.equal(result.errors.length,0);
});
test('file discovery respects its limit',async()=>{
  const result=await collectFiles([root],2);assert.equal(result.files.length,2);assert.equal(result.truncated,true);
});
test('missing files produce recoverable import errors',async()=>{
  const result=await collectFiles([path.join(root,'missing.jpg')]);assert.equal(result.files.length,0);assert.equal(result.errors.length,1);
});
test('corrupt images cannot enter the index',async()=>{
  await assert.rejects(()=>analyze('broken.jpg'));
});
test('oversized images are rejected before decoding',async()=>{
  await assert.rejects(()=>analyzeFile({path:path.join(root,'base.png'),size:129*1024*1024},path.join(root,'thumbs')),/128 MB/);
});
test('fingerprints contain only whole-image features',()=>{
  assert.equal(images['base.png'].variants.length,2);
  assert.equal(images['base.png'].variants[0].grayBytes.length,1024);
  assert.equal(images['base.png'].variants[0].rgbBytes.length,432);
});
for (const format of ['png','jpeg','webp','gif','avif','tiff']) {
  test(`supported ${format} input decodes and matches`,async()=>{
    const name=`format-${format}.${format}`;
    await sharp(path.join(root,'base.png')).resize(600).toFormat(format).toFile(path.join(root,name));
    const image=await analyze(name),result=comparePrepared(images['base.png'],image);
    assert.ok(result&&result.score>=88,JSON.stringify(result));
  });
}
test('a renamed SVG cannot enter the raster-only collection',async()=>{
  await fs.copyFile(path.join(__dirname,'..','assets','coast.svg'),path.join(root,'renamed.png'));
  await assert.rejects(()=>analyze('renamed.png'),/raster/);
});
