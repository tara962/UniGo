import { DayOfWeek } from './constants.js';

/**
 * Represents a university class with scheduling information.
 */
export class Class {
  /**
   * @param {object} params
   * @param {string} params.id - UUID, generated client-side
   * @param {string} params.name - Class name (1-100 characters)
   * @param {string} params.day - Day of the week (monday-friday)
   * @param {string} params.startTime - Start time in HH:mm format
   * @param {string} params.endTime - End time in HH:mm format
   * @param {string} params.location - Campus location name
   */
  constructor({ id, name, day, startTime, endTime, location }) {
    this.id = id;
    this.name = name;
    this.day = day;
    this.startTime = startTime;
    this.endTime = endTime;
    this.location = location;
  }

  /**
   * Serializes the class instance to a plain object for JSON storage.
   * @returns {object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      day: this.day,
      startTime: this.startTime,
      endTime: this.endTime,
      location: this.location
    };
  }

  /**
   * Creates a Class instance from a plain object (deserialization).
   * @param {object} data
   * @returns {Class}
   */
  static fromJSON(data) {
    return new Class({
      id: data.id,
      name: data.name,
      day: data.day,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location
    });
  }
}
