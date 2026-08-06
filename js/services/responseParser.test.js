import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseResponse, formatToResponse } from './responseParser.js';
import { TimeBlock } from '../models/TimeBlock.js';

describe('responseParser', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('parseResponse', () => {
    describe('valid responses', () => {
      it('should parse a valid response with multiple time blocks', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '10:30', endTime: '10:40', type: 'transit', name: 'Walk to Library', location: 'University Library' },
            { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study Session', location: 'University Library' },
            { startTime: '11:30', endTime: '12:15', type: 'meal', name: 'Lunch', location: 'Student Center' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(3);
        expect(result.errors).toHaveLength(0);
        expect(result.timeBlocks[0]).toBeInstanceOf(TimeBlock);
        expect(result.timeBlocks[0].startTime).toBe('10:30');
        expect(result.timeBlocks[0].type).toBe('transit');
      });

      it('should parse an empty timeBlocks array', () => {
        const response = { day: 'tuesday', timeBlocks: [] };
        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should parse a single valid time block', () => {
        const response = {
          day: 'wednesday',
          timeBlocks: [
            { startTime: '09:00', endTime: '09:45', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(1);
        expect(result.timeBlocks[0].name).toBe('Study');
      });
    });

    describe('invalid top-level structure', () => {
      it('should return failure for null response', () => {
        const result = parseResponse(null);

        expect(result.success).toBe(false);
        expect(result.timeBlocks).toHaveLength(0);
        expect(result.errors).toContain('Response is not a valid object');
      });

      it('should return failure for undefined response', () => {
        const result = parseResponse(undefined);

        expect(result.success).toBe(false);
        expect(result.timeBlocks).toHaveLength(0);
      });

      it('should return failure for non-object response', () => {
        const result = parseResponse('invalid');

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('not a valid object');
      });

      it('should return failure when timeBlocks is missing', () => {
        const result = parseResponse({ day: 'monday' });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Response missing "timeBlocks" array');
      });

      it('should return failure when timeBlocks is not an array', () => {
        const result = parseResponse({ day: 'monday', timeBlocks: 'not-array' });

        expect(result.success).toBe(false);
        expect(result.errors).toContain('Response missing "timeBlocks" array');
      });
    });

    describe('block field validation', () => {
      it('should exclude blocks missing required fields', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: '09:30', type: 'activity', name: 'Study', location: 'Library' },
            { startTime: '10:00', endTime: '10:30', type: 'activity', name: 'Read' }
            // missing location
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(1);
        expect(result.timeBlocks[0].name).toBe('Study');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should exclude blocks with empty string fields', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: '09:30', type: 'activity', name: '', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(false);
        expect(result.timeBlocks).toHaveLength(0);
        expect(result.errors[0]).toContain('missing required field "name"');
      });

      it('should exclude non-object blocks', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            'not-an-object',
            { startTime: '09:00', endTime: '09:30', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(1);
        expect(result.timeBlocks[0].name).toBe('Study');
      });
    });

    describe('time format validation', () => {
      it('should exclude blocks with invalid startTime format', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '9:00', endTime: '09:30', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(false);
        expect(result.timeBlocks).toHaveLength(0);
        expect(result.errors[0]).toContain('invalid startTime format');
      });

      it('should exclude blocks with invalid endTime format', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: 'noon', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('invalid endTime format');
      });

      it('should exclude blocks where endTime is not after startTime', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '10:00', endTime: '09:00', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('endTime "09:00" must be after startTime "10:00"');
      });

      it('should exclude blocks where endTime equals startTime', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '10:00', endTime: '10:00', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain('endTime "10:00" must be after startTime "10:00"');
      });
    });

    describe('block type validation', () => {
      it('should exclude blocks with invalid type', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: '09:30', type: 'class', name: 'Math', location: 'Room 101' },
            { startTime: '10:00', endTime: '10:30', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(1);
        expect(result.timeBlocks[0].name).toBe('Study');
        expect(result.errors[0]).toContain('invalid type "class"');
      });

      it('should accept all valid types: transit, meal, activity', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: '09:10', type: 'transit', name: 'Walk', location: 'Path' },
            { startTime: '09:10', endTime: '09:45', type: 'meal', name: 'Snack', location: 'Cafe' },
            { startTime: '09:45', endTime: '10:30', type: 'activity', name: 'Study', location: 'Library' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(3);
      });
    });

    describe('chronological order validation', () => {
      it('should exclude blocks that break chronological order', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '10:00', endTime: '10:30', type: 'activity', name: 'First', location: 'A' },
            { startTime: '09:00', endTime: '09:30', type: 'activity', name: 'OutOfOrder', location: 'B' },
            { startTime: '11:00', endTime: '11:30', type: 'activity', name: 'Third', location: 'C' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(2);
        expect(result.timeBlocks[0].name).toBe('First');
        expect(result.timeBlocks[1].name).toBe('Third');
        expect(result.errors.some(e => e.includes('chronological order'))).toBe(true);
      });
    });

    describe('overlap validation', () => {
      it('should exclude overlapping blocks (keeps first)', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: '10:00', type: 'activity', name: 'First', location: 'A' },
            { startTime: '09:30', endTime: '10:30', type: 'activity', name: 'Overlapping', location: 'B' },
            { startTime: '11:00', endTime: '11:30', type: 'activity', name: 'Third', location: 'C' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(2);
        expect(result.timeBlocks[0].name).toBe('First');
        expect(result.timeBlocks[1].name).toBe('Third');
        expect(result.errors.some(e => e.includes('overlaps'))).toBe(true);
      });

      it('should allow adjacent blocks (end = next start)', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '09:00', endTime: '10:00', type: 'activity', name: 'First', location: 'A' },
            { startTime: '10:00', endTime: '11:00', type: 'activity', name: 'Second', location: 'B' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(2);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('partial validity (Req 3.5)', () => {
      it('should return valid blocks even when some are invalid', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: '08:00', endTime: '08:30', type: 'activity', name: 'Valid1', location: 'A' },
            { startTime: '09:00', endTime: '09:30', type: 'unknown', name: 'BadType', location: 'B' },
            { startTime: '10:00', endTime: '10:30', type: 'meal', name: 'Valid2', location: 'C' },
            { startTime: '11:00', endTime: '10:00', type: 'activity', name: 'BadTime', location: 'D' },
            { startTime: '12:00', endTime: '12:30', type: 'transit', name: 'Valid3', location: 'E' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(true);
        expect(result.timeBlocks).toHaveLength(3);
        expect(result.timeBlocks[0].name).toBe('Valid1');
        expect(result.timeBlocks[1].name).toBe('Valid2');
        expect(result.timeBlocks[2].name).toBe('Valid3');
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should return success false when all blocks are invalid', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: 'bad', endTime: '09:30', type: 'activity', name: 'A', location: 'X' },
            { startTime: '10:00', endTime: '10:30', type: 'invalid', name: 'B', location: 'Y' }
          ]
        };

        const result = parseResponse(response);

        expect(result.success).toBe(false);
        expect(result.timeBlocks).toHaveLength(0);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('logging (Req 9.3)', () => {
      it('should log parse failures via console.warn', () => {
        const response = {
          day: 'monday',
          timeBlocks: [
            { startTime: 'bad', endTime: '09:30', type: 'activity', name: 'Test', location: 'X' }
          ]
        };

        parseResponse(response);

        expect(console.warn).toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('[ResponseParser]'),
          expect.anything()
        );
      });

      it('should log when top-level structure is invalid', () => {
        parseResponse(null);

        expect(console.warn).toHaveBeenCalledWith(
          expect.stringContaining('[ResponseParser]'),
          null
        );
      });
    });
  });

  describe('formatToResponse', () => {
    it('should format TimeBlock objects back to response JSON', () => {
      const blocks = [
        new TimeBlock({ startTime: '10:30', endTime: '10:40', type: 'transit', name: 'Walk', location: 'Library' }),
        new TimeBlock({ startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study', location: 'Library' })
      ];

      const result = formatToResponse(blocks, 'monday');

      expect(result.day).toBe('monday');
      expect(result.timeBlocks).toHaveLength(2);
      expect(result.timeBlocks[0]).toEqual({
        startTime: '10:30',
        endTime: '10:40',
        type: 'transit',
        name: 'Walk',
        location: 'Library'
      });
    });

    it('should default day to monday if not provided', () => {
      const result = formatToResponse([]);

      expect(result.day).toBe('monday');
      expect(result.timeBlocks).toHaveLength(0);
    });

    it('should produce round-trip compatible output (Req 3.4)', () => {
      const originalBlocks = [
        new TimeBlock({ startTime: '09:00', endTime: '09:10', type: 'transit', name: 'Walk', location: 'A' }),
        new TimeBlock({ startTime: '09:10', endTime: '09:45', type: 'meal', name: 'Snack', location: 'B' }),
        new TimeBlock({ startTime: '09:45', endTime: '10:30', type: 'activity', name: 'Study', location: 'C' })
      ];

      const formatted = formatToResponse(originalBlocks, 'tuesday');
      const parsed = parseResponse(formatted);

      expect(parsed.success).toBe(true);
      expect(parsed.timeBlocks).toHaveLength(3);

      for (let i = 0; i < originalBlocks.length; i++) {
        expect(parsed.timeBlocks[i].startTime).toBe(originalBlocks[i].startTime);
        expect(parsed.timeBlocks[i].endTime).toBe(originalBlocks[i].endTime);
        expect(parsed.timeBlocks[i].type).toBe(originalBlocks[i].type);
        expect(parsed.timeBlocks[i].name).toBe(originalBlocks[i].name);
        expect(parsed.timeBlocks[i].location).toBe(originalBlocks[i].location);
      }
    });
  });
});
