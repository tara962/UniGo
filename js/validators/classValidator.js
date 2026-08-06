import { validateTimeValue, timeToMinutes } from '../utils/time.js';
import { DayOfWeek } from '../models/constants.js';

/**
 * Validates class input fields and returns structured error objects.
 *
 * @param {object} input
 * @param {string} input.name - Class name (1-100 characters)
 * @param {string} input.day - Day of the week (monday-friday)
 * @param {string} input.startTime - Start time in HH:mm format
 * @param {string} input.endTime - End time in HH:mm format
 * @param {string} input.location - Campus location name
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }> }}
 */
export function validateClassInput({ name, day, startTime, endTime, location }) {
  const errors = [];

  // Validate name: must be a string, 1-100 characters
  if (typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Class name is required.' });
  } else if (name.length > 100) {
    errors.push({ field: 'name', message: 'Class name must be 100 characters or fewer.' });
  }

  // Validate day: must be a valid day of the week
  if (!DayOfWeek.includes(day)) {
    errors.push({ field: 'day', message: 'Day must be a weekday (monday through friday).' });
  }

  // Validate startTime
  const startValidation = validateTimeValue(startTime);
  if (!startValidation.valid) {
    errors.push({ field: 'startTime', message: startValidation.error });
  }

  // Validate endTime
  const endValidation = validateTimeValue(endTime);
  if (!endValidation.valid) {
    errors.push({ field: 'endTime', message: endValidation.error });
  }

  // Validate endTime > startTime (only if both times are individually valid)
  if (startValidation.valid && endValidation.valid) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (endMinutes <= startMinutes) {
      errors.push({ field: 'endTime', message: 'End time must be later than start time.' });
    }
  }

  // Validate location: must be a non-empty string
  if (typeof location !== 'string' || location.trim().length === 0) {
    errors.push({ field: 'location', message: 'Location is required.' });
  }

  return { valid: errors.length === 0, errors };
}
