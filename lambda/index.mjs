/**
 * AWS Lambda handler for the AI Schedule Optimizer.
 * Proxies schedule optimization requests to Amazon Bedrock (Claude 3 Haiku).
 *
 * Requirements: 3.1, 3.2, 3.5, 4.1, 9.1, 9.2, 9.3
 */

// Dynamic import for AWS SDK - allows Lambda to use it at runtime
// while tests can inject a mock client via setBedrockClient()
let BedrockRuntimeClient, InvokeModelCommand;
try {
  const sdk = await import('@aws-sdk/client-bedrock-runtime');
  BedrockRuntimeClient = sdk.BedrockRuntimeClient;
  InvokeModelCommand = sdk.InvokeModelCommand;
} catch {
  // SDK not available (e.g., test environment) - client must be injected via setBedrockClient()
  BedrockRuntimeClient = null;
  InvokeModelCommand = null;
}

// --- Constants ---

const BEDROCK_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';
const BEDROCK_TIMEOUT_MS = 25000; // 25 seconds, leaving 5s for Lambda cleanup
const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const VALID_BLOCK_TYPES = ['transit', 'meal', 'activity'];
const REQUIRED_BLOCK_FIELDS = ['startTime', 'endTime', 'type', 'name', 'location'];
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MIN_GAP_MINUTES = 15;

// Transit duration constants
const TRANSIT_SAME_BUILDING = 5;
const TRANSIT_DIFFERENT_BUILDING = 10;
const TRANSIT_MIN = 5;
const TRANSIT_MAX = 30;

// --- Bedrock Client (lazy initialized for testability) ---

let bedrockClient = null;

/**
 * Get or create the Bedrock client.
 * @returns {BedrockRuntimeClient}
 */
function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }
  return bedrockClient;
}

/**
 * Set a custom Bedrock client (for testing).
 * @param {BedrockRuntimeClient} client
 */
export function setBedrockClient(client) {
  bedrockClient = client;
}

// --- Time Utilities ---

/**
 * Convert a time string "HH:mm" to total minutes since midnight.
 * @param {string} timeStr
 * @returns {number}
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert total minutes since midnight to "HH:mm" format.
 * @param {number} totalMinutes
 * @returns {string}
 */
function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// --- Gap Computation ---

/**
 * Compute time gaps from a sorted class list for a single day.
 * Filters to gaps >= 15 minutes.
 *
 * @param {Array<{startTime: string, endTime: string, location?: string, name?: string}>} classes
 * @returns {Array<{startTime: string, endTime: string, duration: number, beforeClass: object|null, afterClass: object|null}>}
 */
