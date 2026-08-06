import { timeToMinutes } from '../utils/time.js';
import { BlockType } from '../models/constants.js';

/**
 * Valid block types for generated time blocks (excludes 'class').
 */
const VALID_GENERATED_TYPES = ['transit', 'meal', 'activity'];

/**
 * Meal window definitions with duration rules.
 */
const MEAL_WINDOWS = {
  breakfast: { start: 7 * 60, end: 10 * 60, minMeal: 30, maxMeal: 60 },
  lunch: { start: 11 * 60, end: 14 * 60, minMeal: 30, maxMeal: 60 },
  dinner: { start: 17 * 60, end: 20 * 60, minMeal: 30, maxMeal: 90 },
};

/**
 * Validate that time blocks don't overlap with classes.
 *
 * @param {Array<object>} blocks - TimeBlock objects with startTime, endTime
 * @param {Array<object>} classes - Class objects with startTime, endTime
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }> }}
 */
export function validateNoOverlapWithClasses(blocks, classes) {
  const errors = [];

  for (const block of blocks) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);

    for (const cls of classes) {
      const classStart = timeToMinutes(cls.startTime);
      const classEnd = timeToMinutes(cls.endTime);

      if (blockStart < classEnd && blockEnd > classStart) {
        errors.push({
          block,
          message: `Block "${block.name}" (${block.startTime}-${block.endTime}) overlaps with class "${cls.name}" (${cls.startTime}-${cls.endTime})`
        });
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that time blocks are within computed gaps.
 *
 * @param {Array<object>} blocks - TimeBlock objects with startTime, endTime
 * @param {Array<object>} gaps - Gap objects with startTime, endTime
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }> }}
 */
