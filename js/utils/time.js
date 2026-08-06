/**
 * Time utility functions for the AI Schedule Optimizer.
 * All times use "HH:mm" 24-hour format internally.
 */

/**
 * Parse a time string in "HH:mm" format into hours and minutes.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {{ hours: number, minutes: number }} Parsed time components
 * @throws {Error} If format is invalid
 */
export function parseTime(timeStr) {
  if (typeof timeStr !== 'string') {
    throw new Error('Time must be a string in "HH:mm" format');
  }
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid time format: "${timeStr}". Expected "HH:mm".`);
  }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time value: "${timeStr}". Hours must be 0-23, minutes 0-59.`);
  }
  return { hours, minutes };
}

/**
 * Format a time string from "HH:mm" (24h) to 12-hour display format.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {string} Formatted time like "9:00 AM" or "2:30 PM"
 */
export function formatTime12h(timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}

/**
 * Convert a time string "HH:mm" to total minutes since midnight.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {number} Minutes since midnight
 */
export function timeToMinutes(timeStr) {
  const { hours, minutes } = parseTime(timeStr);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes since midnight to "HH:mm" format.
 * @param {number} totalMinutes - Minutes since midnight (0-1439)
 * @returns {string} Time in "HH:mm" format
 * @throws {Error} If minutes are out of range
 */
export function minutesToTime(totalMinutes) {
  if (typeof totalMinutes !== 'number' || !Number.isInteger(totalMinutes)) {
    throw new Error('Minutes must be an integer');
  }
  if (totalMinutes < 0 || totalMinutes > 1439) {
    throw new Error(`Minutes out of range: ${totalMinutes}. Must be 0-1439.`);
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Calculate duration in minutes between two times.
 * @param {string} startTime - Start time in "HH:mm" format
 * @param {string} endTime - End time in "HH:mm" format
 * @returns {number} Duration in minutes (can be negative if endTime < startTime)
 */
export function calculateDuration(startTime, endTime) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/**
 * Validate that a time is on a 5-minute increment.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {boolean} True if time is a valid 5-minute increment
 */
export function isValidIncrement(timeStr) {
  try {
    const { minutes } = parseTime(timeStr);
    return minutes % 5 === 0;
  } catch {
    return false;
  }
}

/**
 * Validate that a time is within the allowed range of 06:00 to 23:00.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {boolean} True if time is in range [06:00, 23:00]
 */
export function isInTimeRange(timeStr) {
  try {
    const totalMinutes = timeToMinutes(timeStr);
    const minMinutes = 6 * 60;   // 06:00 = 360
    const maxMinutes = 23 * 60;  // 23:00 = 1380
    return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
  } catch {
    return false;
  }
}

/**
 * Validate a time value: must be valid format, 5-minute increment, and in 06:00-23:00 range.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {{ valid: boolean, error?: string }} Validation result
 */
export function validateTimeValue(timeStr) {
  try {
    parseTime(timeStr);
  } catch (e) {
    return { valid: false, error: e.message };
  }
  if (!isValidIncrement(timeStr)) {
    return { valid: false, error: `Time "${timeStr}" is not a 5-minute increment.` };
  }
  if (!isInTimeRange(timeStr)) {
    return { valid: false, error: `Time "${timeStr}" is outside the allowed range (06:00-23:00).` };
  }
  return { valid: true };
}

/**
 * Compute free time gaps for a day given a sorted list of classes.
 * Each gap includes the class before and after it (for transit decisions).
 *
 * @param {Array<{ startTime: string, endTime: string, name?: string, location?: string }>} sortedClasses
 *   Classes sorted by startTime for a single day
 * @returns {Array<{ startTime: string, endTime: string, duration: number, beforeClass: object|null, afterClass: object|null }>}
 *   Array of gap objects
 */
export function computeGaps(sortedClasses) {
  if (!Array.isArray(sortedClasses) || sortedClasses.length === 0) {
    return [];
  }

  const gaps = [];

  for (let i = 0; i < sortedClasses.length - 1; i++) {
    const beforeClass = sortedClasses[i];
    const afterClass = sortedClasses[i + 1];

    const gapStartMinutes = timeToMinutes(beforeClass.endTime);
    const gapEndMinutes = timeToMinutes(afterClass.startTime);
    const duration = gapEndMinutes - gapStartMinutes;

    if (duration > 0) {
      gaps.push({
        startTime: beforeClass.endTime,
        endTime: afterClass.startTime,
        duration,
        beforeClass,
        afterClass,
      });
    }
  }

  return gaps;
}
