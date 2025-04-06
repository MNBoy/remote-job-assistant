import { FormData, FormField, Message } from '../types';

// Store form data after it's been captured and processed
let capturedFormData: FormData | null = null;
let processedFormData: Record<string, string> | null = null;
let isSelectingContainer = false;
let selectedContainer: HTMLElement | null = null;
let highlightElement: HTMLElement | null = null;

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.type === 'CAPTURE_FORM') {
      captureFormData();
    } else if (message.type === 'START_CONTAINER_SELECTION') {
      startContainerSelection();
    } else if (message.type === 'CANCEL_CONTAINER_SELECTION') {
      cancelContainerSelection();
    } else if (message.type === 'CHECK_SELECTION_STATUS') {
      // Return whether selection mode is active
      sendResponse({ isSelecting: isSelectingContainer });
      return true;
    } else if (message.type === 'FILL_FORM') {
      if (processedFormData) {
        fillFormWithData(processedFormData);
      } else {
        sendStatusUpdate(
          'error',
          'No processed form data available. Please capture form first.',
          'You need to capture the form before filling it.'
        );
      }
    }
    return true;
  }
);

// Start container selection mode
const startContainerSelection = () => {
  // Store selection state in chrome.storage
  chrome.storage.local.set({ isSelectingContainer: true });

  // Check if we're already in selection mode
  if (isSelectingContainer) {
    return;
  }

  isSelectingContainer = true;

  // Create highlight element
  highlightElement = document.createElement('div');
  highlightElement.style.position = 'absolute';
  highlightElement.style.pointerEvents = 'none';
  highlightElement.style.zIndex = '10000';
  highlightElement.style.border = '2px solid #4285f4';
  highlightElement.style.backgroundColor = 'rgba(66, 133, 244, 0.1)';
  highlightElement.style.display = 'none';
  document.body.appendChild(highlightElement);

  // Create instruction overlay
  const instructionOverlay = document.createElement('div');
  instructionOverlay.id = 'form-selector-instruction';
  instructionOverlay.style.position = 'fixed';
  instructionOverlay.style.top = '10px';
  instructionOverlay.style.left = '50%';
  instructionOverlay.style.transform = 'translateX(-50%)';
  instructionOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  instructionOverlay.style.color = 'white';
  instructionOverlay.style.padding = '10px 20px';
  instructionOverlay.style.borderRadius = '5px';
  instructionOverlay.style.zIndex = '10001';
  instructionOverlay.style.fontFamily = 'Arial, sans-serif';
  instructionOverlay.style.fontSize = '14px';
  instructionOverlay.style.textAlign = 'center';
  instructionOverlay.innerHTML =
    'Click on the container with form fields. <span style="color:#aaa">Press ESC to cancel</span>';
  document.body.appendChild(instructionOverlay);

  // Add event listeners for mouse movement and clicks
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('click', handleElementClick, true);

  // Add escape key to cancel selection
  document.addEventListener('keydown', handleKeyDown);

  // Update cursor and notify user
  document.body.style.cursor = 'crosshair';
};

// Handle mouse movement during selection
const handleMouseMove = (e: MouseEvent) => {
  if (!isSelectingContainer) return;

  // Get element under mouse
  const element = document.elementFromPoint(
    e.clientX,
    e.clientY
  ) as HTMLElement;

  if (
    element &&
    element !== document.body &&
    element !== document.documentElement &&
    element.id !== 'form-selector-instruction'
  ) {
    // Get element dimensions and position
    const rect = element.getBoundingClientRect();

    // Update highlight element
    if (highlightElement) {
      highlightElement.style.display = 'block';
      highlightElement.style.top = `${window.scrollY + rect.top}px`;
      highlightElement.style.left = `${window.scrollX + rect.left}px`;
      highlightElement.style.width = `${rect.width}px`;
      highlightElement.style.height = `${rect.height}px`;
    }
  }
};

