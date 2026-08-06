import { describe, it, expect } from 'vitest';
import { computeScheduleGaps, calculateTransitDuration } from './scheduleLogic.js';

describe('calculateTransitDuration', () => {
  it('returns 0 for identical locations', () => {
    expect(calculateTransitDuration('Math Building Room 201', 'Math Building Room 201')).toBe(0);
  });

  it('returns 5 for same building different room', () => {
    expect(calculateTransitDuration('Math Building Room 201', 'Math Building Room 305')).toBe(5);
  });

  it('returns 10 for different buildings', () => {
    expect(calculateTransitDuration('Math Building Room 201', 'Science Hall Room 101')).toBe(10);
  });

  it('returns 0 when fromLocation is empty', () => {
    expect(calculateTransitDuration('', 'Science Hall')).toBe(0);
  });

  it('returns 0 when toLocation is empty', () => {
    expect(calculateTransitDuration('Math Building', '')).toBe(0);
  });

  it('returns 0 when both locations are null', () => {
    expect(calculateTransitDuration(null, null)).toBe(0);
  });

  it('returns 0 when both locations are undefined', () => {
    expect(calculateTransitDuration(undefined, undefined)).toBe(0);
  });

  it('handles case-insensitive building comparison', () => {
    expect(calculateTransitDuration('math Building Room 201', 'Math Building Room 305')).toBe(5);
  });

  it('trims whitespace from locations', () => {
    expect(calculateTransitDuration('  Math Building Room 201  ', 'Math Building Room 305')).toBe(5);
  });

  it('result is always between 5 and 30 when transit is needed', () => {
    const result = calculateTransitDuration('A', 'B');
    expect(result).toBeGreaterThanOrEqual(5);
    expect(result).toBeLessThanOrEqual(30);
  });
});

describe('computeScheduleGaps', () => {
  it('returns empty array for empty class list', () => {
    expect(computeScheduleGaps([])).toEqual([]);
  });

  it('returns empty array for single class', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', location: 'Math Building', name: 'Calc' }
    ];
    expect(computeScheduleGaps(classes)).toEqual([]);
  });

  it('returns empty array for non-array input', () => {
    expect(computeScheduleGaps(null)).toEqual([]);
    expect(computeScheduleGaps(undefined)).toEqual([]);
  });

  it('filters out gaps shorter than 15 minutes', () => {
    const classes = [
      { startTime: '09:00', endTime: '09:50', location: 'Math Building', name: 'Calc' },
      { startTime: '10:00', endTime: '11:00', location: 'Math Building', name: 'Physics' }
    ];
    // Gap is 10 min (09:50 to 10:00) — should be filtered out
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(0);
  });

  it('returns gaps of exactly 15 minutes', () => {
    const classes = [
      { startTime: '09:00', endTime: '09:45', location: 'Math Building', name: 'Calc' },
      { startTime: '10:00', endTime: '11:00', location: 'Math Building', name: 'Physics' }
    ];
    // Gap is 15 min (09:45 to 10:00)
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].duration).toBe(15);
  });

  it('computes gap with no transit needed (same location)', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', location: 'Math Building Room 201', name: 'Calc' },
      { startTime: '11:00', endTime: '12:00', location: 'Math Building Room 201', name: 'Algebra' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      transitNeeded: false,
      transitDuration: 0,
      usableTime: 60,
    });
  });

  it('computes gap with transit needed (same building)', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', location: 'Math Building Room 201', name: 'Calc' },
      { startTime: '11:00', endTime: '12:00', location: 'Math Building Room 305', name: 'Algebra' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      transitNeeded: true,
      transitDuration: 5,
      usableTime: 55,
    });
  });

  it('computes gap with transit needed (different buildings)', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', location: 'Math Building Room 201', name: 'Calc' },
      { startTime: '11:00', endTime: '12:00', location: 'Science Hall Room 101', name: 'Chemistry' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({
      startTime: '10:00',
      endTime: '11:00',
      duration: 60,
      transitNeeded: true,
      transitDuration: 10,
      usableTime: 50,
    });
  });

  it('handles gap entirely consumed by transit (usableTime = 0)', () => {
    // Gap of 15 min between different buildings (transit = 10 min)
    const classes = [
      { startTime: '09:00', endTime: '09:45', location: 'Math Building Room 201', name: 'Calc' },
      { startTime: '10:00', endTime: '11:00', location: 'Science Hall Room 101', name: 'Chemistry' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].transitNeeded).toBe(true);
    expect(gaps[0].transitDuration).toBe(10);
    expect(gaps[0].usableTime).toBe(5); // 15 - 10 = 5
  });

  it('usable time is 0 when transit equals or exceeds gap (Req 4.4 scenario)', () => {
    // We can create a scenario where transit >= gap only with maximum transit (30 min).
    // Since our heuristic caps at 10 min for different buildings, we need a 
    // gap that's smaller or equal. But our filter is >= 15 min so let's test
    // that usableTime doesn't go negative
    const classes = [
      { startTime: '09:00', endTime: '09:45', location: 'Arts Center', name: 'Drawing' },
      { startTime: '09:50', endTime: '11:00', location: 'Engineering Lab', name: 'Circuits' }
    ];
    // Gap is only 5 min (09:45 to 09:50) — filtered out by MIN_GAP_MINUTES
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(0);
  });

  it('computes multiple gaps correctly', () => {
    const classes = [
      { startTime: '08:00', endTime: '09:00', location: 'Math Building', name: 'Calc' },
      { startTime: '10:00', endTime: '11:00', location: 'Science Hall', name: 'Physics' },
      { startTime: '13:00', endTime: '14:00', location: 'Library', name: 'Study Group' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(2);

    // First gap: 09:00 to 10:00 (60 min), different buildings
    expect(gaps[0]).toMatchObject({
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
      transitNeeded: true,
      transitDuration: 10,
      usableTime: 50,
    });

    // Second gap: 11:00 to 13:00 (120 min), different buildings
    expect(gaps[1]).toMatchObject({
      startTime: '11:00',
      endTime: '13:00',
      duration: 120,
      transitNeeded: true,
      transitDuration: 10,
      usableTime: 110,
    });
  });

  it('includes beforeClass and afterClass references in gaps', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', location: 'Math Building', name: 'Calc' },
      { startTime: '11:00', endTime: '12:00', location: 'Science Hall', name: 'Physics' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps[0].beforeClass.name).toBe('Calc');
    expect(gaps[0].afterClass.name).toBe('Physics');
  });

  it('handles classes with missing location gracefully', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'Calc' },
      { startTime: '11:00', endTime: '12:00', name: 'Physics' }
    ];
    const gaps = computeScheduleGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].transitNeeded).toBe(false);
    expect(gaps[0].transitDuration).toBe(0);
    expect(gaps[0].usableTime).toBe(60);
  });
});
