import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';

// Add Chrome types to fix TypeScript errors
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <Popup />
    </React.StrictMode>
  );
}
