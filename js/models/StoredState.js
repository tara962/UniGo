import { Class } from './Class.js';
import { UserPreferences } from './UserPreferences.js';
import { Schedule } from './Schedule.js';
import { DayOfWeek } from './constants.js';

/**
 * Represents the complete persisted application state.
 */
export class StoredState {
  /**
   * @param {object} params
   * @param {Class[]} params.classes - Array of classes (max 30)
   * @param {UserPreferences} params.preferences - User preferences
   * @param {Record<string, Schedule|null>} params.schedules - Schedules per day
   * @param {Record<string, number>} params.regenerationCounts - Regeneration counts keyed by "day-gapIndex"
   */
  constructor({ classes = [], preferences = null, schedules = null, regenerationCounts = {} } = {}) {
    this.classes = classes;
    this.preferences = preferences || new UserPreferences();
    this.schedules = schedules || Object.fromEntries(DayOfWeek.map(day => [day, null]));
    this.regenerationCounts = regenerationCounts;
  }

  /**
   * Serializes the stored state to a plain object for JSON storage.
   * @returns {object}
   */
  toJSON() {
    const schedulesJSON = {};
    for (const day of DayOfWeek) {
      schedulesJSON[day] = this.schedules[day] ? this.schedules[day].toJSON() : null;
    }

    return {
      classes: this.classes.map(c => c.toJSON()),
      preferences: this.preferences.toJSON(),
      schedules: schedulesJSON,
      regenerationCounts: { ...this.regenerationCounts }
    };
  }

  /**
   * Creates a StoredState instance from a plain object (deserialization).
   * @param {object} data
   * @returns {StoredState}
   */
  static fromJSON(data) {
    const schedules = {};
    for (const day of DayOfWeek) {
      schedules[day] = data.schedules && data.schedules[day]
        ? Schedule.fromJSON(data.schedules[day])
        : null;
    }

    return new StoredState({
      classes: (data.classes || []).map(c => Class.fromJSON(c)),
      preferences: data.preferences
        ? UserPreferences.fromJSON(data.preferences)
        : new UserPreferences(),
      schedules,
      regenerationCounts: data.regenerationCounts || {}
    });
  }
}
