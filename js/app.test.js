import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock storageService before importing app module
vi.mock('./services/storageService.js', () => ({
  loadClasses: vi.fn(() => []),
  loadPreferences: vi.fn(() => null),
  loadSchedule: vi.fn(() => null)
}));

// Mock all component imports so they don't try to register custom elements multiple times
vi.mock('./components/navigation.js', () => ({}));
vi.mock('./components/app-shell.js', () => ({}));
vi.mock('./components/class-schedule-input.js', () => ({}));
vi.mock('./components/user-preferences-input.js', () => ({}));
vi.mock('./components/schedule-view.js', () => ({}));
vi.mock('./components/time-block-renderer.js', () => ({}));

import { getAppState, initApp, loadStoredState, setupEventListeners, resetAppState, teardownEventListeners } from './app.js';
import { loadClasses, loadPreferences, loadSchedule } from './services/storageService.js';

describe('app.js - Application Entry Point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teardownEventListeners();
    resetAppState();
  });

  afterEach(() => {
    teardownEventListeners();
  });

  describe('initApp', () => {
    it('should call loadStoredState and setup event listeners without errors', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);

      expect(() => initApp()).not.toThrow();
    });
  });

  describe('loadStoredState', () => {
    it('should load classes from localStorage via storageService', () => {
      const mockClasses = [
        { id: '1', name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00', location: 'Room 101' }
      ];
      loadClasses.mockReturnValue(mockClasses);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);

      loadStoredState();

      expect(loadClasses).toHaveBeenCalled();
      const state = getAppState();
      expect(state.classes).toEqual(mockClasses);
    });

    it('should load preferences from localStorage via storageService', () => {
      const mockPrefs = { activities: ['study'], dietaryRestrictions: [], mealPreferences: ['lunch'] };
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(mockPrefs);
      loadSchedule.mockReturnValue(null);

      loadStoredState();

      const state = getAppState();
      expect(state.preferences).toEqual(mockPrefs);
    });

    it('should load schedules for all weekdays', () => {
      const mockSchedule = { day: 'monday', timeBlocks: [], generatedAt: '2024-01-01', seed: 1 };
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockImplementation((day) => {
        return day === 'monday' ? mockSchedule : null;
      });

      loadStoredState();

      const state = getAppState();
      expect(state.schedules.monday).toEqual(mockSchedule);
    });

    it('should handle errors gracefully when loadClasses throws', () => {
      loadClasses.mockImplementation(() => { throw new Error('corrupted'); });
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);

      expect(() => loadStoredState()).not.toThrow();
      const state = getAppState();
      expect(state.classes).toEqual([]);
    });

    it('should handle errors gracefully when loadPreferences throws', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockImplementation(() => { throw new Error('corrupted'); });
      loadSchedule.mockReturnValue(null);

      expect(() => loadStoredState()).not.toThrow();
      const state = getAppState();
      expect(state.preferences).toBeNull();
    });

    it('should handle errors gracefully when loadSchedule throws for a day', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockImplementation(() => { throw new Error('corrupted'); });

      expect(() => loadStoredState()).not.toThrow();
      const state = getAppState();
      expect(state.schedules).toEqual({});
    });
  });

  describe('setupEventListeners', () => {
    it('should update appState.classes on classes-updated event', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      const mockClasses = [{ id: '2', name: 'Physics', day: 'tuesday', startTime: '11:00', endTime: '12:00', location: 'Lab' }];
      document.dispatchEvent(new CustomEvent('classes-updated', {
        detail: { classes: mockClasses }
      }));

      const state = getAppState();
      expect(state.classes).toEqual(mockClasses);
    });

    it('should update appState.preferences on preferences-updated event', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      const mockPrefs = { activities: ['exercise', 'study'], dietaryRestrictions: ['vegan'], mealPreferences: [] };
      document.dispatchEvent(new CustomEvent('preferences-updated', {
        detail: { preferences: mockPrefs }
      }));

      const state = getAppState();
      expect(state.preferences).toEqual(mockPrefs);
    });

    it('should update appState.schedules on schedule-generated event', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      const mockSchedule = { day: 'wednesday', timeBlocks: [{ startTime: '10:00', endTime: '11:00', type: 'activity', name: 'Study', location: 'Library' }], generatedAt: '2024-01-02', seed: 2 };
      document.dispatchEvent(new CustomEvent('schedule-generated', {
        detail: { day: 'wednesday', schedule: mockSchedule }
      }));

      const state = getAppState();
      expect(state.schedules.wednesday).toEqual(mockSchedule);
    });

    it('should update appState.currentDay on day-change event', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      document.dispatchEvent(new CustomEvent('day-change', {
        detail: { day: 'friday' }
      }));

      const state = getAppState();
      expect(state.currentDay).toBe('friday');
    });

    it('should update appState.currentRoute on nav-change event', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      document.dispatchEvent(new CustomEvent('nav-change', {
        detail: { route: 'classes' }
      }));

      const state = getAppState();
      expect(state.currentRoute).toBe('classes');
    });

    it('should handle missing detail in events gracefully', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      expect(() => {
        document.dispatchEvent(new CustomEvent('classes-updated', { detail: null }));
        document.dispatchEvent(new CustomEvent('preferences-updated', { detail: null }));
        document.dispatchEvent(new CustomEvent('schedule-generated', { detail: null }));
        document.dispatchEvent(new CustomEvent('day-change', { detail: null }));
        document.dispatchEvent(new CustomEvent('nav-change', { detail: null }));
      }).not.toThrow();
    });
  });

  describe('getAppState', () => {
    it('should return a copy of the state, not the original reference', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      initApp();

      const state1 = getAppState();
      const state2 = getAppState();
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different object references
    });

    it('should have correct initial state structure', () => {
      loadClasses.mockReturnValue([]);
      loadPreferences.mockReturnValue(null);
      loadSchedule.mockReturnValue(null);
      loadStoredState();

      const state = getAppState();
      expect(state).toHaveProperty('classes');
      expect(state).toHaveProperty('preferences');
      expect(state).toHaveProperty('currentDay');
      expect(state).toHaveProperty('currentRoute');
      expect(state).toHaveProperty('schedules');
      expect(state.currentDay).toBe('monday');
      expect(state.currentRoute).toBe('schedule');
    });
  });
});