export function validateWithinGaps(blocks, gaps) {
  const errors = [];

  for (const block of blocks) {
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);

    const withinAGap = gaps.some(gap => {
      const gapStart = timeToMinutes(gap.startTime);
      const gapEnd = timeToMinutes(gap.endTime);
      return blockStart >= gapStart && blockEnd <= gapEnd;
    });

    if (!withinAGap) {
      errors.push({
        block,
        message: `Block "${block.name}" (${block.startTime}-${block.endTime}) is not within any computed time gap`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that time blocks are in chronological order.
 *
 * @param {Array<object>} blocks - TimeBlock objects with startTime
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }> }}
 */
export function validateChronologicalOrder(blocks) {
  const errors = [];

  for (let i = 1; i < blocks.length; i++) {
    const prevStart = timeToMinutes(blocks[i - 1].startTime);
    const currStart = timeToMinutes(blocks[i].startTime);

    if (currStart < prevStart) {
      errors.push({
        block: blocks[i],
        message: `Block "${blocks[i].name}" (${blocks[i].startTime}) is out of chronological order — appears after "${blocks[i - 1].name}" (${blocks[i - 1].startTime})`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that block types are valid generated types (transit, meal, activity).
 *
 * @param {Array<object>} blocks - TimeBlock objects with type field
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }> }}
 */
export function validateBlockTypes(blocks) {
  const errors = [];

  for (const block of blocks) {
    if (!VALID_GENERATED_TYPES.includes(block.type)) {
      errors.push({
        block,
        message: `Block "${block.name}" has invalid type "${block.type}". Valid types are: ${VALID_GENERATED_TYPES.join(', ')}`
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Determine which meal window (if any) a block falls into based on its start time.
 *
 * @param {number} startMinutes - Block start time in minutes since midnight
 * @returns {string|null} - 'breakfast', 'lunch', 'dinner', or null
 */
function getMealWindow(startMinutes) {
  for (const [window, config] of Object.entries(MEAL_WINDOWS)) {
    if (startMinutes >= config.start && startMinutes < config.end) {
      return window;
    }
  }
  return null;
}

/**
 * Validate block durations based on type:
 * - Transit: 5-30 minutes
 * - Meal: depends on meal window (≥30 min capped, or 10-29 for snack)
 * - Activity: ≥ 15 minutes
 *
 * @param {Array<object>} blocks - TimeBlock objects with startTime, endTime, type
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }> }}
 */
export function validateBlockDurations(blocks) {
  const errors = [];

  for (const block of blocks) {
    const startMin = timeToMinutes(block.startTime);
    const endMin = timeToMinutes(block.endTime);
    const duration = endMin - startMin;

    if (duration <= 0) {
      errors.push({
        block,
        message: `Block "${block.name}" has non-positive duration (${block.startTime}-${block.endTime})`
      });
      continue;
    }

    if (block.type === 'transit') {
      if (duration < 5 || duration > 30) {
        errors.push({
          block,
          message: `Transit block "${block.name}" duration is ${duration} min; must be 5-30 min`
        });
      }
    } else if (block.type === 'meal') {
      const window = getMealWindow(startMin);
      if (window) {
        const config = MEAL_WINDOWS[window];
        // Snack: 10-29 min; Meal: ≥ 30 min capped at max
        if (duration >= 10 && duration <= 29) {
          // Valid as a snack — OK
        } else if (duration >= config.minMeal) {
          if (duration > config.maxMeal) {
            errors.push({
              block,
              message: `Meal block "${block.name}" duration is ${duration} min; ${window} meals capped at ${config.maxMeal} min`
            });
          }
        } else {
          errors.push({
            block,
            message: `Meal block "${block.name}" duration is ${duration} min; must be 10-29 min (snack) or ≥ ${config.minMeal} min (meal) in ${window} window`
          });
        }
      } else {
        // Meal block outside known meal window — apply general minimum
        if (duration < 10) {
          errors.push({
            block,
            message: `Meal block "${block.name}" duration is ${duration} min; minimum is 10 min for snacks`
          });
        }
      }
    } else if (block.type === 'activity') {
      if (duration < 15) {
        errors.push({
          block,
          message: `Activity block "${block.name}" duration is ${duration} min; minimum is 15 min`
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate that no activity or meal block ends after the start of a required transit block
 * that immediately follows it.
 *
 * @param {Array<object>} blocks - TimeBlock objects sorted chronologically
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }> }}
 */
export function validateNoBlockEndsAfterTransitStart(blocks) {
  const errors = [];

  for (let i = 0; i < blocks.length - 1; i++) {
    const current = blocks[i];
    const next = blocks[i + 1];

    if (next.type === 'transit' && (current.type === 'activity' || current.type === 'meal')) {
      const currentEnd = timeToMinutes(current.endTime);
      const transitStart = timeToMinutes(next.startTime);

      if (currentEnd > transitStart) {
        errors.push({
          block: current,
          message: `Block "${current.name}" ends at ${current.endTime} which is after the required transit "${next.name}" starting at ${next.startTime}`
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Main validation function that runs all TimeBlock validations.
 *
 * @param {Array<object>} timeBlocks - Array of TimeBlock objects to validate
 * @param {Array<object>} classes - Array of Class objects for the day
 * @param {Array<object>} gaps - Array of computed gap objects
 * @returns {{ valid: boolean, errors: Array<{ block: object, message: string }>, validBlocks: Array<object> }}
 */
export function validateTimeBlocks(timeBlocks, classes, gaps) {
  if (!Array.isArray(timeBlocks) || timeBlocks.length === 0) {
    return { valid: true, errors: [], validBlocks: [] };
  }

  const allErrors = [];

  // Run all validations
  const typeResult = validateBlockTypes(timeBlocks);
  allErrors.push(...typeResult.errors);

  const orderResult = validateChronologicalOrder(timeBlocks);
  allErrors.push(...orderResult.errors);

  const overlapResult = validateNoOverlapWithClasses(timeBlocks, classes);
  allErrors.push(...overlapResult.errors);

  const gapResult = validateWithinGaps(timeBlocks, gaps);
  allErrors.push(...gapResult.errors);

  const durationResult = validateBlockDurations(timeBlocks);
  allErrors.push(...durationResult.errors);

  const transitResult = validateNoBlockEndsAfterTransitStart(timeBlocks);
  allErrors.push(...transitResult.errors);

  // Determine which blocks are valid (no errors referencing them)
  const blocksWithErrors = new Set(allErrors.map(e => e.block));
  const validBlocks = timeBlocks.filter(block => !blocksWithErrors.has(block));

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    validBlocks
  };
}
