import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSchedule } from './apiClient.js';
import { TimeBlock } from '../models/TimeBlock.js';

describe('apiClient - generateSchedule', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const mockClasses = [
    { toJSON: () => ({ name: 'Calculus', day: 'monday', startTime: '09:00', endTime: '10:30', location: 'Math Building' }) }
  ];

  const mockPreferences = {
    toJSON: () => ({ activities: ['study'], dietaryRestrictions: ['none'], mealPreferences: ['lunch'] })
  };

  const defaultParams = {
    day: 'monday',
    classes: mockClasses,
    preferences: mockPreferences,
    seed: 1
  };

  describe('successful responses', () => {
    it('returns success with parsed TimeBlock array on valid response', async () => {
      const responseBody = {
        day: 'monday',
        timeBlocks: [
          { startTime: '10:30', endTime: '11:00', type: 'activity', name: 'Study', location: 'Library' },
          { startTime: '11:00', endTime: '11:45', type: 'meal', name: 'Lunch', location: 'Cafeteria' }
        ]
      };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseBody)
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(true);
      expect(result.timeBlocks).toHaveLength(2);
      expect(result.timeBlocks[0]).toBeInstanceOf(TimeBlock);
      expect(result.timeBlocks[0].startTime).toBe('10:30');
      expect(result.timeBlocks[0].endTime).toBe('11:00');
      expect(result.timeBlocks[0].type).toBe('activity');
      expect(result.timeBlocks[0].name).toBe('Study');
      expect(result.timeBlocks[0].location).toBe('Library');
      expect(result.timeBlocks[1]).toBeInstanceOf(TimeBlock);
    });

    it('sends correct request body to /optimize', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ day: 'monday', timeBlocks: [] })
      });

      await generateSchedule(defaultParams);

      expect(fetchMock).toHaveBeenCalledWith('/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: 'monday',
          classes: [{ name: 'Calculus', day: 'monday', startTime: '09:00', endTime: '10:30', location: 'Math Building' }],
          preferences: { activities: ['study'], dietaryRestrictions: ['none'], mealPreferences: ['lunch'] },
          regenerationSeed: 1
        }),
        signal: expect.any(AbortSignal)
      });
    });

    it('uses custom baseUrl when provided', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ day: 'monday', timeBlocks: [] })
      });

      await generateSchedule({ ...defaultParams, baseUrl: 'https://api.example.com' });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.example.com/optimize',
        expect.any(Object)
      );
    });

    it('returns empty timeBlocks array on valid response with no blocks', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ day: 'monday', timeBlocks: [] })
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(true);
      expect(result.timeBlocks).toEqual([]);
    });

    it('handles classes without toJSON method (plain objects)', async () => {
      const plainClasses = [
        { name: 'Calculus', day: 'monday', startTime: '09:00', endTime: '10:30', location: 'Math Building' }
      ];
      const plainPrefs = { activities: ['study'], dietaryRestrictions: ['none'], mealPreferences: ['lunch'] };

      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ day: 'monday', timeBlocks: [] })
      });

      await generateSchedule({ ...defaultParams, classes: plainClasses, preferences: plainPrefs });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.classes[0].name).toBe('Calculus');
      expect(body.preferences.activities).toEqual(['study']);
    });
  });

  describe('timeout handling', () => {
    it('returns TIMEOUT error when request exceeds 30 seconds', async () => {
      fetchMock.mockImplementation((_url, options) => {
        return new Promise((_, reject) => {
          options.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      });

      const resultPromise = generateSchedule(defaultParams);
      vi.advanceTimersByTime(30000);
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('TIMEOUT');
      expect(result.error.message).toContain('30 seconds');
    });
  });

  describe('HTTP error handling', () => {
    it('returns backend error code when response contains structured error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: { code: 'BEDROCK_TIMEOUT', message: 'Bedrock timed out' }
        })
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('BEDROCK_TIMEOUT');
      expect(result.error.message).toBe('Bedrock timed out');
    });

    it('returns SERVICE_ERROR when HTTP error has no parseable body', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 502,
        json: () => Promise.reject(new Error('Not JSON'))
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('SERVICE_ERROR');
      expect(result.error.message).toContain('502');
    });

    it('returns SERVICE_ERROR when error body lacks error field', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({ message: 'something went wrong' })
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('SERVICE_ERROR');
      expect(result.error.message).toContain('503');
    });
  });

  describe('parse error handling', () => {
    it('returns PARSE_ERROR when response JSON is invalid', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token'))
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('PARSE_ERROR');
      expect(result.error.message).toContain('parse');
    });

    it('returns PARSE_ERROR when response is missing timeBlocks array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ day: 'monday' })
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('PARSE_ERROR');
      expect(result.error.message).toContain('timeBlocks');
    });

    it('returns PARSE_ERROR when timeBlocks is not an array', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ day: 'monday', timeBlocks: 'not-an-array' })
      });

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('PARSE_ERROR');
      expect(result.error.message).toContain('timeBlocks');
    });
  });

  describe('network error handling', () => {
    it('returns NETWORK_ERROR on fetch failure', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NETWORK_ERROR');
      expect(result.error.message).toBe('Failed to fetch');
    });

    it('returns NETWORK_ERROR with fallback message when error has no message', async () => {
      fetchMock.mockRejectedValue(new Error());

      const result = await generateSchedule(defaultParams);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('NETWORK_ERROR');
      expect(result.error.message).toBe('Network request failed');
    });
  });
});
