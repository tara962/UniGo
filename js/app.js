<<<<<<< HEAD
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
import './components/error-display.js';

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
 * Tracked event listener references for cleanup.
 * @type {Array<{event: string, handler: Function}>}
 */
const _listeners = [];

/**
 * Set up event listeners for cross-component communication.
 * Components dispatch custom events (bubbling + composed) that
 * propagate through shadow DOM boundaries.
 */
function setupEventListeners() {
  // Remove any previously registered listeners to avoid duplicates
  teardownEventListeners();

  const handlers = [
    ['classes-updated', (e) => {
      appState.classes = e.detail?.classes || [];
    }],
    ['preferences-updated', (e) => {
      appState.preferences = e.detail?.preferences || null;
    }],
    ['schedule-generated', (e) => {
      const { day, schedule } = e.detail || {};
      if (day && schedule) {
        appState.schedules[day] = schedule;
      }
    }],
    ['day-change', (e) => {
      const day = e.detail?.day;
      if (day) {
        appState.currentDay = day;
      }
    }],
    ['nav-change', (e) => {
      const route = e.detail?.route;
      if (route) {
        appState.currentRoute = route;
      }
    }]
  ];

  for (const [event, handler] of handlers) {
    document.addEventListener(event, handler);
    _listeners.push({ event, handler });
  }
}

/**
 * Remove all event listeners (for testing/cleanup).
 */
function teardownEventListeners() {
  for (const { event, handler } of _listeners) {
    document.removeEventListener(event, handler);
  }
  _listeners.length = 0;
}

/**
 * Get the current application state (useful for testing and debugging).
 * @returns {object} Current app state
 */
export function getAppState() {
  return { ...appState };
}

/**
 * Reset application state to defaults (for testing purposes).
 */
export function resetAppState() {
  appState.classes = [];
  appState.preferences = null;
  appState.currentDay = 'monday';
  appState.currentRoute = 'schedule';
  appState.schedules = {};
}

/**
 * Exported for testing: the initialization function.
 */
