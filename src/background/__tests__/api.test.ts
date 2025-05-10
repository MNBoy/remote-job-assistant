import '@testing-library/jest-dom';
import { FormData } from '../../types';

global.fetch = jest.fn();

const processFormWithAI = async (
  formData: FormData
): Promise<Record<string, string>> => {
  try {
    const API_BASE_URL = 'http://localhost:3000';

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
    // Don't log the error here as we're expecting errors in some tests
    throw error;
  }
};

describe('API Functions', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  test('processFormWithAI should call fetch with correct parameters', async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        fieldValues: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Sample form data
    const formData: FormData = {
      url: 'https://example.com/job-application',
      title: 'Software Developer Application',
      fields: [
        {
          id: 'name',
          name: 'fullName',
          type: 'text',
          label: 'Full Name',
          value: '',
          required: true,
        },
        {
          id: 'email',
          name: 'email',
          type: 'email',
          label: 'Email Address',
          value: '',
          required: true,
        },
      ],
      userResume: 'Test Resume',
      apiKey: 'test-api-key',
    };

    // Call the function
    const result = await processFormWithAI(formData);

    // Check if fetch was called with the correct URL and options
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/process-form',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      }
    );

    // Check if the function returns the expected result
    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  test('processFormWithAI should handle API errors', async () => {
    // Mock error response
    const mockResponse = {
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({
        message: 'Server error',
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Sample form data
    const formData: FormData = {
      url: 'https://example.com/job-application',
      title: 'Software Developer Application',
      fields: [],
      userResume: 'Test Resume',
      apiKey: 'test-api-key',
    };

    // Use try/catch to handle the expected error
    let error: Error | null = null;
    try {
      await processFormWithAI(formData);
    } catch (e) {
      error = e as Error;
    }

    // Verify the error was thrown with the correct message
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Server error');
  });

  test('processFormWithAI should handle non-success responses', async () => {
    // Mock non-success response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: false,
        message: 'Invalid form data',
      }),
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    // Sample form data
    const formData: FormData = {
      url: 'https://example.com/job-application',
      title: 'Software Developer Application',
      fields: [],
      userResume: 'Test Resume',
      apiKey: 'test-api-key',
    };

    // Use try/catch to handle the expected error
    let error: Error | null = null;
    try {
      await processFormWithAI(formData);
    } catch (e) {
      error = e as Error;
    }

    // Verify the error was thrown with the correct message
    expect(error).not.toBeNull();
    expect(error?.message).toBe('Invalid form data');
  });
});
