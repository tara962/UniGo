import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../services/storageService.js', () => ({
  savePreferences: vi.fn(),
  loadPreferences: vi.fn(() => null)
}));

import { savePreferences, loadPreferences } from '../services/storageService.js';
import './user-preferences-input.js';

describe('UserPreferencesInput', () => {
  let element;

  beforeEach(() => {
    vi.clearAllMocks();
    loadPreferences.mockReturnValue(null);
    element = document.createElement('user-preferences-input');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  describe('rendering', () => {
    it('renders as a custom element with shadow DOM', () => {
      expect(element.shadowRoot).not.toBeNull();
    });

    it('renders activity checkboxes for all categories', () => {
      const checkboxes = element.shadowRoot.querySelectorAll('input[name="activity"]');
      expect(checkboxes.length).toBe(5);
      const values = Array.from(checkboxes).map(cb => cb.value);
      expect(values).toContain('study');
      expect(values).toContain('exercise');
      expect(values).toContain('social');
      expect(values).toContain('relaxation');
      expect(values).toContain('errands');
    });

    it('renders dietary restriction checkboxes', () => {
      const checkboxes = element.shadowRoot.querySelectorAll('input[name="dietary"]');
      expect(checkboxes.length).toBe(8);
      const values = Array.from(checkboxes).map(cb => cb.value);
      expect(values).toContain('vegetarian');
      expect(values).toContain('vegan');
      expect(values).toContain('gluten-free');
      expect(values).toContain('none');
    });

    it('renders meal type checkboxes', () => {
      const checkboxes = element.shadowRoot.querySelectorAll('input[name="meal"]');
      expect(checkboxes.length).toBe(4);
      const values = Array.from(checkboxes).map(cb => cb.value);
      expect(values).toContain('breakfast');
      expect(values).toContain('lunch');
      expect(values).toContain('dinner');
      expect(values).toContain('snack');
    });

    it('renders a save button', () => {
      const btn = element.shadowRoot.querySelector('.save-btn');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toContain('Save Preferences');
    });

    it('has minimum 44x44px touch targets on interactive elements', () => {
      const style = element.shadowRoot.querySelector('style').textContent;
      expect(style).toContain('min-height: 44px');
      expect(style).toContain('min-width: 44px');
      expect(style).toContain('width: 44px');
      expect(style).toContain('height: 44px');
    });
  });

  describe('activity selection and ranking', () => {
    it('adds selected activity to ranked list', () => {
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const rankedItems = element.shadowRoot.querySelectorAll('.ranked-item');
      expect(rankedItems.length).toBe(1);
      expect(rankedItems[0].dataset.activity).toBe('study');
    });

    it('removes deselected activity from ranked list', () => {
      // Select two
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const exerciseCb = element.shadowRoot.querySelector('input[name="activity"][value="exercise"]');
      exerciseCb.checked = true;
      exerciseCb.dispatchEvent(new Event('change', { bubbles: true }));

      expect(element.shadowRoot.querySelectorAll('.ranked-item').length).toBe(2);

      // Deselect study
      const studyCb2 = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb2.checked = false;
      studyCb2.dispatchEvent(new Event('change', { bubbles: true }));

      const rankedItems = element.shadowRoot.querySelectorAll('.ranked-item');
      expect(rankedItems.length).toBe(1);
      expect(rankedItems[0].dataset.activity).toBe('exercise');
    });

    it('moves activity up in ranking', () => {
      // Select two activities
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const exerciseCb = element.shadowRoot.querySelector('input[name="activity"][value="exercise"]');
      exerciseCb.checked = true;
      exerciseCb.dispatchEvent(new Event('change', { bubbles: true }));

      // Move exercise up
      const moveUpBtn = element.shadowRoot.querySelectorAll('.move-up')[1];
      moveUpBtn.click();

      const rankedItems = element.shadowRoot.querySelectorAll('.ranked-item');
      expect(rankedItems[0].dataset.activity).toBe('exercise');
      expect(rankedItems[1].dataset.activity).toBe('study');
    });

    it('moves activity down in ranking', () => {
      // Select two activities
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const exerciseCb = element.shadowRoot.querySelector('input[name="activity"][value="exercise"]');
      exerciseCb.checked = true;
      exerciseCb.dispatchEvent(new Event('change', { bubbles: true }));

      // Move study down
      const moveDownBtn = element.shadowRoot.querySelectorAll('.move-down')[0];
      moveDownBtn.click();

      const rankedItems = element.shadowRoot.querySelectorAll('.ranked-item');
      expect(rankedItems[0].dataset.activity).toBe('exercise');
      expect(rankedItems[1].dataset.activity).toBe('study');
    });

    it('disables move-up on first item and move-down on last item', () => {
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const exerciseCb = element.shadowRoot.querySelector('input[name="activity"][value="exercise"]');
      exerciseCb.checked = true;
      exerciseCb.dispatchEvent(new Event('change', { bubbles: true }));

      const moveUpBtns = element.shadowRoot.querySelectorAll('.move-up');
      const moveDownBtns = element.shadowRoot.querySelectorAll('.move-down');

      expect(moveUpBtns[0].disabled).toBe(true);
      expect(moveDownBtns[moveDownBtns.length - 1].disabled).toBe(true);
    });
  });

  describe('dietary restrictions', () => {
    it('selects dietary restrictions', () => {
      const vegCb = element.shadowRoot.querySelector('input[name="dietary"][value="vegetarian"]');
      vegCb.checked = true;
      vegCb.dispatchEvent(new Event('change', { bubbles: true }));

      expect(element.preferences.dietaryRestrictions).toContain('vegetarian');
    });

    it('deselects all others when "none" is selected', () => {
      // Select vegetarian first
      const vegCb = element.shadowRoot.querySelector('input[name="dietary"][value="vegetarian"]');
      vegCb.checked = true;
      vegCb.dispatchEvent(new Event('change', { bubbles: true }));

      // Select "none"
      const noneCb = element.shadowRoot.querySelector('input[name="dietary"][value="none"]');
      noneCb.checked = true;
      noneCb.dispatchEvent(new Event('change', { bubbles: true }));

      expect(element.preferences.dietaryRestrictions).toEqual(['none']);
      // Verify vegetarian is unchecked in the UI
      const vegCbAfter = element.shadowRoot.querySelector('input[name="dietary"][value="vegetarian"]');
      expect(vegCbAfter.checked).toBe(false);
    });

    it('deselects "none" when a specific restriction is selected', () => {
      // Select "none" first
      const noneCb = element.shadowRoot.querySelector('input[name="dietary"][value="none"]');
      noneCb.checked = true;
      noneCb.dispatchEvent(new Event('change', { bubbles: true }));

      // Select vegan
      const veganCb = element.shadowRoot.querySelector('input[name="dietary"][value="vegan"]');
      veganCb.checked = true;
      veganCb.dispatchEvent(new Event('change', { bubbles: true }));

      expect(element.preferences.dietaryRestrictions).toEqual(['vegan']);
      const noneCbAfter = element.shadowRoot.querySelector('input[name="dietary"][value="none"]');
      expect(noneCbAfter.checked).toBe(false);
    });
  });

  describe('meal preferences', () => {
    it('selects meal types', () => {
      const lunchCb = element.shadowRoot.querySelector('input[name="meal"][value="lunch"]');
      lunchCb.checked = true;
      lunchCb.dispatchEvent(new Event('change', { bubbles: true }));

      expect(element.preferences.mealPreferences).toContain('lunch');
    });

    it('deselects meal types', () => {
      const lunchCb = element.shadowRoot.querySelector('input[name="meal"][value="lunch"]');
      lunchCb.checked = true;
      lunchCb.dispatchEvent(new Event('change', { bubbles: true }));

      lunchCb.checked = false;
      lunchCb.dispatchEvent(new Event('change', { bubbles: true }));

      expect(element.preferences.mealPreferences).not.toContain('lunch');
    });
  });

  describe('save behavior', () => {
    it('dispatches preferences-saved event on save', () => {
      const handler = vi.fn();
      element.addEventListener('preferences-saved', handler);

      // Select an activity
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      // Click save
      const saveBtn = element.shadowRoot.querySelector('.save-btn');
      saveBtn.click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.activities).toEqual(['study']);
    });

    it('shows confirmation message on save', () => {
      const saveBtn = element.shadowRoot.querySelector('.save-btn');
      saveBtn.click();

      const confirmation = element.shadowRoot.querySelector('.confirmation');
      expect(confirmation.hidden).toBe(false);
    });

    it('hides confirmation message after 3 seconds', () => {
      vi.useFakeTimers();

      const saveBtn = element.shadowRoot.querySelector('.save-btn');
      saveBtn.click();

      const confirmation = element.shadowRoot.querySelector('.confirmation');
      expect(confirmation.hidden).toBe(false);

      vi.advanceTimersByTime(3000);
      expect(confirmation.hidden).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('preferences getter/setter', () => {
    it('returns empty preferences by default', () => {
      expect(element.preferences).toEqual({
        activities: [],
        dietaryRestrictions: [],
        mealPreferences: []
      });
    });

    it('setter restores preferences and updates UI', () => {
      element.preferences = {
        activities: ['exercise', 'study'],
        dietaryRestrictions: ['vegan'],
        mealPreferences: ['lunch', 'dinner']
      };

      expect(element.preferences.activities).toEqual(['exercise', 'study']);
      expect(element.preferences.dietaryRestrictions).toEqual(['vegan']);
      expect(element.preferences.mealPreferences).toEqual(['lunch', 'dinner']);

      // Check UI reflects the state
      const exerciseCb = element.shadowRoot.querySelector('input[name="activity"][value="exercise"]');
      expect(exerciseCb.checked).toBe(true);

      const veganCb = element.shadowRoot.querySelector('input[name="dietary"][value="vegan"]');
      expect(veganCb.checked).toBe(true);

      const lunchCb = element.shadowRoot.querySelector('input[name="meal"][value="lunch"]');
      expect(lunchCb.checked).toBe(true);
    });
  });

  describe('localStorage persistence', () => {
    it('loads saved preferences on connectedCallback', () => {
      document.body.removeChild(element);

      loadPreferences.mockReturnValue({
        activities: ['study', 'exercise'],
        dietaryRestrictions: ['vegetarian'],
        mealPreferences: ['lunch']
      });

      element = document.createElement('user-preferences-input');
      document.body.appendChild(element);

      expect(element.preferences.activities).toEqual(['study', 'exercise']);
      expect(element.preferences.dietaryRestrictions).toEqual(['vegetarian']);
      expect(element.preferences.mealPreferences).toEqual(['lunch']);
    });

    it('calls savePreferences with UserPreferences instance on save', () => {
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const vegCb = element.shadowRoot.querySelector('input[name="dietary"][value="vegetarian"]');
      vegCb.checked = true;
      vegCb.dispatchEvent(new Event('change', { bubbles: true }));

      const saveBtn = element.shadowRoot.querySelector('.save-btn');
      saveBtn.click();

      expect(savePreferences).toHaveBeenCalledTimes(1);
      const savedArg = savePreferences.mock.calls[0][0];
      expect(savedArg.activities).toEqual(['study']);
      expect(savedArg.dietaryRestrictions).toEqual(['vegetarian']);
    });

    it('handles null from loadPreferences gracefully', () => {
      document.body.removeChild(element);
      loadPreferences.mockReturnValue(null);

      element = document.createElement('user-preferences-input');
      document.body.appendChild(element);

      expect(element.preferences).toEqual({
        activities: [],
        dietaryRestrictions: [],
        mealPreferences: []
      });
    });

    it('handles empty arrays from loadPreferences', () => {
      document.body.removeChild(element);
      loadPreferences.mockReturnValue({
        activities: [],
        dietaryRestrictions: [],
        mealPreferences: []
      });

      element = document.createElement('user-preferences-input');
      document.body.appendChild(element);

      expect(element.preferences).toEqual({
        activities: [],
        dietaryRestrictions: [],
        mealPreferences: []
      });
    });
  });

  describe('validateForGeneration', () => {
    it('returns valid: false with error when no activities selected', () => {
      const result = element.validateForGeneration();
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please select at least one activity preference');
    });

    it('shows warning message when no activities selected', () => {
      element.validateForGeneration();
      const warning = element.shadowRoot.querySelector('.validation-warning');
      expect(warning.hidden).toBe(false);
    });

    it('returns valid: true when at least one activity is selected', () => {
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      const result = element.validateForGeneration();
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('hides warning message when activities are selected', () => {
      // First show the warning
      element.validateForGeneration();
      const warning = element.shadowRoot.querySelector('.validation-warning');
      expect(warning.hidden).toBe(false);

      // Select an activity
      const studyCb = element.shadowRoot.querySelector('input[name="activity"][value="study"]');
      studyCb.checked = true;
      studyCb.dispatchEvent(new Event('change', { bubbles: true }));

      // Validate again
      element.validateForGeneration();
      const warningAfter = element.shadowRoot.querySelector('.validation-warning');
      expect(warningAfter.hidden).toBe(true);
    });

    it('hides warning on successful save', () => {
      // Show the warning
      element.validateForGeneration();
      const warning = element.shadowRoot.querySelector('.validation-warning');
      expect(warning.hidden).toBe(false);

      // Save
      const saveBtn = element.shadowRoot.querySelector('.save-btn');
      saveBtn.click();

      const warningAfter = element.shadowRoot.querySelector('.validation-warning');
      expect(warningAfter.hidden).toBe(true);
    });
  });
});
