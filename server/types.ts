// Duplicated types from src/types to avoid module resolution issues
export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  required: boolean;
  options?: string[];
  cannotAutoFill?: boolean; // Indicates if field cannot be automatically filled (e.g., file inputs)
  notes?: string; // Additional notes about the field for AI processing
}

export interface FormData {
  url: string;
  title: string;
  fields: FormField[];
  userResume?: string; // Optional resume text provided by the user
  apiKey?: string; // Optional API key provided by the user
}

export interface AIResponse {
  fieldValues: {
    [key: string]: string;
  };
}

export interface Message {
  type: string;
  payload: any;
}
