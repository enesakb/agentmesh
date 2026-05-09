import { describe, expect, it } from 'vitest';
import { capabilityHash, capabilityName } from './index.js';

describe('capabilityHash', () => {
  it('returns a deterministic 32-byte hex hash', () => {
    const a = capabilityHash('data.weather');
    const b = capabilityHash('data.weather');
    expect(a).toBe(b);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('different inputs produce different hashes', () => {
    expect(capabilityHash('data.weather')).not.toBe(capabilityHash('data.price'));
  });
});

describe('capabilityName (reverse lookup)', () => {
  it('round-trips known capabilities', () => {
    const knownCaps = ['data.weather', 'data.crypto-price', 'compute.image', 'consumer'];
    for (const cap of knownCaps) {
      expect(capabilityName(capabilityHash(cap))).toBe(cap);
    }
  });

  it('returns undefined for an unknown hash', () => {
    expect(capabilityName(capabilityHash('this.does.not.exist'))).toBeUndefined();
  });
});
