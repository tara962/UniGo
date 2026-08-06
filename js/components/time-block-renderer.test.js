import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './time-block-renderer.js';

describe('TimeBlockRenderer', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('time-block-renderer');
  });

  afterEach(() => {
    if (el.parentNode) {
      document.body.removeChild(el);
    }
  });

  function mount(attrs = {}) {
    if (attrs['start-time']) el.setAttribute('start-time', attrs['start-time']);
    if (attrs['end-time']) el.setAttribute('end-time', attrs['end-time']);
    if (attrs['block-type']) el.setAttribute('block-type', attrs['block-type']);
    if (attrs['block-name']) el.setAttribute('block-name', attrs['block-name']);
    if (attrs['location']) el.setAttribute('location', attrs['location']);
    if (attrs['scale']) el.setAttribute('scale', attrs['scale']);
    document.body.appendChild(el);
    return el;
  }

  it('registers as a custom element', () => {
    expect(customElements.get('time-block-renderer')).toBeDefined();
  });

  it('renders a shadow DOM with time-block container', () => {
    mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'class', 'block-name': 'Calculus', 'location': 'Math Building' });
    const block = el.shadowRoot.querySelector('.time-block');
    expect(block).not.toBeNull();
  });

  it('displays the block name', () => {
    mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'activity', 'block-name': 'Study Session', 'location': 'Library' });
    const nameEl = el.shadowRoot.querySelector('.time-block-name');
    expect(nameEl.textContent).toBe('Study Session');
  });

  it('displays times in 12-hour format', () => {
    mount({ 'start-time': '14:30', 'end-time': '15:45', 'block-type': 'meal', 'block-name': 'Lunch', 'location': 'Cafeteria' });
    const timeEl = el.shadowRoot.querySelector('.time-block-time');
    expect(timeEl.textContent).toContain('2:30 PM');
    expect(timeEl.textContent).toContain('3:45 PM');
  });

  it('displays the location', () => {
    mount({ 'start-time': '09:00', 'end-time': '09:30', 'block-type': 'transit', 'block-name': 'Walk', 'location': 'Science Building' });
    const locationEl = el.shadowRoot.querySelector('.time-block-location');
    expect(locationEl.textContent).toBe('Science Building');
  });

  describe('block type color/icon coding (Req 7.2)', () => {
    it('applies class styling with book icon', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'class', 'block-name': 'Calculus', 'location': 'Room 201' });
      const block = el.shadowRoot.querySelector('.time-block');
      const icon = el.shadowRoot.querySelector('.time-block-icon');
      expect(block.style.getPropertyValue('--block-bg-color')).toBe('#dbeafe');
      expect(block.style.getPropertyValue('--block-border-color')).toBe('#2563eb');
      expect(icon.textContent).toBe('\u{1F4DA}');
    });

    it('applies transit styling with walking icon', () => {
      mount({ 'start-time': '10:00', 'end-time': '10:10', 'block-type': 'transit', 'block-name': 'Walk', 'location': 'Library' });
      const block = el.shadowRoot.querySelector('.time-block');
      const icon = el.shadowRoot.querySelector('.time-block-icon');
      expect(block.style.getPropertyValue('--block-bg-color')).toBe('#fef3c7');
      expect(block.style.getPropertyValue('--block-border-color')).toBe('#d97706');
      expect(icon.textContent).toBe('\u{1F6B6}');
    });

    it('applies meal styling with plate icon', () => {
      mount({ 'start-time': '12:00', 'end-time': '12:45', 'block-type': 'meal', 'block-name': 'Lunch', 'location': 'Cafeteria' });
      const block = el.shadowRoot.querySelector('.time-block');
      const icon = el.shadowRoot.querySelector('.time-block-icon');
      expect(block.style.getPropertyValue('--block-bg-color')).toBe('#dcfce7');
      expect(block.style.getPropertyValue('--block-border-color')).toBe('#16a34a');
      expect(icon.textContent).toBe('\u{1F37D}\u{FE0F}');
    });

    it('applies activity styling with star icon', () => {
      mount({ 'start-time': '14:00', 'end-time': '15:00', 'block-type': 'activity', 'block-name': 'Exercise', 'location': 'Gym' });
      const block = el.shadowRoot.querySelector('.time-block');
      const icon = el.shadowRoot.querySelector('.time-block-icon');
      expect(block.style.getPropertyValue('--block-bg-color')).toBe('#f3e8ff');
      expect(block.style.getPropertyValue('--block-border-color')).toBe('#9333ea');
      expect(icon.textContent).toBe('\u{2B50}');
    });

    it('each block type has a unique color', () => {
      const types = ['class', 'transit', 'meal', 'activity'];
      const colors = new Set();
      const icons = new Set();

      types.forEach(type => {
        const testEl = document.createElement('time-block-renderer');
        testEl.setAttribute('start-time', '09:00');
        testEl.setAttribute('end-time', '10:00');
        testEl.setAttribute('block-type', type);
        testEl.setAttribute('block-name', 'Test');
        testEl.setAttribute('location', 'Here');
        document.body.appendChild(testEl);

        const block = testEl.shadowRoot.querySelector('.time-block');
        colors.add(block.style.getPropertyValue('--block-bg-color'));
        icons.add(testEl.shadowRoot.querySelector('.time-block-icon').textContent);

        document.body.removeChild(testEl);
      });

      expect(colors.size).toBe(4);
      expect(icons.size).toBe(4);
    });
  });

  describe('proportional height (Req 7.1)', () => {
    it('sets height proportional to duration with default scale', () => {
      // 60 minutes * 2 px/min = 120px
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'class', 'block-name': 'Test', 'location': 'Room' });
      const block = el.shadowRoot.querySelector('.time-block');
      expect(block.style.height).toBe('120px');
    });

    it('sets height proportional to duration with custom scale', () => {
      // 30 minutes * 3 px/min = 90px
      mount({ 'start-time': '09:00', 'end-time': '09:30', 'block-type': 'meal', 'block-name': 'Snack', 'location': 'Cafe', 'scale': '3' });
      const block = el.shadowRoot.querySelector('.time-block');
      expect(block.style.height).toBe('90px');
    });

    it('shorter blocks get smaller height', () => {
      // 15 minutes * 2 px/min = 30px
      mount({ 'start-time': '10:00', 'end-time': '10:15', 'block-type': 'transit', 'block-name': 'Walk', 'location': 'Lib' });
      const block = el.shadowRoot.querySelector('.time-block');
      expect(block.style.height).toBe('30px');
    });

    it('handles 5-minute blocks', () => {
      // 5 minutes * 2 px/min = 10px
      mount({ 'start-time': '10:00', 'end-time': '10:05', 'block-type': 'transit', 'block-name': 'Walk', 'location': 'Nearby' });
      const block = el.shadowRoot.querySelector('.time-block');
      expect(block.style.height).toBe('10px');
    });
  });

  describe('accessibility', () => {
    it('sets aria-label with type and name', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'class', 'block-name': 'Physics 201', 'location': 'Lab' });
      const block = el.shadowRoot.querySelector('.time-block');
      expect(block.getAttribute('aria-label')).toBe('Class: Physics 201');
    });

    it('hides icon from screen readers', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'meal', 'block-name': 'Lunch', 'location': 'Cafe' });
      const icon = el.shadowRoot.querySelector('.time-block-icon');
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('minimum font size on mobile (Req 7.4)', () => {
    it('text elements have minimum 14px font size', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'activity', 'block-name': 'Study', 'location': 'Library' });
      const nameEl = el.shadowRoot.querySelector('.time-block-name');
      const detailsEl = el.shadowRoot.querySelector('.time-block-details');

      // Check computed styles in the shadow DOM stylesheet
      const styles = el.shadowRoot.querySelector('style').textContent;
      // The mobile media query sets font-size to 14px minimum
      expect(styles).toContain('14px');
    });
  });

  describe('attribute changes', () => {
    it('updates rendering when attributes change', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'class', 'block-name': 'Original', 'location': 'Room 1' });

      el.setAttribute('block-name', 'Updated');
      const nameEl = el.shadowRoot.querySelector('.time-block-name');
      expect(nameEl.textContent).toBe('Updated');
    });

    it('updates block type styling when type changes', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'class', 'block-name': 'Test', 'location': 'Room' });

      el.setAttribute('block-type', 'meal');
      const block = el.shadowRoot.querySelector('.time-block');
      expect(block.style.getPropertyValue('--block-bg-color')).toBe('#dcfce7');
    });
  });

  describe('edge cases', () => {
    it('handles missing attributes gracefully', () => {
      document.body.appendChild(el);
      const nameEl = el.shadowRoot.querySelector('.time-block-name');
      expect(nameEl.textContent).toBe('');
    });

    it('handles unknown block type with default styling', () => {
      mount({ 'start-time': '09:00', 'end-time': '10:00', 'block-type': 'unknown', 'block-name': 'Test', 'location': 'Room' });
      const block = el.shadowRoot.querySelector('.time-block');
      // Falls back to activity styling
      expect(block.style.getPropertyValue('--block-bg-color')).toBe('#f3e8ff');
    });

    it('handles invalid time format without crashing', () => {
      mount({ 'start-time': 'invalid', 'end-time': 'bad', 'block-type': 'class', 'block-name': 'Test', 'location': 'Room' });
      const timeEl = el.shadowRoot.querySelector('.time-block-time');
      // Should fallback to raw time display
      expect(timeEl.textContent).toContain('invalid');
    });
  });
});
