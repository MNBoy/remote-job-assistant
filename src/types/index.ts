export interface FormField {
  id: string;
  name: string;
  type: string;
  label: string;
  value: string;
  required: boolean;
  options?: string[];
  cannotAutoFill?: boolean;
  notes?: string;
}

export interface FormData {
  url: string;
  title: string;
  fields: FormField[];
  userResume?: string;
  apiKey?: string;
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
