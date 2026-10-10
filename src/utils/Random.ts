/**
 * Deterministic pseudo-random numbers.
 *
 * The campus must look identical on every load and on every device, otherwise
 * the artist's reference screenshots stop matching what players see. All
 * procedural placement therefore goes through a seeded generator rather than
 * `Math.random()`.
 *
 * Algorithm: mulberry32 — tiny, fast and plenty good enough for scattering trees.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    // Force to a non-zero 32-bit integer.
    this.state = (seed | 0) === 0 ? 0x9e3779b9 : seed | 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Next float in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Next integer in [0, countExclusive). */
  int(countExclusive: number): number {
    return Math.floor(this.next() * countExclusive);
  }

  /** Picks one element. Throws on an empty list so callers fail loudly. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('SeededRandom.pick(): cannot pick from an empty list');
    }
    const chosen = items[this.int(items.length)];
    // `noUncheckedIndexedAccess` cannot see that the index is always in range.
    return chosen as T;
  }
}
