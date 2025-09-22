// Form submission utility for Google Sheets integration
import { GOOGLE_APPS_SCRIPT_URL } from '../config/googleSheets.js';
import { withRateLimit } from './rateLimiter.js';

const API_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL;

// Internal submission function (without rate limiting)
const _submitToGoogleSheets = async (formData) => {
  console.log('API_URL:', API_URL);
  console.log('Form data being sent:', formData);
  console.log('Other details field:', formData.otherDetails);
  console.log('Service field:', formData.service);
  console.log('All form data keys:', Object.keys(formData));
  console.log('Full form data object:', JSON.stringify(formData, null, 2));

  if (!API_URL) {
    throw new Error('Google Apps Script URL not configured');
  }

  try {
    console.log('Sending request to:', API_URL);

    // Use URLSearchParams for better Google Apps Script compatibility
    const body = new URLSearchParams();
    console.log('=== CONVERTING TO URLSEARCHPARAMS ===');
    Object.entries(formData).forEach(([key, value]) => {
      console.log(`Processing ${key}:`, value, `(type: ${typeof value})`);
      if (Array.isArray(value)) {
        console.log(`${key} is array with ${value.length} items:`, value);
        value.forEach((v, index) => {
          console.log(`  Appending ${key}[${index}]:`, v);
          body.append(key, v);
        });
      } else {
        console.log(`${key} is single value:`, value);
        body.append(key, value || ''); // Ensure empty strings are sent
      }
    });

    console.log('Form data being sent as URLSearchParams:', body.toString());
    
    // Let's also check what URLSearchParams thinks about the service field
    const serviceValues = body.getAll('service');
    console.log('Service values in URLSearchParams:', serviceValues);

    let response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    console.log('Response status:', response.status);

    // Apps Script may return text; try to parse JSON, fallback to text
    const text = await response.text();
    console.log('Raw response:', text);
    
    try {
      const json = JSON.parse(text);
      console.log('Parsed JSON response:', json);
      
      // Check if the response indicates success
      if (json.success === false) {
        throw new Error(json.message || 'Google Sheets submission failed');
      }
      
      // If success is true or undefined, consider it successful
      return { success: true, message: json.message || 'Data saved to Google Sheets' };
    } catch (parseError) {
      console.log('Could not parse JSON, treating as text response:', text);
      
      // If we can't parse JSON, check if it's a success message
      if (text.includes('success') || text.includes('saved') || text.includes('received')) {
        return { success: true, message: 'Data saved to Google Sheets' };
      }
      
      // If response is not ok, throw error
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
      }
      
      // Default to success if response is ok
      return { success: true, message: 'Data saved to Google Sheets' };
    }
  } catch (error) {
    console.error('Error submitting to Google Sheets:', error);
    throw error;
  }
};

export const formatFormData = (formElement) => {
  const formData = new FormData(formElement);
  const data = {};
  
  console.log('=== FORM DATA PROCESSING ===');
  console.log('FormData entries:');
  for (let [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  // Get all form fields
  for (let [key, value] of formData.entries()) {
    if (data[key]) {
      // Handle multiple values (like checkboxes)
      console.log(`Multiple value found for ${key}:`, value);
      if (Array.isArray(data[key])) {
        data[key].push(value);
        console.log(`Added to existing array for ${key}:`, data[key]);
      } else {
        data[key] = [data[key], value];
        console.log(`Created new array for ${key}:`, data[key]);
      }
    } else {
      data[key] = value;
      console.log(`Set single value for ${key}:`, value);
    }
  }
  
  // Ensure all expected fields are present, even if empty
  const expectedFields = ['name', 'email', 'phone', 'address', 'referrer', 'service', 'otherDetails', 'notes'];
  expectedFields.forEach(field => {
    if (!data.hasOwnProperty(field)) {
      data[field] = '';
    }
  });
  
  // SECURITY: Add required security fields
  data.apiKey = 'HCCC_SECURE_2024_Kj8mN9pQ2wX5vB7nM3kL9sR4tY6uI8oP'; // Must match server-side secret
  data.timestamp = new Date().toISOString();
  data.userAgent = navigator.userAgent;
  data.referer = window.location.origin; // For origin validation
  
  // Add client fingerprinting for security
  data.screenResolution = `${screen.width}x${screen.height}`;
  data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  data.language = navigator.language;
  
  // Add page referrer for analytics (do not overwrite user's referrer answer)
  if (!data.referrer || String(data.referrer).trim().length === 0) {
    data.referrer = 'unspecified';
  }
  data.pageReferrer = document.referrer || '';
  
  console.log('Final formatted data:', data);
  console.log('Service field in final data:', data.service);
  console.log('Service field type:', typeof data.service);
  console.log('Service is array?', Array.isArray(data.service));
  console.log('REFERRER FIELD DEBUG:', {
    referrer: data.referrer,
    referrerType: typeof data.referrer,
    referrerLength: data.referrer ? data.referrer.length : 0,
    referrerTrimmed: data.referrer ? data.referrer.trim() : 'null'
  });
  
  return data;
};

export const validateFormData = (data) => {
  const errors = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.phone || data.phone.trim().length < 10) {
    errors.push('Please enter a valid phone number');
  }
  
  if (!data.address || data.address.trim().length < 5) {
    errors.push('Please enter a complete address');
  }
  
  if (!data.referrer || data.referrer.trim().length < 1) {
    errors.push('Please tell us how you heard about us');
  }
  
  // Check if at least one service type is selected
  if (!data.service || (Array.isArray(data.service) ? data.service.length === 0 : !data.service)) {
    errors.push('Please select at least one service type');
  }
  
  // Check if "Other" is selected but no description provided
  const services = Array.isArray(data.service) ? data.service : [data.service];
  if (services.includes('other') && (!data.otherDetails || data.otherDetails.trim().length === 0)) {
    errors.push('Please describe the other services you are looking for');
  }
  
  return errors;
};

// Rate-limited submission function (10 submissions per 10 minutes)
export const submitToGoogleSheets = withRateLimit(_submitToGoogleSheets, 10, 10 * 60 * 1000);

