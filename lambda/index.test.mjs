/**
 * Tests for the Lambda function handler.
 * Tests cover: request validation, gap computation, prompt construction,
 * response parsing, block validation, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  handler,
  validateRequest,
  computeTimeGaps,
  calculateTransitDuration,
  computeEnrichedGaps,
  buildSystemPrompt,
  buildUserPrompt,
  parseBedrockResponse,
  validateBlocks,
  setBedrockClient,
} from './index.mjs';

// --- Test Fixtures ---

function makeValidBody(overrides = {}) {
  return {
    day: 'monday',
    classes: [
      { name: 'Calculus', day: 'monday', startTime: '09:00', endTime: '10:30', location: 'Math Building Room 201' },
      { name: 'Physics', day: 'monday', startTime: '13:00', endTime: '14:30', location: 'Science Building Lab 3' },
    ],
    preferences: {
      activities: ['study', 'exercise'],
      dietaryRestrictions: ['vegetarian'],
      mealPreferences: ['lunch'],
    },
    regenerationSeed: 1,
    ...overrides,
  };
}

function makeMockBedrockClient(responseBlocks) {
  const responseBody = JSON.stringify({
    content: [
      {
        type: 'text',
        text: JSON.stringify(responseBlocks),
      }
    ],
  });

  return {
    send: vi.fn().mockResolvedValue({
      body: new TextEncoder().encode(responseBody),
    }),
  };
}

function makeMockBedrockClientError(error) {
  return {
    send: vi.fn().mockRejectedValue(error),
  };
}

// --- Request Validation ---

describe('validateRequest', () => {
  it('accepts a valid request body', () => {
    const result = validateRequest(makeValidBody());
    expect(result.valid).toBe(true);
  });

  it('rejects null body', () => {
    const result = validateRequest(null);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('JSON object');
  });

  it('rejects missing day', () => {
    const result = validateRequest(makeValidBody({ day: undefined }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('day');
  });

  it('rejects invalid day', () => {
    const result = validateRequest(makeValidBody({ day: 'saturday' }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('day');
  });

  it('rejects non-array classes', () => {
    const result = validateRequest(makeValidBody({ classes: 'not-array' }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('classes');
  });

  it('rejects class with missing name', () => {
    const body = makeValidBody();
    body.classes[0].name = '';
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('name');
  });

  it('rejects class with invalid startTime', () => {
    const body = makeValidBody();
    body.classes[0].startTime = 'invalid';
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('startTime');
  });

  it('rejects class with endTime <= startTime', () => {
    const body = makeValidBody();
    body.classes[0].endTime = '08:00';
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('endTime');
  });

  it('rejects missing preferences', () => {
    const result = validateRequest(makeValidBody({ preferences: undefined }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('preferences');
  });

  it('rejects empty activities array', () => {
    const body = makeValidBody();
    body.preferences.activities = [];
    const result = validateRequest(body);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('activities');
  });

  it('rejects non-number regenerationSeed', () => {
    const result = validateRequest(makeValidBody({ regenerationSeed: 'abc' }));
    expect(result.valid).toBe(false);
    expect(result.error).toContain('regenerationSeed');
  });

  it('accepts missing regenerationSeed (optional)', () => {
    const body = makeValidBody();
    delete body.regenerationSeed;
    const result = validateRequest(body);
    expect(result.valid).toBe(true);
  });
});

// --- Gap Computation ---

describe('computeTimeGaps', () => {
  it('returns empty for no classes', () => {
    expect(computeTimeGaps([])).toEqual([]);
  });

  it('returns empty for a single class', () => {
    const classes = [{ startTime: '09:00', endTime: '10:00', name: 'A' }];
    expect(computeTimeGaps(classes)).toEqual([]);
  });

  it('computes gaps between two classes', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'A', location: 'Building A' },
      { startTime: '11:00', endTime: '12:00', name: 'B', location: 'Building B' },
    ];
    const gaps = computeTimeGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].startTime).toBe('10:00');
    expect(gaps[0].endTime).toBe('11:00');
    expect(gaps[0].duration).toBe(60);
  });

  it('filters out gaps shorter than 15 minutes', () => {
    const classes = [
      { startTime: '09:00', endTime: '09:50', name: 'A' },
      { startTime: '10:00', endTime: '11:00', name: 'B' },
    ];
    const gaps = computeTimeGaps(classes);
    expect(gaps).toHaveLength(0); // 10 min gap < 15 min minimum
  });

  it('includes gaps exactly 15 minutes', () => {
    const classes = [
      { startTime: '09:00', endTime: '09:45', name: 'A' },
      { startTime: '10:00', endTime: '11:00', name: 'B' },
    ];
    const gaps = computeTimeGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].duration).toBe(15);
  });

  it('sorts classes by start time before computing', () => {
    const classes = [
      { startTime: '13:00', endTime: '14:00', name: 'B' },
      { startTime: '09:00', endTime: '10:00', name: 'A' },
    ];
    const gaps = computeTimeGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].startTime).toBe('10:00');
    expect(gaps[0].endTime).toBe('13:00');
  });
});

// --- Transit Duration ---

describe('calculateTransitDuration', () => {
  it('returns 0 for same location', () => {
    expect(calculateTransitDuration('Math Building', 'Math Building')).toBe(0);
  });

  it('returns 5 for same building', () => {
    expect(calculateTransitDuration('Math Building Room 101', 'Math Building Room 202')).toBe(5);
  });

  it('returns 10 for different buildings', () => {
    expect(calculateTransitDuration('Math Building', 'Science Building')).toBe(10);
  });

  it('returns 0 for empty locations', () => {
    expect(calculateTransitDuration('', 'Science Building')).toBe(0);
    expect(calculateTransitDuration('Math Building', '')).toBe(0);
  });

  it('returns 0 for null/undefined locations', () => {
    expect(calculateTransitDuration(null, 'Science')).toBe(0);
    expect(calculateTransitDuration('Math', undefined)).toBe(0);
  });
});

// --- Enriched Gaps ---

describe('computeEnrichedGaps', () => {
  it('returns gaps with transit info', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'A', location: 'Math Building' },
      { startTime: '11:00', endTime: '12:00', name: 'B', location: 'Science Building' },
    ];
    const gaps = computeEnrichedGaps(classes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].transitNeeded).toBe(true);
    expect(gaps[0].transitDuration).toBe(10);
    expect(gaps[0].usableTime).toBe(50); // 60 - 10
  });

  it('no transit needed for same location', () => {
    const classes = [
      { startTime: '09:00', endTime: '10:00', name: 'A', location: 'Math Building' },
      { startTime: '11:00', endTime: '12:00', name: 'B', location: 'Math Building' },
    ];
    const gaps = computeEnrichedGaps(classes);
    expect(gaps[0].transitNeeded).toBe(false);
    expect(gaps[0].transitDuration).toBe(0);
    expect(gaps[0].usableTime).toBe(60);
  });
});

// --- Prompt Construction ---

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toBeTruthy();
    expect(typeof prompt).toBe('string');
  });

  it('contains key rules', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('time gaps');
    expect(prompt).toContain('transit');
    expect(prompt).toContain('JSON array');
  });
});

describe('buildUserPrompt', () => {
  it('includes day, classes, gaps, and preferences', () => {
    const gaps = [
      { startTime: '10:00', endTime: '11:00', duration: 60, transitDuration: 0, beforeClass: null, afterClass: null }
    ];
    const preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };
    const classes = [{ name: 'Math', startTime: '09:00', endTime: '10:00', location: 'Room 101' }];

    const prompt = buildUserPrompt('monday', classes, gaps, preferences, 1);

    expect(prompt).toContain('monday');
    expect(prompt).toContain('Math');
    expect(prompt).toContain('study');
    expect(prompt).toContain('Gap 1');
  });
});

// --- Response Parsing ---

describe('parseBedrockResponse', () => {
  it('parses a valid JSON array', () => {
    const blocks = [
      { startTime: '10:00', endTime: '10:30', type: 'activity', name: 'Study', location: 'Library' }
    ];
    const result = parseBedrockResponse(JSON.stringify(blocks));
    expect(result.success).toBe(true);
    expect(result.blocks).toEqual(blocks);
  });

  it('extracts JSON array from surrounding text', () => {
    const blocks = [{ startTime: '10:00', endTime: '10:30', type: 'activity', name: 'Study', location: 'Library' }];
    const text = `Here is your schedule:\n${JSON.stringify(blocks)}\nHope that helps!`;
    const result = parseBedrockResponse(text);
    expect(result.success).toBe(true);
    expect(result.blocks).toEqual(blocks);
  });

  it('fails on empty string', () => {
    const result = parseBedrockResponse('');
    expect(result.success).toBe(false);
  });

  it('fails on non-array JSON', () => {
    const result = parseBedrockResponse('{"key": "value"}');
    expect(result.success).toBe(false);
  });

  it('fails on completely invalid text', () => {
    const result = parseBedrockResponse('This is not JSON at all');
    expect(result.success).toBe(false);
  });
});

// --- Block Validation ---

describe('validateBlocks', () => {
  const gaps = [
    { startTime: '10:00', endTime: '12:00', duration: 120 },
  ];
  const classes = [
    { startTime: '09:00', endTime: '10:00', name: 'A' },
    { startTime: '12:00', endTime: '13:00', name: 'B' },
  ];

  it('accepts valid blocks within gaps', () => {
    const blocks = [
      { startTime: '10:00', endTime: '10:30', type: 'transit', name: 'Walk', location: 'Library' },
      { startTime: '10:30', endTime: '11:30', type: 'activity', name: 'Study', location: 'Library' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects blocks outside gaps', () => {
    const blocks = [
      { startTime: '08:00', endTime: '08:30', type: 'activity', name: 'Walk', location: 'Park' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects blocks overlapping with classes', () => {
    const blocks = [
      { startTime: '09:30', endTime: '10:30', type: 'activity', name: 'Study', location: 'Library' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(0);
  });

  it('rejects blocks with invalid type', () => {
    const blocks = [
      { startTime: '10:00', endTime: '10:30', type: 'invalid', name: 'X', location: 'Y' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(0);
  });

  it('rejects blocks with missing fields', () => {
    const blocks = [
      { startTime: '10:00', type: 'activity', name: 'Study' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(0);
  });

  it('returns partial valid blocks when some fail (Req 3.5)', () => {
    const blocks = [
      { startTime: '10:00', endTime: '10:30', type: 'activity', name: 'Good', location: 'Library' },
      { startTime: '08:00', endTime: '08:30', type: 'activity', name: 'Bad', location: 'Park' },
      { startTime: '11:00', endTime: '11:30', type: 'meal', name: 'Lunch', location: 'Cafe' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(2);
    expect(result.validBlocks[0].name).toBe('Good');
    expect(result.validBlocks[1].name).toBe('Lunch');
  });

  it('removes out-of-order blocks', () => {
    const blocks = [
      { startTime: '11:00', endTime: '11:30', type: 'activity', name: 'Second', location: 'Lib' },
      { startTime: '10:00', endTime: '10:30', type: 'activity', name: 'First', location: 'Lib' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    // First one accepted, second is out of order relative to first
    expect(result.validBlocks).toHaveLength(1);
    expect(result.validBlocks[0].name).toBe('Second');
  });

  it('removes overlapping valid blocks', () => {
    const blocks = [
      { startTime: '10:00', endTime: '11:00', type: 'activity', name: 'A', location: 'Lib' },
      { startTime: '10:30', endTime: '11:30', type: 'activity', name: 'B', location: 'Lib' },
    ];
    const result = validateBlocks(blocks, gaps, classes);
    expect(result.validBlocks).toHaveLength(1);
    expect(result.validBlocks[0].name).toBe('A');
  });
});

// --- Lambda Handler Integration ---

describe('handler', () => {
  beforeEach(() => {
    setBedrockClient(null);
  });

  it('returns 400 for invalid JSON body', async () => {
    const event = { body: 'not json' };
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PARSE_ERROR');
  });

  it('returns 400 for invalid request fields', async () => {
    const event = { body: JSON.stringify({ day: 'saturday' }) };
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PARSE_ERROR');
  });

  it('returns 200 with empty timeBlocks when no gaps exist', async () => {
    const body = makeValidBody({
      classes: [
        { name: 'A', startTime: '09:00', endTime: '10:00', location: 'Room 1' },
        { name: 'B', startTime: '10:05', endTime: '11:00', location: 'Room 2' }, // only 5 min gap
      ],
    });
    const event = { body: JSON.stringify(body) };
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.timeBlocks).toEqual([]);
  });

  it('returns 200 with valid blocks from Bedrock', async () => {
    const bedrockBlocks = [
      { startTime: '10:30', endTime: '10:40', type: 'transit', name: 'Walk to Library', location: 'Library' },
      { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study Session', location: 'Library' },
    ];
    setBedrockClient(makeMockBedrockClient(bedrockBlocks));

    const event = { body: JSON.stringify(makeValidBody()) };
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    expect(responseBody.day).toBe('monday');
    expect(responseBody.timeBlocks).toHaveLength(2);
    expect(responseBody.timeBlocks[0].name).toBe('Walk to Library');
    expect(responseBody.timeBlocks[1].name).toBe('Study Session');
  });

  it('returns 504 on Bedrock timeout', async () => {
    const timeoutError = new Error('Request timed out');
    timeoutError.name = 'AbortError';
    setBedrockClient(makeMockBedrockClientError(timeoutError));

    const event = { body: JSON.stringify(makeValidBody()) };
    const response = await handler(event);

    expect(response.statusCode).toBe(504);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('BEDROCK_TIMEOUT');
  });

  it('returns 502 on Bedrock service error', async () => {
    setBedrockClient(makeMockBedrockClientError(new Error('Service unavailable')));

    const event = { body: JSON.stringify(makeValidBody()) };
    const response = await handler(event);

    expect(response.statusCode).toBe(502);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('BEDROCK_ERROR');
  });

  it('returns 502 on unparseable Bedrock response', async () => {
    // Mock client returns non-JSON text
    const badResponseBody = JSON.stringify({
      content: [{ type: 'text', text: 'This is not JSON at all and has no arrays' }],
    });
    setBedrockClient({
      send: vi.fn().mockResolvedValue({
        body: new TextEncoder().encode(badResponseBody),
      }),
    });

    const event = { body: JSON.stringify(makeValidBody()) };
    const response = await handler(event);

    expect(response.statusCode).toBe(502);
    const body = JSON.parse(response.body);
    expect(body.error.code).toBe('PARSE_ERROR');
  });

  it('returns partial valid blocks when some are invalid (Req 3.5)', async () => {
    const bedrockBlocks = [
      { startTime: '10:30', endTime: '11:00', type: 'activity', name: 'Good Block', location: 'Library' },
      { startTime: '08:00', endTime: '08:30', type: 'activity', name: 'Outside Gap', location: 'Park' },
      { startTime: '11:00', endTime: '12:00', type: 'activity', name: 'Another Good', location: 'Cafe' },
    ];
    setBedrockClient(makeMockBedrockClient(bedrockBlocks));

    const event = { body: JSON.stringify(makeValidBody()) };
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);
    // Only blocks within the gap (10:30-13:00) should be kept
    expect(responseBody.timeBlocks.length).toBeGreaterThanOrEqual(1);
    expect(responseBody.timeBlocks.some(b => b.name === 'Good Block')).toBe(true);
    expect(responseBody.timeBlocks.some(b => b.name === 'Outside Gap')).toBe(false);
  });

  it('includes CORS headers in response', async () => {
    const event = { body: JSON.stringify(makeValidBody({ classes: [] })) };
    const response = await handler(event);
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    expect(response.headers['Content-Type']).toBe('application/json');
  });

  it('handles pre-parsed body (non-string event.body)', async () => {
    const body = makeValidBody({ classes: [] });
    const event = { body };
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
  });
});
