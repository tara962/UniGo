import { describe, it, expect } from 'vitest';
import {
  parseTime,
  formatTime12h,
  timeToMinutes,
  minutesToTime,
  calculateDuration,
  isValidIncrement,
  isInTimeRange,
  validateTimeValue,
  computeGaps,
} from './time.js';

describe('parseTime', () => {
  it('parses a valid time string', () => {
    expect(parseTime('09:30')).toEqual({ hours: 9, minutes: 30 });
  });

  it('parses midnight', () => {
    expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 });
  });

  it('parses end of day', () => {
    expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 });
  });

  it('throws on invalid format (no colon)', () => {
    expect(() => parseTime('0930')).toThrow('Invalid time format');
  });

  it('throws on single-digit hours', () => {
    expect(() => parseTime('9:30')).toThrow('Invalid time format');
  });

  it('throws on non-string input', () => {
    expect(() => parseTime(930)).toThrow('Time must be a string');
  });

  it('throws on invalid hour value', () => {
    expect(() => parseTime('25:00')).toThrow('Invalid time value');
  });

  it('throws on invalid minute value', () => {
    expect(() => parseTime('12:60')).toThrow('Invalid time value');
  });
});

describe('formatTime12h', () => {
  it('formats morning time', () => {
    expect(formatTime12h('09:00')).toBe('9:00 AM');
  });

  it('formats afternoon time', () => {
    expect(formatTime12h('14:30')).toBe('2:30 PM');
  });

  it('formats noon', () => {
    expect(formatTime12h('12:00')).toBe('12:00 PM');
  });

  it('formats midnight', () => {
    expect(formatTime12h('00:00')).toBe('12:00 AM');
  });

  it('formats 1 AM', () => {
    expect(formatTime12h('01:05')).toBe('1:05 AM');
  });

  it('formats 11 PM', () => {
    expect(formatTime12h('23:00')).toBe('11:00 PM');
  });

  it('formats time with minutes', () => {
    expect(formatTime12h('06:45')).toBe('6:45 AM');
  });
});

describe('timeToMinutes', () => {
  it('converts midnight to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0);
  });

  it('converts 1 hour to 60', () => {
    expect(timeToMinutes('01:00')).toBe(60);
  });

  it('converts 09:30 to 570', () => {
    expect(timeToMinutes('09:30')).toBe(570);
  });

  it('converts 23:59 to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439);
  });

  it('converts 06:00 to 360', () => {
    expect(timeToMinutes('06:00')).toBe(360);
  });
});

describe('minutesToTime', () => {
  it('converts 0 to 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('converts 60 to 01:00', () => {
    expect(minutesToTime(60)).toBe('01:00');
  });

  it('converts 570 to 09:30', () => {
    expect(minutesToTime(570)).toBe('09:30');
  });

  it('converts 1439 to 23:59', () => {
    expect(minutesToTime(1439)).toBe('23:59');
  });

  it('throws on negative minutes', () => {
    expect(() => minutesToTime(-1)).toThrow('Minutes out of range');
  });

  it('throws on minutes > 1439', () => {
    expect(() => minutesToTime(1440)).toThrow('Minutes out of range');
  });

  it('throws on non-integer', () => {
    expect(() => minutesToTime(5.5)).toThrow('Minutes must be an integer');
  });

  it('throws on non-number', () => {
    expect(() => minutesToTime('60')).toThrow('Minutes must be an integer');
  });
});

describe('calculateDuration', () => {
  it('calculates duration between two times', () => {
    expect(calculateDuration('09:00', '10:30')).toBe(90);
  });

  it('returns 0 for same times', () => {
    expect(calculateDuration('12:00', '12:00')).toBe(0);
  });

  it('returns negative when end is before start', () => {
    expect(calculateDuration('14:00', '09:00')).toBe(-300);
  });

  it('calculates short duration', () => {
    expect(calculateDuration('08:00', '08:05')).toBe(5);
  });

  it('calculates full day range', () => {
    expect(calculateDuration('06:00', '23:00')).toBe(1020);
  });
});

describe('isValidIncrement', () => {
  it('accepts 5-minute increments', () => {
    expect(isValidIncrement('09:00')).toBe(true);
    expect(isValidIncrement('09:05')).toBe(true);
    expect(isValidIncrement('09:10')).toBe(true);
    expect(isValidIncrement('09:15')).toBe(true);
    expect(isValidIncrement('09:30')).toBe(true);
    expect(isValidIncrement('09:45')).toBe(true);
    expect(isValidIncrement('09:55')).toBe(true);
  });

  it('rejects non-5-minute increments', () => {
    expect(isValidIncrement('09:01')).toBe(false);
    expect(isValidIncrement('09:03')).toBe(false);
    expect(isValidIncrement('09:07')).toBe(false);
    expect(isValidIncrement('09:14')).toBe(false);
    expect(isValidIncrement('09:59')).toBe(false);
  });

  it('returns false for invalid format', () => {
    expect(isValidIncrement('invalid')).toBe(false);
    expect(isValidIncrement('')).toBe(false);
  });
});

