import { StoredState } from '../models/StoredState.js';
import { Class } from '../models/Class.js';
import { UserPreferences } from '../models/UserPreferences.js';
import { Schedule } from '../models/Schedule.js';

const STORAGE_KEY = 'unigo_state';

/**
 * Loads the full StoredState from localStorage.
 * Returns a default StoredState if data is missing or corrupted.
 * @returns {StoredState}
 */
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new StoredState();
    }
    const data = JSON.parse(raw);
    return StoredState.fromJSON(data);
  } catch {
    return new StoredState();
  }
}

/**
 * Persists the full StoredState to localStorage.
 * @param {StoredState} state
 */
function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.toJSON()));
}

/**
 * Saves an array of Class instances (or plain class-like objects) to localStorage.
 * @param {Class[]|object[]} classes
 */
export function saveClasses(classes) {
  const state = loadState();
  state.classes = Array.isArray(classes)
    ? classes.map(c => (c instanceof Class ? c : new Class(c)))
    : [];
  persistState(state);
}

/**
 * Loads the array of Class instances from localStorage.
 * Returns an empty array if data is missing or corrupted.
 * @returns {Class[]}
 */
export function loadClasses() {
  return loadState().classes;
}

/**
 * Saves UserPreferences to localStorage.
 * @param {UserPreferences} prefs
 */
export function savePreferences(prefs) {
  const state = loadState();
  state.preferences = prefs;
  persistState(state);
}

/**
 * Loads UserPreferences from localStorage.
 * Returns default UserPreferences if data is missing or corrupted.
 * @returns {UserPreferences}
 */
export function loadPreferences() {
  return loadState().preferences;
}

/**
 * Saves a Schedule for a specific day to localStorage.
 * @param {string} day - Day of the week (e.g., 'monday')
 * @param {Schedule} schedule
 */
export function saveSchedule(day, schedule) {
  const state = loadState();
  state.schedules[day] = schedule;
  persistState(state);
}

/**
 * Loads a Schedule for a specific day from localStorage.
 * Returns null if no schedule exists for that day.
 * @param {string} day - Day of the week (e.g., 'monday')
 * @returns {Schedule|null}
 */
export function loadSchedule(day) {
  return loadState().schedules[day] || null;
}

/**
 * Gets the regeneration count for a specific day and gap index.
 * @param {string} day - Day of the week
 * @param {number} gapIndex - Index of the time gap
 * @returns {number} Current regeneration count (0 if not tracked yet)
 */
export function getRegenerationCount(day, gapIndex) {
  const state = loadState();
  const key = `${day}-${gapIndex}`;
  return state.regenerationCounts[key] || 0;
}

/**
 * Increments the regeneration count for a specific day and gap index.
 * @param {string} day - Day of the week
 * @param {number} gapIndex - Index of the time gap
 */
export function incrementRegenerationCount(day, gapIndex) {
  const state = loadState();
  const key = `${day}-${gapIndex}`;
  state.regenerationCounts[key] = (state.regenerationCounts[key] || 0) + 1;
  persistState(state);
}
