import '@testing-library/jest-dom';

global.chrome = require('../src/__mocks__/chrome');

global.fetch = jest.fn();

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  // Suppress specific React-related warnings if needed
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    (args[0].includes('React does not recognize the') ||
      args[0].includes('Invalid prop'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  // Suppress specific warnings if needed
  if (
    args[0] &&
    typeof args[0] === 'string' &&
    args[0].includes('Some warning to suppress')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};
