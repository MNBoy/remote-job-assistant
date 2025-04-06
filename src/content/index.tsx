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
        'info',
        'No forms detected on this page. Please select a container with form fields.',
        'Click on "Select Container" to choose the container that has the form fields.'
      );
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

    // Go through each captured field and fill it if we have data
    capturedFormData.fields.forEach((field) => {
      console.log('🚀 ~ capturedFormData.fields.forEach ~ field:', field);
      // Find the field by id or name
      let element: HTMLElement | null = null;

      if (field.id) {
        // First try to find within container
        element = container?.querySelector(`#${field.id}`) as HTMLElement;

        // If not found, try document-wide (for cases where ID is unique)
        if (!element) {
          element = document.getElementById(field.id);
        }
      }

      if (!element && field.name) {
        element = container?.querySelector(
          `[name="${field.name}"]`
        ) as HTMLElement;
      }

      if (!element) {
        return; // Skip if element not found
      }

      // Get the value from processed data
      let value = '';

      // Try using id or name as key first
      if (field.id && data[field.id]) {
        value = data[field.id];
      } else if (field.name && data[field.name]) {
        value = data[field.name];
      } else if (field.label && data[field.label]) {
        // If no match by id/name, try by label
        value = data[field.label];
      }

      if (!value) {
        return; // Skip if no value to fill
      }

      // Fill based on element type
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
            valueAsLower === 'checked';
          element.checked = isChecked;
        } else {
          // For text, email, etc.
          element.value = value;
          // Dispatch input event to trigger any listeners
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
        filledCount++;
      } else if (element instanceof HTMLSelectElement) {
        // For select dropdowns, try to find matching option
        const options = Array.from(element.options);
        const matchingOption = options.find(
          (option) =>
            option.text.toLowerCase().includes(value.toLowerCase()) ||
            option.value.toLowerCase() === value.toLowerCase()
        );

        if (matchingOption) {
          element.value = matchingOption.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        }
      } else if (element instanceof HTMLTextAreaElement) {
        // For textareas
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
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
