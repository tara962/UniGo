import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// Mock window.matchMedia before importing the component
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

// Import AFTER mock is set up
const { AppNavigation } = await import('./navigation.js');

describe('AppNavigation', () => {
  let element;

  beforeEach(() => {
    element = document.createElement('app-navigation');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  });

  describe('Initialization', () => {
    it('should render as a custom element', () => {
      expect(element.shadowRoot).toBeTruthy();
    });

    it('should default to schedule route', () => {
      expect(element.route).toBe('schedule');
    });

    it('should default to monday day', () => {
      expect(element.day).toBe('monday');
    });

    it('should render nav title', () => {
      const title = element.shadowRoot.querySelector('.nav-title');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('UniGo');
    });
  });

  describe('Route navigation', () => {
    it('should render route links for schedule, classes, preferences', () => {
      const links = element.shadowRoot.querySelectorAll('.nav-link');
      expect(links.length).toBe(3);
      const labels = Array.from(links).map(l => l.textContent.trim());
      expect(labels).toContain('Schedule');
      expect(labels).toContain('Classes');
      expect(labels).toContain('Preferences');
    });

    it('should mark current route as active', () => {
      const activeLink = element.shadowRoot.querySelector('.nav-link.active');
      expect(activeLink).toBeTruthy();
      expect(activeLink.dataset.route).toBe('schedule');
    });

    it('should dispatch nav-change event when route link is clicked', () => {
      const handler = vi.fn();
      element.addEventListener('nav-change', handler);

      const classesLink = element.shadowRoot.querySelector('[data-route="classes"]');
      expect(classesLink).toBeTruthy();
      classesLink.click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.route).toBe('classes');
    });

    it('should update active state when route property is set', () => {
      element.route = 'preferences';
      const activeLink = element.shadowRoot.querySelector('.nav-link.active');
      expect(activeLink).toBeTruthy();
      expect(activeLink.dataset.route).toBe('preferences');
    });

    it('should not dispatch nav-change when clicking already active route', () => {
      const handler = vi.fn();
      element.addEventListener('nav-change', handler);

      const scheduleLink = element.shadowRoot.querySelector('[data-route="schedule"]');
      expect(scheduleLink).toBeTruthy();
      scheduleLink.click();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Day selector tabs', () => {
    it('should display day tabs when on schedule route', () => {
      const tabs = element.shadowRoot.querySelectorAll('.day-tab');
      expect(tabs.length).toBe(5);
    });

    it('should not display day tabs on non-schedule routes', () => {
      element.route = 'classes';
      const tabs = element.shadowRoot.querySelectorAll('.day-tab');
      expect(tabs.length).toBe(0);
    });

    it('should mark the current day as active', () => {
      element.day = 'wednesday';
      const activeTab = element.shadowRoot.querySelector('.day-tab.active');
      expect(activeTab).toBeTruthy();
      expect(activeTab.dataset.day).toBe('wednesday');
    });

    it('should dispatch day-change event when day tab is clicked', () => {
      const handler = vi.fn();
      element.addEventListener('day-change', handler);

      const tuesdayTab = element.shadowRoot.querySelector('[data-day="tuesday"]');
      expect(tuesdayTab).toBeTruthy();
      tuesdayTab.click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.day).toBe('tuesday');
    });

    it('should not dispatch day-change when clicking already active day', () => {
      const handler = vi.fn();
      element.addEventListener('day-change', handler);

      const mondayTab = element.shadowRoot.querySelector('[data-day="monday"]');
      expect(mondayTab).toBeTruthy();
      mondayTab.click();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should show abbreviated day labels (Mon, Tue, etc.)', () => {
      const tabs = element.shadowRoot.querySelectorAll('.day-tab');
      const labels = Array.from(tabs).map(t => t.textContent.trim());
      expect(labels).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    });
  });

  describe('Responsive behavior', () => {
    it('should have nav-link elements with min-height style for touch targets', () => {
      // Verify the CSS includes min-height: 44px for nav-link
      const styleEl = element.shadowRoot.querySelector('style');
      expect(styleEl.textContent).toContain('min-height: 44px');
    });

    it('should have day-tab elements with min-height style for touch targets', () => {
      const styleEl = element.shadowRoot.querySelector('style');
      expect(styleEl.textContent).toContain('min-height: 44px');
    });

    it('should have min font size of 16px in styles', () => {
      const styleEl = element.shadowRoot.querySelector('style');
      expect(styleEl.textContent).toContain('font-size: 16px');
    });
  });

  describe('Attribute changes', () => {
    it('should respond to route attribute changes', () => {
      element.setAttribute('route', 'preferences');
      expect(element.route).toBe('preferences');
    });

    it('should respond to day attribute changes', () => {
      element.setAttribute('day', 'friday');
      expect(element.day).toBe('friday');
    });
  });

  describe('Mobile menu', () => {
    beforeEach(() => {
      // Force mobile rendering
      element._mediaQuery = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
      element._render();
    });

    it('should have hamburger button when in mobile mode', () => {
      const hamburger = element.shadowRoot.querySelector('.hamburger-btn');
      expect(hamburger).toBeTruthy();
      expect(hamburger.getAttribute('aria-label')).toBe('Toggle navigation menu');
    });

    it('should toggle menu open state when hamburger is clicked', () => {
      expect(element._menuOpen).toBe(false);
      
      const hamburger = element.shadowRoot.querySelector('.hamburger-btn');
      hamburger.click();
      
      expect(element._menuOpen).toBe(true);
      const panel = element.shadowRoot.querySelector('.mobile-panel');
      expect(panel.classList.contains('open')).toBe(true);
    });

    it('should close menu when overlay is clicked', () => {
      element._menuOpen = true;
      element._render();

      const overlay = element.shadowRoot.querySelector('.mobile-overlay');
      overlay.click();
      
      expect(element._menuOpen).toBe(false);
    });

    it('should close menu when a route is selected', () => {
      element._menuOpen = true;
      element._render();

      const classesLink = element.shadowRoot.querySelector('[data-route="classes"]');
      classesLink.click();

      expect(element._menuOpen).toBe(false);
    });

    it('should show mobile overlay when menu is open', () => {
      element._menuOpen = true;
      element._render();

      const overlay = element.shadowRoot.querySelector('.mobile-overlay');
      expect(overlay.classList.contains('visible')).toBe(true);
    });
  });
});
