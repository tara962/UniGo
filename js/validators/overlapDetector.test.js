import { describe, it, expect } from 'vitest';
import { detectOverlaps, validateClassLimit } from './overlapDetector.js';

describe('detectOverlaps', () => {
  it('returns no conflicts when there are no existing classes', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00' };
    const result = detectOverlaps(newClass, []);
    expect(result.hasOverlap).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('returns no conflicts when classes are on different days', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00' };
    const existing = [
      { name: 'Physics', day: 'tuesday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('returns no conflicts when classes are adjacent (no gap, no overlap)', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '10:00', endTime: '11:00' };
    const existing = [
      { name: 'Physics', day: 'monday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('detects overlap when new class starts before existing ends', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '09:30', endTime: '10:30' };
    const existing = [
      { name: 'Physics', day: 'monday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].existingClass).toEqual(existing[0]);
    expect(result.conflicts[0].message).toContain('Math');
    expect(result.conflicts[0].message).toContain('Physics');
  });

  it('detects overlap when new class completely contains existing class', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '08:00', endTime: '12:00' };
    const existing = [
      { name: 'Physics', day: 'monday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  it('detects overlap when existing class completely contains new class', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '09:15', endTime: '09:45' };
    const existing = [
      { name: 'Physics', day: 'monday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  it('detects overlap when new class ends after existing starts', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '08:00', endTime: '09:30' };
    const existing = [
      { name: 'Physics', day: 'monday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  it('detects multiple conflicts on the same day', () => {
    const newClass = { name: 'Math', day: 'monday', startTime: '09:00', endTime: '14:00' };
    const existing = [
      { name: 'Physics', day: 'monday', startTime: '09:30', endTime: '10:30' },
      { name: 'Chemistry', day: 'monday', startTime: '11:00', endTime: '12:00' },
      { name: 'English', day: 'tuesday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(true);
    expect(result.conflicts).toHaveLength(2);
    expect(result.conflicts[0].existingClass.name).toBe('Physics');
    expect(result.conflicts[1].existingClass.name).toBe('Chemistry');
  });

  it('skips self-comparison by id', () => {
    const newClass = { id: 'abc', name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00' };
    const existing = [
      { id: 'abc', name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(false);
    expect(result.conflicts).toEqual([]);
  });

  it('handles null/undefined inputs gracefully', () => {
    expect(detectOverlaps(null, [])).toEqual({ hasOverlap: false, conflicts: [] });
    expect(detectOverlaps(undefined, [])).toEqual({ hasOverlap: false, conflicts: [] });
    expect(detectOverlaps({ name: 'X', day: 'monday', startTime: '09:00', endTime: '10:00' }, null))
      .toEqual({ hasOverlap: false, conflicts: [] });
  });

  it('includes times in the conflict message', () => {
    const newClass = { name: 'Calculus', day: 'wednesday', startTime: '14:00', endTime: '15:30' };
    const existing = [
      { name: 'Biology', day: 'wednesday', startTime: '14:30', endTime: '16:00' }
    ];
    const result = detectOverlaps(newClass, existing);
    expect(result.hasOverlap).toBe(true);
    expect(result.conflicts[0].message).toContain('14:00');
    expect(result.conflicts[0].message).toContain('15:30');
    expect(result.conflicts[0].message).toContain('14:30');
    expect(result.conflicts[0].message).toContain('16:00');
  });
});

describe('validateClassLimit', () => {
  it('returns valid when under the limit', () => {
    const classes = Array.from({ length: 10 }, (_, i) => ({ name: `Class ${i}` }));
    const result = validateClassLimit(classes);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('returns valid for empty array', () => {
    const result = validateClassLimit([]);
    expect(result.valid).toBe(true);
  });

  it('returns valid for 29 classes (one below limit)', () => {
    const classes = Array.from({ length: 29 }, (_, i) => ({ name: `Class ${i}` }));
    const result = validateClassLimit(classes);
    expect(result.valid).toBe(true);
  });

  it('returns invalid when at exactly 30 classes', () => {
    const classes = Array.from({ length: 30 }, (_, i) => ({ name: `Class ${i}` }));
    const result = validateClassLimit(classes);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('30');
  });

  it('returns invalid when over 30 classes', () => {
    const classes = Array.from({ length: 35 }, (_, i) => ({ name: `Class ${i}` }));
    const result = validateClassLimit(classes);
    expect(result.valid).toBe(false);
  });

  it('handles non-array input gracefully', () => {
    expect(validateClassLimit(null)).toEqual({ valid: true });
    expect(validateClassLimit(undefined)).toEqual({ valid: true });
  });
});
