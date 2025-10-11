/**
 * WORKING Google Apps Script with Multiple Services Support
 * Built from the minimal test - only essential features
 */

// Replace with your actual Google Sheet ID
const SPREADSHEET_ID = '1t6gNYzi-eCrfbB8aIThMY4Kv-wITc3govLwohNtNvZU';
const SHEET_NAME = 'Form Submissions';

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'Holy City Clean Co. Form Handler is running',
      status: 'ready',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Raw e.parameter:', e.parameter);
    console.log('Raw e.postData:', e.postData);
    
    // Check if we can access the spreadsheet
    console.log('Testing spreadsheet access...');
    try {
      const testSpreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
      console.log('Spreadsheet access OK, name:', testSpreadsheet.getName());
    } catch (spreadsheetError) {
      console.error('Spreadsheet access failed:', spreadsheetError.message);
      throw new Error('Cannot access spreadsheet: ' + spreadsheetError.message);
    }
    
    // Get form data - simplified approach
    let data = {};
    
    // Primary: Use e.parameter (this is where URL-encoded form data normally goes)
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      console.log('Found data in e.parameter');
      data = {...e.parameter}; // Create a copy
    }
    // Fallback: Use e.postData if no parameter data
    else if (e.postData && e.postData.contents) {
      console.log('No e.parameter data, trying e.postData');
      console.log('Raw postData contents:', e.postData.contents);
      
      try {
        // Try to parse as URL-encoded
        const params = new URLSearchParams(e.postData.contents);
        for (const [key, value] of params) {
          if (data[key]) {
            // Handle multiple values
            if (Array.isArray(data[key])) {
              data[key].push(value);
            } else {
              data[key] = [data[key], value];
            }
          } else {
            data[key] = value;
          }
        }
        console.log('Parsed from postData:', data);
      } catch (error) {
        console.error('Error parsing postData:', error);
        data = {};
      }
    }
    
    // Handle multiple services (simple approach)
    if (data.service && typeof data.service === 'string' && data.service.includes(',')) {
      console.log('Converting comma-separated services:', data.service);
      data.service = data.service.split(',').map(s => s.trim());
    }
    
    console.log('Final processed data:', data);
    console.log('otherDetails field value:', data.otherDetails);
    console.log('notes field value:', data.notes);
    console.log('service field value:', data.service);
    console.log('service field type:', typeof data.service);
    console.log('service is array?', Array.isArray(data.service));
    
    // Safety check - make sure we have basic data
    if (!data || Object.keys(data).length === 0) {
      console.error('No form data received at all!');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'No form data received'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (!data.name && !data.email) {
      console.error('Missing basic form fields (name, email)');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Missing required form fields'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // SECURITY: Very basic validation (very permissive)
    console.log('Starting validation...');
    let validationResult;
    try {
      validationResult = validateSubmissionData(data);
      console.log('Validation result:', validationResult);
    } catch (validationError) {
      console.error('Validation function error:', validationError.message);
      throw new Error('Validation failed: ' + validationError.message);
    }
    
    if (!validationResult.isValid) {
      console.error('Validation failed:', validationResult.errors);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Validation failed: ' + validationResult.errors.join(', ')
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // SECURITY: Rate limiting check (more permissive)
    console.log('Starting rate limit check...');
    let clientId, rateLimitResult;
    try {
      clientId = getClientIdentifier(e);
      console.log('Client ID:', clientId);
      rateLimitResult = checkRateLimit(clientId);
      console.log('Rate limit result:', rateLimitResult);
    } catch (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError.message);
      // Continue without rate limiting if it fails
      console.log('Continuing without rate limiting due to error');
      rateLimitResult = { allowed: true };
    }
    
    if (!rateLimitResult.allowed) {
      console.error('Rate limit exceeded for client:', clientId);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: `Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} minutes before submitting again.`
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // SECURITY: Sanitize input data (basic)
    const sanitizedData = sanitizeInputData(data);
    console.log('Sanitized data:', sanitizedData);
    
    // Get the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    console.log('Spreadsheet opened');
    
    // Get or create the sheet
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) {
      console.log('Creating new sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // Add headers
      sheet.getRange(1, 1, 1, 10).setValues([[
        'Timestamp', 'Name', 'Email', 'Phone', 'Address', 'Referrer', 'Services', 'Other Service Details', 'Comments/Notes', 'Client IP'
      ]]);
      // Format headers
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 10).setBackground('#f0f0f0');
      console.log('Sheet created with headers');
    }
    
    // Prepare data for insertion - handle services properly
    let services = '';
    if (sanitizedData.service) {
      if (Array.isArray(sanitizedData.service)) {
        // If it's already an array, join with commas
        services = sanitizedData.service.join(', ');
        console.log('Services processed from array:', services);
      } else if (typeof sanitizedData.service === 'string') {
        // If it's a string, check if it's comma-separated
        if (sanitizedData.service.includes(',')) {
          // Split and rejoin to clean up spacing
          services = sanitizedData.service.split(',').map(s => s.trim()).join(', ');
          console.log('Services processed from comma-separated string:', services);
        } else {
          // Single service
          services = sanitizedData.service;
          console.log('Services processed from single string:', services);
        }
      } else {
        // Convert other types to string
        services = sanitizedData.service.toString();
        console.log('Services processed from other type:', services);
      }
    }
    console.log('Final services value for sheet:', services);
    
    const rowData = [
      new Date().toISOString(),
      sanitizedData.name || '',
      sanitizedData.email || '',
      sanitizedData.phone || '',
      sanitizedData.address || '',
      sanitizedData.referrer || '',
      services,
      sanitizedData.otherDetails || '',  // Other service description
      sanitizedData.notes || '',         // Comments/Notes
      clientId
    ];
    
    console.log('Adding row:', rowData);
    sheet.appendRow(rowData);
    console.log('Data added successfully!');
    
    // SECURITY: Record submission for rate limiting
    recordSubmission(clientId);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Form submitted successfully!'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // For debugging, let's be more specific about the error
    let errorMessage = 'An error occurred while processing your submission.';
    
    if (error.message) {
      if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage = 'Permission error: Please check spreadsheet access permissions.';
      } else if (error.message.includes('spreadsheet') || error.message.includes('sheet')) {
        errorMessage = 'Spreadsheet error: ' + error.message;
      } else if (error.message.includes('validation')) {
        errorMessage = 'Validation error: ' + error.message;
      } else {
        errorMessage = 'Error: ' + error.message;
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: errorMessage,
        error: error.message // Include for debugging
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// SECURITY: Very permissive validation
function validateSubmissionData(data) {
  const errors = [];
  
  // Only check if fields exist and are not empty
  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!data.email || data.email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }
  
  if (!data.phone || data.phone.trim().length === 0) {
    errors.push('Phone is required');
  }
  
  if (!data.address || data.address.trim().length === 0) {
    errors.push('Address is required');
  }
  
  if (!data.referrer || data.referrer.trim().length === 0) {
    errors.push('Please tell us how you heard about us');
  }
  
  // Length validation (prevent buffer overflow) - very generous
  Object.keys(data).forEach(field => {
    if (data[field] && data[field].length > MAX_FIELD_LENGTH) {
      errors.push(`${field} is too long (max ${MAX_FIELD_LENGTH} characters)`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

// SECURITY: Simple email validation
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// SECURITY: Basic input sanitization
function sanitizeInputData(data) {
  const sanitized = {};
  
  Object.keys(data).forEach(key => {
    if (typeof data[key] === 'string') {
      // Remove only dangerous HTML/script content
      let sanitizedValue = data[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
      
      // Limit length
      sanitizedValue = sanitizedValue.substring(0, MAX_FIELD_LENGTH);
      
      sanitized[key] = sanitizedValue;
    } else if (Array.isArray(data[key])) {
      // Sanitize array values
      sanitized[key] = data[key].map(item => {
        if (typeof item === 'string') {
          return item.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '')
                    .trim()
                    .substring(0, MAX_FIELD_LENGTH);
        }
        return item;
      });
    } else {
      sanitized[key] = data[key];
    }
  });
  
  return sanitized;
}

// SECURITY: Get client identifier for rate limiting
function getClientIdentifier(e) {
  // Try to get IP from various sources
  const ip = e.parameter?.ip || 
            e.parameter?.client_ip || 
            e.parameter?.remote_addr ||
            'unknown';
  
  // Create a more unique identifier
  const userAgent = e.parameter?.userAgent || e.parameter?.user_agent || 'unknown';
  const timestamp = Math.floor(Date.now() / (1000 * 60 * 60)); // Hour-based
  
  return `${ip}-${userAgent.substring(0, 20)}-${timestamp}`;
}

// SECURITY: Rate limiting check (more permissive)
function checkRateLimit(clientId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let rateLimitSheet = spreadsheet.getSheetByName(RATE_LIMIT_SHEET);
    
    if (!rateLimitSheet) {
      rateLimitSheet = spreadsheet.insertSheet(RATE_LIMIT_SHEET);
      rateLimitSheet.getRange(1, 1, 1, 3).setValues([['ClientId', 'Timestamp', 'Count']]);
    }
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    // Get all rate limit records
    const data = rateLimitSheet.getDataRange().getValues();
    const rows = data.slice(1);
    
    // Count submissions in the last hour
    const hourlySubmissions = rows.filter(row => {
      const recordTime = new Date(row[1]);
      const recordClientId = row[0];
      return recordClientId === clientId && recordTime > oneHourAgo;
    }).length;
    
    // Count submissions in the last day
    const dailySubmissions = rows.filter(row => {
      const recordTime = new Date(row[1]);
      const recordClientId = row[0];
      return recordClientId === clientId && recordTime > oneDayAgo;
    }).length;
    
    if (hourlySubmissions >= MAX_SUBMISSIONS_PER_HOUR) {
      return {
        allowed: false,
        retryAfter: 60,
        reason: 'hourly_limit'
      };
    }
    
    if (dailySubmissions >= MAX_SUBMISSIONS_PER_DAY) {
      return {
        allowed: false,
        retryAfter: 1440, // 24 hours
        reason: 'daily_limit'
      };
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Allow submission if rate limiting fails
    return { allowed: true };
  }
}

// SECURITY: Record submission for rate limiting
function recordSubmission(clientId) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let rateLimitSheet = spreadsheet.getSheetByName(RATE_LIMIT_SHEET);
    
    if (!rateLimitSheet) {
      rateLimitSheet = spreadsheet.insertSheet(RATE_LIMIT_SHEET);
      rateLimitSheet.getRange(1, 1, 1, 3).setValues([['ClientId', 'Timestamp', 'Count']]);
    }
    
    // Add new record
    rateLimitSheet.appendRow([clientId, new Date(), 1]);
    
    // Clean up old records (older than 7 days)
    const data = rateLimitSheet.getDataRange().getValues();
    const sevenDaysAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    
    const validRows = data.filter((row, index) => {
      if (index === 0) return true; // Keep headers
      const recordTime = new Date(row[1]);
      return recordTime > sevenDaysAgo;
    });
    
    if (validRows.length !== data.length) {
      rateLimitSheet.clear();
      rateLimitSheet.getRange(1, 1, validRows.length, validRows[0].length).setValues(validRows);
    }
    
  } catch (error) {
    console.error('Error recording submission:', error);
  }
}
