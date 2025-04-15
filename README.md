# Remote Job Application Assistant

A Chrome extension that automates filling out remote job application forms using AI and your resume.

## Video Tutorial

Check out the demo and explanation on LinkedIn:
[Remote Job Application Assistant Demo](https://www.linkedin.com/posts/moeinsalari_remotejobs-chromeextension-aitools-activity-7317073448936067072-A2S5)

## Features

- Analyzes forms on job application pages
- Uses Google Gemini AI to generate appropriate responses based on your resume
- Automatically fills out form fields
- Works with various input types (text, select, checkbox, etc.)
- Modern UI with React and Tailwind CSS
- Resume-aware responses that pull from your experience and qualifications
- Built-in resume editor - no need to manage external files
- User-provided API keys - no server configuration needed

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express
- **AI**: Google Gemini API (configurable to use other models like OpenAI)
- **Extension**: Chrome Extension Manifest V3

## Installation

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Chrome browser
- Google Gemini API key (obtain from https://ai.google.dev/)

### Setup

1. Clone this repository:

   ```
   git clone https://github.com/yourusername/remote-extension.git
   cd remote-extension
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the extension:

   ```
   npm run build
   ```

4. Start the backend server:

   ```
   npm run start:server
   ```

5. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

## Usage

1. Click the extension icon in your browser toolbar
2. Add your Gemini API key (you only need to do this once)
3. Add your resume in the text area (you only need to do this once)
4. Navigate to a remote job application form
5. Click "Capture Form" to analyze the current form
6. Once analysis is complete, click "Fill Form" to populate the fields with AI-generated responses based on your resume
7. Review the information before submitting the form

Both your resume and API key are saved in your browser's local storage, so you only need to enter them once. You can edit either at any time by clicking their respective "Edit" buttons in the extension popup.

## Development

To run in development mode with hot reloading:

```
npm run dev
```

This will start both the webpack watcher for the extension and the backend server.

## API Key Management

The extension uses client-side API key management for several benefits:

1. No API keys stored on the server
2. Each user can use their own API key
3. More transparent and secure - you control your own API key
4. No hard-coded API keys in source code

To get a Google Gemini API key, visit: https://ai.google.dev/

## Resume Storage

The extension stores your resume directly in the browser's local storage for convenience:

- No need to manage external files
- Resume data is sent with each form processing request
- Edit your resume directly in the extension popup
- Your data stays on your device for privacy
