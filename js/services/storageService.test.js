import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveClasses,
  loadClasses,
  savePreferences,
  loadPreferences,
  saveSchedule,
  loadSchedule,
  getRegenerationCount,
  incrementRegenerationCount
} from './storageService.js';
import { Class } from '../models/Class.js';
import { UserPreferences } from '../models/UserPreferences.js';
import { Schedule } from '../models/Schedule.js';
import { TimeBlock } from '../models/TimeBlock.js';

describe('storageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveClasses / loadClasses', () => {
    it('returns an empty array when no classes are stored', () => {
      const classes = loadClasses();
      expect(classes).toEqual([]);
    });

    it('saves and loads a single class', () => {
      const cls = new Class({
        id: 'abc-123',
        name: 'Calculus 101',
        day: 'monday',
        startTime: '09:00',
        endTime: '10:30',
        location: 'Math Building'
      });

      saveClasses([cls]);
      const loaded = loadClasses();

      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toBeInstanceOf(Class);
      expect(loaded[0].id).toBe('abc-123');
      expect(loaded[0].name).toBe('Calculus 101');
      expect(loaded[0].day).toBe('monday');
      expect(loaded[0].startTime).toBe('09:00');
      expect(loaded[0].endTime).toBe('10:30');
      expect(loaded[0].location).toBe('Math Building');
    });

    it('saves and loads multiple classes', () => {
      const classes = [
        new Class({ id: '1', name: 'Class A', day: 'monday', startTime: '08:00', endTime: '09:00', location: 'Room 1' }),
        new Class({ id: '2', name: 'Class B', day: 'tuesday', startTime: '10:00', endTime: '11:00', location: 'Room 2' }),
        new Class({ id: '3', name: 'Class C', day: 'wednesday', startTime: '14:00', endTime: '15:30', location: 'Room 3' })
      ];

      saveClasses(classes);
      const loaded = loadClasses();

      expect(loaded).toHaveLength(3);
      expect(loaded[0].name).toBe('Class A');
      expect(loaded[1].name).toBe('Class B');
      expect(loaded[2].name).toBe('Class C');
    });

    it('overwrites previous classes on save', () => {
      saveClasses([new Class({ id: '1', name: 'Old', day: 'monday', startTime: '08:00', endTime: '09:00', location: 'A' })]);
      saveClasses([new Class({ id: '2', name: 'New', day: 'tuesday', startTime: '10:00', endTime: '11:00', location: 'B' })]);

      const loaded = loadClasses();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('New');
    });
  });

  describe('savePreferences / loadPreferences', () => {
    it('returns default preferences when none are stored', () => {
      const prefs = loadPreferences();
      expect(prefs).toBeInstanceOf(UserPreferences);
      expect(prefs.activities).toEqual([]);
      expect(prefs.dietaryRestrictions).toEqual([]);
      expect(prefs.mealPreferences).toEqual([]);
    });

    it('saves and loads preferences', () => {
      const prefs = new UserPreferences({
        activities: ['study', 'exercise', 'social'],
        dietaryRestrictions: ['vegetarian', 'gluten-free'],
        mealPreferences: ['lunch', 'snack']
      });

      savePreferences(prefs);
      const loaded = loadPreferences();

      expect(loaded).toBeInstanceOf(UserPreferences);
      expect(loaded.activities).toEqual(['study', 'exercise', 'social']);
      expect(loaded.dietaryRestrictions).toEqual(['vegetarian', 'gluten-free']);
      expect(loaded.mealPreferences).toEqual(['lunch', 'snack']);
    });

    it('overwrites previous preferences on save', () => {
      savePreferences(new UserPreferences({ activities: ['study'] }));
      savePreferences(new UserPreferences({ activities: ['exercise', 'social'] }));

      const loaded = loadPreferences();
      expect(loaded.activities).toEqual(['exercise', 'social']);
    });
  });

  describe('saveSchedule / loadSchedule', () => {
    it('returns null when no schedule is stored for a day', () => {
      const schedule = loadSchedule('monday');
      expect(schedule).toBeNull();
    });

    it('saves and loads a schedule for a specific day', () => {
      const schedule = new Schedule({
        day: 'monday',
        timeBlocks: [
          new TimeBlock({ startTime: '10:30', endTime: '10:40', type: 'transit', name: 'Walk', location: 'Library' }),
          new TimeBlock({ startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study', location: 'Library' })
        ],
        generatedAt: '2024-01-15T10:00:00Z',
        seed: 1
      });

      saveSchedule('monday', schedule);
      const loaded = loadSchedule('monday');

      expect(loaded).toBeInstanceOf(Schedule);
      expect(loaded.day).toBe('monday');
      expect(loaded.timeBlocks).toHaveLength(2);
      expect(loaded.timeBlocks[0]).toBeInstanceOf(TimeBlock);
      expect(loaded.timeBlocks[0].startTime).toBe('10:30');
      expect(loaded.timeBlocks[0].type).toBe('transit');
      expect(loaded.timeBlocks[1].name).toBe('Study');
      expect(loaded.generatedAt).toBe('2024-01-15T10:00:00Z');
      expect(loaded.seed).toBe(1);
    });

    it('saves schedules for different days independently', () => {
      const mondaySchedule = new Schedule({ day: 'monday', timeBlocks: [], generatedAt: '2024-01-15T10:00:00Z', seed: 1 });
      const tuesdaySchedule = new Schedule({ day: 'tuesday', timeBlocks: [], generatedAt: '2024-01-16T10:00:00Z', seed: 2 });

      saveSchedule('monday', mondaySchedule);
      saveSchedule('tuesday', tuesdaySchedule);

      expect(loadSchedule('monday').generatedAt).toBe('2024-01-15T10:00:00Z');
      expect(loadSchedule('tuesday').generatedAt).toBe('2024-01-16T10:00:00Z');
      expect(loadSchedule('wednesday')).toBeNull();
    });
  });

  describe('getRegenerationCount / incrementRegenerationCount', () => {
    it('returns 0 for untracked day/gap combinations', () => {
      expect(getRegenerationCount('monday', 0)).toBe(0);
      expect(getRegenerationCount('friday', 3)).toBe(0);
    });

    it('increments the count for a specific day and gap', () => {
      incrementRegenerationCount('monday', 0);
      expect(getRegenerationCount('monday', 0)).toBe(1);

      incrementRegenerationCount('monday', 0);
      expect(getRegenerationCount('monday', 0)).toBe(2);
    });

    it('tracks counts independently per day/gap combination', () => {
      incrementRegenerationCount('monday', 0);
      incrementRegenerationCount('monday', 1);
      incrementRegenerationCount('tuesday', 0);

      expect(getRegenerationCount('monday', 0)).toBe(1);
      expect(getRegenerationCount('monday', 1)).toBe(1);
      expect(getRegenerationCount('tuesday', 0)).toBe(1);
      expect(getRegenerationCount('wednesday', 0)).toBe(0);
    });
  });

  describe('graceful handling of corrupted data', () => {
    it('returns defaults when localStorage contains invalid JSON', () => {
      localStorage.setItem('unigo_state', 'not valid json {{{');

      const classes = loadClasses();
      const prefs = loadPreferences();
      const schedule = loadSchedule('monday');
      const count = getRegenerationCount('monday', 0);

      expect(classes).toEqual([]);
      expect(prefs).toBeInstanceOf(UserPreferences);
      expect(prefs.activities).toEqual([]);
      expect(schedule).toBeNull();
      expect(count).toBe(0);
    });

    it('returns defaults when localStorage contains unexpected structure', () => {
      localStorage.setItem('unigo_state', JSON.stringify({ unexpected: 'data' }));

      const classes = loadClasses();
      const prefs = loadPreferences();

      expect(classes).toEqual([]);
      expect(prefs).toBeInstanceOf(UserPreferences);
    });

    it('preserves other state fields when updating one field', () => {
      const cls = new Class({ id: '1', name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00', location: 'Room A' });
      saveClasses([cls]);

      const prefs = new UserPreferences({ activities: ['study'] });
      savePreferences(prefs);

      // Classes should still be there after saving preferences
      const loadedClasses = loadClasses();
      expect(loadedClasses).toHaveLength(1);
      expect(loadedClasses[0].name).toBe('Math');

      // Preferences should still be there after saving classes again
      saveClasses([cls, new Class({ id: '2', name: 'Science', day: 'tuesday', startTime: '11:00', endTime: '12:00', location: 'Room B' })]);
      const loadedPrefs = loadPreferences();
      expect(loadedPrefs.activities).toEqual(['study']);
    });
  });
});
