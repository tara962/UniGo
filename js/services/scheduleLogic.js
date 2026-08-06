/**
 * Schedule logic service for the AI Schedule Optimizer.
 * Computes enriched time gaps with transit needs and usable time.
 */

import { computeGaps } from '../utils/time.js';

/**
 * Minimum gap duration in minutes to be considered usable.
 * @type {number}
 */
const MIN_GAP_MINUTES = 15;

/**
 * Transit duration constants in minutes.
 */
const TRANSIT_SAME_BUILDING = 5;
const TRANSIT_DIFFERENT_BUILDING = 10;
const TRANSIT_MAX = 30;
const TRANSIT_MIN = 5;

/**
 * Calculate transit duration between two campus locations.
 *
 * Heuristic:
 * - Same location (identical strings) = 0 min (no transit needed)
 * - Same building (location strings share first word) = 5 min
 * - Different buildings = 10 min
 * - Result clamped to 5-30 min range when transit is needed
 *
 * @param {string} fromLocation - Starting campus location
 * @param {string} toLocation - Destination campus location
 * @returns {number} Transit duration in minutes (0 if same location, 5-30 otherwise)
 */
export function calculateTransitDuration(fromLocation, toLocation) {
  if (!fromLocation || !toLocation) {
    return 0;
  }

  const from = fromLocation.trim();
  const to = toLocation.trim();

  // Same exact location — no transit needed
  if (from === to) {
    return 0;
  }

  // Compare first word to determine if same building
  const fromBuilding = from.split(/\s+/)[0].toLowerCase();
  const toBuilding = to.split(/\s+/)[0].toLowerCase();

  let duration;
  if (fromBuilding === toBuilding) {
    duration = TRANSIT_SAME_BUILDING;
  } else {
    duration = TRANSIT_DIFFERENT_BUILDING;
  }

  // Clamp to valid range
  return Math.max(TRANSIT_MIN, Math.min(TRANSIT_MAX, duration));
}

/**
 * Compute enriched schedule gaps for a given day's classes.
 *
 * Takes a sorted list of classes for a single day, computes raw gaps,
 * filters to gaps >= 15 minutes, and enriches each gap with transit
 * information and usable time.
 *
 * @param {Array<{ startTime: string, endTime: string, location?: string, name?: string }>} classes
 *   Classes sorted by startTime for a single day
 * @returns {Array<{
 *   startTime: string,
 *   endTime: string,
 *   duration: number,
 *   beforeClass: object|null,
 *   afterClass: object|null,
 *   transitNeeded: boolean,
 *   transitDuration: number,
 *   usableTime: number
 * }>} Array of enriched gap objects
 */
export function computeScheduleGaps(classes) {
  if (!Array.isArray(classes) || classes.length === 0) {
    return [];
  }

  // Get raw gaps from time utility
  const rawGaps = computeGaps(classes);

  // Filter to gaps >= 15 minutes (Req 3.3)
  const significantGaps = rawGaps.filter(gap => gap.duration >= MIN_GAP_MINUTES);

  // Enrich each gap with transit and usable time info
  return significantGaps.map(gap => {
    const fromLocation = gap.beforeClass?.location || '';
    const toLocation = gap.afterClass?.location || '';

    const transitDuration = calculateTransitDuration(fromLocation, toLocation);
    const transitNeeded = transitDuration > 0;

    // Usable time = total gap duration minus transit allocation
    // If usable time < 0, the whole gap is transit only (Req 4.4)
    const usableTime = Math.max(0, gap.duration - transitDuration);

    return {
      startTime: gap.startTime,
      endTime: gap.endTime,
      duration: gap.duration,
      beforeClass: gap.beforeClass,
      afterClass: gap.afterClass,
      transitNeeded,
      transitDuration,
      usableTime,
    };
  });
}