export function computeTimeGaps(classes) {
  if (!Array.isArray(classes) || classes.length === 0) {
    return [];
  }

  // Sort by start time
  const sorted = [...classes].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const gaps = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const beforeClass = sorted[i];
    const afterClass = sorted[i + 1];

    const gapStartMin = timeToMinutes(beforeClass.endTime);
    const gapEndMin = timeToMinutes(afterClass.startTime);
    const duration = gapEndMin - gapStartMin;

    if (duration >= MIN_GAP_MINUTES) {
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

/**
 * Calculate transit duration between two campus locations.
 *
 * @param {string} fromLocation
 * @param {string} toLocation
 * @returns {number} Transit duration in minutes (0 if same location)
 */
export function calculateTransitDuration(fromLocation, toLocation) {
  if (!fromLocation || !toLocation) return 0;

  const from = fromLocation.trim();
  const to = toLocation.trim();

  if (from === to) return 0;

  const fromBuilding = from.split(/\s+/)[0].toLowerCase();
  const toBuilding = to.split(/\s+/)[0].toLowerCase();

  let duration;
  if (fromBuilding === toBuilding) {
    duration = TRANSIT_SAME_BUILDING;
  } else {
    duration = TRANSIT_DIFFERENT_BUILDING;
  }

  return Math.max(TRANSIT_MIN, Math.min(TRANSIT_MAX, duration));
}

// --- Request Validation ---

/**
 * Validate the incoming request body.
 *
 * @param {object} body - Parsed request body
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  // Validate day
  if (!body.day || !VALID_DAYS.includes(body.day)) {
    return { valid: false, error: `"day" must be one of: ${VALID_DAYS.join(', ')}` };
  }

  // Validate classes
  if (!Array.isArray(body.classes)) {
    return { valid: false, error: '"classes" must be an array' };
  }

  for (let i = 0; i < body.classes.length; i++) {
    const cls = body.classes[i];
    if (!cls || typeof cls !== 'object') {
      return { valid: false, error: `classes[${i}] must be an object` };
    }
    if (!cls.name || typeof cls.name !== 'string') {
      return { valid: false, error: `classes[${i}].name must be a non-empty string` };
    }
    if (!cls.startTime || !TIME_FORMAT_REGEX.test(cls.startTime)) {
      return { valid: false, error: `classes[${i}].startTime must be in HH:mm format` };
    }
    if (!cls.endTime || !TIME_FORMAT_REGEX.test(cls.endTime)) {
      return { valid: false, error: `classes[${i}].endTime must be in HH:mm format` };
    }
    if (timeToMinutes(cls.endTime) <= timeToMinutes(cls.startTime)) {
      return { valid: false, error: `classes[${i}].endTime must be after startTime` };
    }
  }

  // Validate preferences
  if (!body.preferences || typeof body.preferences !== 'object') {
    return { valid: false, error: '"preferences" must be an object' };
  }

  if (!Array.isArray(body.preferences.activities) || body.preferences.activities.length === 0) {
    return { valid: false, error: '"preferences.activities" must be a non-empty array' };
  }

  // regenerationSeed is optional but must be a number if provided
  if (body.regenerationSeed !== undefined && typeof body.regenerationSeed !== 'number') {
    return { valid: false, error: '"regenerationSeed" must be a number when provided' };
  }

  return { valid: true };
}

// --- Prompt Construction ---

/**
 * Build the system prompt for Bedrock.
 * @returns {string}
 */
export function buildSystemPrompt() {
  return `You are a university schedule optimization assistant. Given a student's class schedule, campus locations, and preferences, generate time-blocked suggestions for their free time.

RULES:
- Only generate blocks within provided time gaps
- Account for transit time between different locations (5-30 minutes)
- Suggest meals during appropriate windows (breakfast 7-10AM, lunch 11AM-2PM, dinner 5-8PM)
- Prioritize activity categories in the order provided by the user
- Vary activity categories across gaps when possible
- Respect dietary restrictions for meal suggestions
- Never overlap with existing classes
- Minimum block durations: transit 5min, meal 30min (10min for snack), activity 15min

OUTPUT FORMAT: Return ONLY a JSON array of time blocks. No commentary.
Each block: {"startTime":"HH:mm","endTime":"HH:mm","type":"transit|meal|activity","name":"description","location":"place"}`;
}

/**
 * Build the user prompt for a specific day's schedule optimization.
 *
 * @param {string} day
 * @param {Array} classes
 * @param {Array} gaps
 * @param {object} preferences
 * @param {number} seed
 * @returns {string}
 */
export function buildUserPrompt(day, classes, gaps, preferences, seed) {
  const gapsDescription = gaps.map((gap, i) => {
    const transitInfo = gap.transitDuration > 0
      ? ` (transit needed: ${gap.transitDuration} min from "${gap.beforeClass?.location}" to "${gap.afterClass?.location}")`
      : '';
    return `  Gap ${i + 1}: ${gap.startTime} - ${gap.endTime} (${gap.duration} min)${transitInfo}`;
  }).join('\n');

  const classesJson = JSON.stringify(classes.map(c => ({
    name: c.name,
    startTime: c.startTime,
    endTime: c.endTime,
    location: c.location || 'Campus'
  })), null, 2);

  return `Day: ${day}
Classes: ${classesJson}
Free time gaps:
${gapsDescription}
Activity preferences (ranked): ${preferences.activities.join(', ')}
Dietary restrictions: ${(preferences.dietaryRestrictions || []).join(', ') || 'none'}
Meal preferences: ${(preferences.mealPreferences || []).join(', ') || 'any'}
Randomization seed: ${seed}

Generate an optimized schedule for the free time gaps.`;
}

// --- Response Parsing & Validation ---

/**
 * Parse the Bedrock response body into a JSON array of time blocks.
 *
 * @param {string} responseText - Raw text from Bedrock
 * @returns {{ success: boolean, blocks?: Array, error?: string }}
 */
export function parseBedrockResponse(responseText) {
  if (!responseText || typeof responseText !== 'string') {
    return { success: false, error: 'Empty or non-string response from Bedrock' };
  }

  // Try to extract JSON array from the response
  let parsed;
  try {
    // First, try direct parse
    parsed = JSON.parse(responseText);
  } catch {
    // Try to find JSON array in the response text
    const arrayMatch = responseText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        parsed = JSON.parse(arrayMatch[0]);
      } catch {
        return { success: false, error: 'Could not parse JSON array from response' };
      }
    } else {
      return { success: false, error: 'No JSON array found in response' };
    }
  }

  if (!Array.isArray(parsed)) {
    return { success: false, error: 'Parsed response is not an array' };
  }

  return { success: true, blocks: parsed };
}

