import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './class-schedule-input.js';

describe('ClassScheduleInput', () => {
  let el;

  beforeEach(() => {
    localStorage.clear();

    // Mock crypto.randomUUID
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10)
    });

    el = document.createElement('class-schedule-input');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('registers as a custom element', () => {
    expect(customElements.get('class-schedule-input')).toBeDefined();
  });

  it('renders a shadow DOM with a form', () => {
    const form = el.shadowRoot.getElementById('class-form');
    expect(form).not.toBeNull();
  });

  it('renders all form fields', () => {
    const nameInput = el.shadowRoot.getElementById('class-name');
    const daySelect = el.shadowRoot.getElementById('class-day');
    const startSelect = el.shadowRoot.getElementById('class-start');
    const endSelect = el.shadowRoot.getElementById('class-end');
    const locationInput = el.shadowRoot.getElementById('class-location');

    expect(nameInput).not.toBeNull();
    expect(daySelect).not.toBeNull();
    expect(startSelect).not.toBeNull();
    expect(endSelect).not.toBeNull();
    expect(locationInput).not.toBeNull();
  });

  it('populates day select with Monday through Friday', () => {
    const daySelect = el.shadowRoot.getElementById('class-day');
    const options = [...daySelect.options];
    expect(options.length).toBe(5);
    expect(options[0].value).toBe('monday');
    expect(options[0].textContent).toBe('Monday');
    expect(options[4].value).toBe('friday');
    expect(options[4].textContent).toBe('Friday');
  });

  it('populates time selects with 5-minute increments from 06:00 to 23:00', () => {
    const startSelect = el.shadowRoot.getElementById('class-start');
    const options = [...startSelect.options];

    // From 06:00 to 23:00 in 5-min increments:
    // 6:00 to 22:55 = 17 hours * 12 options + 1 (23:00) = 205
    expect(options[0].value).toBe('06:00');
    expect(options[options.length - 1].value).toBe('23:00');

    // Verify 5-minute increments
    expect(options[1].value).toBe('06:05');
    expect(options[2].value).toBe('06:10');
  });

  it('exposes classes getter returning empty array initially', () => {
    expect(el.classes).toEqual([]);
  });

  it('adds a class when form is submitted with valid data', () => {
    el.shadowRoot.getElementById('class-name').value = 'Calculus 101';
    el.shadowRoot.getElementById('class-day').value = 'monday';
    el.shadowRoot.getElementById('class-start').value = '09:00';
    el.shadowRoot.getElementById('class-end').value = '10:00';
    el.shadowRoot.getElementById('class-location').value = 'Math Building';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(el.classes.length).toBe(1);
    expect(el.classes[0].name).toBe('Calculus 101');
    expect(el.classes[0].day).toBe('monday');
    expect(el.classes[0].startTime).toBe('09:00');
    expect(el.classes[0].endTime).toBe('10:00');
    expect(el.classes[0].location).toBe('Math Building');
    expect(el.classes[0].id).toBeDefined();
  });

  it('dispatches class-added event when a class is added', () => {
    let eventDetail = null;
    el.addEventListener('class-added', (e) => { eventDetail = e.detail; });

    el.shadowRoot.getElementById('class-name').value = 'Physics';
    el.shadowRoot.getElementById('class-day').value = 'tuesday';
    el.shadowRoot.getElementById('class-start').value = '14:00';
    el.shadowRoot.getElementById('class-end').value = '15:30';
    el.shadowRoot.getElementById('class-location').value = 'Science Hall';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(eventDetail).not.toBeNull();
    expect(eventDetail.class.name).toBe('Physics');
  });

  it('does not add a class if name is empty', () => {
    const initialCount = el.classes.length;
    el.shadowRoot.getElementById('class-name').value = '';
    el.shadowRoot.getElementById('class-location').value = 'Room 101';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(el.classes.length).toBe(initialCount);
  });

  it('does not add a class if location is empty', () => {
    const initialCount = el.classes.length;
    el.shadowRoot.getElementById('class-name').value = 'English';
    el.shadowRoot.getElementById('class-location').value = '';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(el.classes.length).toBe(initialCount);
  });

  it('displays classes grouped by day', () => {
    el.classes = [
      { id: '1', name: 'Math', day: 'monday', startTime: '09:00', endTime: '10:00', location: 'Room A' },
      { id: '2', name: 'English', day: 'wednesday', startTime: '11:00', endTime: '12:00', location: 'Room B' },
      { id: '3', name: 'Physics', day: 'monday', startTime: '14:00', endTime: '15:00', location: 'Room C' }
    ];

    const dayGroups = el.shadowRoot.querySelectorAll('.day-group');
    expect(dayGroups.length).toBe(2); // Monday and Wednesday

    const titles = [...el.shadowRoot.querySelectorAll('.day-group-title')];
    expect(titles[0].textContent).toBe('Monday');
    expect(titles[1].textContent).toBe('Wednesday');
  });

  it('removes a class and dispatches class-removed event', () => {
    el.classes = [
      { id: 'abc-123', name: 'History', day: 'thursday', startTime: '10:00', endTime: '11:00', location: 'Hall D' }
    ];

    let removedDetail = null;
    el.addEventListener('class-removed', (e) => { removedDetail = e.detail; });

    const removeBtn = el.shadowRoot.querySelector('.btn-remove');
    removeBtn.click();

    expect(el.classes.length).toBe(0);
    expect(removedDetail).not.toBeNull();
    expect(removedDetail.class.name).toBe('History');
  });

  it('disables add button and shows message at max 30 classes', () => {
    const classes = [];
    for (let i = 0; i < 30; i++) {
      classes.push({
        id: `id-${i}`,
        name: `Class ${i}`,
        day: 'monday',
        startTime: '09:00',
        endTime: '10:00',
        location: 'Room'
      });
    }
    el.classes = classes;

    const addBtn = el.shadowRoot.getElementById('add-btn');
    const maxMsg = el.shadowRoot.getElementById('max-message');

    expect(addBtn.disabled).toBe(true);
    expect(maxMsg.hidden).toBe(false);
  });

  it('does not allow adding beyond 30 classes', () => {
    const classes = [];
    for (let i = 0; i < 30; i++) {
      classes.push({
        id: `id-${i}`,
        name: `Class ${i}`,
        day: 'monday',
        startTime: '09:00',
        endTime: '10:00',
        location: 'Room'
      });
    }
    el.classes = classes;

    el.shadowRoot.getElementById('class-name').value = 'Extra Class';
    el.shadowRoot.getElementById('class-location').value = 'Room X';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(el.classes.length).toBe(30);
  });

  it('sets classes via setter and renders them', () => {
    el.classes = [
      { id: 'x1', name: 'Art', day: 'friday', startTime: '08:00', endTime: '09:00', location: 'Studio' }
    ];

    expect(el.classes.length).toBe(1);
    const classItems = el.shadowRoot.querySelectorAll('.class-item');
    expect(classItems.length).toBe(1);
  });

  it('shows empty message when no classes are present', () => {
    const emptyMsg = el.shadowRoot.querySelector('.empty-message');
    expect(emptyMsg).not.toBeNull();
    expect(emptyMsg.textContent).toContain('No classes added yet');
  });
});


