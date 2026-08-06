import { AppNavigation } from './navigation.js';

/**
 * AppShell custom element.
 * Provides the main layout container, client-side routing between views,
 * and responsive layout (single-column mobile, multi-column desktop).
 * 
 * Routes:
 * - 'schedule' -> schedule-view component
 * - 'classes' -> class-schedule-input component
 * - 'preferences' -> user-preferences-input component
 */
export class AppShell extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentRoute = 'schedule';
    this._currentDay = 'monday';
  }

  connectedCallback() {
    // Read route from hash if present
    this._readHash();
    this._render();
    this._attachEventListeners();

    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
      this._readHash();
      this._updateView();
      this._updateNavState();
    });
  }

  get route() {
    return this._currentRoute;
  }

  set route(value) {
    const validRoutes = ['schedule', 'classes', 'preferences'];
    if (validRoutes.includes(value) && value !== this._currentRoute) {
      this._currentRoute = value;
      this._updateHash();
      this._updateView();
      this._updateNavState();
    }
  }

  get day() {
    return this._currentDay;
  }

  set day(value) {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (validDays.includes(value) && value !== this._currentDay) {
      this._currentDay = value;
      this._updateHash();
      this._notifyDayChange();
    }
  }

  _readHash() {
    const hash = window.location.hash.slice(1); // Remove '#'
    if (!hash) return;

    const parts = hash.split('/');
    const route = parts[0];
    const validRoutes = ['schedule', 'classes', 'preferences'];
    if (validRoutes.includes(route)) {
      this._currentRoute = route;
    }
    if (route === 'schedule' && parts[1]) {
      const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (validDays.includes(parts[1])) {
        this._currentDay = parts[1];
      }
    }
  }

  _updateHash() {
    if (this._currentRoute === 'schedule') {
      window.location.hash = `schedule/${this._currentDay}`;
    } else {
      window.location.hash = this._currentRoute;
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${AppShell._styles()}</style>
      <div class="shell-container">
        <header class="shell-header">
          <app-navigation route="${this._currentRoute}" day="${this._currentDay}"></app-navigation>
        </header>
        <main class="shell-main" role="main" aria-live="polite">
          <div class="view-container">
            ${this._renderView()}
          </div>
        </main>
      </div>
    `;

    this._attachEventListeners();
  }

  _renderView() {
    switch (this._currentRoute) {
      case 'schedule':
        return '<schedule-view class="view-panel"></schedule-view>';
      case 'classes':
        return '<class-schedule-input class="view-panel"></class-schedule-input>';
      case 'preferences':
        return '<user-preferences-input class="view-panel"></user-preferences-input>';
      default:
        return '<schedule-view class="view-panel"></schedule-view>';
    }
  }

  _updateView() {
    const main = this.shadowRoot.querySelector('.view-container');
    if (main) {
      main.innerHTML = this._renderView();
    }
  }

  _updateNavState() {
    const nav = this.shadowRoot.querySelector('app-navigation');
    if (nav) {
      nav.route = this._currentRoute;
      nav.day = this._currentDay;
    }
  }

  _notifyDayChange() {
    const nav = this.shadowRoot.querySelector('app-navigation');
    if (nav) {
      nav.day = this._currentDay;
    }
    // Notify schedule-view of day change
    const scheduleView = this.shadowRoot.querySelector('schedule-view');
    if (scheduleView && scheduleView.setAttribute) {
      scheduleView.setAttribute('day', this._currentDay);
    }
  }

  _attachEventListeners() {
    const nav = this.shadowRoot.querySelector('app-navigation');
    if (nav) {
      nav.addEventListener('nav-change', (e) => {
        const route = e.detail.route;
        if (route !== this._currentRoute) {
          this._currentRoute = route;
          this._updateHash();
          this._updateView();
          this._updateNavState();
        }
      });

      nav.addEventListener('day-change', (e) => {
        const day = e.detail.day;
        if (day !== this._currentDay) {
          this._currentDay = day;
          this._updateHash();
          this._notifyDayChange();
        }
      });
    }
  }

  static _styles() {
    return `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        color: #1a1a2e;
        min-height: 100vh;
        overflow-x: hidden;
        max-width: 100vw;
      }

      * {
        box-sizing: border-box;
      }

      .shell-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        max-width: 100%;
        overflow-x: hidden;
      }

      .shell-header {
        position: sticky;
        top: 0;
        z-index: 100;
        width: 100%;
      }

      .shell-main {
        flex: 1;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
      }

      .view-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
      }

      .view-panel {
        display: block;
        width: 100%;
      }

      /* Mobile: single-column layout */
      @media (max-width: 767px) {
        .view-container {
          padding: 0.75rem;
        }
      }

      /* Desktop: multi-column layout capability */
      @media (min-width: 768px) {
        .view-container {
          padding: 1.5rem 2rem;
        }
      }

      /* Ensure no horizontal scroll at any viewport 320px-1920px */
      @media (min-width: 320px) and (max-width: 1920px) {
        :host {
          overflow-x: hidden;
        }

        .shell-container,
        .shell-main,
        .view-container {
          max-width: 100%;
        }
      }
    `;
  }
}

customElements.define('app-shell', AppShell);
