/**
 * Type constants for the AI Schedule Optimizer data models.
 */

/** @type {readonly string[]} */
export const DayOfWeek = Object.freeze([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday'
]);

/** @type {readonly string[]} */
export const BlockType = Object.freeze([
  'class',
  'transit',
  'meal',
  'activity'
]);

/** @type {readonly string[]} */
export const ActivityCategory = Object.freeze([
  'study',
  'exercise',
  'social',
  'relaxation',
  'errands'
]);

/** @type {readonly string[]} */
export const DietaryRestriction = Object.freeze([
  'vegetarian',
  'vegan',
  'gluten-free',
  'nut-free',
  'dairy-free',
  'halal',
  'kosher',
  'none'
]);

/** @type {readonly string[]} */
export const MealType = Object.freeze([
  'breakfast',
  'lunch',
  'dinner',
  'snack'
]);
