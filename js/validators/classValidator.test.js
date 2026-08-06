import { describe, it, expect } from 'vitest';
import { validateClassInput } from './classValidator.js';

describe('validateClassInput', () => {
  const validInput = {
    name: 'Calculus 101',
    day: 'monday',
    startTime: '09:00',
    endTime: '10:30',
    location: 'Math Building Room 201'
  };

  it('accepts a fully valid class input', () => {
    const result = validateClassInput(validInput);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // Name validation
  describe('name validation', () => {
    it('rejects empty name', () => {
      const result = validateClassInput({ ...validInput, name: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'name', message: expect.stringContaining('required') })
      );
    });

    it('rejects whitespace-only name', () => {
      const result = validateClassInput({ ...validInput, name: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });

    it('rejects name longer than 100 characters', () => {
      const longName = 'A'.repeat(101);
      const result = validateClassInput({ ...validInput, name: longName });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'name', message: expect.stringContaining('100') })
      );
    });

    it('accepts name with exactly 1 character', () => {
      const result = validateClassInput({ ...validInput, name: 'A' });
      expect(result.valid).toBe(true);
    });

    it('accepts name with exactly 100 characters', () => {
      const result = validateClassInput({ ...validInput, name: 'A'.repeat(100) });
      expect(result.valid).toBe(true);
    });

    it('rejects non-string name', () => {
      const result = validateClassInput({ ...validInput, name: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'name' })
      );
    });
  });

  // Day validation
  describe('day validation', () => {
    it('accepts all valid weekdays', () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      for (const day of days) {
        const result = validateClassInput({ ...validInput, day });
        expect(result.valid).toBe(true);
      }
    });

    it('rejects invalid day strings', () => {
      const result = validateClassInput({ ...validInput, day: 'saturday' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'day' })
      );
    });

    it('rejects undefined day', () => {
      const result = validateClassInput({ ...validInput, day: undefined });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'day' })
      );
    });
  });

  // Start time validation
  describe('startTime validation', () => {
    it('rejects times not on 5-minute increments', () => {
      const result = validateClassInput({ ...validInput, startTime: '09:03' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'startTime', message: expect.stringContaining('5-minute') })
      );
    });

    it('rejects times before 06:00', () => {
      const result = validateClassInput({ ...validInput, startTime: '05:00' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'startTime', message: expect.stringContaining('range') })
      );
    });

    it('rejects times after 23:00', () => {
      const result = validateClassInput({ ...validInput, startTime: '23:05' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'startTime' })
      );
    });

    it('accepts boundary time 06:00', () => {
      const result = validateClassInput({ ...validInput, startTime: '06:00', endTime: '07:00' });
      expect(result.valid).toBe(true);
    });

    it('accepts boundary time 23:00', () => {
      const result = validateClassInput({ ...validInput, startTime: '22:00', endTime: '23:00' });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid time format', () => {
      const result = validateClassInput({ ...validInput, startTime: '9am' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'startTime' })
      );
    });
  });

  // End time validation
  describe('endTime validation', () => {
    it('rejects times not on 5-minute increments', () => {
      const result = validateClassInput({ ...validInput, endTime: '10:33' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'endTime', message: expect.stringContaining('5-minute') })
      );
    });

    it('rejects times outside allowed range', () => {
      const result = validateClassInput({ ...validInput, endTime: '23:30' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'endTime' })
      );
    });
  });

  // End time > start time validation
  describe('endTime > startTime validation', () => {
    it('rejects endTime equal to startTime', () => {
      const result = validateClassInput({ ...validInput, startTime: '09:00', endTime: '09:00' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'endTime', message: expect.stringContaining('later') })
      );
    });

    it('rejects endTime before startTime', () => {
      const result = validateClassInput({ ...validInput, startTime: '10:00', endTime: '09:00' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'endTime', message: expect.stringContaining('later') })
      );
    });

    it('accepts endTime just after startTime (5 min gap)', () => {
      const result = validateClassInput({ ...validInput, startTime: '09:00', endTime: '09:05' });
      expect(result.valid).toBe(true);
    });
  });

  // Location validation
  describe('location validation', () => {
    it('rejects empty location', () => {
      const result = validateClassInput({ ...validInput, location: '' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'location', message: expect.stringContaining('required') })
      );
    });

    it('rejects whitespace-only location', () => {
      const result = validateClassInput({ ...validInput, location: '   ' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'location' })
      );
    });

    it('rejects non-string location', () => {
      const result = validateClassInput({ ...validInput, location: null });
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'location' })
      );
    });
  });

  // Multiple errors
  describe('multiple errors', () => {
    it('returns all errors when multiple fields are invalid', () => {
      const result = validateClassInput({
        name: '',
        day: 'sunday',
        startTime: 'invalid',
        endTime: 'invalid',
        location: ''
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });
});
