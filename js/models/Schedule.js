import { TimeBlock } from './TimeBlock.js';

/**
 * Represents a generated schedule for a single day.
 */
export class Schedule {
  /**
   * @param {object} params
   * @param {string} params.day - Day of the week
   * @param {TimeBlock[]} params.timeBlocks - Chronologically ordered time blocks
   * @param {string} params.generatedAt - ISO timestamp of generation
   * @param {number} params.seed - Regeneration seed used
   */
  constructor({ day, timeBlocks = [], generatedAt, seed }) {
    this.day = day;
    this.timeBlocks = timeBlocks;
    this.generatedAt = generatedAt;
    this.seed = seed;
  }

  /**
   * Serializes the schedule to a plain object for JSON storage.
   * @returns {object}
   */
  toJSON() {
    return {
      day: this.day,
      timeBlocks: this.timeBlocks.map(block => block.toJSON()),
      generatedAt: this.generatedAt,
      seed: this.seed
    };
  }

  /**
   * Creates a Schedule instance from a plain object (deserialization).
   * @param {object} data
   * @returns {Schedule}
   */
  static fromJSON(data) {
    return new Schedule({
      day: data.day,
      timeBlocks: (data.timeBlocks || []).map(block => TimeBlock.fromJSON(block)),
      generatedAt: data.generatedAt,
      seed: data.seed
    });
  }
}
