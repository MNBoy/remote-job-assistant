import React, { useEffect, useState } from 'react';
import '../styles/global.css';

// Sample resume text that users can copy
const SAMPLE_RESUME = `John Doe
Software Developer
Email: john.doe@example.com
Phone: (555) 123-4567
LinkedIn: linkedin.com/in/johndoe
GitHub: github.com/johndoe

⸻

SUMMARY

Experienced software developer with 5+ years of experience in full-stack development, specializing in React, Node.js, and TypeScript. Passionate about creating efficient, scalable, and maintainable code with a focus on user experience.

⸻

SKILLS

Programming Languages: JavaScript, TypeScript, Python, HTML, CSS
Frameworks/Libraries: React, Node.js, Express, Redux, Tailwind CSS
Tools: Git, Docker, AWS, CI/CD, Jest, Webpack
Databases: MongoDB, PostgreSQL, MySQL
Methodologies: Agile, Scrum, TDD

⸻

WORK EXPERIENCE

Senior Frontend Developer
ABC Tech Inc. | Jan 2020 - Present
• Developed and maintained React applications for enterprise clients
• Implemented responsive designs using Tailwind CSS
• Improved application performance by 40% through code optimization
• Led a team of 3 developers on multiple projects

Full Stack Developer
XYZ Solutions | Aug 2017 - Dec 2019
• Built RESTful APIs using Node.js and Express
• Created dynamic UIs with React and Redux
• Collaborated with UX designers to implement user-friendly interfaces
• Participated in code reviews and mentored junior developers

⸻

EDUCATION

Bachelor of Science in Computer Science
University of Technology | 2013 - 2017
• GPA: 3.8/4.0
• Relevant coursework: Data Structures, Algorithms, Web Development

⸻

CERTIFICATIONS

• AWS Certified Developer - Associate
• MongoDB Certified Developer
• Google Professional Cloud Developer`;

