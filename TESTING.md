# Testing Documentation

This document provides information about the testing setup and how to run tests for the Remote Job Application Assistant Chrome extension.

## Testing Setup

The project uses the following testing tools:

- **Jest**: JavaScript testing framework
- **React Testing Library**: For testing React components
- **JSDOM**: For simulating a browser environment

## Running Tests

To run the tests, use the following commands:

```bash
# Run all tests
pnpm test

# Run tests in watch mode (tests will rerun when files change)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Test Structure

Tests are organized in `__tests__` directories next to the code they are testing:

```
src/
├── popup/
│   ├── Popup.tsx
│   └── __tests__/
│       └── Popup.test.tsx
├── content/
│   ├── index.tsx
│   └── __tests__/
│       └── utils.test.ts
└── background/
    ├── index.ts
    └── __tests__/
        ├── background.test.ts
        └── api.test.ts
```

## Mock Files

Chrome API mocks are located in `src/__mocks__/chromeMock.ts`. These mocks simulate the Chrome extension APIs for testing purposes.

## Adding New Tests

When adding new tests:

1. Create a new test file in the appropriate `__tests__` directory
2. Import the necessary testing utilities
3. Mock any external dependencies
4. Write your test cases

Example:

```typescript
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import YourComponent from '../YourComponent';

// Mock any dependencies
jest.mock('chrome', () => require('../../__mocks__/chromeMock').default);

describe('YourComponent', () => {
  test('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Coverage Reports

After running `pnpm test:coverage`, a coverage report will be generated in the `coverage` directory. You can open `coverage/lcov-report/index.html` in your browser to view the detailed coverage report.
