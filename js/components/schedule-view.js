import { formatTime12h, timeToMinutes } from '../utils/time.js';
import { BlockType } from '../models/constants.js';
import { getRegenerationCount, incrementRegenerationCount, loadSchedule, loadClasses, loadPreferences, saveSchedule } from '../services/storageService.js';
import { generateSchedule } from '../services/apiClient.js';
import './time-block-renderer.js';
import './error-display.js';

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
 * Maximum regeneration attempts per day per gap (Req 10.3).
 */
const MAX_REGENERATIONS = 5;

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

    /* Regeneration controls (Req 10.1, 10.2, 10.3) */
    .regenerate-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .regenerate-count {
      font-size: 0.875rem;
      color: #6b7280;
      white-space: nowrap;
    }

    .btn-regenerate {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 1rem;
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: 1px solid #2563eb;
      background-color: #2563eb;
      color: #ffffff;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      transition: background-color 0.2s ease, opacity 0.2s ease, transform 0.1s ease;
    }

    .btn-regenerate:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    .btn-regenerate:active:not(:disabled) {
      transform: scale(0.97);
    }

    .btn-regenerate:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .btn-regenerate:disabled {
      background-color: #9ca3af;
      border-color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.7;
    }

    .btn-regenerate-icon {
      font-size: 1rem;
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
      transition: opacity 0.2s ease;
    }

    /* Block appearance animation for timeline children */
    .blocks-column time-block-renderer {
      animation: blockSlideIn 0.35s ease-out both;
    }

    .blocks-column time-block-renderer:nth-child(1) { animation-delay: 0.05s; }
    .blocks-column time-block-renderer:nth-child(2) { animation-delay: 0.1s; }
    .blocks-column time-block-renderer:nth-child(3) { animation-delay: 0.15s; }
    .blocks-column time-block-renderer:nth-child(4) { animation-delay: 0.2s; }
    .blocks-column time-block-renderer:nth-child(5) { animation-delay: 0.25s; }
    .blocks-column time-block-renderer:nth-child(6) { animation-delay: 0.3s; }
    .blocks-column time-block-renderer:nth-child(7) { animation-delay: 0.35s; }
    .blocks-column time-block-renderer:nth-child(8) { animation-delay: 0.4s; }

    @keyframes blockSlideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    /* Error display integration */
    error-display {
      display: block;
      margin-top: 0.5rem;
    }

    /* Generate Schedule button in empty state */
    .btn-generate {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 1rem;
      font-weight: 500;
      padding: 0.625rem 1.25rem;
      border-radius: 6px;
      border: 1px solid #2563eb;
      background-color: #2563eb;
      color: #ffffff;
      cursor: pointer;
      min-width: 44px;
      min-height: 44px;
      margin-top: 1rem;
      transition: background-color 0.2s ease, transform 0.1s ease;
    }

    .btn-generate:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    .btn-generate:active:not(:disabled) {
      transform: scale(0.97);
    }

    .btn-generate:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    .btn-generate:disabled {
      background-color: #9ca3af;
      border-color: #9ca3af;
      cursor: not-allowed;
      opacity: 0.7;
    }

    /* CSS Transitions for loading states and block animations */
    .loading-state,
    .empty-state,
    .timeline {
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
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

      .regenerate-controls {
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
      }
    }
  </style>

  <div class="schedule-container">
    <div class="schedule-header">
      <h2 class="schedule-title">Schedule</h2>
      <div class="regenerate-controls hidden">
        <span class="regenerate-count" aria-live="polite"></span>
        <button class="btn-regenerate" type="button" aria-label="Regenerate schedule">
          <span class="btn-regenerate-icon" aria-hidden="true">\u{1F504}</span>
          Regenerate
        </button>
      </div>
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
      <button class="btn-generate" type="button" aria-label="Generate Schedule">
        \u{2728} Generate Schedule
      </button>
    </div>

    <!-- Error display (Req 9.1, 9.2, 9.3, 9.5) -->
    <error-display hidden></error-display>

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
 * legend, loading state, empty state, regeneration controls, and responsive design.
 *
 * Properties (set via JavaScript):
 *  - blocks: Array of { startTime, endTime, type, name, location }
 *  - loading: boolean
 *  - scale: number (pixels per minute, default 2)
 *  - day: string (day of the week, e.g., 'monday')
 *  - classes: Array of class objects for the current day
 *  - preferences: UserPreferences object
 *  - gapIndex: number (index of the gap being displayed, default 0)
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
    this._day = 'monday';
    this._classes = [];
    this._preferences = null;
    this._gapIndex = 0;
    this._regenerationSeed = 1;
    this._blocksExplicitlySet = false;

    // Bind handlers
    this._onRegenerateClick = this._onRegenerateClick.bind(this);
    this._onGenerateClick = this._onGenerateClick.bind(this);
    this._onErrorRetry = this._onErrorRetry.bind(this);
    this._onErrorDismiss = this._onErrorDismiss.bind(this);
  }

  static get observedAttributes() {
    return ['day'];
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === 'day' && newVal && newVal !== oldVal) {
      this._day = newVal;
      // When day is changed via attribute (from app-shell), always load from storage
      this._blocksExplicitlySet = false;
      this._loadScheduleForDay(newVal);
    }
  }

  connectedCallback() {
    this._renderLegend();
    // Only load from localStorage if blocks weren't explicitly set via property
    if (!this._blocksExplicitlySet) {
      this._loadScheduleForDay(this._day);
    }
    this._updateView();
    this._attachRegenerateListener();
    this._attachGenerateListener();
    this._attachErrorListeners();
  }

  disconnectedCallback() {
    this._detachRegenerateListener();
    this._detachGenerateListener();
    this._detachErrorListeners();
  }

  /**
   * Set the blocks to display. Blocks should be in chronological order.
   * Includes both class blocks and generated TimeBlocks (Req 7.3).
   * @param {Array<{startTime: string, endTime: string, type: string, name: string, location: string}>} blocks
   */
  set blocks(blocks) {
    this._blocks = Array.isArray(blocks) ? blocks : [];
    this._blocksExplicitlySet = true;
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

  /**
   * Set the current day for regeneration tracking.
   * Also loads the stored schedule for that day from localStorage
   * (unless blocks have been explicitly set via the blocks property).
   * @param {string} value
   */
  set day(value) {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    if (validDays.includes(value)) {
      this._day = value;
      if (this.isConnected) {
        if (!this._blocksExplicitlySet) {
          this._loadScheduleForDay(value);
        }
        this._updateRegenerateControls();
      }
    }
  }

  get day() {
    return this._day;
  }

  /**
   * Set classes for the current day (needed for regeneration API call).
   * @param {Array} value
   */
  set classes(value) {
    this._classes = Array.isArray(value) ? value : [];
  }

  get classes() {
    return this._classes;
  }

  /**
   * Set user preferences (needed for regeneration API call).
   * @param {object|null} value
   */
  set preferences(value) {
    this._preferences = value || null;
  }

  get preferences() {
    return this._preferences;
  }

  /**
   * Set the gap index for regeneration tracking.
   * @param {number} value
   */
  set gapIndex(value) {
    const parsed = parseInt(value, 10);
    this._gapIndex = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    if (this.isConnected) {
      this._updateRegenerateControls();
    }
  }

  get gapIndex() {
    return this._gapIndex;
  }

  /** Attach click listener to the regenerate button. */
  _attachRegenerateListener() {
    const btn = this.shadowRoot.querySelector('.btn-regenerate');
    if (btn) {
      btn.addEventListener('click', this._onRegenerateClick);
    }
  }

  /** Detach click listener from the regenerate button. */
  _detachRegenerateListener() {
    const btn = this.shadowRoot.querySelector('.btn-regenerate');
    if (btn) {
      btn.removeEventListener('click', this._onRegenerateClick);
    }
  }

  /** Attach click listener to the generate button. */
  _attachGenerateListener() {
    const btn = this.shadowRoot.querySelector('.btn-generate');
    if (btn) {
      btn.addEventListener('click', this._onGenerateClick);
    }
  }

  /** Detach click listener from the generate button. */
  _detachGenerateListener() {
    const btn = this.shadowRoot.querySelector('.btn-generate');
    if (btn) {
      btn.removeEventListener('click', this._onGenerateClick);
    }
  }

  /** Attach error display event listeners. */
  _attachErrorListeners() {
    const errorEl = this.shadowRoot.querySelector('error-display');
    if (errorEl) {
      errorEl.addEventListener('error-retry', this._onErrorRetry);
      errorEl.addEventListener('error-dismiss', this._onErrorDismiss);
    }
  }

  /** Detach error display event listeners. */
  _detachErrorListeners() {
    const errorEl = this.shadowRoot.querySelector('error-display');
    if (errorEl) {
      errorEl.removeEventListener('error-retry', this._onErrorRetry);
      errorEl.removeEventListener('error-dismiss', this._onErrorDismiss);
    }
  }

  /**
   * Load the schedule for the given day from localStorage.
   * Also loads classes and preferences for the current day.
   * @param {string} day
   */
  _loadScheduleForDay(day) {
    // Load classes for this day from storage
    try {
      const allClasses = loadClasses();
      this._classes = allClasses.filter(c => c.day === day);
    } catch {
      this._classes = [];
    }

    // Load preferences from storage
    try {
      this._preferences = loadPreferences();
    } catch {
      this._preferences = null;
    }

    // Load schedule from localStorage
    try {
      const schedule = loadSchedule(day);
      if (schedule && schedule.timeBlocks && schedule.timeBlocks.length > 0) {
        // Combine class blocks with generated time blocks
        const classBlocks = this._classes.map(c => ({
          startTime: c.startTime,
          endTime: c.endTime,
          type: 'class',
          name: c.name,
          location: c.location
        }));
        const generatedBlocks = schedule.timeBlocks.map(tb => ({
          startTime: tb.startTime,
          endTime: tb.endTime,
          type: tb.type,
          name: tb.name,
          location: tb.location
        }));
        this._blocks = [...classBlocks, ...generatedBlocks];
      } else {
        // Show class blocks even if no generated schedule
        if (this._classes.length > 0) {
          this._blocks = this._classes.map(c => ({
            startTime: c.startTime,
            endTime: c.endTime,
            type: 'class',
            name: c.name,
            location: c.location
          }));
        } else {
          this._blocks = [];
        }
      }
    } catch {
      this._blocks = [];
    }

    if (this.isConnected) {
      this._updateView();
    }

    // Dispatch day-change event for other components (Req 7.1)
    this.dispatchEvent(new CustomEvent('day-change', {
      bubbles: true,
      composed: true,
      detail: { day }
    }));
  }

  /**
   * Handle Generate Schedule button click.
   * Sends the current day's classes and preferences to the API.
   */
  async _onGenerateClick() {
    // Load classes and preferences from storage for the current day
    try {
      const allClasses = loadClasses();
      this._classes = allClasses.filter(c => c.day === this._day);
    } catch {
      this._classes = [];
    }

    try {
      this._preferences = loadPreferences();
    } catch {
      this._preferences = null;
    }

    // Validate: need at least classes and preferences (Req 2.5)
    if (!this._preferences || !this._preferences.activities || this._preferences.activities.length === 0) {
      const errorEl = this.shadowRoot.querySelector('error-display');
      if (errorEl) {
        errorEl.error = {
          code: 'VALIDATION_ERROR',
          message: 'Please set at least one activity preference before generating a schedule.'
        };
      }
      return;
    }

    if (this._classes.length === 0) {
      const errorEl = this.shadowRoot.querySelector('error-display');
      if (errorEl) {
        errorEl.error = {
          code: 'VALIDATION_ERROR',
          message: 'Please add classes for this day before generating a schedule.'
        };
      }
      return;
    }

    // Show loading state
    this.loading = true;

    // Hide error display
    const errorEl = this.shadowRoot.querySelector('error-display');
    if (errorEl) {
      errorEl.error = null;
    }

    try {
      const result = await generateSchedule({
        day: this._day,
        classes: this._classes,
        preferences: this._preferences,
        seed: this._regenerationSeed
      });

      if (result.success) {
        // Save schedule to localStorage
        const schedule = {
          day: this._day,
          timeBlocks: result.timeBlocks.map(tb => ({
            startTime: tb.startTime,
            endTime: tb.endTime,
            type: tb.type,
            name: tb.name,
            location: tb.location
          })),
          generatedAt: new Date().toISOString(),
          seed: this._regenerationSeed
        };
        saveSchedule(this._day, schedule);

        // Build blocks combining classes + generated
        const classBlocks = this._classes.map(c => ({
          startTime: c.startTime,
          endTime: c.endTime,
          type: 'class',
          name: c.name,
          location: c.location
        }));
        const generatedBlocks = schedule.timeBlocks;
        this._blocks = [...classBlocks, ...generatedBlocks];

        this._loading = false;
        this._updateView();

        // Dispatch event to notify parent
        this.dispatchEvent(new CustomEvent('schedule-generated', {
          bubbles: true,
          composed: true,
          detail: { day: this._day, schedule }
        }));
      } else {
        this._loading = false;
        this._updateView();

        // Show error in error-display component (Req 9.1, 9.5)
        if (errorEl) {
          errorEl.error = result.error;
        }
      }
    } catch (err) {
      this._loading = false;
      this._updateView();

      if (errorEl) {
        errorEl.error = {
          code: 'NETWORK_ERROR',
          message: err.message || 'Failed to generate schedule'
        };
      }
    }
  }

  /**
   * Handle error retry - re-trigger generate schedule.
   */
  _onErrorRetry() {
    this._onGenerateClick();
  }

  /**
   * Handle error dismiss - hide error and return to pre-request state (Req 9.4).
   */
  _onErrorDismiss() {
    const errorEl = this.shadowRoot.querySelector('error-display');
    if (errorEl) {
      errorEl.error = null;
    }
  }

  /**
   * Handle regenerate button click (Req 10.1, 10.2, 10.3).
   * Increments regeneration seed, calls API, replaces schedule.
   */
  async _onRegenerateClick() {
    const count = getRegenerationCount(this._day, this._gapIndex);
    if (count >= MAX_REGENERATIONS) {
      return; // Limit reached, button should already be disabled
    }

    // Increment seed for new randomization (Req 10.1)
    this._regenerationSeed++;

    // Show loading state
    this.loading = true;

    try {
      const result = await generateSchedule({
        day: this._day,
        classes: this._classes,
        preferences: this._preferences,
        seed: this._regenerationSeed
      });

      if (result.success) {
        // Increment regeneration count in storage (Req 10.3)
        incrementRegenerationCount(this._day, this._gapIndex);

        // Replace displayed schedule with new one (Req 10.2)
        // Convert TimeBlock instances to plain objects for rendering
        const newBlocks = result.timeBlocks.map(tb => ({
          startTime: tb.startTime,
          endTime: tb.endTime,
          type: tb.type,
          name: tb.name,
          location: tb.location
        }));

        // Merge class blocks with new generated blocks
        const classBlocks = this._blocks.filter(b => b.type === 'class');
        this._blocks = [...classBlocks, ...newBlocks];

        this._loading = false;
        this._updateView();

        // Dispatch event to notify parent of schedule change
        this.dispatchEvent(new CustomEvent('schedule-regenerated', {
          bubbles: true,
          composed: true,
          detail: {
            day: this._day,
            timeBlocks: result.timeBlocks,
            seed: this._regenerationSeed
          }
        }));
      } else {
        this._loading = false;
        this._updateView();

        // Dispatch error event for error display handling
        this.dispatchEvent(new CustomEvent('regeneration-error', {
          bubbles: true,
          composed: true,
          detail: {
            error: result.error
          }
        }));
      }
    } catch (err) {
      this._loading = false;
      this._updateView();

      this.dispatchEvent(new CustomEvent('regeneration-error', {
        bubbles: true,
        composed: true,
        detail: {
          error: {
            code: 'NETWORK_ERROR',
            message: err.message || 'Regeneration failed'
          }
        }
      }));
    }
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

    this._updateRegenerateControls();
  }

  /** Update the regenerate button and count indicator visibility/state. */
  _updateRegenerateControls() {
    const controlsEl = this.shadowRoot.querySelector('.regenerate-controls');
    const countEl = this.shadowRoot.querySelector('.regenerate-count');
    const btn = this.shadowRoot.querySelector('.btn-regenerate');

    if (!controlsEl || !countEl || !btn) return;

    // Show controls only when a schedule is displayed (blocks present and not loading)
    if (this._blocks.length > 0 && !this._loading) {
      controlsEl.classList.remove('hidden');

      const count = getRegenerationCount(this._day, this._gapIndex);
      const remaining = MAX_REGENERATIONS - count;

      // Update count indicator (Req 10.3)
      countEl.textContent = `${count}/${MAX_REGENERATIONS} regenerations used`;

      // Disable button when limit reached
      if (count >= MAX_REGENERATIONS) {
        btn.disabled = true;
        btn.setAttribute('aria-label', 'Regeneration limit reached');
      } else {
        btn.disabled = false;
        btn.setAttribute('aria-label', `Regenerate schedule (${remaining} remaining)`);
      }
    } else {
      controlsEl.classList.add('hidden');
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
