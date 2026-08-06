import { timeToMinutes } from '../utils/time.js';

/**
 * Maximum number of classes allowed in a schedule.
 */
const MAX_CLASSES = 30;

/**
 * Detect time overlaps between a new class and existing classes on the same day.
 * Overlap is defined as: classA.startTime < classB.endTime AND classA.endTime > classB.startTime
 *
 * @param {object} newClass - The class being added (must have day, startTime, endTime, name)
 * @param {Array<object>} existingClasses - Array of existing classes
 * @returns {{ hasOverlap: boolean, conflicts: Array<{ existingClass: object, message: string }> }}
 */
export function detectOverlaps(newClass, existingClasses) {
  if (!newClass || !Array.isArray(existingClasses)) {
    return { hasOverlap: false, conflicts: [] };
  }

  const conflicts = [];
  const newStart = timeToMinutes(newClass.startTime);
  const newEnd = timeToMinutes(newClass.endTime);

  for (const existing of existingClasses) {
    // Only check classes on the same day
    if (existing.day !== newClass.day) {
      continue;
    }

    // Skip comparing class with itself (by id)
    if (existing.id && newClass.id && existing.id === newClass.id) {
      continue;
    }

    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);

    // Overlap: classA.startTime < classB.endTime AND classA.endTime > classB.startTime
    if (newStart < existingEnd && newEnd > existingStart) {
      conflicts.push({
        existingClass: existing,
        message: `"${newClass.name}" (${newClass.startTime}-${newClass.endTime}) overlaps with "${existing.name}" (${existing.startTime}-${existing.endTime})`
      });
    }
  }

  return {
    hasOverlap: conflicts.length > 0,
    conflicts
  };
}

/**
 * Validate that the class limit has not been exceeded.
 *
 * @param {Array<object>} existingClasses - Array of existing classes
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateClassLimit(existingClasses) {
  if (!Array.isArray(existingClasses)) {
    return { valid: true };
  }

  if (existingClasses.length >= MAX_CLASSES) {
    return {
      valid: false,
      error: `Maximum of ${MAX_CLASSES} classes reached. Remove a class before adding a new one.`
    };
  }

  return { valid: true };
}
