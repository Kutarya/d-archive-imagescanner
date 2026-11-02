'use strict';

// Whole-image fingerprints only. No face detector, identity model, embeddings,
// account lookup, or person-specific features are used here.
const COS = Array.from({ length: 8 }, (_, u) =>
  Float64Array.from({ length: 32 }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / 64)));

function bitsToHex(bits) {
  let hash = 0n;
  for (const bit of bits) hash = (hash << 1n) | BigInt(Boolean(bit));
  return hash.toString(16).padStart(16, '0');
}

function perceptualHash(gray) {
  const horizontal = Array.from({ length: 8 }, () => new Float64Array(32));
  for (let u = 0; u < 8; u++) {
    for (let y = 0; y < 32; y++) {
      let sum = 0;
      for (let x = 0; x < 32; x++) sum += gray[y * 32 + x] * COS[u][x];
      horizontal[u][y] = sum;
    }
  }
  const coefficients = [];
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let y = 0; y < 32; y++) sum += horizontal[u][y] * COS[v][y];
      coefficients.push(sum);
    }
  }
  const sorted = coefficients.slice(1).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  return bitsToHex(coefficients.map((value, i) => i !== 0 && value > median));
}

function differenceHash(gray) {
  const bits = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const row = Math.round(y * 31 / 7) * 32;
      bits.push(gray[row + Math.round(x * 31 / 8)] > gray[row + Math.round((x + 1) * 31 / 8)]);
    }
  }
  return bitsToHex(bits);
}

const POPCOUNT = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];
function hamming(a, b) {
  let distance = 0;
  for (let i = 0; i < 16; i++) distance += POPCOUNT[parseInt(a[i], 16) ^ parseInt(b[i], 16)];
  return distance;
}

function fingerprint(gray, rgb, region, ratio) {
  const pixels = Buffer.from(gray);
  let sum = 0;
  for (const value of pixels) sum += value;
  const mean = sum / pixels.length;
  let variance = 0;
  for (const value of pixels) variance += (value - mean) ** 2;
  return {
    p: perceptualHash(pixels), d: differenceHash(pixels),
    gray: pixels.toString('base64'), rgb: Buffer.from(rgb).toString('base64'),
    mean, std: Math.sqrt(variance / pixels.length), region, ratio
  };
}

function prepare(image) {
  return { ...image, variants: image.variants.map(v => ({
    ...v, grayBytes: Buffer.from(v.gray, 'base64'), rgbBytes: Buffer.from(v.rgb, 'base64')
  })) };
}

function variantScore(a, b) {
  // Reject different compositions even if their global color / pHash is close.
  if (Math.abs(Math.log(a.ratio / b.ratio)) > 0.2) return null;
  const pd = hamming(a.p, b.p);
  const dd = hamming(a.d, b.d);
  if (pd > 14 || dd > 24) return null;
  const ga = a.grayBytes, gb = b.grayBytes;
  const ca = a.rgbBytes, cb = b.rgbBytes;
  let colorError = 0;
  for (let i = 0; i < ca.length; i++) colorError += Math.abs(ca[i] - cb[i]);
  colorError /= ca.length;
  const colorSimilarity = Math.max(0, 1 - colorError / 100);
  if (a.std < 7 || b.std < 7) {
    if (a.std > 7 || b.std > 7 || colorError > 2 || Math.abs(a.mean - b.mean) > 2 ||
        Math.abs(Math.log(a.ratio / b.ratio)) > 0.025) return null;
    return { score: 99, crop: a.region !== b.region, pd, dd, correlation: 1 };
  }
  let covariance = 0;
  for (let i = 0; i < ga.length; i++) covariance += (ga[i] - a.mean) * (gb[i] - b.mean);
  const correlation = covariance / (ga.length * a.std * b.std);
  if (correlation < 0.88 || colorError > 65) return null;
  const score = 100 * (0.32 * (1 - pd / 64) + 0.12 * (1 - dd / 64) +
    0.48 * Math.min(1, correlation) + 0.08 * colorSimilarity);
  return { score: Math.min(99.9, Math.round(score * 10) / 10),
    crop: a.region !== b.region, pd, dd, correlation };
}

function comparePrepared(query, candidate) {
  if (query.sha256 === candidate.sha256) return { score: 100, kind: 'exact', reason: 'Dosya içeriği birebir aynı (SHA-256).' };
  let best = null;
  for (const a of query.variants) {
    for (const b of candidate.variants) {
      const result = variantScore(a, b);
      if (result && (!best || result.score > best.score)) best = result;
    }
  }
  if (!best) return null;
  return { score: best.score, kind: best.crop ? 'edited' : 'similar',
    reason: best.crop ? 'Merkezden hafif kırpılmış görüntü ile görsel desenler uyuşuyor.' :
      'Görsel desenler uyuşuyor; boyut, renk veya sıkıştırma farklı olabilir.' };
}

module.exports = { fingerprint, prepare, comparePrepared, hamming, perceptualHash, differenceHash };