// Handle element click during selection
const handleElementClick = (e: MouseEvent) => {
  if (!isSelectingContainer) return;

  // Prevent default behavior
  e.preventDefault();
  e.stopPropagation();

  // Get element under mouse
  const element = document.elementFromPoint(
    e.clientX,
    e.clientY
  ) as HTMLElement;

  // Ignore clicks on our instruction element
  if (element && element.id === 'form-selector-instruction') {
    return false;
  }

  if (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    // Set selected container
    selectedContainer = element;

    // End selection mode
    endContainerSelection();

    // Capture form data using the selected container
    captureFormDataFromContainer(selectedContainer);

    // Store selection success status
    chrome.storage.local.set({
      selection_success: true,
      isSelectingContainer: false,
    });

    // Create a visual feedback element to inform user
    const feedbackElement = document.createElement('div');
    feedbackElement.style.position = 'fixed';
    feedbackElement.style.top = '10px';
    feedbackElement.style.left = '50%';
    feedbackElement.style.transform = 'translateX(-50%)';
    feedbackElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    feedbackElement.style.color = 'white';
    feedbackElement.style.padding = '10px 20px';
    feedbackElement.style.borderRadius = '5px';
    feedbackElement.style.zIndex = '10001';
    feedbackElement.style.fontFamily = 'Arial, sans-serif';
    feedbackElement.style.fontSize = '14px';
    feedbackElement.style.textAlign = 'center';
    feedbackElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
    feedbackElement.innerHTML =
      'Form container selected! Click the extension icon to continue.';
    document.body.appendChild(feedbackElement);

    // Remove the feedback after 5 seconds
    setTimeout(() => {
      if (feedbackElement.parentNode) {
        feedbackElement.parentNode.removeChild(feedbackElement);
      }
    }, 5000);

    // Request to open the popup
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  }

  return false;
};

// Handle key press during selection
const handleKeyDown = (e: KeyboardEvent) => {
  if (isSelectingContainer && e.key === 'Escape') {
    cancelContainerSelection();
  }
};

// End container selection mode
const endContainerSelection = () => {
  isSelectingContainer = false;

  // Update storage to reflect that we're no longer selecting
  chrome.storage.local.set({ isSelectingContainer: false });

  // Remove event listeners
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('click', handleElementClick, true);
  document.removeEventListener('keydown', handleKeyDown);

  // Reset cursor
  document.body.style.cursor = 'default';

  // Remove highlight element
  if (highlightElement) {
    document.body.removeChild(highlightElement);
    highlightElement = null;
  }

  // Remove instruction overlay
  const instructionOverlay = document.getElementById(
    'form-selector-instruction'
  );
  if (instructionOverlay) {
    document.body.removeChild(instructionOverlay);
  }
};

// Cancel container selection
const cancelContainerSelection = () => {
  // Clear selection state in chrome.storage
  chrome.storage.local.set({
    isSelectingContainer: false,
    selection_cancelled: true,
  });

  endContainerSelection();
  sendStatusUpdate('idle', 'Container selection cancelled.');

  // Create a visual feedback element
  const feedbackElement = document.createElement('div');
  feedbackElement.style.position = 'fixed';
  feedbackElement.style.top = '10px';
  feedbackElement.style.left = '50%';
  feedbackElement.style.transform = 'translateX(-50%)';
  feedbackElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  feedbackElement.style.color = 'white';
  feedbackElement.style.padding = '10px 20px';
  feedbackElement.style.borderRadius = '5px';
  feedbackElement.style.zIndex = '10001';
  feedbackElement.style.fontFamily = 'Arial, sans-serif';
  feedbackElement.style.fontSize = '14px';
  feedbackElement.style.textAlign = 'center';
  feedbackElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
  feedbackElement.innerHTML =
    'Selection cancelled! Click the extension icon to continue.';
  document.body.appendChild(feedbackElement);

  // Remove the feedback after 5 seconds
  setTimeout(() => {
    if (feedbackElement.parentNode) {
      feedbackElement.parentNode.removeChild(feedbackElement);
    }
  }, 5000);

  // Request to open the popup
  chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
};

