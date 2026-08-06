import { TimeBlock } from '../models/TimeBlock.js';

/**
 * Default base URL for the API. Can be overridden via the baseUrl parameter.
 */
const DEFAULT_BASE_URL = 'https://icwsnqzyf3.execute-api.us-east-1.amazonaws.com/prod';

/**
 * Timeout duration in milliseconds (30 seconds per Req 9.2).
 */
const TIMEOUT_MS = 30000;

/**
 * Generates an optimized schedule by calling the /optimize endpoint.
 *
 * @param {object} params
 * @param {string} params.day - Day of the week (e.g., 'monday')
 * @param {import('../models/Class.js').Class[]} params.classes - Classes for the day
 * @param {import('../models/UserPreferences.js').UserPreferences} params.preferences - User preferences
 * @param {number} params.seed - Regeneration seed
 * @param {string} [params.baseUrl] - Optional base URL override
 * @returns {Promise<{success: true, timeBlocks: TimeBlock[]} | {success: false, error: {code: string, message: string}}>}
 */
export async function generateSchedule({ day, classes, preferences, seed, baseUrl = DEFAULT_BASE_URL }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        day,
        classes: classes.map(c => c.toJSON ? c.toJSON() : c),
        preferences: preferences.toJSON ? preferences.toJSON() : preferences,
        regenerationSeed: seed
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to parse error body from backend
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        // Could not parse error body
      }

      if (errorData && errorData.error) {
        return {
          success: false,
          error: {
            code: errorData.error.code,
            message: errorData.error.message
          }
        };
      }

      return {
        success: false,
        error: {
          code: 'SERVICE_ERROR',
          message: `Service returned status ${response.status}`
        }
      };
    }

    // Parse success response
    let data;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse response JSON'
        }
      };
    }

    // Validate response structure
    if (!data || !Array.isArray(data.timeBlocks)) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Response missing timeBlocks array'
        }
      };
    }

    // Convert plain objects to TimeBlock instances
    const timeBlocks = data.timeBlocks.map(block => TimeBlock.fromJSON(block));

    return {
      success: true,
      timeBlocks
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return {
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'Request timed out after 30 seconds'
        }
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: err.message || 'Network request failed'
      }
    };
  }
}
