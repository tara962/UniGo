/**
 * Main application entry point.
 * Registers all custom elements, initializes the app shell,
 * loads stored state from localStorage on startup, and
 * connects components via custom events and shared state.
 *
 * Requirements: 1.4, 2.4 (persist state across sessions)
 */

// Import all custom element components
import './components/navigation.js';
import './components/app-shell.js';
import './components/class-schedule-input.js';
import './components/user-preferences-input.js';
import './components/schedule-view.js';
import './components/time-block-renderer.js';

// Import services
import { loadClasses, loadPreferences, loadSchedule } from './services/storageService.js';

/**
 * Application state shared across components via events.
 * Stored in a simple object; components dispatch and listen for
 * custom events to communicate state changes.
 */
const appState = {
  classes: [],
  preferences: null,
  currentDay: 'monday',
  currentRoute: 'schedule',
  schedules: {}
};

/**
 * Initialize the application by loading persisted state from localStorage
 * and setting up event listeners for cross-component communication.
 */
function initApp() {
  // Load persisted state (Req 1.4, 2.4)
  loadStoredState();

  // Set up global event listeners for component communication
  setupEventListeners();
}

/**
 * Load stored state from localStorage and populate appState.
 */
function loadStoredState() {
  try {
    appState.classes = loadClasses();
  } catch {
    appState.classes = [];
  }

  try {
    appState.preferences = loadPreferences();
  } catch {
    appState.preferences = null;
  }

  // Load schedules for all days
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  for (const day of days) {
    try {
      const schedule = loadSchedule(day);
      if (schedule) {
        appState.schedules[day] = schedule;
      }
    } catch {
      // Skip corrupted schedule data
    }
  }
}

/**
 * Set up event listeners for cross-component communication.
 * Components dispatch custom events (bubbling + composed) that
 * propagate through shadow DOM boundaries.
 */
function setupEventListeners() {
  // Listen for class list changes (from class-schedule-input)
  document.addEventListener('classes-updated', (e) => {
    appState.classes = e.detail?.classes || [];
  });

  // Listen for preferences changes (from user-preferences-input)
  document.addEventListener('preferences-updated', (e) => {
    appState.preferences = e.detail?.preferences || null;
  });

  // Listen for schedule generation results
  document.addEventListener('schedule-generated', (e) => {
    const { day, schedule } = e.detail || {};
    if (day && schedule) {
      appState.schedules[day] = schedule;
    }
  });

  // Listen for day changes (from navigation)
  document.addEventListener('day-change', (e) => {
    const day = e.detail?.day;
    if (day) {
      appState.currentDay = day;
    }
  });

  // Listen for route changes (from navigation)
  document.addEventListener('nav-change', (e) => {
    const route = e.detail?.route;
    if (route) {
      appState.currentRoute = route;
    }
  });
}

/**
 * Get the current application state (useful for testing and debugging).
 * @returns {object} Current app state
 */
export function getAppState() {
  return { ...appState };
}

/**
 * Exported for testing: the initialization function.
 */
export { initApp, loadStoredState, setupEventListeners };

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