// Capture form data from a specific container
const captureFormDataFromContainer = async (container: HTMLElement) => {
  try {
    sendStatusUpdate('processing', 'Analyzing fields in selected container...');

    // Get all input, select, and textarea elements in the container
    const formElements = container.querySelectorAll('input, select, textarea');

    if (formElements.length === 0) {
      sendStatusUpdate(
        'error',
        'No input fields found in the selected container.',
        'The container you selected does not contain any input fields that can be filled.'
      );
      return;
    }

    const fields: FormField[] = [];

    // Process each form element
    formElements.forEach((element) => {
      const el = element as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;

      // Skip hidden and submit inputs
      if (
        el.type === 'hidden' ||
        el.type === 'submit' ||
        el.type === 'button'
      ) {
        return;
      }

      // Find label for this element
      let label = '';
      const id = el.id;
      if (id) {
        const labelElement = document.querySelector(`label[for="${id}"]`);
        if (labelElement) {
          label = labelElement.textContent?.trim() || '';
        }
      }

      // If no label found, try to find a nearby label or placeholder
      if (!label) {
        // Check for placeholder attribute - only for input and textarea elements
        if ('placeholder' in el) {
          label = el.placeholder || '';
        }

        // If still no label, check for a parent with a label
        if (!label) {
          const parent = el.closest('.form-group, .field, .input-group');
          if (parent) {
            const labelInParent = parent.querySelector('label');
            if (labelInParent) {
              label = labelInParent.textContent?.trim() || '';
            }
          }
        }
      }

      // Create a field object
      const field: FormField = {
        id: el.id || '',
        name: el.name || '',
        type: el.type || 'text',
        label,
        value: el.value,
        required: el.required,
      };

      // For file inputs, add a note that these cannot be filled automatically
      if (el instanceof HTMLInputElement && el.type === 'file') {
        field.cannotAutoFill = true;
        field.value = ''; // Ensure we don't try to pass any value
        field.notes =
          'File inputs cannot be filled automatically due to security restrictions';
      }

      // For select elements, add options
      if (el.tagName.toLowerCase() === 'select') {
        const selectElement = el as HTMLSelectElement;
        field.options = Array.from(selectElement.options).map(
          (option) => option.text
        );
      }

      fields.push(field);
    });

    // Check if we have enough labeled fields
    let labeledFieldsCount = fields.filter(
      (field) => field.label || field.name || field.id
    ).length;
    if (labeledFieldsCount === 0) {
      sendStatusUpdate(
        'error',
        'No identifiable fields found.',
        'Could not identify any fields with labels, names, or IDs. This may not work with this form.'
      );
      return;
    }

    // Create form data object
    capturedFormData = {
      url: window.location.href,
      title: document.title,
      fields: fields,
    };

    // Send the form data to the background script for AI processing
    chrome.runtime.sendMessage(
      {
        type: 'PROCESS_FORM',
        payload: capturedFormData,
      },
      (response) => {
        if (response && response.success) {
          processedFormData = response.data;
          sendStatusUpdate(
            'success',
            'Form analyzed successfully! Ready to fill.'
          );
        } else {
          sendStatusUpdate(
            'error',
            response?.message || 'Failed to process form data.',
            response?.error ||
              'The server could not process this form. Please try again or check your API key and resume.'
          );
        }
      }
    );
  } catch (error: any) {
    console.error('Error capturing form data from container:', error);
    sendStatusUpdate(
      'error',
      'An error occurred while capturing form data.',
      error?.message || 'An unexpected error occurred while analyzing the form.'
    );
  }
};

