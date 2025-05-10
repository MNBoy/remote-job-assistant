import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('Background Script', () => {
  let mockChrome: any;
  let messageListeners: Array<
    (message: any, sender: any, sendResponse: any) => boolean
  >;
  let sendResponse: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup mock for chrome.runtime.onMessage.addListener
    messageListeners = [];
    mockChrome = chrome;
    mockChrome.runtime.onMessage.addListener = jest.fn((listener) => {
      messageListeners.push(listener);
    });

    // Mock sendResponse
    sendResponse = jest.fn();

    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();

    // Import the background script to register listeners
    jest.isolateModules(() => {
      require('../index');
    });
  });

  test('should respond with error if resume is missing', () => {
    // Simulate chrome.storage.local.get returning empty values
    mockChrome.storage.local.get.mockImplementation(
      (keys: string[], callback: (result: any) => void) => {
        callback({});
      }
    );

    // Trigger the message listener
    const listener = messageListeners[0];
    listener(
      {
        type: 'PROCESS_FORM',
        payload: { formFields: [] },
      },
      {},
      sendResponse
    );

    // Check if sendResponse was called with the expected error
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      message: expect.stringContaining('Missing resume'),
    });
  });

  test('should update resume when UPDATE_RESUME message is received', () => {
    // Trigger the message listener
    const listener = messageListeners[0];
    listener(
      {
        type: 'UPDATE_RESUME',
        payload: { resume: 'Test Resume' },
      },
      {},
      sendResponse
    );

    // Check if chrome.storage.local.set was called with the correct data
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
      { userResume: 'Test Resume' },
      expect.any(Function)
    );

    // Check if sendResponse was called with success
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should update API key when UPDATE_API_KEY message is received', () => {
    // Trigger the message listener
    const listener = messageListeners[0];
    listener(
      {
        type: 'UPDATE_API_KEY',
        payload: { apiKey: 'test-api-key' },
      },
      {},
      sendResponse
    );

    // Check if chrome.storage.local.set was called with the correct data
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
      { geminiApiKey: 'test-api-key' },
      expect.any(Function)
    );

    // Check if sendResponse was called with success
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  test('should set badge when OPEN_POPUP message is received', () => {
    // Trigger the message listener
    const listener = messageListeners[0];
    listener({ type: 'OPEN_POPUP' }, {}, sendResponse);

    // Check if setBadgeText and setBadgeBackgroundColor were called
    expect(mockChrome.action.setBadgeText).toHaveBeenCalledWith({ text: '✓' });
    expect(mockChrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({
      color: '#4CAF50',
    });
  });
});
