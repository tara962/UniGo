import { formatTime12h, timeToMinutes } from '../utils/time.js';
import { BlockType } from '../models/constants.js';
import './time-block-renderer.js';

/**
 * Legend configuration matching TimeBlockRenderer color/icon scheme.
 */
const LEGEND_ITEMS = [
  { type: 'class', label: 'Class', color: '#dbeafe', borderColor: '#2563eb', icon: '\u{1F4DA}' },
  { type: 'transit', label: 'Transit', color: '#fef3c7', borderColor: '#d97706', icon: '\u{1F6B6}' },
  { type: 'meal', label: 'Meal', color: '#dcfce7', borderColor: '#16a34a', icon: '\u{1F37D}\u{FE0F}' },
  { type: 'activity', label: 'Activity', color: '#f3e8ff', borderColor: '#9333ea', icon: '\u{2B50}' }
];

/**
 * Default pixels per minute scale for time blocks.
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

    .schedule-container {
      min-width: 600px;
      width: 100%;
      padding: 1rem;
    }

    .schedule-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .schedule-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
    }

    /* Legend (Req 7.2) */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 14px;
    }

    .legend-swatch {
      width: 16px;
      height: 16px;
      border-radius: 3px;
      border-left: 3px solid var(--swatch-border);
      background-color: var(--swatch-bg);
    }

    .legend-icon {
      font-size: 14px;
    }

    .legend-label {
      color: #374151;
    }

    /* Timeline area */
    .timeline {
      position: relative;
      display: flex;
      gap: 0;
    }

    .time-axis {
      display: flex;
      flex-direction: column;
      width: 60px;
      flex-shrink: 0;
      padding-top: 4px;
    }

    .time-axis-label {
      font-size: 12px;
      color: #6b7280;
      text-align: right;
      padding-right: 8px;
      line-height: 1;
      position: absolute;
    }

    .blocks-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      border-left: 2px solid #e5e7eb;
      padding-left: 0.75rem;
    }

    /* Empty state (Req 7.5) */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      color: #6b7280;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .empty-state-message {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #374151;
    }

    .empty-state-prompt {
      font-size: 1rem;
      color: #6b7280;
    }

    /* Loading state */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 1rem;
      color: #6b7280;
    }

    /* Hidden utility */
    .hidden {
      display: none !important;
    }

    /* Responsive (Req 7.4) */
    @media (max-width: 767px) {
      .schedule-container {
        min-width: 100%;
        width: 100%;
        padding: 0.5rem;
      }

      .time-axis {
        width: 48px;
      }

      .time-axis-label {
        font-size: 11px;
      }

      .legend {
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
      }

      .legend-item {
        font-size: 14px;
      }
    }
  </style>

  <div class="schedule-container">
    <div class="schedule-header">
      <h2 class="schedule-title">Schedule</h2>
    </div>

    <!-- Legend (Req 7.2) -->
    <div class="legend" role="list" aria-label="Block type legend"></div>

    <!-- Loading state -->
    <div class="loading-state hidden" role="status" aria-live="polite">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p class="loading-text">Generating your optimized schedule...</p>
    </div>

    <!-- Empty state (Req 7.5) -->
    <div class="empty-state hidden" role="status">
      <div class="empty-state-icon" aria-hidden="true">\u{1F4C5}</div>
      <p class="empty-state-message">No schedule available</p>
      <p class="empty-state-prompt">Generate a schedule to see your optimized day here.</p>
    </div>

    <!-- Timeline with blocks (Req 7.1, 7.3) -->
    <div class="timeline hidden" role="list" aria-label="Daily schedule timeline">
      <div class="time-axis"></div>
      <div class="blocks-column"></div>
    </div>
  </div>