// Capture all form fields on the current page
const captureFormData = async () => {
  try {
    sendStatusUpdate('processing', 'Analyzing form fields...');

    // Find all forms on the page
    const forms = document.querySelectorAll('form');
    if (forms.length === 0) {
      // No forms found, prompt user to select a container instead
      sendStatusUpdate(
        'error',
        'No forms detected on this page. Please select a container with form fields.',
        'Click on "Select Container" to choose the container that has the form fields.'
      );

      // Also send a separate message to reset the capturing state in the popup
      chrome.runtime.sendMessage({
        type: 'RESET_CAPTURE_STATE',
      });

      return;
    }

    // For simplicity, we'll process the first form found
    const form = forms[0];

    // Get all input, select, and textarea elements
    const formElements = form.querySelectorAll('input, select, textarea');

    if (formElements.length === 0) {
      sendStatusUpdate(
        'error',
        'No input fields found in the form.',
        'The form on this page does not contain any input fields that can be filled.'
      );
      return;
    }

    const fields: FormField[] = [];

    // Process each form element
    formElements.forEach((element) => {
      const el = element as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement;

      // Skip hidden and submit inputs
      if (
        el.type === 'hidden' ||
        el.type === 'submit' ||
        el.type === 'button'
      ) {
        return;
      }

      // Find label for this element
      let label = '';
      const id = el.id;
      if (id) {
        const labelElement = document.querySelector(`label[for="${id}"]`);
        if (labelElement) {
          label = labelElement.textContent?.trim() || '';
        }
      }

      // If no label found, try to find a nearby label or placeholder
      if (!label) {
        // Check for placeholder attribute - only for input and textarea elements
        if ('placeholder' in el) {
          label = el.placeholder || '';
        }

        // If still no label, check for a parent with a label
        if (!label) {
          const parent = el.closest('.form-group, .field, .input-group');
          if (parent) {
            const labelInParent = parent.querySelector('label');
            if (labelInParent) {
              label = labelInParent.textContent?.trim() || '';
            }
          }
        }
      }

      // Create a field object
      const field: FormField = {
        id: el.id || '',
        name: el.name || '',
        type: el.type || 'text',
        label: label,
        value: el.value,
        required: el.required,
      };

      // For file inputs, add a note that these cannot be filled automatically
      if (el instanceof HTMLInputElement && el.type === 'file') {
        field.cannotAutoFill = true;
        field.value = ''; // Ensure we don't try to pass any value
        field.notes =
          'File inputs cannot be filled automatically due to security restrictions';
      }

      // For select elements, add options
      if (el.tagName.toLowerCase() === 'select') {
        const selectElement = el as HTMLSelectElement;
        field.options = Array.from(selectElement.options).map(
          (option) => option.text
        );
      }

      fields.push(field);
    });

    // Check if we have enough labeled fields
    let labeledFieldsCount = fields.filter(
      (field) => field.label || field.name || field.id
    ).length;
    if (labeledFieldsCount === 0) {
      sendStatusUpdate(
        'error',
        'No identifiable fields found.',
        'Could not identify any fields with labels, names, or IDs. This may not work with this form.'
      );
      return;
    }

    // Create form data object
    capturedFormData = {
      url: window.location.href,
      title: document.title,
      fields: fields,
    };

    // Send the form data to the background script for AI processing
    chrome.runtime.sendMessage(
      {
        type: 'PROCESS_FORM',
        payload: capturedFormData,
      },
      (response) => {
        if (response && response.success) {
          processedFormData = response.data;
          sendStatusUpdate(
            'success',
            'Form analyzed successfully! Ready to fill.'
          );
        } else {
          sendStatusUpdate(
            'error',
            response?.message || 'Failed to process form data.',
            response?.error ||
              'The server could not process this form. Please try again or check your API key and resume.'
          );
        }
      }
    );
  } catch (error: any) {
    console.error('Error capturing form data:', error);
    sendStatusUpdate(
      'error',
      'An error occurred while capturing form data.',
      error?.message || 'An unexpected error occurred while analyzing the form.'
    );
  }
};

