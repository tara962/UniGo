import { describe, it, expect } from 'vitest';
import {
  validateTimeBlocks,
  validateNoOverlapWithClasses,
  validateWithinGaps,
  validateChronologicalOrder,
  validateBlockTypes,
  validateBlockDurations,
  validateNoBlockEndsAfterTransitStart
} from './timeBlockValidator.js';

describe('timeBlockValidator', () => {
  describe('validateBlockTypes', () => {
    it('accepts valid block types (transit, meal, activity)', () => {
      const blocks = [
        { type: 'transit', name: 'Walk', startTime: '09:00', endTime: '09:10' },
        { type: 'meal', name: 'Lunch', startTime: '12:00', endTime: '12:45' },
        { type: 'activity', name: 'Study', startTime: '14:00', endTime: '15:00' },
      ];
      const result = validateBlockTypes(blocks);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid block type "class"', () => {
      const blocks = [
        { type: 'class', name: 'Math 101', startTime: '09:00', endTime: '10:00' },
      ];
      const result = validateBlockTypes(blocks);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('invalid type');
    });

    it('rejects unknown block type', () => {
      const blocks = [
        { type: 'nap', name: 'Power Nap', startTime: '14:00', endTime: '14:30' },
      ];
      const result = validateBlockTypes(blocks);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('nap');
    });
  });

  describe('validateChronologicalOrder', () => {
    it('passes for blocks in correct order', () => {
      const blocks = [
        { startTime: '09:00', endTime: '09:10', name: 'A' },
        { startTime: '09:10', endTime: '09:30', name: 'B' },
        { startTime: '10:00', endTime: '10:30', name: 'C' },
      ];
      const result = validateChronologicalOrder(blocks);
      expect(result.valid).toBe(true);
    });

    it('passes for blocks with same start time', () => {
      const blocks = [
        { startTime: '09:00', endTime: '09:10', name: 'A' },
        { startTime: '09:00', endTime: '09:30', name: 'B' },
      ];
      const result = validateChronologicalOrder(blocks);
      expect(result.valid).toBe(true);
    });

    it('fails for blocks out of order', () => {
      const blocks = [
        { startTime: '10:00', endTime: '10:30', name: 'B' },
        { startTime: '09:00', endTime: '09:30', name: 'A' },
      ];
      const result = validateChronologicalOrder(blocks);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('out of chronological order');
    });

    it('passes for a single block', () => {
      const blocks = [
        { startTime: '09:00', endTime: '09:30', name: 'A' },
      ];
      const result = validateChronologicalOrder(blocks);
      expect(result.valid).toBe(true);
    });

    it('passes for an empty array', () => {
      const result = validateChronologicalOrder([]);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateNoOverlapWithClasses', () => {
    const classes = [
      { name: 'Math 101', startTime: '09:00', endTime: '10:00' },
      { name: 'Physics', startTime: '14:00', endTime: '15:30' },
    ];

    it('passes when blocks don\'t overlap with classes', () => {
      const blocks = [
        { name: 'Study', startTime: '10:00', endTime: '11:00' },
        { name: 'Lunch', startTime: '12:00', endTime: '12:45' },
      ];
      const result = validateNoOverlapWithClasses(blocks, classes);
      expect(result.valid).toBe(true);
    });

    it('fails when a block overlaps with a class', () => {
      const blocks = [
        { name: 'Study', startTime: '09:30', endTime: '10:30' },
      ];
      const result = validateNoOverlapWithClasses(blocks, classes);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('overlaps with class "Math 101"');
    });

    it('fails when a block starts during a class', () => {
      const blocks = [
        { name: 'Coffee', startTime: '14:30', endTime: '15:00' },
      ];
      const result = validateNoOverlapWithClasses(blocks, classes);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('Physics');
    });

    it('passes when block ends exactly when class starts', () => {
      const blocks = [
        { name: 'Walk', startTime: '08:50', endTime: '09:00' },
      ];
      const result = validateNoOverlapWithClasses(blocks, classes);
      expect(result.valid).toBe(true);
    });

    it('passes when block starts exactly when class ends', () => {
      const blocks = [
        { name: 'Walk', startTime: '10:00', endTime: '10:10' },
      ];
      const result = validateNoOverlapWithClasses(blocks, classes);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateWithinGaps', () => {
    const gaps = [
      { startTime: '10:00', endTime: '12:00' },
      { startTime: '15:30', endTime: '17:00' },
    ];

    it('passes when blocks are within gaps', () => {
      const blocks = [
        { name: 'Study', startTime: '10:00', endTime: '11:00' },
        { name: 'Exercise', startTime: '15:30', endTime: '16:30' },
      ];
      const result = validateWithinGaps(blocks, gaps);
      expect(result.valid).toBe(true);
    });

    it('fails when a block extends beyond a gap', () => {
      const blocks = [
        { name: 'Study', startTime: '11:00', endTime: '12:30' },
      ];
      const result = validateWithinGaps(blocks, gaps);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('not within any computed time gap');
    });

    it('fails when a block is completely outside any gap', () => {
      const blocks = [
        { name: 'Lunch', startTime: '13:00', endTime: '13:30' },
      ];
      const result = validateWithinGaps(blocks, gaps);
      expect(result.valid).toBe(false);
    });

    it('passes when block fills an entire gap exactly', () => {
      const blocks = [
        { name: 'Long Study', startTime: '10:00', endTime: '12:00' },
      ];
      const result = validateWithinGaps(blocks, gaps);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateBlockDurations', () => {
    describe('transit blocks', () => {
      it('accepts transit block of 5 minutes', () => {
        const blocks = [{ type: 'transit', name: 'Walk', startTime: '10:00', endTime: '10:05' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('accepts transit block of 30 minutes', () => {
        const blocks = [{ type: 'transit', name: 'Bus', startTime: '10:00', endTime: '10:30' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('rejects transit block shorter than 5 minutes', () => {
        const blocks = [{ type: 'transit', name: 'Walk', startTime: '10:00', endTime: '10:03' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('must be 5-30 min');
      });

      it('rejects transit block longer than 30 minutes', () => {
        const blocks = [{ type: 'transit', name: 'Walk', startTime: '10:00', endTime: '10:35' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('must be 5-30 min');
      });
    });

    describe('meal blocks', () => {
      it('accepts breakfast meal of 30 min', () => {
        const blocks = [{ type: 'meal', name: 'Breakfast', startTime: '08:00', endTime: '08:30' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('accepts breakfast meal capped at 60 min', () => {
        const blocks = [{ type: 'meal', name: 'Breakfast', startTime: '08:00', endTime: '09:00' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('rejects breakfast meal exceeding 60 min cap', () => {
        const blocks = [{ type: 'meal', name: 'Breakfast', startTime: '08:00', endTime: '09:05' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('capped at 60 min');
      });

      it('accepts lunch meal of 45 min', () => {
        const blocks = [{ type: 'meal', name: 'Lunch', startTime: '12:00', endTime: '12:45' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('rejects lunch meal exceeding 60 min cap', () => {
        const blocks = [{ type: 'meal', name: 'Lunch', startTime: '11:00', endTime: '12:05' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('capped at 60 min');
      });

      it('accepts dinner meal of 90 min (dinner cap)', () => {
        const blocks = [{ type: 'meal', name: 'Dinner', startTime: '17:00', endTime: '18:30' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('rejects dinner meal exceeding 90 min cap', () => {
        const blocks = [{ type: 'meal', name: 'Dinner', startTime: '17:00', endTime: '18:35' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('capped at 90 min');
      });

      it('accepts snack of 15 min in breakfast window', () => {
        const blocks = [{ type: 'meal', name: 'Snack', startTime: '08:00', endTime: '08:15' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('accepts snack of 29 min in lunch window', () => {
        const blocks = [{ type: 'meal', name: 'Snack', startTime: '12:00', endTime: '12:29' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('accepts snack of 10 min in dinner window', () => {
        const blocks = [{ type: 'meal', name: 'Snack', startTime: '17:00', endTime: '17:10' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('rejects meal block shorter than 10 min in a meal window', () => {
        const blocks = [{ type: 'meal', name: 'Quick Bite', startTime: '12:00', endTime: '12:05' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('must be 10-29 min (snack) or ≥ 30 min');
      });
    });

    describe('activity blocks', () => {
      it('accepts activity block of 15 min (minimum)', () => {
        const blocks = [{ type: 'activity', name: 'Walk', startTime: '10:00', endTime: '10:15' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('accepts activity block of 60 min', () => {
        const blocks = [{ type: 'activity', name: 'Study', startTime: '10:00', endTime: '11:00' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(true);
      });

      it('rejects activity block shorter than 15 min', () => {
        const blocks = [{ type: 'activity', name: 'Quick Stretch', startTime: '10:00', endTime: '10:10' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('minimum is 15 min');
      });
    });

    describe('non-positive duration', () => {
      it('rejects block with end time equal to start time', () => {
        const blocks = [{ type: 'activity', name: 'Nothing', startTime: '10:00', endTime: '10:00' }];
        const result = validateBlockDurations(blocks);
        expect(result.valid).toBe(false);
        expect(result.errors[0].message).toContain('non-positive duration');
      });
    });
  });

  describe('validateNoBlockEndsAfterTransitStart', () => {
    it('passes when activity ends before transit starts', () => {
      const blocks = [
        { type: 'activity', name: 'Study', startTime: '10:00', endTime: '10:30' },
        { type: 'transit', name: 'Walk', startTime: '10:30', endTime: '10:40' },
      ];
      const result = validateNoBlockEndsAfterTransitStart(blocks);
      expect(result.valid).toBe(true);
    });

    it('fails when activity ends after transit starts', () => {
      const blocks = [
        { type: 'activity', name: 'Study', startTime: '10:00', endTime: '10:35' },
        { type: 'transit', name: 'Walk', startTime: '10:30', endTime: '10:40' },
      ];
      const result = validateNoBlockEndsAfterTransitStart(blocks);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('after the required transit');
    });

    it('fails when meal ends after transit starts', () => {
      const blocks = [
        { type: 'meal', name: 'Lunch', startTime: '12:00', endTime: '12:50' },
        { type: 'transit', name: 'Walk', startTime: '12:45', endTime: '12:55' },
      ];
      const result = validateNoBlockEndsAfterTransitStart(blocks);
      expect(result.valid).toBe(false);
    });

    it('does not flag transit followed by transit', () => {
      const blocks = [
        { type: 'transit', name: 'Walk A', startTime: '10:00', endTime: '10:15' },
        { type: 'transit', name: 'Walk B', startTime: '10:10', endTime: '10:20' },
      ];
      const result = validateNoBlockEndsAfterTransitStart(blocks);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateTimeBlocks (main function)', () => {
    const classes = [
      { name: 'Math 101', startTime: '09:00', endTime: '10:00' },
      { name: 'Physics', startTime: '14:00', endTime: '15:30' },
    ];
    const gaps = [
      { startTime: '10:00', endTime: '14:00' },
      { startTime: '15:30', endTime: '18:00' },
    ];

    it('returns valid for empty timeBlocks array', () => {
      const result = validateTimeBlocks([], classes, gaps);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validBlocks).toHaveLength(0);
    });

    it('returns valid for null/undefined timeBlocks', () => {
      const result = validateTimeBlocks(null, classes, gaps);
      expect(result.valid).toBe(true);
    });

    it('validates a correct schedule', () => {
      const blocks = [
        { type: 'transit', name: 'Walk to Library', startTime: '10:00', endTime: '10:10', location: 'Library' },
        { type: 'activity', name: 'Study', startTime: '10:10', endTime: '11:00', location: 'Library' },
        { type: 'meal', name: 'Lunch', startTime: '12:00', endTime: '12:45', location: 'Cafeteria' },
        { type: 'transit', name: 'Walk to Gym', startTime: '15:30', endTime: '15:40', location: 'Gym' },
        { type: 'activity', name: 'Exercise', startTime: '15:40', endTime: '16:30', location: 'Gym' },
      ];
      const result = validateTimeBlocks(blocks, classes, gaps);
      expect(result.valid).toBe(true);
      expect(result.validBlocks).toHaveLength(5);
    });

    it('identifies invalid blocks and returns valid ones', () => {
      const blocks = [
        { type: 'activity', name: 'Study', startTime: '10:00', endTime: '11:00', location: 'Library' },
        { type: 'invalid', name: 'Bad Block', startTime: '11:00', endTime: '11:30', location: 'Nowhere' },
        { type: 'meal', name: 'Lunch', startTime: '12:00', endTime: '12:45', location: 'Cafeteria' },
      ];
      const result = validateTimeBlocks(blocks, classes, gaps);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.validBlocks).toContain(blocks[0]);
      expect(result.validBlocks).toContain(blocks[2]);
      expect(result.validBlocks).not.toContain(blocks[1]);
    });

    it('catches overlap with class', () => {
      const blocks = [
        { type: 'activity', name: 'Study', startTime: '09:30', endTime: '10:30', location: 'Library' },
      ];
      const result = validateTimeBlocks(blocks, classes, gaps);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('overlaps with class'))).toBe(true);
    });

    it('catches block outside gaps', () => {
      const blocks = [
        { type: 'activity', name: 'Study', startTime: '08:00', endTime: '08:30', location: 'Library' },
      ];
      const result = validateTimeBlocks(blocks, classes, gaps);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('not within any computed time gap'))).toBe(true);
    });

    it('catches chronological order violation', () => {
      const blocks = [
        { type: 'activity', name: 'Study B', startTime: '11:00', endTime: '12:00', location: 'Library' },
        { type: 'activity', name: 'Study A', startTime: '10:00', endTime: '11:00', location: 'Library' },
      ];
      const result = validateTimeBlocks(blocks, classes, gaps);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('chronological order'))).toBe(true);
    });
  });
});
