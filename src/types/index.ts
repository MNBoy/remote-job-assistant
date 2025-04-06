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
  type:
    | 'CAPTURE_FORM'
    | 'START_CONTAINER_SELECTION'
    | 'CANCEL_CONTAINER_SELECTION'
    | 'CHECK_SELECTION_STATUS'
    | 'OPEN_POPUP'
    | 'FILL_FORM'
    | 'STATUS_UPDATE'
    | 'PROCESS_FORM'
    | 'UPDATE_RESUME'
    | 'UPDATE_API_KEY'
    | 'RESET_CAPTURE_STATE';
  payload: any;
}
