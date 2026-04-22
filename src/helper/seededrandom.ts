export function seedFromCityId(cityId: string): number {
  let hash = 5381;
  for (let i = 0; i < cityId.length; i++) {
    hash = ((hash * 31) + cityId.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let s = seed;
  return function nextRandom() {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
