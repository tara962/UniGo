import { describe, it, expect } from 'vitest';
import { Class } from './Class.js';
import { TimeBlock } from './TimeBlock.js';
import { UserPreferences } from './UserPreferences.js';
import { Schedule } from './Schedule.js';
import { StoredState } from './StoredState.js';
import {
  DayOfWeek,
  BlockType,
  ActivityCategory,
  DietaryRestriction,
  MealType
} from './constants.js';

describe('Constants', () => {
  it('DayOfWeek contains all weekdays', () => {
    expect(DayOfWeek).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  });

  it('BlockType contains all block types', () => {
    expect(BlockType).toEqual(['class', 'transit', 'meal', 'activity']);
  });

  it('ActivityCategory contains all categories', () => {
    expect(ActivityCategory).toEqual(['study', 'exercise', 'social', 'relaxation', 'errands']);
  });

  it('DietaryRestriction contains all restrictions', () => {
    expect(DietaryRestriction).toEqual([
      'vegetarian', 'vegan', 'gluten-free', 'nut-free',
      'dairy-free', 'halal', 'kosher', 'none'
    ]);
  });

  it('MealType contains all meal types', () => {
    expect(MealType).toEqual(['breakfast', 'lunch', 'dinner', 'snack']);
  });

  it('constants are frozen (immutable)', () => {
    expect(Object.isFrozen(DayOfWeek)).toBe(true);
    expect(Object.isFrozen(BlockType)).toBe(true);
    expect(Object.isFrozen(ActivityCategory)).toBe(true);
    expect(Object.isFrozen(DietaryRestriction)).toBe(true);
    expect(Object.isFrozen(MealType)).toBe(true);
  });
});

describe('Class', () => {
  const classData = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Calculus 101',
    day: 'monday',
    startTime: '09:00',
    endTime: '10:30',
    location: 'Math Building Room 201'
  };

  it('constructs with all fields', () => {
    const cls = new Class(classData);
    expect(cls.id).toBe(classData.id);
    expect(cls.name).toBe(classData.name);
    expect(cls.day).toBe(classData.day);
    expect(cls.startTime).toBe(classData.startTime);
    expect(cls.endTime).toBe(classData.endTime);
    expect(cls.location).toBe(classData.location);
  });

  it('serializes to JSON', () => {
    const cls = new Class(classData);
    const json = cls.toJSON();
    expect(json).toEqual(classData);
  });

  it('deserializes from JSON', () => {
    const cls = Class.fromJSON(classData);
    expect(cls).toBeInstanceOf(Class);
    expect(cls.id).toBe(classData.id);
    expect(cls.name).toBe(classData.name);
    expect(cls.day).toBe(classData.day);
    expect(cls.startTime).toBe(classData.startTime);
    expect(cls.endTime).toBe(classData.endTime);
    expect(cls.location).toBe(classData.location);
  });

  it('round-trips through JSON serialization', () => {
    const cls = new Class(classData);
    const restored = Class.fromJSON(JSON.parse(JSON.stringify(cls.toJSON())));
    expect(restored.toJSON()).toEqual(cls.toJSON());
  });
});

describe('TimeBlock', () => {
  const blockData = {
    startTime: '10:30',
    endTime: '10:40',
    type: 'transit',
    name: 'Walk to Library',
    location: 'University Library'
  };

  it('constructs with all fields', () => {
    const block = new TimeBlock(blockData);
    expect(block.startTime).toBe(blockData.startTime);
    expect(block.endTime).toBe(blockData.endTime);
    expect(block.type).toBe(blockData.type);
    expect(block.name).toBe(blockData.name);
    expect(block.location).toBe(blockData.location);
  });

  it('serializes to JSON', () => {
    const block = new TimeBlock(blockData);
    const json = block.toJSON();
    expect(json).toEqual(blockData);
  });

  it('deserializes from JSON', () => {
    const block = TimeBlock.fromJSON(blockData);
    expect(block).toBeInstanceOf(TimeBlock);
    expect(block.startTime).toBe(blockData.startTime);
    expect(block.type).toBe(blockData.type);
  });

  it('round-trips through JSON serialization', () => {
    const block = new TimeBlock(blockData);
    const restored = TimeBlock.fromJSON(JSON.parse(JSON.stringify(block.toJSON())));
    expect(restored.toJSON()).toEqual(block.toJSON());
  });
});

describe('UserPreferences', () => {
  const prefsData = {
    activities: ['study', 'exercise', 'social'],
    dietaryRestrictions: ['vegetarian'],
    mealPreferences: ['lunch', 'snack']
  };

  it('constructs with all fields', () => {
    const prefs = new UserPreferences(prefsData);
    expect(prefs.activities).toEqual(prefsData.activities);
    expect(prefs.dietaryRestrictions).toEqual(prefsData.dietaryRestrictions);
    expect(prefs.mealPreferences).toEqual(prefsData.mealPreferences);
  });

  it('constructs with defaults when no args provided', () => {
    const prefs = new UserPreferences();
    expect(prefs.activities).toEqual([]);
    expect(prefs.dietaryRestrictions).toEqual([]);
    expect(prefs.mealPreferences).toEqual([]);
  });

  it('serializes to JSON', () => {
    const prefs = new UserPreferences(prefsData);
    const json = prefs.toJSON();
    expect(json).toEqual(prefsData);
  });

  it('toJSON creates copies of arrays', () => {
    const prefs = new UserPreferences(prefsData);
    const json = prefs.toJSON();
    json.activities.push('errands');
    expect(prefs.activities).not.toContain('errands');
  });

  it('deserializes from JSON', () => {
    const prefs = UserPreferences.fromJSON(prefsData);
    expect(prefs).toBeInstanceOf(UserPreferences);
    expect(prefs.activities).toEqual(prefsData.activities);
  });

  it('deserializes with missing fields gracefully', () => {
    const prefs = UserPreferences.fromJSON({});
    expect(prefs.activities).toEqual([]);
    expect(prefs.dietaryRestrictions).toEqual([]);
    expect(prefs.mealPreferences).toEqual([]);
  });

  it('round-trips through JSON serialization', () => {
    const prefs = new UserPreferences(prefsData);
    const restored = UserPreferences.fromJSON(JSON.parse(JSON.stringify(prefs.toJSON())));
    expect(restored.toJSON()).toEqual(prefs.toJSON());
  });
});