describe('isInTimeRange', () => {
  it('accepts 06:00 (lower boundary)', () => {
    expect(isInTimeRange('06:00')).toBe(true);
  });

  it('accepts 23:00 (upper boundary)', () => {
    expect(isInTimeRange('23:00')).toBe(true);
  });

  it('accepts times within range', () => {
    expect(isInTimeRange('12:00')).toBe(true);
    expect(isInTimeRange('09:30')).toBe(true);
    expect(isInTimeRange('18:45')).toBe(true);
  });

  it('rejects times before 06:00', () => {
    expect(isInTimeRange('05:59')).toBe(false);
    expect(isInTimeRange('00:00')).toBe(false);
    expect(isInTimeRange('05:00')).toBe(false);
  });

  it('rejects times after 23:00', () => {
    expect(isInTimeRange('23:01')).toBe(false);
    expect(isInTimeRange('23:59')).toBe(false);
  });

  it('returns false for invalid format', () => {
    expect(isInTimeRange('bad')).toBe(false);
  });
});

describe('validateTimeValue', () => {
  it('accepts valid time on 5-min increment in range', () => {
    expect(validateTimeValue('09:00')).toEqual({ valid: true });
    expect(validateTimeValue('06:00')).toEqual({ valid: true });
    expect(validateTimeValue('23:00')).toEqual({ valid: true });
    expect(validateTimeValue('14:35')).toEqual({ valid: true });
  });

  it('rejects invalid format', () => {
    const result = validateTimeValue('9:00');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid time format');
  });

  it('rejects non-5-minute increment', () => {
    const result = validateTimeValue('09:03');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not a 5-minute increment');
  });

  it('rejects time out of range', () => {
    const result = validateTimeValue('05:00');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('outside the allowed range');
  });

  it('rejects time after 23:00 even on 5-min increment', () => {
    const result = validateTimeValue('23:05');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('outside the allowed range');
  });
});

describe('computeGaps', () => {
  it('returns empty array for empty class list', () => {
    expect(computeGaps([])).toEqual([]);
  });

  it('returns empty array for single class', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'Math', location: 'Room A' },
    ];
    expect(computeGaps(classes)).toEqual([]);
  });

  it('computes a single gap between two classes', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'Math', location: 'Room A' },
      { startTime: '11:00', endTime: '12:00', name: 'English', location: 'Room B' },
    ];
    const gaps = computeGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toEqual({
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      beforeClass: classes[0],
      afterClass: classes[1],
    });
  });

  it('computes multiple gaps between classes', () => {
    const classes = [
      { startTime: '08:00', endTime: '09:00', name: 'A', location: 'L1' },
      { startTime: '10:00', endTime: '11:00', name: 'B', location: 'L2' },
      { startTime: '13:00', endTime: '14:00', name: 'C', location: 'L3' },
    ];
    const gaps = computeGaps(classes);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].startTime).toBe('09:00');
    expect(gaps[0].endTime).toBe('10:00');
    expect(gaps[0].duration).toBe(60);
    expect(gaps[0].beforeClass.name).toBe('A');
    expect(gaps[0].afterClass.name).toBe('B');
    expect(gaps[1].startTime).toBe('11:00');
    expect(gaps[1].endTime).toBe('13:00');
    expect(gaps[1].duration).toBe(120);
    expect(gaps[1].beforeClass.name).toBe('B');
    expect(gaps[1].afterClass.name).toBe('C');
  });

  it('returns no gap when classes are back-to-back', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'A', location: 'L1' },
      { startTime: '10:00', endTime: '11:00', name: 'B', location: 'L2' },
    ];
    const gaps = computeGaps(classes);
    expect(gaps).toHaveLength(0);
  });

  it('computes short gap (5 minutes)', () => {
    const classes = [
      { startTime: '09:00', endTime: '09:55', name: 'A', location: 'L1' },
      { startTime: '10:00', endTime: '11:00', name: 'B', location: 'L2' },
    ];
    const gaps = computeGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].duration).toBe(5);
  });

  it('handles classes with only name and times (no location)', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'A' },
      { startTime: '12:00', endTime: '13:00', name: 'B' },
    ];
    const gaps = computeGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].duration).toBe(120);
    expect(gaps[0].beforeClass).toBe(classes[0]);
    expect(gaps[0].afterClass).toBe(classes[1]);
  });

  it('returns empty for null/undefined input', () => {
    expect(computeGaps(null)).toEqual([]);
    expect(computeGaps(undefined)).toEqual([]);
  });
});
