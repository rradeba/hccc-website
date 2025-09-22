/**
 * WORKING Google Apps Script - Based on Previously Successful Version
 * Fixed referrer field validation issue
 */

// SECURITY CONFIGURATION
const SPREADSHEET_ID = '1t6gNYzi-eCrfbB8aIThMY4Kv-wITc3govLwohNtNvZU';
const SHEET_NAME = 'Form Submissions';
const SECURITY_LOG_SHEET = 'Security_Log';

// SECURITY: API Key for authentication
const API_SECRET = 'HCCC_SECURE_2024_Kj8mN9pQ2wX5vB7nM3kL9sR4tY6uI8oP';

// SECURITY: Allowed domains
const ALLOWED_ORIGINS = [
  'https://imaginative-pony-4b2b43.netlify.app',
  'https://holycityclean.co',
  'https://www.holycityclean.co',
  'http://localhost:3000',
  'http://localhost:3001'
];

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'active',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Raw e.parameter:', e.parameter);
    
    // Get form data from e.parameter (URL-encoded data)
    const data = e.parameter || {};
    
    console.log('Received data:', data);
    console.log('Service field raw:', data.service);
    console.log('Referrer field raw:', data.referrer);
    
    // SECURITY: Origin validation
    const referer = data.referer || '';
    if (referer && !validateOrigin(referer)) {
      logSecurityEvent('INVALID_ORIGIN', { origin: referer });
      return securityErrorResponse('Access denied: Invalid origin');
    }
    
    // SECURITY: API Key validation
    if (!validateAPIKey(data.apiKey)) {
      logSecurityEvent('INVALID_API_KEY', { apiKey: data.apiKey?.substring(0, 8) + '...' });
      return securityErrorResponse('Access denied: Invalid authentication');
    }
    
    // BASIC VALIDATION - More lenient approach
    const errors = [];
    
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
    
    // FIXED: Referrer validation - accept both filled values and "unspecified"
    if (!data.referrer || data.referrer.trim().length === 0) {
      errors.push('Please tell us how you heard about us');
    } else if (data.referrer === 'unspecified') {
      // This is OK - frontend sets this when field is empty but we want to allow it
      console.log('Referrer field is unspecified - this is acceptable');
    }
    
    if (!data.service) {
      errors.push('Please select at least one service');
    }
    
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Validation failed: ' + errors.join(', ')
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle multiple services
    let services = processServices(data.service);
    console.log('Processed services:', services);
    
    // Save to spreadsheet
    const saveResult = saveToSpreadsheet(data, services);
    if (!saveResult.success) {
      throw new Error('Failed to save data: ' + saveResult.error);
    }
    
    // Log successful submission
    logSecurityEvent('FORM_SUBMITTED', { services, rowId: saveResult.rowId });
    
    console.log('Form submitted successfully');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Form submitted successfully!',
        submissionId: saveResult.rowId,
        servicesProcessed: services
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Form submission error:', error);
    
    // Log error
    logSecurityEvent('SUBMISSION_ERROR', { 
      error: error.message,
      stack: error.stack?.substring(0, 500) 
    });
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Submission failed. Please try again later.'
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// SECURITY: Origin validation
function validateOrigin(referer) {
  if (!referer) return true; // Allow requests without referer for now
  
  try {
    const url = new URL(referer);
    const origin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
    return ALLOWED_ORIGINS.includes(origin);
  } catch (e) {
    return false;
  }
}

// SECURITY: API Key validation
function validateAPIKey(providedKey) {
  if (!providedKey) return false;
  return providedKey === API_SECRET;
}

// Email validation
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Process multiple services
function processServices(serviceData) {
  if (!serviceData) return '';
  
  if (Array.isArray(serviceData)) {
    return serviceData.join(', ');
  } else if (typeof serviceData === 'string') {
    if (serviceData.includes(',')) {
      return serviceData.split(',').map(s => s.trim()).join(', ');
    }
    return serviceData;
  }
  
  return String(serviceData);
}

// Save data to spreadsheet
function saveToSpreadsheet(data, services) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // Add headers
      sheet.getRange(1, 1, 1, 10).setValues([[
        'Timestamp', 'Name', 'Email', 'Phone', 'Address', 'Referrer', 
        'Services', 'Other Details', 'Notes', 'User Agent'
      ]]);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 10).setBackground('#f0f0f0');
    }
    
    const rowData = [
      new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.address || '',
      data.referrer || '',
      services,
      data.otherDetails || '',
      data.notes || '',
      data.userAgent || ''
    ];
    
    sheet.appendRow(rowData);
    const rowId = sheet.getLastRow();
    
    return { success: true, rowId };
    
  } catch (error) {
    console.error('Spreadsheet save error:', error);
    return { success: false, error: error.message };
  }
}

// SECURITY: Security event logging
function logSecurityEvent(eventType, details) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let logSheet = spreadsheet.getSheetByName(SECURITY_LOG_SHEET);
    
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(SECURITY_LOG_SHEET);
      logSheet.getRange(1, 1, 1, 4).setValues([
        ['Timestamp', 'Event Type', 'Details', 'Severity']
      ]);
      logSheet.getRange(1, 1, 1, 4).setFontWeight('bold');
      logSheet.getRange(1, 1, 1, 4).setBackground('#ffcccc');
    }
    
    const severity = getSeverityLevel(eventType);
    const detailsJson = JSON.stringify(details);
    
    logSheet.appendRow([
      new Date().toISOString(),
      eventType,
      detailsJson,
      severity
    ]);
    
    // Keep only last 500 log entries
    if (logSheet.getLastRow() > 500) {
      logSheet.deleteRows(2, 50); // Delete oldest 50 entries
    }
    
  } catch (error) {
    console.error('Security logging failed:', error);
  }
}

function getSeverityLevel(eventType) {
  const severityMap = {
    'INVALID_ORIGIN': 'HIGH',
    'INVALID_API_KEY': 'HIGH',
    'FORM_SUBMITTED': 'LOW',
    'SUBMISSION_ERROR': 'MEDIUM'
  };
  return severityMap[eventType] || 'LOW';
}

// Error response functions
function securityErrorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      message: message,
      error: 'SECURITY_ERROR'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}