describe('Schedule', () => {
  const scheduleData = {
    day: 'monday',
    timeBlocks: [
      { startTime: '10:30', endTime: '10:40', type: 'transit', name: 'Walk to Library', location: 'University Library' },
      { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study Session', location: 'University Library' }
    ],
    generatedAt: '2024-01-15T10:30:00.000Z',
    seed: 1
  };

  it('constructs with all fields', () => {
    const schedule = new Schedule({
      ...scheduleData,
      timeBlocks: scheduleData.timeBlocks.map(b => new TimeBlock(b))
    });
    expect(schedule.day).toBe('monday');
    expect(schedule.timeBlocks).toHaveLength(2);
    expect(schedule.timeBlocks[0]).toBeInstanceOf(TimeBlock);
    expect(schedule.generatedAt).toBe(scheduleData.generatedAt);
    expect(schedule.seed).toBe(1);
  });

  it('constructs with empty timeBlocks by default', () => {
    const schedule = new Schedule({ day: 'tuesday', generatedAt: '2024-01-15T10:30:00.000Z', seed: 0 });
    expect(schedule.timeBlocks).toEqual([]);
  });

  it('serializes to JSON', () => {
    const schedule = new Schedule({
      ...scheduleData,
      timeBlocks: scheduleData.timeBlocks.map(b => new TimeBlock(b))
    });
    const json = schedule.toJSON();
    expect(json).toEqual(scheduleData);
  });

  it('deserializes from JSON', () => {
    const schedule = Schedule.fromJSON(scheduleData);
    expect(schedule).toBeInstanceOf(Schedule);
    expect(schedule.day).toBe('monday');
    expect(schedule.timeBlocks).toHaveLength(2);
    expect(schedule.timeBlocks[0]).toBeInstanceOf(TimeBlock);
    expect(schedule.timeBlocks[0].type).toBe('transit');
  });

  it('round-trips through JSON serialization', () => {
    const schedule = Schedule.fromJSON(scheduleData);
    const restored = Schedule.fromJSON(JSON.parse(JSON.stringify(schedule.toJSON())));
    expect(restored.toJSON()).toEqual(schedule.toJSON());
  });
});

describe('StoredState', () => {
  const stateData = {
    classes: [
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Calculus 101',
        day: 'monday',
        startTime: '09:00',
        endTime: '10:30',
        location: 'Math Building Room 201'
      }
    ],
    preferences: {
      activities: ['study', 'exercise'],
      dietaryRestrictions: ['vegetarian'],
      mealPreferences: ['lunch']
    },
    schedules: {
      monday: {
        day: 'monday',
        timeBlocks: [
          { startTime: '10:30', endTime: '11:30', type: 'activity', name: 'Study', location: 'Library' }
        ],
        generatedAt: '2024-01-15T10:30:00.000Z',
        seed: 1
      },
      tuesday: null,
      wednesday: null,
      thursday: null,
      friday: null
    },
    regenerationCounts: { 'monday-0': 2, 'wednesday-1': 5 }
  };

  it('constructs with all fields', () => {
    const state = StoredState.fromJSON(stateData);
    expect(state.classes).toHaveLength(1);
    expect(state.classes[0]).toBeInstanceOf(Class);
    expect(state.preferences).toBeInstanceOf(UserPreferences);
    expect(state.schedules.monday).toBeInstanceOf(Schedule);
    expect(state.schedules.tuesday).toBeNull();
    expect(state.regenerationCounts).toEqual({ 'monday-0': 2, 'wednesday-1': 5 });
  });

  it('constructs with defaults when no args provided', () => {
    const state = new StoredState();
    expect(state.classes).toEqual([]);
    expect(state.preferences).toBeInstanceOf(UserPreferences);
    expect(state.preferences.activities).toEqual([]);
    expect(state.schedules.monday).toBeNull();
    expect(state.schedules.friday).toBeNull();
    expect(state.regenerationCounts).toEqual({});
  });

  it('serializes to JSON', () => {
    const state = StoredState.fromJSON(stateData);
    const json = state.toJSON();
    expect(json).toEqual(stateData);
  });

  it('deserializes from JSON', () => {
    const state = StoredState.fromJSON(stateData);
    expect(state).toBeInstanceOf(StoredState);
    expect(state.classes[0].name).toBe('Calculus 101');
    expect(state.preferences.activities).toEqual(['study', 'exercise']);
    expect(state.schedules.monday.timeBlocks[0].name).toBe('Study');
  });

  it('handles missing fields gracefully on deserialization', () => {
    const state = StoredState.fromJSON({});
    expect(state.classes).toEqual([]);
    expect(state.preferences).toBeInstanceOf(UserPreferences);
    expect(state.schedules.monday).toBeNull();
    expect(state.regenerationCounts).toEqual({});
  });

  it('round-trips through JSON serialization', () => {
    const state = StoredState.fromJSON(stateData);
    const restored = StoredState.fromJSON(JSON.parse(JSON.stringify(state.toJSON())));
    expect(restored.toJSON()).toEqual(state.toJSON());
  });
});
