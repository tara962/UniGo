/**
 * Navigation custom element.
 * Responsive nav: hamburger menu on mobile (<768px), inline on desktop (>=768px).
 * Dispatches 'nav-change' event when a route is selected.
 * Dispatches 'day-change' event when a day tab is selected.
 */
export class AppNavigation extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._currentRoute = 'schedule';
    this._currentDay = 'monday';
    this._menuOpen = false;
    this._mediaQuery = null;
    this._onMediaChange = this._onMediaChange.bind(this);
    this._onDocumentClick = this._onDocumentClick.bind(this);
  }

  static get observedAttributes() {
    return ['route', 'day'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'route' && newVal && newVal !== oldVal) {
      this._currentRoute = newVal;
      this._render();
    }
    if (name === 'day' && newVal && newVal !== oldVal) {
      this._currentDay = newVal;
      this._render();
    }
  }

  connectedCallback() {
    if (typeof window.matchMedia === 'function') {
      this._mediaQuery = window.matchMedia('(max-width: 767px)');
      if (this._mediaQuery.addEventListener) {
        this._mediaQuery.addEventListener('change', this._onMediaChange);
      }
    } else {
      this._mediaQuery = { matches: false, addEventListener() {}, removeEventListener() {} };
    }
    this._render();
    document.addEventListener('click', this._onDocumentClick);
  }

  disconnectedCallback() {
    if (this._mediaQuery && this._mediaQuery.removeEventListener) {
      this._mediaQuery.removeEventListener('change', this._onMediaChange);
    }
    document.removeEventListener('click', this._onDocumentClick);
  }

  get route() {
    return this._currentRoute;
  }

  set route(value) {
    if (value && value !== this._currentRoute) {
      this._currentRoute = value;
      this._render();
    }
  }

  get day() {
    return this._currentDay;
  }

  set day(value) {
    if (value && value !== this._currentDay) {
      this._currentDay = value;
      this._render();
    }
  }

  _onMediaChange() {
    this._menuOpen = false;
    this._render();
  }

  _onDocumentClick(e) {
    if (this._menuOpen && !this.contains(e.target)) {
      this._menuOpen = false;
      this._render();
    }
  }

  _isMobile() {
    return this._mediaQuery ? this._mediaQuery.matches : false;
  }

  _render() {
    const isMobile = this._isMobile();
    const routes = [
      { id: 'schedule', label: 'Schedule' },
      { id: 'classes', label: 'Classes' },
      { id: 'preferences', label: 'Preferences' }
    ];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

    const navLinksHtml = routes.map(r => `
      <li>
        <button class="nav-link${this._currentRoute === r.id ? ' active' : ''}"
          data-route="${r.id}" aria-current="${this._currentRoute === r.id ? 'page' : 'false'}">
          ${r.label}
        </button>
      </li>
    `).join('');

    const dayTabsHtml = this._currentRoute === 'schedule' ? `
      <div class="day-tabs" role="tablist" aria-label="Day selector">
        ${days.map(d => `
          <button class="day-tab${this._currentDay === d ? ' active' : ''}"
            role="tab" aria-selected="${this._currentDay === d}"
            data-day="${d}">
            ${d.charAt(0).toUpperCase() + d.slice(1, 3)}
          </button>
        `).join('')}
      </div>
    ` : '';

    let navContent;
    if (isMobile) {
      navContent = `
        <div class="nav-header">
          <span class="nav-title">UniGo</span>
          <button class="hamburger-btn" aria-label="Toggle navigation menu" aria-expanded="${this._menuOpen}">
            <span class="hamburger-icon${this._menuOpen ? ' open' : ''}">
              <span></span><span></span><span></span>
            </span>
          </button>
        </div>
        <div class="mobile-overlay${this._menuOpen ? ' visible' : ''}" aria-hidden="${!this._menuOpen}"></div>
        <div class="mobile-panel${this._menuOpen ? ' open' : ''}" role="menu" aria-hidden="${!this._menuOpen}">
          <ul class="nav-links">${navLinksHtml}</ul>
        </div>
        ${dayTabsHtml}
      `;
    } else {
      navContent = `
        <div class="nav-header">
          <span class="nav-title">UniGo</span>
        </div>
        <ul class="nav-links desktop">${navLinksHtml}</ul>
        ${dayTabsHtml}
      `;
    }

    this.shadowRoot.innerHTML = `
      <style>${AppNavigation._styles()}</style>
      <nav class="nav-container" aria-label="Main navigation">
        ${navContent}
      </nav>
    `;

    this._attachEventListeners();
  }

  _attachEventListeners() {
    const shadow = this.shadowRoot;

    // Hamburger button
    const hamburger = shadow.querySelector('.hamburger-btn');
    if (hamburger) {
      hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        this._menuOpen = !this._menuOpen;
        this._render();
      });
    }

    // Mobile overlay click to close
    const overlay = shadow.querySelector('.mobile-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => {
        this._menuOpen = false;
        this._render();
      });
    }

    // Route links
    shadow.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const route = link.dataset.route;
        if (route !== this._currentRoute) {
          this._currentRoute = route;
          this._menuOpen = false;
          this._render();
          this.dispatchEvent(new CustomEvent('nav-change', {
            bubbles: true,
            composed: true,
            detail: { route }
          }));
        } else {
          this._menuOpen = false;
          this._render();
        }
      });
    });

    // Day tabs
    shadow.querySelectorAll('.day-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const day = tab.dataset.day;
        if (day !== this._currentDay) {
          this._currentDay = day;
          this._render();
          this.dispatchEvent(new CustomEvent('day-change', {
            bubbles: true,
            composed: true,
            detail: { day }
          }));
        }
      });
    });
  }

  static _styles() {
    return `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        --nav-bg: #1a1a2e;
        --nav-text: #ffffff;
        --nav-active: #4a6cf7;
        --nav-hover: #2a2a4e;
      }

      * { box-sizing: border-box; }

      .nav-container {
        background: var(--nav-bg);
        color: var(--nav-text);
        padding: 0;
        position: relative;
      }

      .nav-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        min-height: 56px;
      }

      .nav-title {
        font-size: 1.25rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      .hamburger-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
      }

      .hamburger-icon {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 24px;
        height: 24px;
        position: relative;
      }

      .hamburger-icon span {
        display: block;
        width: 24px;
        height: 3px;
        background: var(--nav-text);
        border-radius: 2px;
        transition: transform 0.3s, opacity 0.3s;
        position: absolute;
      }

      .hamburger-icon span:nth-child(1) { top: 4px; }
      .hamburger-icon span:nth-child(2) { top: 11px; }
      .hamburger-icon span:nth-child(3) { top: 18px; }

      .hamburger-icon.open span:nth-child(1) {
        top: 11px;
        transform: rotate(45deg);
      }
      .hamburger-icon.open span:nth-child(2) { opacity: 0; }
      .hamburger-icon.open span:nth-child(3) {
        top: 11px;
        transform: rotate(-45deg);
      }

      .mobile-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 998;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .mobile-overlay.visible {
        display: block;
        opacity: 1;
      }

      .mobile-panel {
        position: fixed;
        top: 0;
        right: -280px;
        width: 280px;
        max-width: 80vw;
        height: 100%;
        background: var(--nav-bg);
        z-index: 999;
        transition: right 0.3s ease;
        padding: 1rem 0;
        overflow-y: auto;
      }

      .mobile-panel.open { right: 0; }

      .nav-links {
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .nav-links.desktop {
        display: flex;
        gap: 0.25rem;
        padding: 0 1rem 0.5rem;
      }

      .nav-link {
        display: flex;
        align-items: center;
        width: 100%;
        min-height: 44px;
        padding: 0.75rem 1.5rem;
        background: none;
        border: none;
        color: var(--nav-text);
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        text-align: left;
        transition: background-color 0.2s;
        border-radius: 0;
      }

      .nav-links.desktop .nav-link {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        width: auto;
      }

      .nav-link:hover { background: var(--nav-hover); }
      .nav-link.active {
        background: var(--nav-active);
        font-weight: 600;
      }

      .day-tabs {
        display: flex;
        gap: 0.25rem;
        padding: 0.5rem 1rem 0.75rem;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .day-tab {
        flex: 1;
        min-width: 44px;
        min-height: 44px;
        padding: 0.5rem 0.75rem;
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        color: var(--nav-text);
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
        white-space: nowrap;
      }

      .day-tab:hover {
        background: var(--nav-hover);
        border-color: rgba(255, 255, 255, 0.5);
      }

      .day-tab.active {
        background: var(--nav-active);
        border-color: var(--nav-active);
        font-weight: 600;
      }

      @media (min-width: 768px) {
        .nav-container {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
        }
        .nav-header { flex-shrink: 0; }
        .nav-links.desktop {
          flex: 1;
          padding: 0;
          justify-content: flex-start;
        }
        .day-tabs {
          width: 100%;
          padding: 0.5rem 1rem 0.75rem;
        }
      }
    `;
  }
}

customElements.define('app-navigation', AppNavigation);
