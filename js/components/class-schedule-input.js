import { DayOfWeek } from '../models/constants.js';
import { validateClassInput } from '../validators/classValidator.js';
import { detectOverlaps, validateClassLimit } from '../validators/overlapDetector.js';
import { saveClasses, loadClasses } from '../services/storageService.js';

/**
 * Generates time options in 5-minute increments from 06:00 to 23:00.
 * @returns {string[]} Array of time strings in HH:mm format
 */
function generateTimeOptions() {
  const options = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 5) {
      if (h === 23 && m > 0) break;
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      options.push(`${hh}:${mm}`);
    }
  }
  return options;
}

/**
 * Formats a day value to display label (e.g., 'monday' -> 'Monday').
 * @param {string} day
 * @returns {string}
 */
function formatDayLabel(day) {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * Formats a time string from HH:mm to 12-hour display.
 * @param {string} timeStr - Time in "HH:mm" format
 * @returns {string}
 */
function formatTime12h(timeStr) {
  const [hStr, mStr] = timeStr.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = mStr;
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes} ${period}`;
}

const MAX_CLASSES = 30;

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

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 1rem;
    }

    h2 {
      margin: 0 0 1rem;
      font-size: 1.25rem;
    }

    .form-group {
      margin-bottom: 0.75rem;
    }

    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
      font-size: 16px;
    }

    input[type="text"],
    select {
      width: 100%;
      min-height: 44px;
      padding: 0.5rem 0.75rem;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 6px;
      background: #fff;
    }

    input[type="text"]:focus,
    select:focus {
      outline: 2px solid #2563eb;
      outline-offset: 1px;
      border-color: #2563eb;
    }

    .time-row {
      display: flex;
      gap: 0.75rem;
    }

    .time-row .form-group {
      flex: 1;
    }

    .btn {
      min-width: 44px;
      min-height: 44px;
      padding: 0.625rem 1.25rem;
      font-size: 16px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .btn-primary {
      background-color: #2563eb;
      color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    .btn-primary:disabled {
      background-color: #93c5fd;
      cursor: not-allowed;
    }

    .btn-remove {
      background-color: #fee2e2;
      color: #dc2626;
      min-width: 44px;
      min-height: 44px;
      padding: 0.5rem;
      font-size: 14px;
      border: 1px solid #fca5a5;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-remove:hover {
      background-color: #fecaca;
    }

    .max-message {
      color: #dc2626;
      font-size: 14px;
      margin-top: 0.5rem;
      padding: 0.5rem;
      background-color: #fef2f2;
      border-radius: 4px;
    }

    .class-list {
      margin-top: 1.5rem;
    }

    .class-list h3 {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
    }

    .day-group {
      margin-bottom: 1rem;
    }

    .day-group-title {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 0.5rem;
      padding-bottom: 0.25rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .class-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.625rem 0.75rem;
      margin-bottom: 0.375rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    }

    .class-info {
      flex: 1;
      min-width: 0;
    }

    .class-name {
      font-weight: 500;
    }

    .class-details {
      font-size: 14px;
      color: #6b7280;
      margin-top: 0.125rem;
    }

    .empty-message {
      color: #6b7280;
      font-style: italic;
      padding: 1rem 0;
    }

    .error-messages {
      color: #dc2626;
      font-size: 14px;
      margin-bottom: 0.75rem;
      padding: 0.5rem 0.75rem;
      background-color: #fef2f2;
      border: 1px solid #fca5a5;
      border-radius: 6px;
    }

    .error-messages[hidden] {
      display: none;
    }

    .error-messages ul {
      margin: 0;
      padding: 0 0 0 1.25rem;
      list-style: disc;
    }

    .error-messages li {
      margin-bottom: 0.25rem;
    }

    .error-messages li:last-child {
      margin-bottom: 0;
    }
  </style>

  <div class="container">
    <h2>Class Schedule</h2>

    <form id="class-form" novalidate>
      <div class="form-group">
        <label for="class-name">Class Name</label>
        <input type="text" id="class-name" placeholder="e.g., Calculus 101" maxlength="100" required>
      </div>

      <div class="form-group">
        <label for="class-day">Day</label>
        <select id="class-day" required></select>
      </div>

      <div class="time-row">
        <div class="form-group">
          <label for="class-start">Start Time</label>
          <select id="class-start" required></select>
        </div>
        <div class="form-group">
          <label for="class-end">End Time</label>
          <select id="class-end" required></select>
        </div>
      </div>

      <div class="form-group">
        <label for="class-location">Location</label>
        <input type="text" id="class-location" placeholder="e.g., Math Building Room 201" required>
      </div>

      <div class="error-messages" id="form-errors" hidden aria-live="assertive" role="alert"></div>

      <div class="form-group">
        <button type="submit" class="btn btn-primary" id="add-btn">Add Class</button>
      </div>

      <div class="max-message" id="max-message" hidden>
        Maximum of ${MAX_CLASSES} classes reached. Remove a class to add more.
      </div>
    </form>

    <div class="class-list" id="class-list">
      <h3>Added Classes</h3>
      <div id="class-list-content"></div>
    </div>
  </div>
`;

/**
 * ClassScheduleInput custom element.
 * Renders a form for adding university classes and displays them grouped by day.
 */
export class ClassScheduleInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    /** @type {Array<{id: string, name: string, day: string, startTime: string, endTime: string, location: string}>} */
    this._classes = [];
  }

  connectedCallback() {
    this._populateDaySelect();
    this._populateTimeSelects();
    this._bindEvents();
    this._loadPersistedClasses();
    this._render();
  }

  /** Load classes from localStorage on startup. */
  _loadPersistedClasses() {
    try {
      const stored = loadClasses();
      if (Array.isArray(stored) && stored.length > 0) {
        this._classes = stored;
      }
    } catch {
      // If loading fails, keep empty array
    }
  }

  /**
   * Gets the current list of classes.
   * @returns {Array<{id: string, name: string, day: string, startTime: string, endTime: string, location: string}>}
   */
  get classes() {
    return [...this._classes];
  }

  /**
   * Sets the classes array (e.g., when restoring from storage).
   * @param {Array<{id: string, name: string, day: string, startTime: string, endTime: string, location: string}>} value
   */
  set classes(value) {
    this._classes = Array.isArray(value) ? [...value] : [];
    this._render();
  }

  /** Populate the day select dropdown. */
  _populateDaySelect() {
    const select = this.shadowRoot.getElementById('class-day');
    DayOfWeek.forEach(day => {
      const option = document.createElement('option');
      option.value = day;
      option.textContent = formatDayLabel(day);
      select.appendChild(option);
    });
  }

  /** Populate start and end time select dropdowns. */
  _populateTimeSelects() {
    const timeOptions = generateTimeOptions();
    const startSelect = this.shadowRoot.getElementById('class-start');
    const endSelect = this.shadowRoot.getElementById('class-end');

    timeOptions.forEach(time => {
      const optStart = document.createElement('option');
      optStart.value = time;
      optStart.textContent = formatTime12h(time);
      startSelect.appendChild(optStart);

      const optEnd = document.createElement('option');
      optEnd.value = time;
      optEnd.textContent = formatTime12h(time);
      endSelect.appendChild(optEnd);
    });

    // Default end time to one hour after start
    if (timeOptions.length > 12) {
      endSelect.selectedIndex = 12; // 07:00 (1 hour after 06:00 default)
    }
  }

  /** Bind event listeners. */
  _bindEvents() {
    const form = this.shadowRoot.getElementById('class-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleAdd();
    });
  }

  /** Handle adding a new class from form data. */
  _handleAdd() {
    this._clearErrors();

    if (this._classes.length >= MAX_CLASSES) return;

    const name = this.shadowRoot.getElementById('class-name').value.trim();
    const day = this.shadowRoot.getElementById('class-day').value;
    const startTime = this.shadowRoot.getElementById('class-start').value;
    const endTime = this.shadowRoot.getElementById('class-end').value;
    const location = this.shadowRoot.getElementById('class-location').value.trim();

    // Run field validation
    const validation = validateClassInput({ name, day, startTime, endTime, location });
    if (!validation.valid) {
      this._showErrors(validation.errors.map(e => e.message));
      return;
    }

    // Check class limit
    const limitCheck = validateClassLimit(this._classes);
    if (!limitCheck.valid) {
      this._showErrors([limitCheck.error]);
      return;
    }

    const newClass = {
      id: crypto.randomUUID(),
      name,
      day,
      startTime,
      endTime,
      location
    };

    // Check for overlaps with existing classes
    const overlapResult = detectOverlaps(newClass, this._classes);
    if (overlapResult.hasOverlap) {
      this._showErrors(overlapResult.conflicts.map(c => c.message));
      return;
    }

    this._classes.push(newClass);
    this._resetForm();
    this._render();
    saveClasses(this._classes);

    this.dispatchEvent(new CustomEvent('class-added', {
      bubbles: true,
      composed: true,
      detail: { class: newClass }
    }));
  }

  /**
   * Remove a class by id.
   * @param {string} id
   */
  _removeClass(id) {
    const removed = this._classes.find(c => c.id === id);
    if (!removed) return;

    this._classes = this._classes.filter(c => c.id !== id);
    this._render();
    saveClasses(this._classes);

    this.dispatchEvent(new CustomEvent('class-removed', {
      bubbles: true,
      composed: true,
      detail: { class: removed }
    }));
  }

  /** Reset the form fields after adding a class. */
  _resetForm() {
    this.shadowRoot.getElementById('class-name').value = '';
    this.shadowRoot.getElementById('class-location').value = '';
    this.shadowRoot.getElementById('class-day').selectedIndex = 0;
    this.shadowRoot.getElementById('class-start').selectedIndex = 0;
    this.shadowRoot.getElementById('class-end').selectedIndex = 12;
  }

  /** Re-render the class list and max message state. */
  _render() {
    const atMax = this._classes.length >= MAX_CLASSES;
    const addBtn = this.shadowRoot.getElementById('add-btn');
    const maxMsg = this.shadowRoot.getElementById('max-message');

    addBtn.disabled = atMax;
    maxMsg.hidden = !atMax;

    this._renderClassList();
  }

  /** Render the class list grouped by day. */
  _renderClassList() {
    const container = this.shadowRoot.getElementById('class-list-content');

    if (this._classes.length === 0) {
      container.innerHTML = '<p class="empty-message">No classes added yet.</p>';
      return;
    }

    // Group classes by day
    const grouped = {};
    DayOfWeek.forEach(day => {
      const dayClasses = this._classes.filter(c => c.day === day);
      if (dayClasses.length > 0) {
        grouped[day] = dayClasses;
      }
    });

    let html = '';
    for (const day of Object.keys(grouped)) {
      html += `<div class="day-group">`;
      html += `<div class="day-group-title">${formatDayLabel(day)}</div>`;
      for (const cls of grouped[day]) {
        html += `
          <div class="class-item">
            <div class="class-info">
              <div class="class-name">${this._escapeHtml(cls.name)}</div>
              <div class="class-details">${formatTime12h(cls.startTime)} – ${formatTime12h(cls.endTime)} · ${this._escapeHtml(cls.location)}</div>
            </div>
            <button class="btn-remove" data-id="${cls.id}" aria-label="Remove ${this._escapeHtml(cls.name)}">Remove</button>
          </div>
        `;
      }
      html += `</div>`;
    }

    container.innerHTML = html;

    // Bind remove buttons
    container.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this._removeClass(btn.dataset.id);
      });
    });
  }

  /**
   * Display error messages in the error container.
   * @param {string[]} messages
   */
  _showErrors(messages) {
    const container = this.shadowRoot.getElementById('form-errors');
    if (messages.length === 1) {
      container.textContent = messages[0];
    } else {
      container.innerHTML = '<ul>' + messages.map(m => `<li>${this._escapeHtml(m)}</li>`).join('') + '</ul>';
    }
    container.hidden = false;
  }

  /** Clear all displayed error messages. */
  _clearErrors() {
    const container = this.shadowRoot.getElementById('form-errors');
    container.textContent = '';
    container.hidden = true;
  }

  /**
   * Escape HTML to prevent XSS in rendered content.
   * @param {string} str
   * @returns {string}
   */
  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

customElements.define('class-schedule-input', ClassScheduleInput);
