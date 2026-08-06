import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// Mock window.matchMedia before importing components
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

await import('./navigation.js');
await import('./app-shell.js');

describe('AppShell', () => {
  let element;

  beforeEach(() => {
    window.location.hash = '';
    element = document.createElement('app-shell');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
    window.location.hash = '';
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

    it('should contain navigation component', () => {
      const nav = element.shadowRoot.querySelector('app-navigation');
      expect(nav).toBeTruthy();
    });

    it('should contain a main content area', () => {
      const main = element.shadowRoot.querySelector('main[role="main"]');
      expect(main).toBeTruthy();
    });
  });

  describe('Routing', () => {
    it('should render schedule-view for schedule route', () => {
      const view = element.shadowRoot.querySelector('schedule-view');
      expect(view).toBeTruthy();
    });

    it('should render class-schedule-input for classes route', () => {
      element.route = 'classes';
      const view = element.shadowRoot.querySelector('class-schedule-input');
      expect(view).toBeTruthy();
    });

    it('should render user-preferences-input for preferences route', () => {
      element.route = 'preferences';
      const view = element.shadowRoot.querySelector('user-preferences-input');
      expect(view).toBeTruthy();
    });

    it('should update the URL hash when route changes', () => {
      element.route = 'classes';
      expect(window.location.hash).toBe('#classes');
    });

    it('should include day in hash for schedule route', () => {
      // Switch away then back to schedule to trigger hash update
      element.route = 'classes';
      element.route = 'schedule';
      expect(window.location.hash).toContain('schedule/');
    });

    it('should not show previous view when route changes', () => {
      element.route = 'classes';
      const scheduleView = element.shadowRoot.querySelector('schedule-view');
      expect(scheduleView).toBeNull();
    });
  });

  describe('Navigation integration', () => {
    it('should update route when nav-change event is received', () => {
      const nav = element.shadowRoot.querySelector('app-navigation');
      nav.dispatchEvent(new CustomEvent('nav-change', {
        bubbles: true,
        composed: true,
        detail: { route: 'preferences' }
      }));

      expect(element.route).toBe('preferences');
      const view = element.shadowRoot.querySelector('user-preferences-input');
      expect(view).toBeTruthy();
    });

    it('should update day when day-change event is received', () => {
      const nav = element.shadowRoot.querySelector('app-navigation');
      nav.dispatchEvent(new CustomEvent('day-change', {
        bubbles: true,
        composed: true,
        detail: { day: 'thursday' }
      }));

      expect(element.day).toBe('thursday');
    });

    it('should sync day change to hash', () => {
      element.day = 'wednesday';
      expect(window.location.hash).toContain('wednesday');
    });
  });

  describe('Hash-based navigation', () => {
    it('should read route from hash on connect', () => {
      element.parentNode.removeChild(element);
      
      window.location.hash = '#preferences';
      const newElement = document.createElement('app-shell');
      document.body.appendChild(newElement);

      expect(newElement.route).toBe('preferences');
      
      newElement.parentNode.removeChild(newElement);
    });

    it('should read day from hash on connect', () => {
      element.parentNode.removeChild(element);
      
      window.location.hash = '#schedule/friday';
      const newElement = document.createElement('app-shell');
      document.body.appendChild(newElement);

      expect(newElement.day).toBe('friday');
      
      newElement.parentNode.removeChild(newElement);
    });
  });

  describe('Responsive layout', () => {
    it('should have overflow-x hidden in styles', () => {
      const style = element.shadowRoot.querySelector('style');
      expect(style.textContent).toContain('overflow-x: hidden');
    });

    it('should have sticky header', () => {
      const style = element.shadowRoot.querySelector('style');
      expect(style.textContent).toContain('sticky');
    });

    it('should have max-width constraint on view container', () => {
      const style = element.shadowRoot.querySelector('style');
      expect(style.textContent).toContain('max-width: 1200px');
    });
  });

  describe('Route property validation', () => {
    it('should ignore invalid route values', () => {
      element.route = 'invalid-route';
      expect(element.route).toBe('schedule');
    });

    it('should ignore invalid day values', () => {
      element.day = 'sunday';
      expect(element.day).toBe('monday');
    });
  });
});
