import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { FormData } from './types';

// Load environment variables for port config
dotenv.config();

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Set up middleware
app.use(cors());
app.use(express.json());

// Endpoint to process form data with AI
app.post('/api/process-form', async (req, res) => {
  try {
    const formData: FormData = req.body;

    // Validate required data
    if (!formData || !formData.fields || formData.fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid form data. No fields provided.',
      });
    }

    // Validate API key
    if (!formData.apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Missing API key. Please provide a Gemini API key.',
      });
    }

    // Validate resume
    if (!formData.userResume) {
      return res.status(400).json({
        success: false,
        message: 'Missing resume. Please provide resume information.',
      });
    }

    console.log('Received form data:', {
      url: formData.url,
      title: formData.title,
      fieldCount: formData.fields.length,
      hasResume: !!formData.userResume,
      hasApiKey: !!formData.apiKey,
    });

    // Process the form data with AI
    const result = await processFormWithAI(formData);

    // Return the AI-generated values
    res.json({
      success: true,
      fieldValues: result,
    });
  } catch (error: any) {
    console.error('Error processing form data:', error);

    // Detect API key errors
    let message = 'An error occurred while processing the form data with AI.';
    let status = 500;

    if (error.message && error.message.includes('API key')) {
      message =
        'Invalid API key. Please check your Gemini API key and try again.';
      status = 401;
    }

    res.status(status).json({
      success: false,
      message: message,
      error: error.message || 'Unknown error',
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log('Ready to process form data with client-provided API keys');
});

// Process form data with Gemini AI
async function processFormWithAI(
  formData: FormData
): Promise<Record<string, string>> {
  try {
    // Initialize Gemini API client with key from request
    const genAI = new GoogleGenerativeAI(formData.apiKey || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    // Get resume content from request payload
    const resumeContent = `Resume content:\n${formData.userResume}`;

    // Format the form data for the AI prompt
    const formattedFields = formData.fields
      .map((field) => {
        let description = `Field: ${field.label || field.name || field.id}`;
        description += `\nType: ${field.type}`;

        if (field.required) {
          description += '\nRequired: Yes';
        }

        if (field.options && field.options.length > 0) {
          description += `\nOptions: ${field.options.join(', ')}`;
        }

        // Add information about file inputs or other fields that cannot be auto-filled
        if (field.cannotAutoFill) {
          description += '\nCannotAutoFill: Yes';
          if (field.notes) {
            description += `\nNotes: ${field.notes}`;
          }
        }

        return description;
      })
      .join('\n\n');

    const prompt = `
You are an AI assistant helping to fill out a job application form on ${formData.url}
Form title: ${formData.title}

Here are the form fields:
${formattedFields}

Here is the applicant's resume information:
${resumeContent}

Please provide appropriate values for each field based on the field label, type, and the resume information.
Use the resume information where applicable to fill out relevant fields.
Respond in JSON format with keys matching the field labels (or names if no label exists) and values that would be appropriate for a job application.

IMPORTANT RULES:
1. For dropdown or select fields, provide a value that matches one of the available options.
2. For checkboxes, respond with "yes" or "no" as appropriate.
3. For fields not covered by the resume, make up realistic information for the applicant.
4. DO NOT provide values for file input fields - they cannot be filled programmatically.
5. Skip any field marked with "cannotAutoFill: true" - these are typically file inputs.
`;

    // Call Gemini API
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const parsedResponse = JSON.parse(jsonStr);
      return parsedResponse;
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', text);
      throw new Error('Invalid JSON response from AI');
    }
  } catch (error) {
    console.error('Error in AI processing:', error);
    throw error;
  }
}