/**
 * Validate a single time block object.
 *
 * @param {object} block
 * @param {number} index
 * @returns {string[]} Array of error messages (empty if valid)
 */
function validateBlock(block, index) {
  const errors = [];

  if (!block || typeof block !== 'object') {
    errors.push(`Block at index ${index} is not an object`);
    return errors;
  }

  // Check required fields
  for (const field of REQUIRED_BLOCK_FIELDS) {
    if (!block[field] || typeof block[field] !== 'string') {
      errors.push(`Block at index ${index} missing or invalid field "${field}"`);
    }
  }

  if (errors.length > 0) return errors;

  // Validate time format
  if (!TIME_FORMAT_REGEX.test(block.startTime)) {
    errors.push(`Block at index ${index} has invalid startTime "${block.startTime}"`);
  }
  if (!TIME_FORMAT_REGEX.test(block.endTime)) {
    errors.push(`Block at index ${index} has invalid endTime "${block.endTime}"`);
  }

  // Validate endTime > startTime
  if (errors.length === 0) {
    if (timeToMinutes(block.endTime) <= timeToMinutes(block.startTime)) {
      errors.push(`Block at index ${index} endTime must be after startTime`);
    }
  }

  // Validate block type
  if (!VALID_BLOCK_TYPES.includes(block.type)) {
    errors.push(`Block at index ${index} has invalid type "${block.type}"`);
  }

  return errors;
}

/**
 * Validate parsed blocks for ordering, gap confinement, and correctness.
 * Returns valid blocks only (partial validity returns subset per Req 3.5).
 *
 * @param {Array} blocks - Parsed block objects
 * @param {Array} gaps - Computed time gaps
 * @param {Array} classes - Class list for the day
 * @returns {{ validBlocks: Array, errors: string[] }}
 */
export function validateBlocks(blocks, gaps, classes) {
  const errors = [];
  const validBlocks = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockErrors = validateBlock(block, i);

    if (blockErrors.length > 0) {
      errors.push(...blockErrors);
      continue;
    }

    // Validate block is within a gap
    const blockStart = timeToMinutes(block.startTime);
    const blockEnd = timeToMinutes(block.endTime);

    const withinGap = gaps.some(gap => {
      const gapStart = timeToMinutes(gap.startTime);
      const gapEnd = timeToMinutes(gap.endTime);
      return blockStart >= gapStart && blockEnd <= gapEnd;
    });

    if (!withinGap) {
      errors.push(`Block "${block.name}" (${block.startTime}-${block.endTime}) is not within any time gap`);
      continue;
    }

    // Validate no overlap with classes
    const overlapsClass = classes.some(cls => {
      const classStart = timeToMinutes(cls.startTime);
      const classEnd = timeToMinutes(cls.endTime);
      return blockStart < classEnd && blockEnd > classStart;
    });

    if (overlapsClass) {
      errors.push(`Block "${block.name}" (${block.startTime}-${block.endTime}) overlaps with a class`);
      continue;
    }

    validBlocks.push(block);
  }

  // Validate chronological ordering among valid blocks
  const orderedBlocks = [];
  for (let i = 0; i < validBlocks.length; i++) {
    if (i === 0) {
      orderedBlocks.push(validBlocks[i]);
      continue;
    }

    const prevStart = timeToMinutes(orderedBlocks[orderedBlocks.length - 1].startTime);
    const currStart = timeToMinutes(validBlocks[i].startTime);

    if (currStart >= prevStart) {
      orderedBlocks.push(validBlocks[i]);
    } else {
      errors.push(`Block "${validBlocks[i].name}" is out of chronological order`);
    }
  }

  // Remove overlapping blocks among valid ones
  const finalBlocks = [];
  for (let i = 0; i < orderedBlocks.length; i++) {
    if (i === 0) {
      finalBlocks.push(orderedBlocks[i]);
      continue;
    }

    const prevEnd = timeToMinutes(finalBlocks[finalBlocks.length - 1].endTime);
    const currStart = timeToMinutes(orderedBlocks[i].startTime);

    if (currStart >= prevEnd) {
      finalBlocks.push(orderedBlocks[i]);
    } else {
      errors.push(`Block "${orderedBlocks[i].name}" overlaps with previous block`);
    }
  }

  return { validBlocks: finalBlocks, errors };
}

