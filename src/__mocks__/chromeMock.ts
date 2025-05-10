const chrome = {
  action: {
    setBadgeText: () => Promise.resolve(),
  },
  storage: {
    local: {
      get: (keys: string[], callback: (result: any) => void) => {
        callback({});
        return Promise.resolve();
      },
      set: (items: any) => Promise.resolve(),
    },
  },
  runtime: {
    onMessage: {
      addListener: (callback: any) => {},
      removeListener: (callback: any) => {},
    },
    sendMessage: (message: any) => Promise.resolve(),
  },
  tabs: {
    query: (queryInfo: any, callback: (tabs: any[]) => void) => {
      callback([{ id: 1 }]);
      return Promise.resolve();
    },
    sendMessage: (tabId: number, message: any) => Promise.resolve(),
  },
};

export default chrome;
