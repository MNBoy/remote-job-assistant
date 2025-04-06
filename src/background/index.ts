import { FormData } from '../types';

// URLs for our backend API
const API_BASE_URL = 'http://localhost:3000';

// Store resume data and API key
let userResume = '';
let apiKey = '';

// Initialize by trying to get resume and API key from storage
chrome.storage.local.get(['userResume', 'geminiApiKey'], (result) => {
  if (result.userResume) {
    userResume = result.userResume;
    console.log('Resume loaded from storage');
  }

  if (result.geminiApiKey) {
    apiKey = result.geminiApiKey;
    console.log('API key loaded from storage');
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PROCESS_FORM' && message.payload) {
    // Check if we have required data
    if (!userResume || !apiKey) {
      let errorMessage = '';

      if (!userResume) {
        errorMessage =
          'Missing resume. Please add your resume in the extension popup.';
      } else if (!apiKey) {
        errorMessage =
          'Missing API key. Please add your Gemini API key in the extension popup.';
      }

      sendResponse({
        success: false,
        message: errorMessage,
      });

      return true;
    }

    // Add resume and API key to the form data
    message.payload.userResume = userResume;
    message.payload.apiKey = apiKey;

    processFormWithAI(message.payload as FormData)
      .then((result) => {
        // Send response back to content script
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error('Error processing form with AI:', error);
        sendResponse({
          success: false,
          message: 'Failed to process form with AI. Please try again.',
          error: error.message || 'Unknown error',
        });
      });

    // Return true to indicate that we will send a response asynchronously
    return true;
  } else if (message.type === 'UPDATE_RESUME' && message.payload) {
    // Update the resume data
    userResume = message.payload.resume;

    // Store in chrome.storage for persistence
    chrome.storage.local.set({ userResume: userResume }, () => {
      console.log('Resume updated in storage');
    });

    // Send a success response
    sendResponse({ success: true });
    return true;
  } else if (message.type === 'UPDATE_API_KEY' && message.payload) {
    // Update the API key
    apiKey = message.payload.apiKey;

    // Store in chrome.storage for persistence
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      console.log('API key updated in storage');
    });

    // Send a success response
    sendResponse({ success: true });
    return true;
  } else if (message.type === 'OPEN_POPUP') {
    // Add a badge to the extension icon
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

    return true;
  }
});

// Process form data with AI
async function processFormWithAI(
  formData: FormData
): Promise<Record<string, string>> {
  try {
    // Make API request to our backend
    const response = await fetch(`${API_BASE_URL}/api/process-form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API request failed with status ${response.status}`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || 'Unknown server error');
    }

    return result.fieldValues;
  } catch (error) {
    console.error('Error in processFormWithAI:', error);
    throw error;
  }
}

// Log that background script has loaded
console.log('Remote Job Application Assistant background script loaded');

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Check if this is our notification
  chrome.storage.local.get(['lastNotificationId'], (result) => {
    if (result.lastNotificationId === notificationId) {
      // Open the popup in a new tab since chrome.action.openPopup() is unreliable
      chrome.tabs.create({
        url: 'popup.html',
      });

      // Clear the notification
      chrome.notifications.clear(notificationId);
    }
  });
});
