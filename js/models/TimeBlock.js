import { BlockType } from './constants.js';

/**
 * Represents a time block in a generated schedule.
 */
export class TimeBlock {
  /**
   * @param {object} params
   * @param {string} params.startTime - Start time in HH:mm format
   * @param {string} params.endTime - End time in HH:mm format
   * @param {string} params.type - Block type: 'class' | 'transit' | 'meal' | 'activity'
   * @param {string} params.name - Name/description of the block
   * @param {string} params.location - Campus location
   */
  constructor({ startTime, endTime, type, name, location }) {
    this.startTime = startTime;
    this.endTime = endTime;
    this.type = type;
    this.name = name;
    this.location = location;
  }

  /**
   * Serializes the time block to a plain object for JSON storage.
   * @returns {object}
   */
  toJSON() {
    return {
      startTime: this.startTime,
      endTime: this.endTime,
      type: this.type,
      name: this.name,
      location: this.location
    };
  }

  /**
   * Creates a TimeBlock instance from a plain object (deserialization).
   * @param {object} data
   * @returns {TimeBlock}
   */
  static fromJSON(data) {
    return new TimeBlock({
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      name: data.name,
      location: data.location
    });
  }
}
