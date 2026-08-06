import { formatTime12h } from '../utils/time.js';
import { BlockType } from '../models/constants.js';

/**
 * Color and icon configuration per block type.
 * Each type has a unique color and emoji icon (Req 7.2).
 */
const BLOCK_TYPE_CONFIG = {
  class: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    textColor: '#1e40af',
    icon: '\u{1F4DA}', // books
    label: 'Class'
  },
  transit: {
    backgroundColor: '#fef3c7',
    borderColor: '#d97706',
    textColor: '#92400e',
    icon: '\u{1F6B6}', // walking
    label: 'Transit'
  },
  meal: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
    textColor: '#166534',
    icon: '\u{1F37D}\u{FE0F}', // plate with cutlery
    label: 'Meal'
  },
  activity: {
    backgroundColor: '#f3e8ff',
    borderColor: '#9333ea',
    textColor: '#6b21a8',
    icon: '\u{2B50}', // star
    label: 'Activity'
  }
};

/**
 * Default pixels per minute for proportional height calculation.
 * Can be overridden via the `scale` attribute (pixels per minute).
 */
const DEFAULT_SCALE = 2;

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      color: #1a1a1a;
    }

    * {
      box-sizing: border-box;
    }

    .time-block {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 0.5rem 0.75rem;
      border-left: 4px solid var(--block-border-color, #ccc);
      background-color: var(--block-bg-color, #f9fafb);
      border-radius: 6px;
      overflow: hidden;
      min-height: 40px;
    }

    .time-block-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.25rem;
    }

    .time-block-icon {
      font-size: 1rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .time-block-name {
      font-weight: 600;
      font-size: 14px;
      color: var(--block-text-color, #1a1a1a);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .time-block-details {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      font-size: 14px;
      color: #4b5563;
    }

    .time-block-time {
      white-space: nowrap;
    }

    .time-block-location {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    @media (max-width: 767px) {
      .time-block-name {
        font-size: 14px;
      }
      .time-block-details {
        font-size: 14px;
      }
    }
  </style>

  <div class="time-block" role="listitem" aria-label="">
    <div class="time-block-header">
      <span class="time-block-icon" aria-hidden="true"></span>
      <span class="time-block-name"></span>
    </div>
    <div class="time-block-details">
      <span class="time-block-time"></span>
      <span class="time-block-location"></span>
    </div>
  </div>
`;

/**
 * TimeBlockRenderer custom element.
 * Renders a single time block with proportional height, color/icon coding, and time display.
 *
 * Attributes:
 *  - start-time: Start time in HH:mm format
 *  - end-time: End time in HH:mm format
 *  - block-type: One of 'class', 'transit', 'meal', 'activity'
 *  - block-name: Activity/event name
 *  - location: Campus location
 *  - scale: Pixels per minute for proportional height (default: 2)
 *
 * @element time-block-renderer
 */
export class TimeBlockRenderer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  static get observedAttributes() {
    return ['start-time', 'end-time', 'block-type', 'block-name', 'location', 'scale'];
  }

  connectedCallback() {
    this._render();
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this._render();
    }
  }

  /** @returns {string} Start time in HH:mm format */
  get startTime() {
    return this.getAttribute('start-time') || '';
  }

  /** @returns {string} End time in HH:mm format */
  get endTime() {
    return this.getAttribute('end-time') || '';
  }

  /** @returns {string} Block type */
  get blockType() {
    return this.getAttribute('block-type') || '';
  }

  /** @returns {string} Block name */
  get blockName() {
    return this.getAttribute('block-name') || '';
  }

  /** @returns {string} Location */
  get location() {
    return this.getAttribute('location') || '';
  }

  /** @returns {number} Pixels per minute scale factor */
  get scale() {
    const val = parseFloat(this.getAttribute('scale'));
    return isNaN(val) || val <= 0 ? DEFAULT_SCALE : val;
  }

  /**
   * Calculate duration in minutes from start and end times.
   * @returns {number} Duration in minutes, or 0 if times are invalid
   */
  _getDurationMinutes() {
    const start = this.startTime;
    const end = this.endTime;
    if (!start || !end) return 0;

    try {
      const startParts = start.split(':');
      const endParts = end.split(':');
      const startMinutes = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
      const endMinutes = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
      const duration = endMinutes - startMinutes;
      return duration > 0 ? duration : 0;
    } catch {
      return 0;
    }
  }

  /** Render the time block with appropriate styling and content. */
  _render() {
    const config = BLOCK_TYPE_CONFIG[this.blockType] || BLOCK_TYPE_CONFIG.activity;
    const duration = this._getDurationMinutes();
    const height = duration * this.scale;

    // Set CSS custom properties for theming
    const blockEl = this.shadowRoot.querySelector('.time-block');
    blockEl.style.setProperty('--block-bg-color', config.backgroundColor);
    blockEl.style.setProperty('--block-border-color', config.borderColor);
    blockEl.style.setProperty('--block-text-color', config.textColor);

    // Set proportional height (Req 7.1)
    if (height > 0) {
      blockEl.style.height = `${height}px`;
    }

    // Set aria-label for accessibility
    const typeLabel = config.label;
    const ariaLabel = `${typeLabel}: ${this.blockName}`;
    blockEl.setAttribute('aria-label', ariaLabel);

    // Set icon
    const iconEl = this.shadowRoot.querySelector('.time-block-icon');
    iconEl.textContent = config.icon;

    // Set name
    const nameEl = this.shadowRoot.querySelector('.time-block-name');
    nameEl.textContent = this.blockName;

    // Set time display (12h format)
    const timeEl = this.shadowRoot.querySelector('.time-block-time');
    let timeText = '';
    if (this.startTime && this.endTime) {
      try {
        timeText = `${formatTime12h(this.startTime)} – ${formatTime12h(this.endTime)}`;
      } catch {
        timeText = `${this.startTime} – ${this.endTime}`;
      }
    }
    timeEl.textContent = timeText;

    // Set location
    const locationEl = this.shadowRoot.querySelector('.time-block-location');
    locationEl.textContent = this.location;
  }
}

customElements.define('time-block-renderer', TimeBlockRenderer);
