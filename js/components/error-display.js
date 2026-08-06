/**
 * ErrorDisplay custom element.
 * Displays contextual error messages in the schedule display area with
 * retry and dismiss functionality.
 *
 * Error codes mapped to user-friendly messages:
 *  - TIMEOUT / BEDROCK_TIMEOUT: "Request took too long"
 *  - SERVICE_ERROR / BEDROCK_ERROR: "Service temporarily unavailable"
 *  - PARSE_ERROR: "Schedule could not be generated"
 *  - NETWORK_ERROR: "No internet connection"
 *
 * Properties (set via JavaScript):
 *  - error: { code: string, message: string } | null
 *
 * Events emitted:
 *  - 'error-retry': User clicked retry button
 *  - 'error-dismiss': User dismissed the error
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 *
 * @element error-display
 */

const ERROR_MESSAGES = {
  TIMEOUT: 'Request took too long',
  BEDROCK_TIMEOUT: 'Request took too long',
  SERVICE_ERROR: 'Service temporarily unavailable',
  BEDROCK_ERROR: 'Service temporarily unavailable',
  PARSE_ERROR: 'Schedule could not be generated',
  NETWORK_ERROR: 'No internet connection'
};

/**
 * Error codes that should show a retry button (Req 9.1, 9.2).
 */
const RETRYABLE_CODES = new Set([
  'TIMEOUT',
  'BEDROCK_TIMEOUT',
  'SERVICE_ERROR',
  'BEDROCK_ERROR',
  'PARSE_ERROR',
  'NETWORK_ERROR'
]);

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
    }

    :host([hidden]) {
      display: none !important;
    }

    * {
      box-sizing: border-box;
    }

    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
      text-align: center;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      margin: 1rem 0;
    }

    .error-icon {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
    }

    .error-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #991b1b;
      margin: 0 0 0.5rem 0;
    }

    .error-description {
      font-size: 0.9375rem;
      color: #7f1d1d;
      margin: 0 0 1.25rem 0;
      max-width: 400px;
    }

    .error-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn {
      font-size: 1rem;
      font-weight: 500;
      padding: 0.625rem 1.25rem;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      transition: background-color 0.15s ease;
    }

    .btn-retry {
      background-color: #2563eb;
      color: #ffffff;
    }

    .btn-retry:hover {
      background-color: #1d4ed8;
    }

    .btn-retry:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .btn-dismiss {
      background-color: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-dismiss:hover {
      background-color: #e5e7eb;
    }

    .btn-dismiss:focus-visible {
      outline: 2px solid #6b7280;
      outline-offset: 2px;
    }

    .hidden {
      display: none !important;
    }

    @media (max-width: 767px) {
      .error-container {
        padding: 1.5rem 1rem;
        margin: 0.5rem 0;
      }

      .error-actions {
        flex-direction: column;
        width: 100%;
      }

      .btn {
        width: 100%;
      }
    }
  </style>

  <div class="error-container" role="alert" aria-live="assertive">
    <div class="error-icon" aria-hidden="true">\u26A0\uFE0F</div>
    <h3 class="error-title"></h3>
    <p class="error-description"></p>
    <div class="error-actions">
      <button class="btn btn-retry" type="button">Try Again</button>
      <button class="btn btn-dismiss" type="button">Dismiss</button>
    </div>
  </div>
`;

export class ErrorDisplay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._error = null;
    this._hideTimeout = null;

    // Bind event handlers
    this._onRetryClick = this._onRetryClick.bind(this);
    this._onDismissClick = this._onDismissClick.bind(this);
  }

  connectedCallback() {
    const retryBtn = this.shadowRoot.querySelector('.btn-retry');
    const dismissBtn = this.shadowRoot.querySelector('.btn-dismiss');

    retryBtn.addEventListener('click', this._onRetryClick);
    dismissBtn.addEventListener('click', this._onDismissClick);

    this._updateView();
  }

  disconnectedCallback() {
    const retryBtn = this.shadowRoot.querySelector('.btn-retry');
    const dismissBtn = this.shadowRoot.querySelector('.btn-dismiss');

    retryBtn.removeEventListener('click', this._onRetryClick);
    dismissBtn.removeEventListener('click', this._onDismissClick);

    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
      this._hideTimeout = null;
    }
  }

  /**
   * Set the error to display.
   * Setting to null or undefined hides the error display.
   * @param {{ code: string, message: string } | null} value
   */
  set error(value) {
    const prev = this._error;
    this._error = value || null;

    if (this._error && this.isConnected) {
      this._updateView();
      // Dispatch a custom event so the parent (schedule-view) can hide loading indicators
      // within 2 seconds (Req 9.5)
      this._scheduleLoadingHide();
    } else if (!this._error && this.isConnected) {
      this._updateView();
    }
  }

  get error() {
    return this._error;
  }

  /**
   * Returns the user-facing error message for the given error code.
   * @param {string} code
   * @returns {string}
   */
  static getMessageForCode(code) {
    return ERROR_MESSAGES[code] || 'An unexpected error occurred';
  }

  /**
   * Returns whether a given error code is retryable.
   * @param {string} code
   * @returns {boolean}
   */
  static isRetryable(code) {
    return RETRYABLE_CODES.has(code);
  }

  /**
   * Dismiss the error programmatically (Req 9.5: error persists until dismissed or new request).
   */
  dismiss() {
    this._error = null;
    this._updateView();
    this.dispatchEvent(new CustomEvent('error-dismiss', { bubbles: true, composed: true }));
  }

  /** @private */
  _updateView() {
    const container = this.shadowRoot.querySelector('.error-container');
    const titleEl = this.shadowRoot.querySelector('.error-title');
    const descEl = this.shadowRoot.querySelector('.error-description');
    const retryBtn = this.shadowRoot.querySelector('.btn-retry');

    if (!this._error) {
      container.classList.add('hidden');
      this.setAttribute('hidden', '');
      return;
    }

    container.classList.remove('hidden');
    this.removeAttribute('hidden');

    const code = this._error.code;
    const userMessage = ErrorDisplay.getMessageForCode(code);
    const detailMessage = this._error.message || '';

    titleEl.textContent = userMessage;
    descEl.textContent = detailMessage !== userMessage ? detailMessage : 'Please try again or come back later.';

    // Show retry button for retryable errors (Req 9.1, 9.2)
    if (ErrorDisplay.isRetryable(code)) {
      retryBtn.classList.remove('hidden');
    } else {
      retryBtn.classList.add('hidden');
    }
  }

  /**
   * Schedule the dispatching of a 'hide-loading' event within 2 seconds (Req 9.5).
   * @private
   */
  _scheduleLoadingHide() {
    if (this._hideTimeout) {
      clearTimeout(this._hideTimeout);
    }
    // Dispatch immediately — the schedule-view should hide loading within 2s of error detection
    // We dispatch immediately since the error has already been detected.
    this.dispatchEvent(new CustomEvent('hide-loading', { bubbles: true, composed: true }));
  }

  /** @private */
  _onRetryClick() {
    this.dispatchEvent(new CustomEvent('error-retry', { bubbles: true, composed: true }));
  }

  /** @private */
  _onDismissClick() {
    this.dismiss();
  }
}

customElements.define('error-display', ErrorDisplay);