// --- Enriched Gap Computation (with transit info) ---

/**
 * Compute enriched gaps with transit information.
 *
 * @param {Array} classes - Classes for the day
 * @returns {Array} Enriched gap objects with transit info
 */
export function computeEnrichedGaps(classes) {
  const gaps = computeTimeGaps(classes);

  return gaps.map(gap => {
    const fromLocation = gap.beforeClass?.location || '';
    const toLocation = gap.afterClass?.location || '';
    const transitDuration = calculateTransitDuration(fromLocation, toLocation);

    return {
      ...gap,
      transitNeeded: transitDuration > 0,
      transitDuration,
      usableTime: Math.max(0, gap.duration - transitDuration),
    };
  });
}

// --- Main Lambda Handler ---

/**
 * AWS Lambda handler function.
 *
 * @param {object} event - API Gateway event
 * @returns {object} API Gateway response
 */
export async function handler(event) {
  // Parse request body
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return buildResponse(400, {
      error: { code: 'PARSE_ERROR', message: 'Invalid JSON in request body' }
    });
  }

  // Validate request
  const validation = validateRequest(body);
  if (!validation.valid) {
    return buildResponse(400, {
      error: { code: 'PARSE_ERROR', message: validation.error }
    });
  }

  const { day, classes, preferences, regenerationSeed = 1 } = body;

  // Compute time gaps from class schedule
  const gaps = computeEnrichedGaps(classes);

  if (gaps.length === 0) {
    return buildResponse(200, { day, timeBlocks: [] });
  }

  // Build prompts
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(day, classes, gaps, preferences, regenerationSeed);

  // Invoke Bedrock
  let bedrockResponseText;
  try {
    bedrockResponseText = await invokeBedrockWithTimeout(systemPrompt, userPrompt);
  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError' || err.message?.includes('timeout')) {
      console.error('[Lambda] Bedrock timeout:', err.message);
      return buildResponse(504, {
        error: { code: 'BEDROCK_TIMEOUT', message: 'The AI service took too long to respond. Please try again.' }
      });
    }

    console.error('[Lambda] Bedrock invocation error:', err);
    return buildResponse(502, {
      error: { code: 'BEDROCK_ERROR', message: 'The AI service is temporarily unavailable. Please try again later.' }
    });
  }

  // Parse Bedrock response
  const parseResult = parseBedrockResponse(bedrockResponseText);
  if (!parseResult.success) {
    console.error('[Lambda] Parse failure:', parseResult.error, 'Raw response:', bedrockResponseText);
    return buildResponse(502, {
      error: { code: 'PARSE_ERROR', message: 'The schedule could not be generated. Please try again.' }
    });
  }

  // Validate parsed blocks
  const { validBlocks, errors: validationErrors } = validateBlocks(parseResult.blocks, gaps, classes);

  if (validationErrors.length > 0) {
    console.warn('[Lambda] Block validation warnings:', validationErrors);
  }

  // Return valid blocks (partial result if some failed validation per Req 3.5)
  return buildResponse(200, {
    day,
    timeBlocks: validBlocks,
  });
}

// --- Bedrock Invocation ---

/**
 * Invoke Bedrock with a timeout.
 *
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} The response text from Bedrock
 */
async function invokeBedrockWithTimeout(systemPrompt, userPrompt) {
  const client = getBedrockClient();

  const requestBody = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      }
    ],
  });

  // Build the command — if SDK is available, use InvokeModelCommand;
  // otherwise pass a plain object (for injected mock clients)
  const commandParams = {
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: requestBody,
  };

  const command = InvokeModelCommand
    ? new InvokeModelCommand(commandParams)
    : commandParams;

  // Create an AbortController for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), BEDROCK_TIMEOUT_MS);

  try {
    const response = await client.send(command, {
      abortSignal: abortController.signal,
    });

    // Parse the response body
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from Claude's response format
    if (responseBody.content && Array.isArray(responseBody.content)) {
      const textBlocks = responseBody.content.filter(c => c.type === 'text');
      if (textBlocks.length > 0) {
        return textBlocks.map(t => t.text).join('');
      }
    }

    throw new Error('Unexpected Bedrock response format');
  } finally {
    clearTimeout(timeoutId);
  }
}

// --- Response Builder ---

/**
 * Build a standard API Gateway response.
 *
 * @param {number} statusCode
 * @param {object} body
 * @returns {object}
 */
function buildResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