// Fill the form with processed data
const fillFormWithData = (data: Record<string, string>) => {
  try {
    if (!capturedFormData) {
      sendStatusUpdate(
        'error',
        'No form data available.',
        'Please capture the form first before trying to fill it.'
      );
      return;
    }

    sendStatusUpdate('processing', 'Filling form fields...');
    console.log('Form data to fill:', data);

    // Determine which container to use for finding and filling fields
    let container: Element | null = null;

    // If we have a selected container, use that
    if (selectedContainer) {
      container = selectedContainer;
    } else {
      // Otherwise, try to find a form
      const forms = document.querySelectorAll('form');
      if (forms.length > 0) {
        container = forms[0];
      }
    }

    if (!container) {
      sendStatusUpdate(
        'error',
        'Form container no longer available on this page.',
        'The form that was previously captured is no longer available on this page.'
      );
      return;
    }

    // Keep track of fields we've filled
    let filledCount = 0;
    // Keep track of fields we tried to fill
    let attemptedFields = 0;
    // Track errors for debugging
    const fillErrors: Array<{ field: FormField; error: string }> = [];

    // Log all form fields for debugging
    console.log('Captured form fields:', capturedFormData.fields);

    // Create a normalized version of the data keys for better matching
    const normalizedData: Record<string, string> = {};
    Object.keys(data).forEach((key) => {
      normalizedData[key.toLowerCase().trim()] = data[key];

      // Also add variants without special characters
      const simplifiedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (simplifiedKey !== key.toLowerCase()) {
        normalizedData[simplifiedKey] = data[key];
      }
    });

    // Go through each captured field and fill it if we have data
    capturedFormData.fields.forEach((field) => {
      try {
        attemptedFields++;

        // Debug log for fields with complex IDs
        if (field.id && /[^\w-]/.test(field.id)) {
          console.log(
            `Field has complex ID that might need special handling: "${field.id}"`,
            field
          );
        }

        // Find the field by id or name
        let element: HTMLElement | null = null;

        // Try multiple strategies to find the element
        if (field.id) {
          // Strategy 1: Find by ID within container - with proper CSS escaping
          try {
            // CSS.escape is the proper way to escape IDs for use in selectors
            const escapedId = CSS.escape(field.id);
            element = container?.querySelector(`#${escapedId}`) as HTMLElement;
          } catch (e) {
            // Fallback if CSS.escape is not available
            console.log(
              'CSS.escape not available, using getElementById instead'
            );
          }

          // Strategy 2: Find by ID document-wide - this is safer because it doesn't use CSS selectors
          if (!element) {
            element = document.getElementById(field.id);
          }
        }

        // Strategy 3: Find by name - with proper escaping
        if (!element && field.name) {
          try {
            const escapedName = CSS.escape(field.name);
            element = container?.querySelector(
              `[name="${escapedName}"]`
            ) as HTMLElement;

            if (!element) {
              // Try to find in the entire document if not found in container
              element = document.querySelector(
                `[name="${escapedName}"]`
              ) as HTMLElement;
            }
          } catch (e) {
            // Fallback to a safer getElementsByName approach
            const elements = document.getElementsByName(field.name);
            if (elements.length > 0) {
              element = elements[0] as HTMLElement;
            }
          }
        }

        // Strategy 4: If we have a label, try to find by label text
        if (!element && field.label) {
          // Find labels with matching text
          try {
            const labels = Array.from(document.querySelectorAll('label'));
            for (const label of labels) {
              if (
                label.textContent?.trim().toLowerCase() ===
                field.label.toLowerCase()
              ) {
                // If label has a 'for' attribute, use it to find the element
                if (label.htmlFor) {
                  element = document.getElementById(label.htmlFor);
                  if (element) break;
                }

                // If no 'for' attribute or element not found, check if label wraps an input
                const inputInLabel = label.querySelector(
                  'input, select, textarea'
                );
                if (inputInLabel) {
                  element = inputInLabel as HTMLElement;
                  break;
                }
              }
            }
          } catch (error) {
            console.error('Error finding element by label:', error);
          }
        }

        // Strategy 5: Try to find input with matching placeholder
        if (!element && field.label) {
          try {
            // Use a safer approach by iterating through inputs directly
            const inputs = Array.from(
              container.querySelectorAll('input, textarea')
            );
            for (const input of inputs) {
              try {
                const placeholder =
                  (input as HTMLInputElement).placeholder || '';
                if (
                  placeholder.toLowerCase().includes(field.label.toLowerCase())
                ) {
                  element = input as HTMLElement;
                  break;
                }
              } catch (inputError) {
                // Skip this input if there's an issue with it
                console.log('Error checking input placeholder:', inputError);
              }
            }
          } catch (error) {
            console.error('Error finding element by placeholder:', error);
          }
        }

        // Strategy 6: For complex IDs, try to find by directly looking at all inputs
        if (!element && (field.id || field.name)) {
          try {
            const allInputs = Array.from(
              container.querySelectorAll('input, select, textarea')
            );
            for (const input of allInputs) {
              if (
                (field.id && input.id === field.id) ||
                (field.name && (input as HTMLInputElement).name === field.name)
              ) {
                element = input as HTMLElement;
                break;
              }
            }
          } catch (error) {
            console.error(
              'Error finding element by direct ID/name comparison:',
              error
            );
          }
        }

        // If still not found, skip this field
        if (!element) {
          return;
        }

        // Get the value from processed data using multiple matching strategies
        let value = '';

        // Strategy 1: Direct match by id, name, or label
        if (field.id && data[field.id]) {
          value = data[field.id];
        } else if (field.name && data[field.name]) {
          value = data[field.name];
        } else if (field.label && data[field.label]) {
          value = data[field.label];
        }

        // Strategy 2: Case-insensitive match
        if (!value) {
          const fieldKeys = [field.id, field.name, field.label].filter(Boolean);
          for (const key of fieldKeys) {
            if (!key) continue;

            const lowercaseKey = key.toLowerCase().trim();
            if (normalizedData[lowercaseKey]) {
              value = normalizedData[lowercaseKey];
              break;
            }

            // Try without special characters
            const simplifiedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (
              simplifiedKey !== lowercaseKey &&
              normalizedData[simplifiedKey]
            ) {
              value = normalizedData[simplifiedKey];
              break;
            }
          }
        }

        // Strategy 3: Partial match (especially useful for long labels)
        if (!value && field.label) {
          for (const [key, val] of Object.entries(data)) {
            if (
              key.toLowerCase().includes(field.label.toLowerCase()) ||
              field.label.toLowerCase().includes(key.toLowerCase())
            ) {
              value = val;
              break;
            }
          }
        }

        // If still no value found, try one last strategy - look for key terms in field names/labels
        if (!value) {
          const commonFieldTerms: Record<string, string[]> = {
            name: ['name', 'full name', 'first name', 'last name'],
            email: ['email', 'e-mail', 'mail'],
            phone: ['phone', 'telephone', 'mobile', 'cell'],
            address: ['address', 'street', 'location'],
            city: ['city', 'town'],
            state: ['state', 'province', 'region'],
            zip: ['zip', 'postal', 'zip code', 'postcode'],
            country: ['country', 'nation'],
          };

          // Check if field matches any common terms
          const fieldTexts = [field.id, field.name, field.label]
            .filter(Boolean)
            .map((t) => t.toLowerCase());

          for (const [dataType, terms] of Object.entries(commonFieldTerms)) {
            // Check if any field text contains any of the terms for this data type
            const matchesTerm = terms.some((term) =>
              fieldTexts.some((fieldText) => fieldText.includes(term))
            );

            if (matchesTerm) {
              // Look for this data type in our AI data
              for (const [key, val] of Object.entries(data)) {
                if (terms.some((term) => key.toLowerCase().includes(term))) {
                  value = val;
                  break;
                }
              }
              if (value) break;
            }
          }
        }

        // If still no value to fill, skip this field
        if (!value) {
          return;
        }

        // Fill based on element type with error handling
        try {
          if (element instanceof HTMLInputElement) {
            // Skip file inputs - cannot set values on these for security reasons
            if (element.type === 'file') {
              console.log('Skipping file input:', element.name || element.id);
              return;
            }

            if (element.type === 'checkbox' || element.type === 'radio') {
              // For checkboxes and radio buttons
              const valueAsLower = value.toLowerCase();
              const isChecked =
                valueAsLower === 'yes' ||
                valueAsLower === 'true' ||
                valueAsLower === 'checked' ||
                valueAsLower === 'y' ||
                valueAsLower === '1';

              // For radio buttons, check if value matches option
              if (element.type === 'radio' && element.value) {
                if (
                  element.value.toLowerCase() === valueAsLower ||
                  element.value.toLowerCase().includes(valueAsLower) ||
                  valueAsLower.includes(element.value.toLowerCase())
                ) {
                  element.checked = true;
                }
              } else {
                element.checked = isChecked;
              }
            } else {
              // For text, email, etc.
              element.value = value;
              // Dispatch input event to trigger any listeners
              element.dispatchEvent(new Event('input', { bubbles: true }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            filledCount++;
          } else if (element instanceof HTMLSelectElement) {
            // For select dropdowns, try multiple strategies to find matching option
            const options = Array.from(element.options);
            let matched = false;

            // Strategy 1: Find option with text that includes our value
            const matchingOption = options.find(
              (option) =>
                option.text.toLowerCase().includes(value.toLowerCase()) ||
                value.toLowerCase().includes(option.text.toLowerCase()) ||
                option.value.toLowerCase() === value.toLowerCase()
            );

            if (matchingOption) {
              element.value = matchingOption.value;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              matched = true;
            } else {
              // Strategy 2: Find closest matching option by text
              let bestMatch = '';
              let highestScore = 0;

              options.forEach((option) => {
                // Simple similarity score - count matching words
                const optionWords = option.text.toLowerCase().split(/\s+/);
                const valueWords = value.toLowerCase().split(/\s+/);

                const matchingWords = optionWords.filter((word) =>
                  valueWords.some(
                    (valueWord) =>
                      valueWord.includes(word) || word.includes(valueWord)
                  )
                );

                const score =
                  matchingWords.length /
                  Math.max(optionWords.length, valueWords.length);

                if (score > highestScore) {
                  highestScore = score;
                  bestMatch = option.value;
                }
              });

              if (highestScore > 0.3) {
                // Threshold for considering it a match
                element.value = bestMatch;
                element.dispatchEvent(new Event('change', { bubbles: true }));
                matched = true;
              }
            }

            if (matched) {
              filledCount++;
            }
          } else if (element instanceof HTMLTextAreaElement) {
            // For textareas
            element.value = value;
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
        } catch (error: unknown) {
          console.error('Error filling field:', field, error);
          fillErrors.push({
            field,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } catch (error) {
        console.error('Error filling field:', field, error);
        fillErrors.push({
          field,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    if (filledCount > 0) {
      sendStatusUpdate(
        'success',
        `Successfully filled ${filledCount} field(s).`
      );
    } else {
      sendStatusUpdate(
        'error',
        'No fields were filled. Data may not match the form.',
        'The AI-generated data could not be matched to any fields in the form. This form might have a complex structure or custom fields.'
      );
    }

    if (fillErrors.length > 0) {
      console.warn('Encountered errors while filling fields:', fillErrors);
      sendStatusUpdate(
        'warning',
        'Some fields were not filled due to errors.',
        'There were errors while filling some fields. Please check the console for more details.'
      );
    }
  } catch (error: any) {
    console.error('Error filling form:', error);
    sendStatusUpdate(
      'error',
      'An error occurred while filling the form.',
      error?.message ||
        'An unexpected error occurred while filling the form fields.'
    );
  }
};

// Send status updates to the popup
const sendStatusUpdate = (status: string, message: string, error?: string) => {
  chrome.runtime.sendMessage({
    type: 'STATUS_UPDATE',
    payload: {
      status,
      message,
      error,
    },
  });
};
