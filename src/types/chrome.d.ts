// This is a simplified declaration file to help with TypeScript errors in our extension
// The @types/chrome package already provides the full definitions, but this can help with
// specific issues we might encounter

import {} from 'chrome';

declare global {
  interface Window {
    chrome: typeof chrome;
  }

  namespace chrome {
    // Add any specific interfaces or types we need to override here
  }
}