describe('ClassScheduleInput - Validation and Error Display (Task 5.2)', () => {
  let el;

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('crypto', {
      randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10)
    });

    el = document.createElement('class-schedule-input');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('displays inline error when end time is equal to start time (Req 1.5)', () => {
    el.shadowRoot.getElementById('class-name').value = 'Math 101';
    el.shadowRoot.getElementById('class-day').value = 'monday';
    el.shadowRoot.getElementById('class-start').value = '09:00';
    el.shadowRoot.getElementById('class-end').value = '09:00';
    el.shadowRoot.getElementById('class-location').value = 'Room A';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errors = el.shadowRoot.getElementById('form-errors');
    expect(errors.hidden).toBe(false);
    expect(errors.textContent).toContain('End time must be later than start time');
    expect(el.classes.length).toBe(0);
  });

  it('displays inline error when end time is earlier than start time (Req 1.5)', () => {
    el.shadowRoot.getElementById('class-name').value = 'Math 101';
    el.shadowRoot.getElementById('class-day').value = 'monday';
    el.shadowRoot.getElementById('class-start').value = '14:00';
    el.shadowRoot.getElementById('class-end').value = '09:00';
    el.shadowRoot.getElementById('class-location').value = 'Room A';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errors = el.shadowRoot.getElementById('form-errors');
    expect(errors.hidden).toBe(false);
    expect(errors.textContent).toContain('End time must be later than start time');
    expect(el.classes.length).toBe(0);
  });

  it('displays inline error identifying conflicting class names and times for overlaps (Req 1.3)', () => {
    // Add a first class directly
    el.shadowRoot.getElementById('class-name').value = 'Physics';
    el.shadowRoot.getElementById('class-day').value = 'tuesday';
    el.shadowRoot.getElementById('class-start').value = '09:00';
    el.shadowRoot.getElementById('class-end').value = '10:30';
    el.shadowRoot.getElementById('class-location').value = 'Science Hall';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(el.classes.length).toBe(1);

    // Try to add an overlapping class
    el.shadowRoot.getElementById('class-name').value = 'Chemistry';
    el.shadowRoot.getElementById('class-day').value = 'tuesday';
    el.shadowRoot.getElementById('class-start').value = '10:00';
    el.shadowRoot.getElementById('class-end').value = '11:00';
    el.shadowRoot.getElementById('class-location').value = 'Lab Building';

    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errors = el.shadowRoot.getElementById('form-errors');
    expect(errors.hidden).toBe(false);
    // Error should identify both class names and times
    expect(errors.textContent).toContain('Chemistry');
    expect(errors.textContent).toContain('Physics');
    expect(errors.textContent).toContain('overlaps');
    expect(el.classes.length).toBe(1); // Second class blocked
  });

  it('blocks save until overlap conflict is resolved (Req 1.2)', () => {
    // Add first class
    el.shadowRoot.getElementById('class-name').value = 'English';
    el.shadowRoot.getElementById('class-day').value = 'wednesday';
    el.shadowRoot.getElementById('class-start').value = '13:00';
    el.shadowRoot.getElementById('class-end').value = '14:00';
    el.shadowRoot.getElementById('class-location').value = 'Arts Building';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(el.classes.length).toBe(1);

    // Try overlapping class (should be blocked)
    el.shadowRoot.getElementById('class-name').value = 'History';
    el.shadowRoot.getElementById('class-day').value = 'wednesday';
    el.shadowRoot.getElementById('class-start').value = '13:30';
    el.shadowRoot.getElementById('class-end').value = '14:30';
    el.shadowRoot.getElementById('class-location').value = 'Humanities';

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(el.classes.length).toBe(1); // Still 1 - blocked

    // Now add a non-overlapping class (should succeed)
    el.shadowRoot.getElementById('class-name').value = 'History';
    el.shadowRoot.getElementById('class-day').value = 'wednesday';
    el.shadowRoot.getElementById('class-start').value = '15:00';
    el.shadowRoot.getElementById('class-end').value = '16:00';
    el.shadowRoot.getElementById('class-location').value = 'Humanities';

    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(el.classes.length).toBe(2); // Now 2 - allowed
  });

  it('persists to localStorage on successful add (Req 1.4)', () => {
    el.shadowRoot.getElementById('class-name').value = 'Biology';
    el.shadowRoot.getElementById('class-day').value = 'thursday';
    el.shadowRoot.getElementById('class-start').value = '08:00';
    el.shadowRoot.getElementById('class-end').value = '09:00';
    el.shadowRoot.getElementById('class-location').value = 'Bio Lab';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // Verify something was stored in localStorage
    const stored = localStorage.getItem('unigo_state');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored);
    expect(parsed.classes).toHaveLength(1);
    expect(parsed.classes[0].name).toBe('Biology');
    expect(parsed.classes[0].day).toBe('thursday');
  });

  it('persists removal to localStorage', () => {
    el.shadowRoot.getElementById('class-name').value = 'Sociology';
    el.shadowRoot.getElementById('class-day').value = 'friday';
    el.shadowRoot.getElementById('class-start').value = '10:00';
    el.shadowRoot.getElementById('class-end').value = '11:00';
    el.shadowRoot.getElementById('class-location').value = 'Social Sciences';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(el.classes.length).toBe(1);

    // Remove the class
    const removeBtn = el.shadowRoot.querySelector('.btn-remove');
    removeBtn.click();

    const stored = JSON.parse(localStorage.getItem('unigo_state'));
    expect(stored.classes).toHaveLength(0);
  });

  it('restores classes from localStorage on page load (Req 1.4)', () => {
    // Pre-populate localStorage with a class
    const state = {
      classes: [{
        id: 'stored-1',
        name: 'Pre-existing Class',
        day: 'monday',
        startTime: '11:00',
        endTime: '12:00',
        location: 'Room 305'
      }],
      preferences: { activities: [], dietaryRestrictions: [], mealPreferences: [] },
      schedules: {},
      regenerationCounts: {}
    };
    localStorage.setItem('unigo_state', JSON.stringify(state));

    // Create a new element (simulates page load)
    document.body.removeChild(el);
    el = document.createElement('class-schedule-input');
    document.body.appendChild(el);

    expect(el.classes.length).toBe(1);
    expect(el.classes[0].name).toBe('Pre-existing Class');
    expect(el.classes[0].day).toBe('monday');
    expect(el.classes[0].startTime).toBe('11:00');
    expect(el.classes[0].endTime).toBe('12:00');

    // Verify it renders in the list
    const classItems = el.shadowRoot.querySelectorAll('.class-item');
    expect(classItems.length).toBe(1);
  });

  it('does not persist to localStorage when validation fails', () => {
    // Attempt to add with invalid data (end time = start time)
    el.shadowRoot.getElementById('class-name').value = 'Bad Class';
    el.shadowRoot.getElementById('class-day').value = 'monday';
    el.shadowRoot.getElementById('class-start').value = '10:00';
    el.shadowRoot.getElementById('class-end').value = '10:00';
    el.shadowRoot.getElementById('class-location').value = 'Room X';

    const form = el.shadowRoot.getElementById('class-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    // localStorage should either be empty or have no classes
    const stored = localStorage.getItem('unigo_state');
    if (stored) {
      const parsed = JSON.parse(stored);
      expect(parsed.classes).toHaveLength(0);
    }
  });

  it('clears previous errors on new submission attempt', () => {
    const form = el.shadowRoot.getElementById('class-form');

    // First invalid submit
    el.shadowRoot.getElementById('class-name').value = 'Test';
    el.shadowRoot.getElementById('class-day').value = 'monday';
    el.shadowRoot.getElementById('class-start').value = '10:00';
    el.shadowRoot.getElementById('class-end').value = '09:00';
    el.shadowRoot.getElementById('class-location').value = 'Room';
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    const errors = el.shadowRoot.getElementById('form-errors');
    expect(errors.hidden).toBe(false);

    // Second valid submit should clear previous errors
    el.shadowRoot.getElementById('class-name').value = 'Valid Class';
    el.shadowRoot.getElementById('class-start').value = '10:00';
    el.shadowRoot.getElementById('class-end').value = '11:00';
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(errors.hidden).toBe(true);
    expect(el.classes.length).toBe(1);
  });
});
