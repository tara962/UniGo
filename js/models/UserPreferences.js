import { ActivityCategory, DietaryRestriction, MealType } from './constants.js';

/**
 * Represents user preferences for schedule optimization.
 */
export class UserPreferences {
  /**
   * @param {object} params
   * @param {string[]} params.activities - Activity categories ordered by rank (index 0 = highest)
   * @param {string[]} params.dietaryRestrictions - Dietary restrictions
   * @param {string[]} params.mealPreferences - Preferred meal types
   */
  constructor({ activities = [], dietaryRestrictions = [], mealPreferences = [] } = {}) {
    this.activities = activities;
    this.dietaryRestrictions = dietaryRestrictions;
    this.mealPreferences = mealPreferences;
  }

  /**
   * Serializes the preferences to a plain object for JSON storage.
   * @returns {object}
   */
  toJSON() {
    return {
      activities: [...this.activities],
      dietaryRestrictions: [...this.dietaryRestrictions],
      mealPreferences: [...this.mealPreferences]
    };
  }

  /**
   * Creates a UserPreferences instance from a plain object (deserialization).
   * @param {object} data
   * @returns {UserPreferences}
   */
  static fromJSON(data) {
    return new UserPreferences({
      activities: data.activities || [],
      dietaryRestrictions: data.dietaryRestrictions || [],
      mealPreferences: data.mealPreferences || []
    });
  }
}
