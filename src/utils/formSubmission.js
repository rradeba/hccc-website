// Form submission utility for Flask backend integration
// import { GOOGLE_APPS_SCRIPT_URL } from '../config/googleSheets.js';
import { withRateLimit } from './rateLimiter.js';

// Backend API URL - Railway backend
const API_URL = import.meta.env.VITE_BACKEND_URL || 'https://hccc-db-production.up.railway.app';

// Internal submission function (without rate limiting)
const _submitToBackend = async (formData) => {
  console.log('API_URL:', API_URL);
  console.log('Form data being sent:', formData);

  if (!API_URL) {
    throw new Error('Backend API URL not configured');
  }

  try {
    console.log('Sending request to:', `${API_URL}/api/leads`);

    // Send as JSON to Flask backend
    const response = await fetch(`${API_URL}/api/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Backend response:', result);
    
    return { success: true, message: 'Lead submitted successfully' };
  } catch (error) {
    console.error('Error submitting to backend:', error);
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
  const expectedFields = ['firstName', 'lastName', 'name', 'email', 'phone', 'streetAddress', 'city', 'state', 'zip', 'address', 'referrer', 'service', 'otherDetails', 'notes'];
  expectedFields.forEach(field => {
    if (!data.hasOwnProperty(field)) {
      data[field] = '';
    }
  });

  // Build combined name from first and last if present
  if ((!data.name || data.name.trim().length === 0) && (data.firstName || data.lastName)) {
    data.name = `${(data.firstName || '').trim()} ${(data.lastName || '').trim()}`.trim();
  }

  // Build combined address from parts if present
  if ((data.streetAddress || data.city || data.state || data.zip)) {
    const parts = [
      (data.streetAddress || '').trim(),
      (data.city || '').trim(),
      [ (data.state || '').trim(), (data.zip || '').trim() ].filter(Boolean).join(' ')
    ].filter(Boolean)
    const combined = parts.join(', ')
    if (combined && combined.length > 0) {
      data.address = combined
    }
  }
  
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
  
  if (!data.firstName || data.firstName.trim().length < 1) {
    errors.push('First name is required');
  }
  if (!data.lastName || data.lastName.trim().length < 1) {
    errors.push('Last name is required');
  }
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.phone || data.phone.trim().length < 10) {
    errors.push('Please enter a valid phone number');
  }
  
  // Validate address parts and combined address
  if (!data.streetAddress || data.streetAddress.trim().length < 3) {
    errors.push('Street address is required');
  }
  if (!data.city || data.city.trim().length < 2) {
    errors.push('City is required');
  }
  if (!data.state || data.state.trim().length < 2) {
    errors.push('State is required');
  }
  if (!data.zip || data.zip.trim().length < 5) {
    errors.push('ZIP code is required');
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
export const submitToGoogleSheets = withRateLimit(_submitToBackend, 10, 10 * 60 * 1000);

