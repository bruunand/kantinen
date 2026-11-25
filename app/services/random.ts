/**
 * Shuffles the items into an order that looks random but is the same every
 * time for the same seed, so separate requests can agree on it without state.
 */
export const shuffleWithSeed = <T>(items: readonly T[], seed: string): T[] => {
  const random = createSeededRandom(hashString(seed));
  const shuffled = [...items];

  // Fisher-Yates
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

/** FNV-1a: turns the seed string into a 32-bit number for the generator. */
const hashString = (value: string): number => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
};

/** Mulberry32: a tiny generator that yields numbers in [0, 1) like Math.random. */
const createSeededRandom = (seed: number) => {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;

    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