const Popup: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isSelectingContainer, setIsSelectingContainer] =
    useState<boolean>(false);
  const [status, setStatus] = useState<string>('idle');
  const [message, setMessage] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  const [showResumeEditor, setShowResumeEditor] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyEditor, setShowApiKeyEditor] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showSampleResume, setShowSampleResume] = useState<boolean>(false);
  const [copiedSample, setCopiedSample] = useState<boolean>(false);

  useEffect(() => {
    // Clear badge when popup opens
    chrome.action.setBadgeText({ text: '' });

    // Get saved resume, API key and selection status from chrome storage
    chrome.storage.local.get(
      [
        'userResume',
        'geminiApiKey',
        'isSelectingContainer',
        'selection_success',
        'selection_cancelled',
      ],
      (result) => {
        // Load resume text
        if (result.userResume) {
          setResumeText(result.userResume);
        }

        // Load API key
        if (result.geminiApiKey) {
          setApiKey(result.geminiApiKey);
        }

        // Check if selection was successful and clear the flag
        if (result.selection_success) {
          setStatus('success');
          setMessage(
            'Form container successfully selected and analyzed. Ready to fill.'
          );
          // Clear the flag
          chrome.storage.local.set({ selection_success: false });
        }

        // Check if selection was cancelled and clear the flag
        if (result.selection_cancelled) {
          setStatus('idle');
          setMessage('Container selection was cancelled.');
          // Clear the flag
          chrome.storage.local.set({ selection_cancelled: false });
        }

        // Check if we're currently in selection mode
        if (result.isSelectingContainer) {
          setIsSelectingContainer(true);
          setStatus('processing');
          setMessage(
            'Container selection mode is active. Please select a container with form fields on the page.'
          );

          // Double check with content script about actual selection status
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0].id) {
              chrome.tabs.sendMessage(
                tabs[0].id,
                { type: 'CHECK_SELECTION_STATUS' },
                (response) => {
                  // If content script reports it's not actually selecting, update our state
                  if (response && response.isSelecting === false) {
                    setIsSelectingContainer(false);
                    setStatus('idle');
                    setMessage('');
                    chrome.storage.local.set({ isSelectingContainer: false });
                  }
                }
              );
            }
          });
        }
      }
    );

    // Listen for messages from the content script or background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'STATUS_UPDATE') {
        setStatus(message.payload.status);
        setMessage(message.payload.message);

        if (message.payload.status === 'error') {
          setError(message.payload.error || 'An unknown error occurred');
          setIsCapturing(false);
          setIsSelectingContainer(false);
          // Update storage to reflect that we're no longer selecting
          chrome.storage.local.set({ isSelectingContainer: false });
        } else if (message.payload.status === 'success') {
          setError('');
          setIsCapturing(false);
          setIsSelectingContainer(false);
          // Update storage to reflect that we're no longer selecting
          chrome.storage.local.set({ isSelectingContainer: false });
        } else if (message.payload.status === 'idle') {
          setIsSelectingContainer(false);
          // Update storage to reflect that we're no longer selecting
          chrome.storage.local.set({ isSelectingContainer: false });
        } else if (message.payload.status === 'info') {
          // For info messages, we should still reset the capturing state
          // This ensures buttons become re-enabled
          setIsCapturing(false);
        }
      } else if (message.type === 'RESET_CAPTURE_STATE') {
        // Reset capturing state when explicitly requested
        setIsCapturing(false);
      }
      return true;
    });
  }, []);

  const handleCapture = () => {
    // Don't allow capture if resume or API key is missing
    if (!resumeText.trim()) {
      setError('Please add your resume before capturing a form');
      return;
    }

    if (!apiKey.trim()) {
      setError('Please add your Gemini API key before capturing a form');
      return;
    }

    setError(''); // Clear any previous errors
    setIsCapturing(true);
    setStatus('processing');
    setMessage('Analyzing form...');

    // Send message to content script to start form capture
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'CAPTURE_FORM' });
      }
    });
  };

  const handleContainerSelect = () => {
    // Don't allow capture if resume or API key is missing
    if (!resumeText.trim()) {
      setError('Please add your resume before capturing a form');
      return;
    }

    if (!apiKey.trim()) {
      setError('Please add your Gemini API key before capturing a form');
      return;
    }

    setError(''); // Clear any previous errors
    setIsCapturing(true);
    setIsSelectingContainer(true);
    setStatus('processing');
    setMessage('Please select a container with form fields...');

    // Store selection state in chrome.storage
    chrome.storage.local.set({ isSelectingContainer: true });

    // Send message to content script to start container selection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'START_CONTAINER_SELECTION',
        });

        // Close the popup to allow the user to see the page
        window.close();
      }
    });
  };

  const handleCancelSelection = () => {
    // Update local state
    setIsSelectingContainer(false);
    setIsCapturing(false);
    setStatus('idle');
    setMessage('Container selection cancelled.');

    // Update storage
    chrome.storage.local.set({ isSelectingContainer: false });

    // Send message to content script to cancel container selection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'CANCEL_CONTAINER_SELECTION',
        });
      }
    });
  };

  const handleFill = () => {
    // Send message to content script to fill the form with AI-generated data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'FILL_FORM' });
      }
    });
  };

  const saveResume = () => {
    // Save resume to chrome storage
    chrome.storage.local.set({ userResume: resumeText }, () => {
      console.log('Resume saved to chrome storage');
    });

    // Also send to background script to update the backend
    chrome.runtime.sendMessage({
      type: 'UPDATE_RESUME',
      payload: { resume: resumeText },
    });

    setShowResumeEditor(false);
    setShowSampleResume(false);
  };

  const saveApiKey = () => {
    // Save API key to chrome storage
    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
      console.log('API key saved to chrome storage');
    });

    // Also send to background script to update the API key
    chrome.runtime.sendMessage({
      type: 'UPDATE_API_KEY',
      payload: { apiKey: apiKey },
    });

    setShowApiKeyEditor(false);
  };

  const toggleResumeEditor = () => {
    setShowResumeEditor(!showResumeEditor);
    if (!showResumeEditor) {
      setShowSampleResume(false);
    }
  };

  const toggleApiKeyEditor = () => {
    setShowApiKeyEditor(!showApiKeyEditor);
  };

  const toggleSampleResume = () => {
    setShowSampleResume(!showSampleResume);
  };

  const copySampleResume = () => {
    navigator.clipboard.writeText(SAMPLE_RESUME);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  const useSampleResume = () => {
    setResumeText(SAMPLE_RESUME);
    setShowSampleResume(false);
  };

  return (
    <div className='p-4 bg-gray-50 min-h-screen'>
      <header className='mb-6'>
        <h1 className='text-2xl font-bold text-blue-600'>
          Remote Job Application Assistant
        </h1>
        <p className='text-gray-600 text-sm'>
          Automate your job applications with Google Gemini
        </p>
      </header>

      {error && (
        <div className='mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded'>
          <p className='text-sm font-medium'>{error}</p>
        </div>
      )}

      <div className='mb-6'>
        <div className='bg-white rounded-lg shadow-md p-4 mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-lg font-semibold'>Form Assistant</h2>
            <span
              className={`px-2 py-1 text-xs rounded-full ${
                status === 'idle'
                  ? 'bg-gray-100 text-gray-600'
                  : status === 'processing'
                  ? 'bg-yellow-100 text-yellow-600'
                  : status === 'success'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
          <p className='text-sm text-gray-600 mb-4'>
            {message ||
              'Capture the current form and let AI fill it out using your resume.'}
          </p>
          <div className='flex flex-col space-y-2'>
            {isSelectingContainer ? (
              <div className='flex flex-col space-y-2'>
                <div className='p-3 bg-purple-100 border border-purple-300 text-purple-800 rounded-md mb-1'>
                  <p className='text-sm font-medium mb-1'>
                    Container selection mode is active
                  </p>
                  <p className='text-xs'>
                    Click on any element on the page that contains the form
                    fields you want to fill.
                  </p>
                </div>
                <button
                  onClick={handleCancelSelection}
                  className='w-full py-2 px-4 rounded-md text-white font-medium bg-red-500 hover:bg-red-600'
                >
                  Cancel Selection
                </button>
              </div>
            ) : (
              <>
                <div className='flex space-x-2'>
                  <button
                    onClick={handleCapture}
                    disabled={
                      isCapturing || !resumeText.trim() || !apiKey.trim()
                    }
                    className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                      isCapturing || !resumeText.trim() || !apiKey.trim()
                        ? 'bg-blue-300 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    title={
                      !resumeText.trim()
                        ? 'Please add your resume first'
                        : !apiKey.trim()
                        ? 'Please add your API key first'
                        : ''
                    }
                  >
                    {isCapturing ? 'Analyzing...' : 'Auto-Find Form'}
                  </button>
                  <button
                    onClick={handleContainerSelect}
                    disabled={
                      isCapturing || !resumeText.trim() || !apiKey.trim()
                    }
                    className={`flex-1 py-2 px-4 rounded-md text-white font-medium ${
                      isCapturing || !resumeText.trim() || !apiKey.trim()
                        ? 'bg-purple-300 cursor-not-allowed'
                        : 'bg-purple-500 hover:bg-purple-600'
                    }`}
                    title='Select a specific container that has form fields'
                  >
                    Select Container
                  </button>
                </div>
                <button
                  onClick={handleFill}
                  disabled={status !== 'success'}
                  className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                    status !== 'success'
                      ? 'bg-green-300 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  Fill Form
                </button>
              </>
            )}
          </div>
        </div>

        {/* API Key Section */}
        <div className='bg-white rounded-lg shadow-md p-4 mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-lg font-semibold'>API Key</h2>
            <button
              onClick={toggleApiKeyEditor}
              className='text-sm text-blue-500 hover:text-blue-700'
            >
              {showApiKeyEditor ? 'Cancel' : apiKey ? 'Edit' : 'Add API Key'}
            </button>
          </div>

          {!showApiKeyEditor ? (
            apiKey ? (
              <div>
                <p className='text-sm text-gray-600 mb-2'>
                  Your Gemini API key is saved.
                </p>
                <div className='max-h-8 overflow-hidden bg-gray-50 p-2 rounded text-xs text-gray-500 mb-2'>
                  <div>{apiKey.substring(0, 8)}•••••••••••••••••••••</div>
                </div>
              </div>
            ) : (
              <p className='text-sm text-gray-600'>
                You need to add your Gemini API key. Click "Add API Key" to get
                started.
              </p>
            )
          ) : (
            <div>
              <p className='text-sm text-gray-600 mb-2'>
                Enter your Google Gemini API key:
              </p>
              <input
                type='password'
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded-md text-sm mb-2'
                placeholder='Enter your Gemini API key...'
              />
              <div className='flex justify-between'>
                <a
                  href='https://ai.google.dev/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-xs text-blue-500 hover:text-blue-700'
                >
                  Get a Gemini API key
                </a>
                <button
                  onClick={saveApiKey}
                  disabled={!apiKey.trim()}
                  className={`py-1 px-3 rounded-md text-white font-medium ${
                    !apiKey.trim()
                      ? 'bg-green-300 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  Save API Key
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resume Section */}
        <div className='bg-white rounded-lg shadow-md p-4'>
          <div className='flex items-center justify-between mb-2'>
            <h2 className='text-lg font-semibold'>My Resume</h2>
            <button
              onClick={toggleResumeEditor}
              className='text-sm text-blue-500 hover:text-blue-700'
            >
              {showResumeEditor ? 'Cancel' : resumeText ? 'Edit' : 'Add Resume'}
            </button>
          </div>

          {!showResumeEditor ? (
            resumeText ? (
              <div>
                <p className='text-sm text-gray-600 mb-2'>
                  Your resume is saved and will be used for filling out
                  applications.
                </p>
                <div className='max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs text-gray-500 mb-2'>
                  {resumeText.split('\n').map((line, i) => (
                    <div key={i}>{line || ' '}</div>
                  ))}
                </div>
              </div>
            ) : (
              <p className='text-sm text-gray-600'>
                You haven't added your resume yet. Click "Add Resume" to get
                started.
              </p>
            )
          ) : (
            <div>
              <p className='text-sm text-gray-600 mb-2'>
                Enter your resume in plain text format:
              </p>
              <div className='flex justify-between items-center mb-2'>
                <button
                  onClick={toggleSampleResume}
                  className='text-xs text-blue-500 hover:underline'
                >
                  {showSampleResume ? 'Hide sample' : 'See sample format'}
                </button>
                <p className='text-xs text-gray-500'>
                  Have a PDF? Ask ChatGPT to convert it to this format
                </p>
              </div>

              {showSampleResume && (
                <div className='mb-4 border border-gray-200 rounded-md'>
                  <div className='bg-gray-50 p-2 flex justify-between items-center'>
                    <h3 className='text-sm font-medium text-gray-700'>
                      Sample Resume Format
                    </h3>
                    <div className='flex space-x-2'>
                      <button
                        onClick={useSampleResume}
                        className='text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600'
                      >
                        Use Template
                      </button>
                      <button
                        onClick={copySampleResume}
                        className='text-xs bg-gray-500 text-white py-1 px-2 rounded hover:bg-gray-600'
                      >
                        {copiedSample ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className='p-2 text-xs text-gray-600 overflow-y-auto max-h-32 whitespace-pre-wrap'>
                    {SAMPLE_RESUME}
                  </div>
                </div>
              )}

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                className='w-full h-64 p-2 border border-gray-300 rounded-md text-sm mb-2'
                placeholder='Enter your resume here...'
              />
              <div className='flex justify-end'>
                <button
                  onClick={saveResume}
                  disabled={!resumeText.trim()}
                  className={`py-1 px-3 rounded-md text-white font-medium ${
                    !resumeText.trim()
                      ? 'bg-green-300 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  Save Resume
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className='text-center text-xs text-gray-500'>
        <p>Remote Job Application Assistant v1.0 - Powered by Google Gemini</p>
      </footer>
    </div>
  );
};

export default Popup;
