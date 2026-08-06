import { TimeBlock } from '../models/TimeBlock.js';
import { timeToMinutes } from '../utils/time.js';

/**
 * Valid block types for generated time blocks (transit, meal, activity).
 */
const VALID_BLOCK_TYPES = ['transit', 'meal', 'activity'];

/**
 * Required fields for a valid TimeBlock in the response.
 */
const REQUIRED_FIELDS = ['startTime', 'endTime', 'type', 'name', 'location'];

/**
 * Time format regex for HH:mm validation.
 */
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Parse and validate a Bedrock API response into TimeBlock objects.
 * Returns valid blocks and excludes invalid ones (partial result support per Req 3.5).
 * Logs parse failures for debugging (Req 9.3).
 *
 * @param {object} responseData - The parsed JSON response from the API
 * @returns {{ success: boolean, timeBlocks: TimeBlock[], errors: string[] }}
 */
export function parseResponse(responseData) {
  const errors = [];

  // Validate top-level structure
  if (!responseData || typeof responseData !== 'object') {
    const msg = 'Response is not a valid object';
    logParseFailure(msg, responseData);
    return { success: false, timeBlocks: [], errors: [msg] };
  }

  if (!Array.isArray(responseData.timeBlocks)) {
    const msg = 'Response missing "timeBlocks" array';
    logParseFailure(msg, responseData);
    return { success: false, timeBlocks: [], errors: [msg] };
  }

  const rawBlocks = responseData.timeBlocks;

  if (rawBlocks.length === 0) {
    return { success: true, timeBlocks: [], errors: [] };
  }

  // Validate each block individually
  const validatedBlocks = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const raw = rawBlocks[i];
    const blockErrors = validateBlock(raw, i);

    if (blockErrors.length === 0) {
      validatedBlocks.push(raw);
    } else {
      errors.push(...blockErrors);
      logParseFailure(`Block at index ${i} failed validation`, { block: raw, errors: blockErrors });
    }
  }

  // Validate chronological order among valid blocks
  const orderedBlocks = filterChronological(validatedBlocks, errors);

  // Validate no overlaps among valid blocks
  const nonOverlappingBlocks = filterOverlaps(orderedBlocks, errors);

  // Convert to TimeBlock instances
  const timeBlocks = nonOverlappingBlocks.map(block => new TimeBlock({
    startTime: block.startTime,
    endTime: block.endTime,
    type: block.type,
    name: block.name,
    location: block.location
  }));

  const success = errors.length === 0 && timeBlocks.length > 0;

  return {
    success: timeBlocks.length > 0,
    timeBlocks,
    errors
  };
}

/**
 * Validate a single block has all required fields and valid values.
 *
 * @param {any} block - Raw block object from response
 * @param {number} index - Block index for error messages
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateBlock(block, index) {
  const errors = [];

  if (!block || typeof block !== 'object') {
    errors.push(`Block at index ${index} is not an object`);
    return errors;
  }

  // Check required fields exist
  for (const field of REQUIRED_FIELDS) {
    if (block[field] === undefined || block[field] === null || block[field] === '') {
      errors.push(`Block at index ${index} missing required field "${field}"`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  // Validate field types are strings
  for (const field of REQUIRED_FIELDS) {
    if (typeof block[field] !== 'string') {
      errors.push(`Block at index ${index} field "${field}" must be a string`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  // Validate time format
  if (!TIME_FORMAT_REGEX.test(block.startTime)) {
    errors.push(`Block at index ${index} has invalid startTime format "${block.startTime}"`);
  }

  if (!TIME_FORMAT_REGEX.test(block.endTime)) {
    errors.push(`Block at index ${index} has invalid endTime format "${block.endTime}"`);
  }

  // Validate endTime > startTime
  if (errors.length === 0) {
    const startMin = timeToMinutes(block.startTime);
    const endMin = timeToMinutes(block.endTime);
    if (endMin <= startMin) {
      errors.push(`Block at index ${index} endTime "${block.endTime}" must be after startTime "${block.startTime}"`);
    }
  }

  // Validate block type
  if (!VALID_BLOCK_TYPES.includes(block.type)) {
    errors.push(`Block at index ${index} has invalid type "${block.type}". Valid types: ${VALID_BLOCK_TYPES.join(', ')}`);
  }

  return errors;
}

/**
 * Filter blocks to maintain chronological order.
 * Removes blocks that break chronological ordering.
 *
 * @param {object[]} blocks - Validated blocks
 * @param {string[]} errors - Error array to append to
 * @returns {object[]} Blocks in chronological order
 */
function filterChronological(blocks, errors) {
  if (blocks.length <= 1) {
    return blocks;
  }

  const ordered = [blocks[0]];

  for (let i = 1; i < blocks.length; i++) {
    const prevStart = timeToMinutes(ordered[ordered.length - 1].startTime);
    const currStart = timeToMinutes(blocks[i].startTime);

    if (currStart >= prevStart) {
      ordered.push(blocks[i]);
    } else {
      errors.push(`Block "${blocks[i].name}" (${blocks[i].startTime}) is out of chronological order, excluded`);
      logParseFailure(`Block excluded due to chronological order violation`, blocks[i]);
    }
  }

  return ordered;
}

/**
 * Filter blocks to remove overlapping ones.
 * Keeps the first block when two overlap; removes the later one.
 *
 * @param {object[]} blocks - Chronologically ordered blocks
 * @param {string[]} errors - Error array to append to
 * @returns {object[]} Non-overlapping blocks
 */
function filterOverlaps(blocks, errors) {
  if (blocks.length <= 1) {
    return blocks;
  }

  const result = [blocks[0]];

  for (let i = 1; i < blocks.length; i++) {
    const prevEnd = timeToMinutes(result[result.length - 1].endTime);
    const currStart = timeToMinutes(blocks[i].startTime);

    if (currStart >= prevEnd) {
      result.push(blocks[i]);
    } else {
      errors.push(`Block "${blocks[i].name}" (${blocks[i].startTime}-${blocks[i].endTime}) overlaps with previous block, excluded`);
      logParseFailure(`Block excluded due to overlap`, blocks[i]);
    }
  }

  return result;
}

/**
 * Log parse failures for debugging (Req 9.3).
 *
 * @param {string} message - Description of the failure
 * @param {any} data - Related data for debugging
 */
function logParseFailure(message, data) {
  console.warn(`[ResponseParser] ${message}`, data);
}

/**
 * Format TimeBlock objects back to the response JSON format.
 * Used for round-trip validation (Req 3.4).
 *
 * @param {TimeBlock[]} timeBlocks - Array of TimeBlock objects
 * @param {string} [day] - Optional day of week
 * @returns {object} Response-format object with day and timeBlocks
 */
export function formatToResponse(timeBlocks, day = 'monday') {
  return {
    day,
    timeBlocks: timeBlocks.map(block => ({
      startTime: block.startTime,
      endTime: block.endTime,
      type: block.type,
      name: block.name,
      location: block.location
    }))
  };
}
