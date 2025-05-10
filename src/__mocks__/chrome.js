// Simple mock for Chrome API
const chrome = {
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        callback({});
        return Promise.resolve();
      }),
      set: jest.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn(() => Promise.resolve()),
  },
  tabs: {
    query: jest.fn((queryInfo, callback) => {
      callback([{ id: 1 }]);
      return Promise.resolve();
    }),
    sendMessage: jest.fn(() => Promise.resolve()),
    create: jest.fn(),
  },
  notifications: {
    onClicked: {
      addListener: jest.fn(),
    },
    clear: jest.fn(),
  },
};

module.exports = chrome;
