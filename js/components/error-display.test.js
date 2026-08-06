import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorDisplay } from './error-display.js';

describe('ErrorDisplay', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('error-display');
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

  it('registers as a custom element', () => {
    expect(customElements.get('error-display')).toBeDefined();
  });

  it('renders a shadow DOM', () => {
    mount();
    expect(el.shadowRoot).not.toBeNull();
  });

  describe('initial state', () => {
    it('is hidden when no error is set', () => {
      mount();
      expect(el.hasAttribute('hidden')).toBe(true);
    });

    it('has error default to null', () => {
      mount();
      expect(el.error).toBeNull();
    });

    it('error container has hidden class when no error', () => {
      mount();
      const container = el.shadowRoot.querySelector('.error-container');
      expect(container.classList.contains('hidden')).toBe(true);
    });
  });

  describe('error display messages (Req 9.1, 9.2, 9.3)', () => {
    it('shows "Service temporarily unavailable" for SERVICE_ERROR', () => {
      mount();
      el.error = { code: 'SERVICE_ERROR', message: 'Server returned 500' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Service temporarily unavailable');
    });

    it('shows "Service temporarily unavailable" for BEDROCK_ERROR', () => {
      mount();
      el.error = { code: 'BEDROCK_ERROR', message: 'Bedrock invocation failed' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Service temporarily unavailable');
    });

    it('shows "Request took too long" for TIMEOUT', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Request timed out after 30 seconds' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Request took too long');
    });

    it('shows "Request took too long" for BEDROCK_TIMEOUT', () => {
      mount();
      el.error = { code: 'BEDROCK_TIMEOUT', message: 'Bedrock timed out' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Request took too long');
    });

    it('shows "Schedule could not be generated" for PARSE_ERROR', () => {
      mount();
      el.error = { code: 'PARSE_ERROR', message: 'Failed to parse response' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Schedule could not be generated');
    });

    it('shows "No internet connection" for NETWORK_ERROR', () => {
      mount();
      el.error = { code: 'NETWORK_ERROR', message: 'fetch failed' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('No internet connection');
    });

    it('shows generic message for unknown error codes', () => {
      mount();
      el.error = { code: 'UNKNOWN_CODE', message: 'Something went wrong' };
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('An unexpected error occurred');
    });

    it('shows error detail message in description', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Request timed out after 30 seconds' };
      const desc = el.shadowRoot.querySelector('.error-description');
      expect(desc.textContent).toBe('Request timed out after 30 seconds');
    });

    it('shows fallback description when detail matches title', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Request took too long' };
      const desc = el.shadowRoot.querySelector('.error-description');
      expect(desc.textContent).toBe('Please try again or come back later.');
    });
  });

  describe('retry button (Req 9.1, 9.2)', () => {
    it('shows retry button for TIMEOUT errors', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      expect(retryBtn.classList.contains('hidden')).toBe(false);
    });

    it('shows retry button for SERVICE_ERROR', () => {
      mount();
      el.error = { code: 'SERVICE_ERROR', message: 'Server error' };
      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      expect(retryBtn.classList.contains('hidden')).toBe(false);
    });

    it('shows retry button for BEDROCK_TIMEOUT', () => {
      mount();
      el.error = { code: 'BEDROCK_TIMEOUT', message: 'Timeout' };
      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      expect(retryBtn.classList.contains('hidden')).toBe(false);
    });

    it('shows retry button for BEDROCK_ERROR', () => {
      mount();
      el.error = { code: 'BEDROCK_ERROR', message: 'Error' };
      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      expect(retryBtn.classList.contains('hidden')).toBe(false);
    });

    it('shows retry button for PARSE_ERROR', () => {
      mount();
      el.error = { code: 'PARSE_ERROR', message: 'Parse failed' };
      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      expect(retryBtn.classList.contains('hidden')).toBe(false);
    });

    it('shows retry button for NETWORK_ERROR', () => {
      mount();
      el.error = { code: 'NETWORK_ERROR', message: 'No network' };
      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      expect(retryBtn.classList.contains('hidden')).toBe(false);
    });

    it('dispatches error-retry event on retry click', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      const handler = vi.fn();
      el.addEventListener('error-retry', handler);

      const retryBtn = el.shadowRoot.querySelector('.btn-retry');
      retryBtn.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('retry button has minimum 44px touch target', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      const styles = el.shadowRoot.querySelector('style').textContent;
      expect(styles).toContain('min-height: 44px');
      expect(styles).toContain('min-width: 44px');
    });
  });

  describe('dismiss functionality (Req 9.5)', () => {
    it('shows dismiss button when error is displayed', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      const dismissBtn = el.shadowRoot.querySelector('.btn-dismiss');
      expect(dismissBtn).not.toBeNull();
    });

    it('hides error on dismiss click', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      const dismissBtn = el.shadowRoot.querySelector('.btn-dismiss');
      dismissBtn.click();

      expect(el.error).toBeNull();
      expect(el.hasAttribute('hidden')).toBe(true);
    });

    it('dispatches error-dismiss event on dismiss click', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      const handler = vi.fn();
      el.addEventListener('error-dismiss', handler);

      const dismissBtn = el.shadowRoot.querySelector('.btn-dismiss');
      dismissBtn.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('can be dismissed programmatically', () => {
      mount();
      el.error = { code: 'SERVICE_ERROR', message: 'Error' };
      expect(el.hasAttribute('hidden')).toBe(false);

      el.dismiss();

      expect(el.error).toBeNull();
      expect(el.hasAttribute('hidden')).toBe(true);
    });

    it('error persists until dismissed (Req 9.5)', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };

      // Error should still be visible
      const container = el.shadowRoot.querySelector('.error-container');
      expect(container.classList.contains('hidden')).toBe(false);
      expect(el.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('loading indicator hide event (Req 9.5)', () => {
    it('dispatches hide-loading event when error is set', () => {
      mount();
      const handler = vi.fn();
      el.addEventListener('hide-loading', handler);

      el.error = { code: 'TIMEOUT', message: 'Timed out' };

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('hide-loading event bubbles and is composed', () => {
      mount();
      let event = null;
      el.addEventListener('hide-loading', (e) => { event = e; });

      el.error = { code: 'SERVICE_ERROR', message: 'Error' };

      expect(event).not.toBeNull();
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });
  });

  describe('visibility toggling', () => {
    it('becomes visible when error is set', () => {
      mount();
      el.error = { code: 'SERVICE_ERROR', message: 'Error' };
      expect(el.hasAttribute('hidden')).toBe(false);
      const container = el.shadowRoot.querySelector('.error-container');
      expect(container.classList.contains('hidden')).toBe(false);
    });

    it('becomes hidden when error is cleared', () => {
      mount();
      el.error = { code: 'SERVICE_ERROR', message: 'Error' };
      el.error = null;
      expect(el.hasAttribute('hidden')).toBe(true);
    });

    it('handles setting error before mount', () => {
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      mount();
      // After mount, connectedCallback calls _updateView
      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Request took too long');
      expect(el.hasAttribute('hidden')).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('error container has role="alert"', () => {
      mount();
      const container = el.shadowRoot.querySelector('.error-container');
      expect(container.getAttribute('role')).toBe('alert');
    });

    it('error container has aria-live="assertive"', () => {
      mount();
      const container = el.shadowRoot.querySelector('.error-container');
      expect(container.getAttribute('aria-live')).toBe('assertive');
    });

    it('icon is aria-hidden', () => {
      mount();
      const icon = el.shadowRoot.querySelector('.error-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('static helper methods', () => {
    it('getMessageForCode returns correct messages', () => {
      expect(ErrorDisplay.getMessageForCode('TIMEOUT')).toBe('Request took too long');
      expect(ErrorDisplay.getMessageForCode('BEDROCK_TIMEOUT')).toBe('Request took too long');
      expect(ErrorDisplay.getMessageForCode('SERVICE_ERROR')).toBe('Service temporarily unavailable');
      expect(ErrorDisplay.getMessageForCode('BEDROCK_ERROR')).toBe('Service temporarily unavailable');
      expect(ErrorDisplay.getMessageForCode('PARSE_ERROR')).toBe('Schedule could not be generated');
      expect(ErrorDisplay.getMessageForCode('NETWORK_ERROR')).toBe('No internet connection');
      expect(ErrorDisplay.getMessageForCode('UNKNOWN')).toBe('An unexpected error occurred');
    });

    it('isRetryable identifies retryable error codes', () => {
      expect(ErrorDisplay.isRetryable('TIMEOUT')).toBe(true);
      expect(ErrorDisplay.isRetryable('BEDROCK_TIMEOUT')).toBe(true);
      expect(ErrorDisplay.isRetryable('SERVICE_ERROR')).toBe(true);
      expect(ErrorDisplay.isRetryable('BEDROCK_ERROR')).toBe(true);
      expect(ErrorDisplay.isRetryable('PARSE_ERROR')).toBe(true);
      expect(ErrorDisplay.isRetryable('NETWORK_ERROR')).toBe(true);
    });
  });

  describe('error state transitions', () => {
    it('can switch between different errors', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      let title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Request took too long');

      el.error = { code: 'SERVICE_ERROR', message: 'Server error' };
      title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Service temporarily unavailable');
    });

    it('clears old error when new error is set (new request clears old)', () => {
      mount();
      el.error = { code: 'TIMEOUT', message: 'Timed out' };
      el.error = { code: 'PARSE_ERROR', message: 'Parse failed' };

      const title = el.shadowRoot.querySelector('.error-title');
      expect(title.textContent).toBe('Schedule could not be generated');
    });
  });
});
