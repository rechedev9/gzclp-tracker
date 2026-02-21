import { describe, it, expect } from 'bun:test';
import { NIVEL7_DEFINITION } from './nivel7';
import { computeGenericProgram } from '../generic-engine';

// Config values are the week-6 RECORD targets (cycle 1).
// Cycle 1: S1=T−10, S2=T−7.5, S3=T−10, S4=T−5, S5=T−2.5, S6=T
// Cycle 2: S7=T−7.5, S8=T−5, S9=T−7.5, S10=T−2.5, S11=T, S12=T+2.5
const BASE_CONFIG = {
  press_mil: 50,
  bench: 70,
  squat: 90,
  deadlift: 110,
};

describe('NIVEL7_DEFINITION', () => {
  describe('structure', () => {
    it('should have 48 days (2 cycles × 24)', () => {
      expect(NIVEL7_DEFINITION.days.length).toBe(48);
    });

    it('should have totalWorkouts = 48', () => {
      expect(NIVEL7_DEFINITION.totalWorkouts).toBe(48);
    });

    it('should have cycleLength = 48', () => {
      expect(NIVEL7_DEFINITION.cycleLength).toBe(48);
    });

    it('should have workoutsPerWeek = 4', () => {
      expect(NIVEL7_DEFINITION.workoutsPerWeek).toBe(4);
    });

    it('should have 4 config fields (1 target per main lift)', () => {
      expect(NIVEL7_DEFINITION.configFields.length).toBe(4);
    });

    it('should have 5-6 slots per day', () => {
      for (const day of NIVEL7_DEFINITION.days) {
        expect(day.slots.length).toBeGreaterThanOrEqual(4);
        expect(day.slots.length).toBeLessThanOrEqual(6);
      }
    });

    it('should repeat day names across cycles', () => {
      const cycle1Names = NIVEL7_DEFINITION.days.slice(0, 24).map((d) => d.name);
      const cycle2Names = NIVEL7_DEFINITION.days.slice(24, 48).map((d) => d.name);
      expect(cycle1Names).toEqual(cycle2Names);
    });
  });

  describe('cycle 1 wave periodization', () => {
    it('should derive press militar weights: T−10, T−7.5, T−10 (deload), T−5, T−2.5, T', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // T=50 → 40, 42.5, 40, 45, 47.5, 50
      const b1 = [0, 4].map(
        (i) => rows[i].slots.find((s) => s.slotId === 'press_mil-c1b1')?.weight
      );
      const deload = rows[8].slots.find((s) => s.slotId === 'press_mil-c1b1d')?.weight;
      const b2 = [12, 16, 20].map(
        (i) => rows[i].slots.find((s) => s.slotId === 'press_mil-c1b2')?.weight
      );

      expect(b1).toEqual([40, 42.5]);
      expect(deload).toBe(40);
      expect(b2).toEqual([45, 47.5, 50]);
    });

    it('should derive bench weights from target', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      const b1 = [2, 6].map((i) => rows[i].slots.find((s) => s.slotId === 'bench-c1b1')?.weight);
      const deload = rows[10].slots.find((s) => s.slotId === 'bench-c1b1d')?.weight;
      const b2 = [14, 18, 22].map(
        (i) => rows[i].slots.find((s) => s.slotId === 'bench-c1b2')?.weight
      );

      expect(b1).toEqual([60, 62.5]);
      expect(deload).toBe(60);
      expect(b2).toEqual([65, 67.5, 70]);
    });

    it('should reach the exact target weight in cycle 1 final session', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      expect(rows[20].slots.find((s) => s.slotId === 'press_mil-c1b2')?.weight).toBe(50);
      expect(rows[22].slots.find((s) => s.slotId === 'bench-c1b2')?.weight).toBe(70);
      expect(rows[23].slots.find((s) => s.slotId === 'squat-c1b2')?.weight).toBe(90);
      expect(rows[21].slots.find((s) => s.slotId === 'deadlift-c1b2')?.weight).toBe(110);
    });
  });

  describe('cycle 2 wave periodization (+2.5kg escalation)', () => {
    it('should shift press militar wave by +2.5: T−7.5, T−5, T−7.5, T−2.5, T, T+2.5', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // Cycle 2 days start at index 24
      // T=50, cycle 2 target = 52.5
      const b1 = [24, 28].map(
        (i) => rows[i].slots.find((s) => s.slotId === 'press_mil-c2b1')?.weight
      );
      const deload = rows[32].slots.find((s) => s.slotId === 'press_mil-c2b1d')?.weight;
      const b2 = [36, 40, 44].map(
        (i) => rows[i].slots.find((s) => s.slotId === 'press_mil-c2b2')?.weight
      );

      expect(b1).toEqual([42.5, 45]);
      expect(deload).toBe(42.5);
      expect(b2).toEqual([47.5, 50, 52.5]);
    });

    it('should shift bench wave by +2.5', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // T=70, cycle 2 target = 72.5
      const b1 = [26, 30].map((i) => rows[i].slots.find((s) => s.slotId === 'bench-c2b1')?.weight);
      const deload = rows[34].slots.find((s) => s.slotId === 'bench-c2b1d')?.weight;
      const b2 = [38, 42, 46].map(
        (i) => rows[i].slots.find((s) => s.slotId === 'bench-c2b2')?.weight
      );

      expect(b1).toEqual([62.5, 65]);
      expect(deload).toBe(62.5);
      expect(b2).toEqual([67.5, 70, 72.5]);
    });

    it('should reach T+2.5 in cycle 2 final session', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      expect(rows[44].slots.find((s) => s.slotId === 'press_mil-c2b2')?.weight).toBe(52.5);
      expect(rows[46].slots.find((s) => s.slotId === 'bench-c2b2')?.weight).toBe(72.5);
      expect(rows[47].slots.find((s) => s.slotId === 'squat-c2b2')?.weight).toBe(92.5);
      expect(rows[45].slots.find((s) => s.slotId === 'deadlift-c2b2')?.weight).toBe(112.5);
    });
  });

  describe('deload behavior', () => {
    it('should keep cycle 1 deload weight fixed regardless of result', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {
        '8': { 'press_mil-c1b1d': { result: 'success' } },
      });

      expect(rows[8].slots.find((s) => s.slotId === 'press_mil-c1b1d')?.weight).toBe(40);
    });

    it('should keep cycle 2 deload weight fixed', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {
        '32': { 'press_mil-c2b1d': { result: 'success' } },
      });

      expect(rows[32].slots.find((s) => s.slotId === 'press_mil-c2b1d')?.weight).toBe(42.5);
    });
  });

  describe('slot chains', () => {
    it('should use cycle-qualified slot IDs (c1/c2 prefix)', () => {
      const allMainIds = new Set<string>();

      for (const day of NIVEL7_DEFINITION.days) {
        for (const slot of day.slots) {
          if (
            slot.id.startsWith('press_mil-') ||
            slot.id.startsWith('bench-') ||
            slot.id.startsWith('squat-') ||
            slot.id.startsWith('deadlift-')
          ) {
            allMainIds.add(slot.id);
          }
        }
      }

      // 4 lifts × 3 phases × 2 cycles = 24 unique main lift slot IDs
      expect(allMainIds.size).toBe(24);
    });

    it('should use c1 slots in days 0-23 and c2 slots in days 24-47', () => {
      for (let i = 0; i < 24; i++) {
        const mainSlot = NIVEL7_DEFINITION.days[i].slots[0];
        expect(mainSlot.id).toContain('-c1');
      }
      for (let i = 24; i < 48; i++) {
        const mainSlot = NIVEL7_DEFINITION.days[i].slots[0];
        expect(mainSlot.id).toContain('-c2');
      }
    });
  });

  describe('block schemes', () => {
    it('should use 5x5 for block 1 main lifts in both cycles', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // Cycle 1 day 0
      const c1Press = rows[0].slots.find((s) => s.slotId === 'press_mil-c1b1');
      expect(c1Press?.sets).toBe(5);
      expect(c1Press?.reps).toBe(5);

      // Cycle 2 day 24
      const c2Press = rows[24].slots.find((s) => s.slotId === 'press_mil-c2b1');
      expect(c2Press?.sets).toBe(5);
      expect(c2Press?.reps).toBe(5);
    });

    it('should use 3x3 for block 2 main lifts in both cycles', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // Cycle 1 day 12
      const c1Press = rows[12].slots.find((s) => s.slotId === 'press_mil-c1b2');
      expect(c1Press?.sets).toBe(3);
      expect(c1Press?.reps).toBe(3);

      // Cycle 2 day 36
      const c2Press = rows[36].slots.find((s) => s.slotId === 'press_mil-c2b2');
      expect(c2Press?.sets).toBe(3);
      expect(c2Press?.reps).toBe(3);
    });

    it('should use 1x5/1x3 for deadlift in both cycles', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      const c1DlB1 = rows[1].slots.find((s) => s.slotId === 'deadlift-c1b1');
      expect(c1DlB1?.sets).toBe(1);
      expect(c1DlB1?.reps).toBe(5);

      const c2DlB2 = rows[37].slots.find((s) => s.slotId === 'deadlift-c2b2');
      expect(c2DlB2?.sets).toBe(1);
      expect(c2DlB2?.reps).toBe(3);
    });
  });

  describe('accessory behavior', () => {
    it('should not auto-progress accessory weights', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // press_franc across both cycles — all 0kg
      const pfWeights = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44].map((i) => {
        const slot = rows[i].slots.find((s) => s.slotId === 'press_franc');
        return slot?.weight;
      });

      expect(pfWeights.every((w) => w === 0)).toBe(true);
    });

    it('should vary accessory sets/reps per week within each cycle', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {});

      // Cycle 1: press_franc wk1=4x8, wk2=4x6, wk3=5x5
      const c1wk1 = rows[0].slots.find((s) => s.slotId === 'press_franc');
      const c1wk2 = rows[4].slots.find((s) => s.slotId === 'press_franc');
      const c1wk3 = rows[8].slots.find((s) => s.slotId === 'press_franc');

      expect(c1wk1?.sets).toBe(4);
      expect(c1wk1?.reps).toBe(8);
      expect(c1wk2?.sets).toBe(4);
      expect(c1wk2?.reps).toBe(6);
      expect(c1wk3?.sets).toBe(5);
      expect(c1wk3?.reps).toBe(5);

      // Cycle 2 repeats the same pattern
      const c2wk1 = rows[24].slots.find((s) => s.slotId === 'press_franc');
      expect(c2wk1?.sets).toBe(4);
      expect(c2wk1?.reps).toBe(8);
    });
  });

  describe('fail behavior', () => {
    it('should keep weight on cycle 1 build-phase fail', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {
        '0': { 'press_mil-c1b1': { result: 'fail' } },
      });

      const day4Slot = rows[4].slots.find((s) => s.slotId === 'press_mil-c1b1');
      expect(day4Slot?.weight).toBe(40);
    });

    it('should keep weight on cycle 2 peak-phase fail', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {
        '36': { 'press_mil-c2b2': { result: 'fail' } },
      });

      const day40Slot = rows[40].slots.find((s) => s.slotId === 'press_mil-c2b2');
      expect(day40Slot?.weight).toBe(47.5);
    });

    it('should progress cycle 2 after success following a fail', () => {
      const rows = computeGenericProgram(NIVEL7_DEFINITION, BASE_CONFIG, {
        '36': { 'press_mil-c2b2': { result: 'fail' } },
        '40': { 'press_mil-c2b2': { result: 'success' } },
      });

      // Day 36: 47.5 (fail → no change), Day 40: 47.5 (success → +2.5), Day 44: 50
      const day44Slot = rows[44].slots.find((s) => s.slotId === 'press_mil-c2b2');
      expect(day44Slot?.weight).toBe(50);
    });
  });
});