export { initApp, loadStoredState, setupEventListeners, teardownEventListeners };

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
=======
// === SIDEBAR TOGGLE ===
document.addEventListener('DOMContentLoaded', () => {
  // === LOGIN CHECK ===
  if (!localStorage.getItem('unigo-logged-in') && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }

  const menuBtn = document.querySelector('.menu-btn');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const body = document.body;

  if (menuBtn && sidebar && overlay) {
    function toggleSidebar() {
      sidebar.classList.toggle('open');
      body.classList.toggle('sidebar-open');
      if (window.innerWidth <= 768) {
        overlay.classList.toggle('visible');
      }
    }

    menuBtn.addEventListener('click', toggleSidebar);

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      body.classList.remove('sidebar-open');
      overlay.classList.remove('visible');
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        overlay.classList.remove('visible');
      }
    });
  }

  // === SIGN OUT ===
  const signOutLink = document.getElementById('sign-out-link');
  if (signOutLink) {
    signOutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('unigo-logged-in');
      window.location.href = 'login.html';
    });
  }

  // === PREFERENCE TAGS (toggle) ===
  document.querySelectorAll('.pref-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
    });
  });

  // === PROFILE PHOTO PERSISTENCE (localStorage) ===
  loadSidebarProfile();

  // Avatar upload on options page
  const avatarInput = document.getElementById('avatar-input');
  if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target.result;
          localStorage.setItem('unigo-avatar', dataUrl);
          const circleLabel = document.getElementById('avatar-circle-label');
          if (circleLabel) {
            circleLabel.innerHTML = `<img src="${dataUrl}" alt="Profile">`;
          }
          loadSidebarProfile();
        };
        reader.readAsDataURL(file);
      }
    });

    // Load existing avatar into options page circle
    const savedAvatar = localStorage.getItem('unigo-avatar');
    if (savedAvatar) {
      const circleLabel = document.getElementById('avatar-circle-label');
      if (circleLabel) {
        circleLabel.innerHTML = `<img src="${savedAvatar}" alt="Profile">`;
      }
    }
  }

  // === DISPLAY NAME PERSISTENCE ===
  const nameInput = document.getElementById('display-name-input');
  if (nameInput) {
    const savedName = localStorage.getItem('unigo-name');
    if (savedName) nameInput.value = savedName;
    nameInput.addEventListener('input', () => {
      localStorage.setItem('unigo-name', nameInput.value);
      loadSidebarProfile();
    });
  }

  // === LOCATION TOGGLE WITH DEVICE LOCATION SERVICES ===
  const locationToggle = document.getElementById('location-toggle');
  if (locationToggle) {
    const savedLocation = localStorage.getItem('unigo-location-enabled');
    locationToggle.checked = savedLocation === 'true';
    locationToggle.addEventListener('change', () => {
      if (locationToggle.checked) {
        // Check if geolocation is available (requires https or localhost, not file://)
        if (navigator.geolocation && window.location.protocol !== 'file:') {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              localStorage.setItem('unigo-user-lat', position.coords.latitude.toString());
              localStorage.setItem('unigo-user-lng', position.coords.longitude.toString());
              localStorage.setItem('unigo-location-enabled', 'true');
            },
            () => {
              locationToggle.checked = false;
              alert('Location access denied. Please enable location in your browser settings.');
              localStorage.setItem('unigo-location-enabled', 'false');
            }
          );
        } else {
          // Running on file:// protocol - use default UBC campus location as fallback
          // In production this would use actual GPS, but for local testing we simulate
          localStorage.setItem('unigo-user-lat', '49.26200');
          localStorage.setItem('unigo-user-lng', '-123.24800');
          localStorage.setItem('unigo-location-enabled', 'true');
        }
      } else {
        localStorage.removeItem('unigo-user-lat');
        localStorage.removeItem('unigo-user-lng');
        localStorage.setItem('unigo-location-enabled', 'false');
      }
    });
  }

  // === COURSES (add/remove with localStorage) ===
  const coursesContainer = document.getElementById('courses-container');
  const courseInput = document.getElementById('course-input');
  const courseAddBtn = document.getElementById('course-add-btn');

  if (coursesContainer && courseInput && courseAddBtn) {
    let courses = JSON.parse(localStorage.getItem('unigo-courses') || '[]');

    function renderCourses() {
      coursesContainer.innerHTML = '';

      if (courses.length === 0) {
        coursesContainer.innerHTML = '<p style="color:#999; font-size:0.82rem; font-style:italic;">No courses added yet</p>';
        return;
      }

      courses.forEach((course, index) => {
        const chip = document.createElement('span');
        chip.className = 'course-chip';
        chip.innerHTML = `${course}<span class="remove-course" data-index="${index}">&times;</span>`;
        coursesContainer.appendChild(chip);
      });

      // Attach remove listeners
      coursesContainer.querySelectorAll('.remove-course').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.index);
          courses.splice(idx, 1);
          localStorage.setItem('unigo-courses', JSON.stringify(courses));
          renderCourses();
        });
      });
    }

    courseAddBtn.addEventListener('click', addCourse);
    courseInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCourse();
      }
    });

    function addCourse() {
      const val = courseInput.value.trim().toUpperCase();
      if (val && !courses.includes(val)) {
        courses.push(val);
        localStorage.setItem('unigo-courses', JSON.stringify(courses));
        renderCourses();
        courseInput.value = '';
      }
    }

    renderCourses();
  }
});

// === SIDEBAR PROFILE LOADER ===
function loadSidebarProfile() {
  const avatarImg = document.getElementById('sidebar-avatar');
  const avatarDefault = document.getElementById('sidebar-avatar-default');
  const usernameEl = document.getElementById('sidebar-username');

  const savedAvatar = localStorage.getItem('unigo-avatar');
  const savedName = localStorage.getItem('unigo-name');

  if (avatarImg && avatarDefault) {
    if (savedAvatar) {
      avatarImg.src = savedAvatar;
      avatarImg.style.display = 'block';
      avatarDefault.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarDefault.style.display = 'flex';
    }
  }

  if (usernameEl) {
    usernameEl.textContent = savedName || 'User';
  }
}
>>>>>>> 2d6d0ce0bf54140f03d253fdf7233b9ccfe82261
