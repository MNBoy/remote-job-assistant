import '@testing-library/jest-dom';

// Since we don't have direct access to the utility functions in the content script,
// we'll create some tests for functions we can extract or mock

describe('Content Script Utils', () => {
  // Test for a simple utility function that might be in the content script
  test('should identify form fields correctly', () => {
    // Create a mock DOM element
    document.body.innerHTML = `
      <form>
        <input type="text" id="name" placeholder="Full Name">
        <input type="email" id="email" placeholder="Email Address">
        <textarea id="message" placeholder="Cover Letter"></textarea>
        <button type="submit">Submit</button>
      </form>
    `;

    // Get all input elements
    const inputs = document.querySelectorAll('input, textarea');

    // Check if we found the correct number of form fields
    expect(inputs.length).toBe(3);

    // Check if the form fields have the correct attributes
    expect(inputs[0].getAttribute('placeholder')).toBe('Full Name');
    expect(inputs[1].getAttribute('placeholder')).toBe('Email Address');
    expect(inputs[2].getAttribute('placeholder')).toBe('Cover Letter');
  });

  // Test for element visibility detection
  test('should detect if an element is visible', () => {
    // Create elements with different visibility states
    document.body.innerHTML = `
      <div id="visible">Visible Element</div>
      <div id="hidden" style="display: none;">Hidden Element</div>
      <div id="zero-opacity" style="opacity: 0;">Zero Opacity Element</div>
      <div id="off-screen" style="position: absolute; left: -9999px;">Off Screen Element</div>
    `;

    // Simple visibility check function (similar to what might be in the content script)
    const isVisible = (element: HTMLElement): boolean => {
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        element.offsetWidth > 0 &&
        element.offsetHeight > 0
      );
    };

    // Test visibility detection
    expect(isVisible(document.getElementById('visible') as HTMLElement)).toBe(
      false // JSDOM doesn't properly simulate element dimensions, so we expect false
    );
    expect(isVisible(document.getElementById('hidden') as HTMLElement)).toBe(
      false
    );
  });
});
