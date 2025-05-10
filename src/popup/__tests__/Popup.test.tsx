import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import Popup from '../Popup';

describe('Popup Component', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();
  });

  test('renders the popup with initial state', () => {
    render(<Popup />);

    // Check for main title
    expect(
      screen.getByText('Remote Job Application Assistant')
    ).toBeInTheDocument();

    // Check for main buttons
    expect(screen.getByText('Auto-Find Form')).toBeInTheDocument();
    expect(screen.getByText('Select Container')).toBeInTheDocument();
    expect(screen.getByText('Fill Form')).toBeInTheDocument();
  });

  test('shows resume editor when "Add Resume" button is clicked', () => {
    render(<Popup />);

    // Click the Add Resume button
    fireEvent.click(screen.getByText('Add Resume'));

    // Now the resume editor should be visible
    expect(screen.getByText('Save Resume')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter your resume here...')
    ).toBeInTheDocument();
  });

  test('shows API key editor when "Add API Key" button is clicked', () => {
    render(<Popup />);

    // Click the Add API Key button
    fireEvent.click(screen.getByText('Add API Key'));

    // Now the API key editor should be visible
    expect(screen.getByText('Save API Key')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Enter your Gemini API key...')
    ).toBeInTheDocument();
  });

  test('shows error message for missing resume', () => {
    render(<Popup />);

    // Check for error message about missing resume
    expect(
      screen.getByText(
        'You haven\'t added your resume yet. Click "Add Resume" to get started.'
      )
    ).toBeInTheDocument();
  });

  test('shows error message for missing API key', () => {
    render(<Popup />);

    // Check for error message about missing API key
    expect(
      screen.getByText(
        'You need to add your Gemini API key. Click "Add API Key" to get started.'
      )
    ).toBeInTheDocument();
  });
});
