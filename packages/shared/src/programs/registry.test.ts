import { describe, it, expect } from 'bun:test';
import { getProgramDefinition, getAllPresetPrograms } from './registry';

// ---------------------------------------------------------------------------
// Registry integration tests — real lookup through the real definition map
// ---------------------------------------------------------------------------
describe('program registry', () => {
  it('should return GZCLP definition by ID', () => {
    const gzclp = getProgramDefinition('gzclp');
    expect(gzclp).toBeDefined();
    expect(gzclp?.id).toBe('gzclp');
    expect(gzclp?.name).toBe('GZCLP');
  });

  it('should return undefined for unknown program ID', () => {
    expect(getProgramDefinition('nonexistent')).toBeUndefined();
  });

  it('should list all preset programs', () => {
    const all = getAllPresetPrograms();
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((p) => p.id === 'gzclp')).toBe(true);
  });

  describe('nivel7 — after split into nivel7-days/', () => {
    it('getProgramDefinition resolves nivel7 successfully after the split', () => {
      const nivel7 = getProgramDefinition('nivel7');

      expect(nivel7).toBeDefined();
      expect(nivel7?.id).toBe('nivel7');
    });

    it('nivel7 definition contains all 48 expected days (24 per cycle × 2 cycles)', () => {
      const nivel7 = getProgramDefinition('nivel7');

      expect(nivel7?.days.length).toBe(48);
    });

    it('nivel7 is listed in getAllPresetPrograms', () => {
      const all = getAllPresetPrograms();

      expect(all.some((p) => p.id === 'nivel7')).toBe(true);
    });
  });
});
