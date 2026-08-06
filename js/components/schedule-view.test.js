import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './schedule-view.js';
import * as storageService from '../services/storageService.js';
import * as apiClient from '../services/apiClient.js';

describe('ScheduleView', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('schedule-view');
  });

  afterEach(() => {
    if (el.parentNode) {
      document.body.removeChild(el);
    }
  });

  function mount() {
    document.body.appendChild(el);
    return el;
  }

  const sampleBlocks = [
    { startTime: '09:00', endTime: '10:30', type: 'class', name: 'Calculus 101', location: 'Math Building Room 201' },
    { startTime: '10:30', endTime: '10:40', type: 'transit', name: 'Walk to Library', location: 'University Library' },
    { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study Session', location: 'University Library' },
    { startTime: '11:30', endTime: '12:15', type: 'meal', name: 'Lunch - Veggie Bowl', location: 'Student Center Cafeteria' }
  ];

  it('registers as a custom element', () => {
    expect(customElements.get('schedule-view')).toBeDefined();
  });

  it('renders a shadow DOM', () => {
    mount();
    expect(el.shadowRoot).not.toBeNull();
  });

  describe('legend (Req 7.2)', () => {
    it('displays a legend with all block types', () => {
      mount();
      const legendItems = el.shadowRoot.querySelectorAll('.legend-item');
      expect(legendItems.length).toBe(4);
    });

    it('legend contains correct labels', () => {
      mount();
      const labels = el.shadowRoot.querySelectorAll('.legend-label');
      const labelTexts = Array.from(labels).map(l => l.textContent);
      expect(labelTexts).toContain('Class');
      expect(labelTexts).toContain('Transit');
      expect(labelTexts).toContain('Meal');
      expect(labelTexts).toContain('Activity');
    });

    it('legend has color swatches for each type', () => {
      mount();
      const swatches = el.shadowRoot.querySelectorAll('.legend-swatch');
      expect(swatches.length).toBe(4);
      // Verify unique colors
      const colors = new Set(Array.from(swatches).map(s => s.style.getPropertyValue('--swatch-bg')));
      expect(colors.size).toBe(4);
    });

    it('legend has icons for each type', () => {
      mount();
      const icons = el.shadowRoot.querySelectorAll('.legend-icon');
      expect(icons.length).toBe(4);
      const iconTexts = new Set(Array.from(icons).map(i => i.textContent));
      expect(iconTexts.size).toBe(4);
    });

    it('legend has role="list" and items have role="listitem"', () => {
      mount();
      const legend = el.shadowRoot.querySelector('.legend');
      expect(legend.getAttribute('role')).toBe('list');
      const items = el.shadowRoot.querySelectorAll('.legend-item');
      items.forEach(item => {
        expect(item.getAttribute('role')).toBe('listitem');
      });
    });
  });

  describe('empty state (Req 7.5)', () => {
    it('shows empty state when no blocks are set', () => {
      mount();
      const emptyState = el.shadowRoot.querySelector('.empty-state');
      expect(emptyState.classList.contains('hidden')).toBe(false);
    });

    it('shows "No schedule available" message', () => {
      mount();
      const message = el.shadowRoot.querySelector('.empty-state-message');
      expect(message.textContent).toBe('No schedule available');
    });

    it('shows generate prompt message', () => {
      mount();
      const prompt = el.shadowRoot.querySelector('.empty-state-prompt');
      expect(prompt.textContent.toLowerCase()).toContain('generate');
    });

    it('hides timeline when empty', () => {
      mount();
      const timeline = el.shadowRoot.querySelector('.timeline');
      expect(timeline.classList.contains('hidden')).toBe(true);
    });

    it('hides loading when empty and not loading', () => {
      mount();
      const loading = el.shadowRoot.querySelector('.loading-state');
      expect(loading.classList.contains('hidden')).toBe(true);
    });
  });

  describe('loading state', () => {
    it('shows loading state when loading is true', () => {
      mount();
      el.loading = true;
      const loadingState = el.shadowRoot.querySelector('.loading-state');
      expect(loadingState.classList.contains('hidden')).toBe(false);
    });

    it('shows spinner during loading', () => {
      mount();
      el.loading = true;
      const spinner = el.shadowRoot.querySelector('.loading-spinner');
      expect(spinner).not.toBeNull();
    });

    it('shows loading text', () => {
      mount();
      el.loading = true;
      const text = el.shadowRoot.querySelector('.loading-text');
      expect(text.textContent.length).toBeGreaterThan(0);
    });

    it('hides empty state during loading', () => {
      mount();
      el.loading = true;
      const emptyState = el.shadowRoot.querySelector('.empty-state');
      expect(emptyState.classList.contains('hidden')).toBe(true);
    });

    it('hides timeline during loading', () => {
      mount();
      el.loading = true;
      const timeline = el.shadowRoot.querySelector('.timeline');
      expect(timeline.classList.contains('hidden')).toBe(true);
    });

    it('loading state has aria-live="polite" for accessibility', () => {
      mount();
      const loadingState = el.shadowRoot.querySelector('.loading-state');
      expect(loadingState.getAttribute('aria-live')).toBe('polite');
    });

    it('transitions from loading to timeline when blocks arrive', () => {
      mount();
      el.loading = true;
      el.loading = false;
      el.blocks = sampleBlocks;

      const timeline = el.shadowRoot.querySelector('.timeline');
      const loadingState = el.shadowRoot.querySelector('.loading-state');
      expect(loadingState.classList.contains('hidden')).toBe(true);
      expect(timeline.classList.contains('hidden')).toBe(false);
    });
  });

  describe('timeline rendering (Req 7.1, 7.3)', () => {
    it('shows timeline when blocks are set', () => {
      mount();
      el.blocks = sampleBlocks;
      const timeline = el.shadowRoot.querySelector('.timeline');
      expect(timeline.classList.contains('hidden')).toBe(false);
    });

    it('hides empty state when blocks are present', () => {
      mount();
      el.blocks = sampleBlocks;
      const emptyState = el.shadowRoot.querySelector('.empty-state');
      expect(emptyState.classList.contains('hidden')).toBe(true);
    });

    it('renders time-block-renderer elements for each block', () => {
      mount();
      el.blocks = sampleBlocks;
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(4);
    });

    it('displays blocks in chronological order (Req 7.3)', () => {
      mount();
      // Set blocks in reversed order to verify sorting
      el.blocks = [...sampleBlocks].reverse();
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');

      const startTimes = Array.from(renderers).map(r => r.getAttribute('start-time'));
      expect(startTimes).toEqual(['09:00', '10:30', '10:40', '11:30']);
    });

    it('each block renderer has correct attributes', () => {
      mount();
      el.blocks = sampleBlocks;
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');

      const first = renderers[0];
      expect(first.getAttribute('start-time')).toBe('09:00');
      expect(first.getAttribute('end-time')).toBe('10:30');
      expect(first.getAttribute('block-type')).toBe('class');
      expect(first.getAttribute('block-name')).toBe('Calculus 101');
      expect(first.getAttribute('location')).toBe('Math Building Room 201');
    });

    it('renders time axis labels at hour boundaries', () => {
      mount();
      el.blocks = sampleBlocks;
      const axisLabels = el.shadowRoot.querySelectorAll('.time-axis-label');
      expect(axisLabels.length).toBeGreaterThan(0);

      // Should include labels from 9 AM to 1 PM (covering 09:00-12:15)
      const labelTexts = Array.from(axisLabels).map(l => l.textContent);
      expect(labelTexts).toContain('9:00 AM');
    });

    it('positions blocks using absolute positioning within the timeline', () => {
      mount();
      el.blocks = sampleBlocks;
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      const first = renderers[0];
      expect(first.style.position).toBe('absolute');
      expect(first.style.top).toBe('0px'); // First block starts at top
    });

    it('sets block height proportional to duration', () => {
      mount();
      el.blocks = sampleBlocks;
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');

      // First block: 09:00-10:30 = 90 min * 2 px/min = 180px
      const first = renderers[0];
      expect(first.style.height).toBe('180px');

      // Transit block: 10:30-10:40 = 10 min * 2 px/min = 20px
      const transit = renderers[1];
      expect(transit.style.height).toBe('20px');
    });
  });

  describe('class blocks alongside generated blocks (Req 7.3)', () => {
    it('renders class blocks and generated blocks together', () => {
      mount();
      const mixedBlocks = [
        { startTime: '09:00', endTime: '10:00', type: 'class', name: 'Physics', location: 'Lab 101' },
        { startTime: '10:00', endTime: '10:10', type: 'transit', name: 'Walk', location: 'Library' },
        { startTime: '10:10', endTime: '11:00', type: 'activity', name: 'Study', location: 'Library' },
        { startTime: '11:00', endTime: '12:00', type: 'class', name: 'Chemistry', location: 'Chem Building' }
      ];
      el.blocks = mixedBlocks;

      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(4);

      // Verify class blocks are rendered
      const types = Array.from(renderers).map(r => r.getAttribute('block-type'));
      expect(types.filter(t => t === 'class').length).toBe(2);
      expect(types.filter(t => t === 'transit').length).toBe(1);
      expect(types.filter(t => t === 'activity').length).toBe(1);
    });
  });

  describe('responsive design (Req 7.4)', () => {
    it('has min-width of 600px on desktop in the schedule container', () => {
      mount();
      const styles = el.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('min-width: 600px');
    });

    it('has full-width on mobile via media query', () => {
      mount();
      const styles = el.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('max-width: 767px');
      expect(styles).toContain('min-width: 100%');
    });

    it('has minimum 14px font size in legend items', () => {
      mount();
      const styles = el.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('14px');
    });
  });

  describe('scale property', () => {
    it('uses default scale of 2 pixels per minute', () => {
      mount();
      expect(el.scale).toBe(2);
    });

    it('allows custom scale via property', () => {
      mount();
      el.scale = 3;
      expect(el.scale).toBe(3);
    });

    it('passes scale to time-block-renderer elements', () => {
      mount();
      el.scale = 3;
      el.blocks = sampleBlocks;
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers[0].getAttribute('scale')).toBe('3');
    });

    it('rejects invalid scale values', () => {
      mount();
      el.scale = -1;
      expect(el.scale).toBe(2); // default

      el.scale = 'abc';
      expect(el.scale).toBe(2); // default
    });
  });

  describe('blocks property', () => {
    it('defaults to empty array', () => {
      mount();
      expect(el.blocks).toEqual([]);
    });

    it('accepts an array of block objects', () => {
      mount();
      el.blocks = sampleBlocks;
      expect(el.blocks).toEqual(sampleBlocks);
    });

    it('handles non-array input gracefully', () => {
      mount();
      el.blocks = null;
      expect(el.blocks).toEqual([]);

      el.blocks = 'invalid';
      expect(el.blocks).toEqual([]);
    });

    it('re-renders when blocks change', () => {
      mount();
      el.blocks = sampleBlocks;
      let renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(4);

      el.blocks = [sampleBlocks[0]];
      renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(1);
    });

    it('shows empty state when blocks are cleared', () => {
      mount();
      el.blocks = sampleBlocks;
      el.blocks = [];
      const emptyState = el.shadowRoot.querySelector('.empty-state');
      expect(emptyState.classList.contains('hidden')).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles single block', () => {
      mount();
      el.blocks = [{ startTime: '09:00', endTime: '10:00', type: 'class', name: 'Test', location: 'Room' }];
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(1);
    });

    it('handles blocks with missing location', () => {
      mount();
      el.blocks = [{ startTime: '09:00', endTime: '10:00', type: 'activity', name: 'Study', location: '' }];
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(1);
      expect(renderers[0].getAttribute('location')).toBe('');
    });

    it('does not render before connected', () => {
      // Set blocks before mounting
      el.blocks = sampleBlocks;
      mount();
      const renderers = el.shadowRoot.querySelectorAll('time-block-renderer');
      expect(renderers.length).toBe(4);
    });
  });

  describe('regeneration controls (Req 10.1, 10.2, 10.3)', () => {
    beforeEach(() => {
      // Mock storageService methods
      vi.spyOn(storageService, 'getRegenerationCount').mockReturnValue(0);
      vi.spyOn(storageService, 'incrementRegenerationCount').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('hides regenerate button when no blocks are displayed', () => {
      mount();
      const controls = el.shadowRoot.querySelector('.regenerate-controls');
      expect(controls.classList.contains('hidden')).toBe(true);
    });

    it('shows regenerate button when blocks are displayed', () => {
      mount();
      el.blocks = sampleBlocks;
      const controls = el.shadowRoot.querySelector('.regenerate-controls');
      expect(controls.classList.contains('hidden')).toBe(false);
    });

    it('hides regenerate button during loading', () => {
      mount();
      el.blocks = sampleBlocks;
      el.loading = true;
      const controls = el.shadowRoot.querySelector('.regenerate-controls');
      expect(controls.classList.contains('hidden')).toBe(true);
    });

    it('shows regeneration count indicator (Req 10.3)', () => {
      storageService.getRegenerationCount.mockReturnValue(2);
      mount();
      el.blocks = sampleBlocks;
      const countEl = el.shadowRoot.querySelector('.regenerate-count');
      expect(countEl.textContent).toBe('2/5 regenerations used');
    });

    it('shows 0/5 when no regenerations have been used', () => {
      storageService.getRegenerationCount.mockReturnValue(0);
      mount();
      el.blocks = sampleBlocks;
      const countEl = el.shadowRoot.querySelector('.regenerate-count');
      expect(countEl.textContent).toBe('0/5 regenerations used');
    });

    it('disables button when regeneration limit (5) is reached (Req 10.3)', () => {
      storageService.getRegenerationCount.mockReturnValue(5);
      mount();
      el.blocks = sampleBlocks;
      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      expect(btn.disabled).toBe(true);
    });

    it('enables button when under the regeneration limit', () => {
      storageService.getRegenerationCount.mockReturnValue(3);
      mount();
      el.blocks = sampleBlocks;
      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      expect(btn.disabled).toBe(false);
    });

    it('shows count 5/5 and disabled button at max', () => {
      storageService.getRegenerationCount.mockReturnValue(5);
      mount();
      el.blocks = sampleBlocks;
      const countEl = el.shadowRoot.querySelector('.regenerate-count');
      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      expect(countEl.textContent).toBe('5/5 regenerations used');
      expect(btn.disabled).toBe(true);
    });

    it('calls API with incremented seed on regenerate click (Req 10.1)', async () => {
      const mockResult = {
        success: true,
        timeBlocks: [
          { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'New Activity', location: 'Library' }
        ]
      };
      vi.spyOn(apiClient, 'generateSchedule').mockResolvedValue(mockResult);
      storageService.getRegenerationCount.mockReturnValue(0);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'monday';
      el.classes = [{ name: 'Test', day: 'monday', startTime: '09:00', endTime: '10:30', location: 'Room' }];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      // Wait for the async operation
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(apiClient.generateSchedule).toHaveBeenCalledWith({
        day: 'monday',
        classes: el.classes,
        preferences: el.preferences,
        seed: 2 // Incremented from 1
      });
    });

    it('increments regeneration count in storage after successful regeneration (Req 10.3)', async () => {
      const mockResult = {
        success: true,
        timeBlocks: [
          { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'New', location: 'Lib' }
        ]
      };
      vi.spyOn(apiClient, 'generateSchedule').mockResolvedValue(mockResult);
      storageService.getRegenerationCount.mockReturnValue(1);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'tuesday';
      el.gapIndex = 2;
      el.classes = [];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(storageService.incrementRegenerationCount).toHaveBeenCalledWith('tuesday', 2);
    });

    it('replaces displayed schedule after successful regeneration (Req 10.2)', async () => {
      const mockResult = {
        success: true,
        timeBlocks: [
          { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'New Activity', location: 'Library' }
        ]
      };
      vi.spyOn(apiClient, 'generateSchedule').mockResolvedValue(mockResult);
      storageService.getRegenerationCount.mockReturnValue(0);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'monday';
      el.classes = [];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      // Should keep class blocks and replace generated blocks
      const classBlocks = el.blocks.filter(b => b.type === 'class');
      const activityBlocks = el.blocks.filter(b => b.type === 'activity');
      expect(classBlocks.length).toBe(1); // Original class block preserved
      expect(activityBlocks.length).toBe(1);
      expect(activityBlocks[0].name).toBe('New Activity');
    });

    it('dispatches schedule-regenerated event on success', async () => {
      const mockResult = {
        success: true,
        timeBlocks: [
          { startTime: '10:40', endTime: '11:30', type: 'activity', name: 'Study', location: 'Lib' }
        ]
      };
      vi.spyOn(apiClient, 'generateSchedule').mockResolvedValue(mockResult);
      storageService.getRegenerationCount.mockReturnValue(0);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'wednesday';
      el.classes = [];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const eventPromise = new Promise(resolve => {
        el.addEventListener('schedule-regenerated', resolve);
      });

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      const event = await eventPromise;
      expect(event.detail.day).toBe('wednesday');
      expect(event.detail.timeBlocks).toEqual(mockResult.timeBlocks);
    });

    it('dispatches regeneration-error event on API failure', async () => {
      const mockResult = {
        success: false,
        error: { code: 'TIMEOUT', message: 'Request timed out' }
      };
      vi.spyOn(apiClient, 'generateSchedule').mockResolvedValue(mockResult);
      storageService.getRegenerationCount.mockReturnValue(0);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'monday';
      el.classes = [];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const eventPromise = new Promise(resolve => {
        el.addEventListener('regeneration-error', resolve);
      });

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      const event = await eventPromise;
      expect(event.detail.error.code).toBe('TIMEOUT');
    });

    it('does not call API when limit is reached', async () => {
      vi.spyOn(apiClient, 'generateSchedule').mockResolvedValue({ success: true, timeBlocks: [] });
      storageService.getRegenerationCount.mockReturnValue(5);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'monday';
      el.classes = [];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(apiClient.generateSchedule).not.toHaveBeenCalled();
    });

    it('shows loading state during regeneration', async () => {
      let resolveApi;
      const apiPromise = new Promise(resolve => { resolveApi = resolve; });
      vi.spyOn(apiClient, 'generateSchedule').mockReturnValue(apiPromise);
      storageService.getRegenerationCount.mockReturnValue(0);

      mount();
      el.blocks = sampleBlocks;
      el.day = 'monday';
      el.classes = [];
      el.preferences = { activities: ['study'], dietaryRestrictions: [], mealPreferences: [] };

      const btn = el.shadowRoot.querySelector('.btn-regenerate');
      btn.click();

      // Loading should be visible immediately after click
      await new Promise(resolve => setTimeout(resolve, 0));
      const loadingEl = el.shadowRoot.querySelector('.loading-state');
      expect(loadingEl.classList.contains('hidden')).toBe(false);

      // Resolve the API call
      resolveApi({ success: true, timeBlocks: [] });
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    it('has 44px minimum touch target on regenerate button (Req 8.1)', () => {
      mount();
      el.blocks = sampleBlocks;
      const styles = el.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('min-height: 44px');
      expect(styles).toContain('min-width: 44px');
    });

    it('tracks day and gapIndex properties', () => {
      mount();
      el.day = 'friday';
      el.gapIndex = 3;
      expect(el.day).toBe('friday');
      expect(el.gapIndex).toBe(3);
    });

    it('rejects invalid day values', () => {
      mount();
      el.day = 'invalid';
      expect(el.day).toBe('monday'); // Default value
    });

    it('defaults gapIndex to 0 for invalid values', () => {
      mount();
      el.gapIndex = -1;
      expect(el.gapIndex).toBe(0);
      el.gapIndex = 'abc';
      expect(el.gapIndex).toBe(0);
    });
  });
});
