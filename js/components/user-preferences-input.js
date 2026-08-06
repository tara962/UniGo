import { ActivityCategory, DietaryRestriction, MealType } from '../models/constants.js';
import { UserPreferences } from '../models/UserPreferences.js';
import { savePreferences, loadPreferences } from '../services/storageService.js';

/**
 * UserPreferencesInput custom element.
 * Renders activity ranking, dietary restrictions, and meal type preferences.
 * Dispatches 'preferences-saved' event on save.
 */
export class UserPreferencesInput extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    /** @type {string[]} Selected activities in ranked order */
    this._rankedActivities = [];
    /** @type {string[]} Selected dietary restrictions */
    this._dietaryRestrictions = [];
    /** @type {string[]} Selected meal types */
    this._mealPreferences = [];
    this._confirmationTimeout = null;
  }

  connectedCallback() {
    const saved = loadPreferences();
    if (saved) {
      if (saved.activities && saved.activities.length > 0) {
        this._rankedActivities = [...saved.activities];
      }
      if (saved.dietaryRestrictions && saved.dietaryRestrictions.length > 0) {
        this._dietaryRestrictions = [...saved.dietaryRestrictions];
      }
      if (saved.mealPreferences && saved.mealPreferences.length > 0) {
        this._mealPreferences = [...saved.mealPreferences];
      }
    }
    this._render();
    this._attachEventListeners();
  }

  disconnectedCallback() {
    if (this._confirmationTimeout) {
      clearTimeout(this._confirmationTimeout);
    }
  }

  /**
   * Returns a UserPreferences-compatible object.
   */
  get preferences() {
    return {
      activities: [...this._rankedActivities],
      dietaryRestrictions: [...this._dietaryRestrictions],
      mealPreferences: [...this._mealPreferences]
    };
  }

  /**
   * Set preferences programmatically (e.g., restoring from storage).
   * @param {{ activities?: string[], dietaryRestrictions?: string[], mealPreferences?: string[] }} prefs
   */
  set preferences(prefs) {
    if (prefs.activities) {
      this._rankedActivities = [...prefs.activities];
    }
    if (prefs.dietaryRestrictions) {
      this._dietaryRestrictions = [...prefs.dietaryRestrictions];
    }
    if (prefs.mealPreferences) {
      this._mealPreferences = [...prefs.mealPreferences];
    }
    this._render();
    this._attachEventListeners();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>${UserPreferencesInput._styles()}</style>
      <div class="preferences-container">
        <h2>User Preferences</h2>

        <!-- Activity Preferences Section -->
        <fieldset class="section">
          <legend>Activity Preferences</legend>
          <p class="hint">Select activities and use arrows to rank them (top = highest priority).</p>
          <div class="activity-checkboxes">
            ${ActivityCategory.map(cat => `
              <label class="checkbox-label">
                <input type="checkbox" name="activity" value="${cat}"
                  ${this._rankedActivities.includes(cat) ? 'checked' : ''}>
                <span class="checkbox-text">${this._capitalize(cat)}</span>
              </label>
            `).join('')}
          </div>
          <div class="ranked-list" aria-label="Ranked activities" role="list">
            ${this._rankedActivities.map((act, idx) => `
              <div class="ranked-item" role="listitem" data-activity="${act}">
                <span class="rank-number">${idx + 1}.</span>
                <span class="rank-label">${this._capitalize(act)}</span>
                <div class="rank-buttons">
                  <button type="button" class="rank-btn move-up" data-index="${idx}"
                    aria-label="Move ${act} up" ${idx === 0 ? 'disabled' : ''}>&#9650;</button>
                  <button type="button" class="rank-btn move-down" data-index="${idx}"
                    aria-label="Move ${act} down" ${idx === this._rankedActivities.length - 1 ? 'disabled' : ''}>&#9660;</button>
                </div>
              </div>
            `).join('')}
          </div>
        </fieldset>

        <!-- Dietary Restrictions Section -->
        <fieldset class="section">
          <legend>Dietary Restrictions</legend>
          <div class="dietary-checkboxes">
            ${DietaryRestriction.map(restriction => `
              <label class="checkbox-label">
                <input type="checkbox" name="dietary" value="${restriction}"
                  ${this._dietaryRestrictions.includes(restriction) ? 'checked' : ''}>
                <span class="checkbox-text">${this._capitalize(restriction)}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>

        <!-- Meal Type Preferences Section -->
        <fieldset class="section">
          <legend>Meal Type Preferences</legend>
          <div class="meal-checkboxes">
            ${MealType.map(meal => `
              <label class="checkbox-label">
                <input type="checkbox" name="meal" value="${meal}"
                  ${this._mealPreferences.includes(meal) ? 'checked' : ''}>
                <span class="checkbox-text">${this._capitalize(meal)}</span>
              </label>
            `).join('')}
          </div>
        </fieldset>

        <!-- Save Button -->
        <button type="button" class="save-btn" aria-label="Save preferences">Save Preferences</button>

        <!-- Validation Warning -->
        <div class="validation-warning" role="alert" aria-live="assertive" hidden>
          Please select at least one activity preference
        </div>

        <!-- Confirmation Message -->
        <div class="confirmation" role="status" aria-live="polite" hidden>
          Preferences saved!
        </div>
      </div>
    `;
  }

  _attachEventListeners() {
    const shadow = this.shadowRoot;

    // Activity checkboxes
    shadow.querySelectorAll('input[name="activity"]').forEach(cb => {
      cb.addEventListener('change', (e) => this._handleActivityToggle(e));
    });

    // Dietary restriction checkboxes
    shadow.querySelectorAll('input[name="dietary"]').forEach(cb => {
      cb.addEventListener('change', (e) => this._handleDietaryChange(e));
    });

    // Meal type checkboxes
    shadow.querySelectorAll('input[name="meal"]').forEach(cb => {
      cb.addEventListener('change', (e) => this._handleMealChange(e));
    });

    // Rank up/down buttons
    shadow.querySelectorAll('.move-up').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleMoveUp(e));
    });
    shadow.querySelectorAll('.move-down').forEach(btn => {
      btn.addEventListener('click', (e) => this._handleMoveDown(e));
    });

    // Save button
    const saveBtn = shadow.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this._handleSave());
    }
  }

  _handleActivityToggle(e) {
    const value = e.target.value;
    if (e.target.checked) {
      if (!this._rankedActivities.includes(value)) {
        this._rankedActivities.push(value);
      }
    } else {
      this._rankedActivities = this._rankedActivities.filter(a => a !== value);
    }
    this._render();
    this._attachEventListeners();
  }

  _handleDietaryChange(e) {
    const value = e.target.value;
    if (value === 'none' && e.target.checked) {
      // "none" deselects all others
      this._dietaryRestrictions = ['none'];
    } else if (e.target.checked) {
      // Remove "none" if selecting a specific restriction
      this._dietaryRestrictions = this._dietaryRestrictions.filter(d => d !== 'none');
      if (!this._dietaryRestrictions.includes(value)) {
        this._dietaryRestrictions.push(value);
      }
    } else {
      this._dietaryRestrictions = this._dietaryRestrictions.filter(d => d !== value);
    }
    this._render();
    this._attachEventListeners();
  }

  _handleMealChange(e) {
    const value = e.target.value;
    if (e.target.checked) {
      if (!this._mealPreferences.includes(value)) {
        this._mealPreferences.push(value);
      }
    } else {
      this._mealPreferences = this._mealPreferences.filter(m => m !== value);
    }
  }

  _handleMoveUp(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    if (idx > 0) {
      [this._rankedActivities[idx - 1], this._rankedActivities[idx]] =
        [this._rankedActivities[idx], this._rankedActivities[idx - 1]];
      this._render();
      this._attachEventListeners();
    }
  }

  _handleMoveDown(e) {
    const idx = parseInt(e.currentTarget.dataset.index, 10);
    if (idx < this._rankedActivities.length - 1) {
      [this._rankedActivities[idx], this._rankedActivities[idx + 1]] =
        [this._rankedActivities[idx + 1], this._rankedActivities[idx]];
      this._render();
      this._attachEventListeners();
    }
  }

  _handleSave() {
    // Persist to localStorage
    const prefsInstance = new UserPreferences({
      activities: [...this._rankedActivities],
      dietaryRestrictions: [...this._dietaryRestrictions],
      mealPreferences: [...this._mealPreferences]
    });
    savePreferences(prefsInstance);

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('preferences-saved', {
      bubbles: true,
      composed: true,
      detail: this.preferences
    }));

    // Hide validation warning if visible
    const warning = this.shadowRoot.querySelector('.validation-warning');
    if (warning) {
      warning.hidden = true;
    }

    // Show confirmation message
    const confirmation = this.shadowRoot.querySelector('.confirmation');
    if (confirmation) {
      confirmation.hidden = false;
      if (this._confirmationTimeout) {
        clearTimeout(this._confirmationTimeout);
      }
      this._confirmationTimeout = setTimeout(() => {
        confirmation.hidden = true;
      }, 3000);
    }
  }

  /**
   * Validates that preferences are sufficient for schedule generation.
   * Shows a visual warning if validation fails.
   * @returns {{ valid: boolean, error?: string }}
   */
  validateForGeneration() {
    if (this._rankedActivities.length === 0) {
      const warning = this.shadowRoot.querySelector('.validation-warning');
      if (warning) {
        warning.hidden = false;
      }
      return { valid: false, error: 'Please select at least one activity preference' };
    }
    const warning = this.shadowRoot.querySelector('.validation-warning');
    if (warning) {
      warning.hidden = true;
    }
    return { valid: true };
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static _styles() {
    return `
      :host {
        display: block;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 16px;
        line-height: 1.5;
        color: #1a1a2e;
      }

      .preferences-container {
        max-width: 600px;
        margin: 0 auto;
        padding: 1rem;
      }

      h2 {
        margin: 0 0 1rem;
        font-size: 1.5rem;
        color: #1a1a2e;
      }

      .section {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
      }

      .section legend {
        font-weight: 600;
        font-size: 1.1rem;
        padding: 0 0.5rem;
      }

      .hint {
        margin: 0 0 0.75rem;
        font-size: 0.875rem;
        color: #555;
      }

      .activity-checkboxes,
      .dietary-checkboxes,
      .meal-checkboxes {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        min-height: 44px;
        min-width: 44px;
        padding: 0.5rem 0.75rem;
        border: 1px solid #ccc;
        border-radius: 6px;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.2s, border-color 0.2s;
      }

      .checkbox-label:hover {
        background-color: #f0f4ff;
        border-color: #4a6cf7;
      }

      .checkbox-label input[type="checkbox"] {
        width: 20px;
        height: 20px;
        margin-right: 0.5rem;
        cursor: pointer;
      }

      .checkbox-text {
        font-size: 1rem;
      }

      .ranked-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .ranked-item {
        display: flex;
        align-items: center;
        padding: 0.5rem 0.75rem;
        background: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        min-height: 44px;
      }

      .rank-number {
        font-weight: 600;
        margin-right: 0.5rem;
        min-width: 1.5rem;
      }

      .rank-label {
        flex: 1;
        font-size: 1rem;
      }

      .rank-buttons {
        display: flex;
        gap: 0.25rem;
      }

      .rank-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-size: 1rem;
        transition: background-color 0.2s, border-color 0.2s;
      }

      .rank-btn:hover:not(:disabled) {
        background-color: #e8ecff;
        border-color: #4a6cf7;
      }

      .rank-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .save-btn {
        display: block;
        width: 100%;
        min-height: 44px;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: #fff;
        background-color: #4a6cf7;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .save-btn:hover {
        background-color: #3a5ce5;
      }

      .save-btn:active {
        background-color: #2e4fd4;
      }

      .confirmation {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
        border-radius: 6px;
        font-weight: 500;
        text-align: center;
        animation: fadeIn 0.3s ease-in;
      }

      .validation-warning {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background-color: #fff3cd;
        color: #856404;
        border: 1px solid #ffc107;
        border-radius: 6px;
        font-weight: 500;
        text-align: center;
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Responsive: ensure single-column on mobile */
      @media (max-width: 767px) {
        .preferences-container {
          padding: 0.75rem;
        }

        .activity-checkboxes,
        .dietary-checkboxes,
        .meal-checkboxes {
          flex-direction: column;
        }
      }
    `;
  }
}

customElements.define('user-preferences-input', UserPreferencesInput);