`;

/**
 * ScheduleView custom element.
 * Orchestrates the schedule display with a vertical time-blocked layout,
 * legend, loading state, empty state, and responsive design.
 *
 * Properties (set via JavaScript):
 *  - blocks: Array of { startTime, endTime, type, name, location }
 *  - loading: boolean
 *  - scale: number (pixels per minute, default 2)
 *
 * @element schedule-view
 */
export class ScheduleView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this._blocks = [];
    this._loading = false;
    this._scale = DEFAULT_SCALE;
  }

  connectedCallback() {
    this._renderLegend();
    this._updateView();
  }

  /**
   * Set the blocks to display. Blocks should be in chronological order.
   * Includes both class blocks and generated TimeBlocks (Req 7.3).
   * @param {Array<{startTime: string, endTime: string, type: string, name: string, location: string}>} blocks
   */
  set blocks(blocks) {
    this._blocks = Array.isArray(blocks) ? blocks : [];
    if (this.isConnected) {
      this._updateView();
    }
  }

  get blocks() {
    return this._blocks;
  }

  /**
   * Set loading state. Shows spinner during API calls.
   * @param {boolean} value
   */
  set loading(value) {
    this._loading = Boolean(value);
    if (this.isConnected) {
      this._updateView();
    }
  }

  get loading() {
    return this._loading;
  }

  /**
   * Set the pixels-per-minute scale for proportional block heights.
   * @param {number} value
   */
  set scale(value) {
    const parsed = parseFloat(value);
    this._scale = isNaN(parsed) || parsed <= 0 ? DEFAULT_SCALE : parsed;
    if (this.isConnected) {
      this._updateView();
    }
  }

  get scale() {
    return this._scale;
  }

  /** Render the legend section (Req 7.2). */
  _renderLegend() {
    const legendEl = this.shadowRoot.querySelector('.legend');
    legendEl.innerHTML = '';

    for (const item of LEGEND_ITEMS) {
      const legendItem = document.createElement('div');
      legendItem.className = 'legend-item';
      legendItem.setAttribute('role', 'listitem');

      legendItem.innerHTML = `
        <span class="legend-swatch" style="--swatch-bg: ${item.color}; --swatch-border: ${item.borderColor};" aria-hidden="true"></span>
        <span class="legend-icon" aria-hidden="true">${item.icon}</span>
        <span class="legend-label">${item.label}</span>
      `;

      legendEl.appendChild(legendItem);
    }
  }

  /** Update which view state is visible: loading, empty, or timeline. */
  _updateView() {
    const loadingEl = this.shadowRoot.querySelector('.loading-state');
    const emptyEl = this.shadowRoot.querySelector('.empty-state');
    const timelineEl = this.shadowRoot.querySelector('.timeline');

    // Hide all first
    loadingEl.classList.add('hidden');
    emptyEl.classList.add('hidden');
    timelineEl.classList.add('hidden');

    if (this._loading) {
      loadingEl.classList.remove('hidden');
    } else if (this._blocks.length === 0) {
      emptyEl.classList.remove('hidden');
    } else {
      timelineEl.classList.remove('hidden');
      this._renderTimeline();
    }
  }

  /** Render the timeline with time axis and blocks in chronological order (Req 7.3). */
  _renderTimeline() {
    const timeAxisEl = this.shadowRoot.querySelector('.time-axis');
    const blocksEl = this.shadowRoot.querySelector('.blocks-column');

    timeAxisEl.innerHTML = '';
    blocksEl.innerHTML = '';

    // Sort blocks chronologically by startTime (Req 7.3)
    const sorted = [...this._blocks].sort((a, b) => {
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    if (sorted.length === 0) return;

    // Calculate timeline range
    const firstStart = timeToMinutes(sorted[0].startTime);
    const lastEnd = timeToMinutes(sorted[sorted.length - 1].endTime);

    // Add time axis labels at hour boundaries
    const startHour = Math.floor(firstStart / 60);
    const endHour = Math.ceil(lastEnd / 60);

    for (let hour = startHour; hour <= endHour; hour++) {
      const minuteOffset = hour * 60 - firstStart;
      const topPx = minuteOffset * this._scale;

      const label = document.createElement('div');
      label.className = 'time-axis-label';
      label.style.top = `${topPx}px`;

      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      try {
        label.textContent = formatTime12h(timeStr);
      } catch {
        label.textContent = timeStr;
      }

      timeAxisEl.appendChild(label);
    }

    // Set timeline height
    const totalHeight = (lastEnd - firstStart) * this._scale;
    timeAxisEl.style.position = 'relative';
    timeAxisEl.style.height = `${totalHeight}px`;
    blocksEl.style.position = 'relative';
    blocksEl.style.height = `${totalHeight}px`;

    // Render each block as a time-block-renderer positioned absolutely
    for (const block of sorted) {
      const blockStart = timeToMinutes(block.startTime);
      const blockEnd = timeToMinutes(block.endTime);
      const topPx = (blockStart - firstStart) * this._scale;
      const heightPx = (blockEnd - blockStart) * this._scale;

      const renderer = document.createElement('time-block-renderer');
      renderer.setAttribute('start-time', block.startTime);
      renderer.setAttribute('end-time', block.endTime);
      renderer.setAttribute('block-type', block.type);
      renderer.setAttribute('block-name', block.name);
      renderer.setAttribute('location', block.location || '');
      renderer.setAttribute('scale', String(this._scale));

      renderer.style.position = 'absolute';
      renderer.style.top = `${topPx}px`;
      renderer.style.left = '0';
      renderer.style.right = '0';
      renderer.style.height = `${heightPx}px`;

      blocksEl.appendChild(renderer);
    }
  }
}

customElements.define('schedule-view', ScheduleView);
