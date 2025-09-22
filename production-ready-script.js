/**
 * PRODUCTION-READY Google Apps Script
 * Enhanced security for public-facing form submissions
 */

// SECURITY CONFIGURATION
const SPREADSHEET_ID = '1t6gNYzi-eCrfbB8aIThMY4Kv-wITc3govLwohNtNvZU';
const SHEET_NAME = 'Form Submissions';
const SECURITY_LOG_SHEET = 'Security_Log';

// SECURITY: API Key for authentication (change this!)
const API_SECRET = 'HCCC_FORM_SECRET_2024_CHANGE_THIS';

// SECURITY: Allowed domains (your website domains)
const ALLOWED_ORIGINS = [
  'https://your-domain.com',
  'https://www.your-domain.com',
  'http://localhost:3000',  // Remove this in production
  'http://localhost:3001'   // Remove this in production
];

// SECURITY: Rate limiting configuration
const RATE_LIMITS = {
  GLOBAL_PER_MINUTE: 30,     // Max 30 submissions per minute globally
  GLOBAL_PER_HOUR: 200,      // Max 200 submissions per hour globally
  CLIENT_PER_HOUR: 5,        // Max 5 submissions per hour per client
  CLIENT_PER_DAY: 10         // Max 10 submissions per day per client
};

// SECURITY: Input validation limits
const VALIDATION_LIMITS = {
  MAX_FIELD_LENGTH: 1000,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 20,
  MAX_ADDRESS_LENGTH: 200,
  MAX_NOTES_LENGTH: 2000
};

function doGet(e) {
  // Only return basic status, no sensitive information
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'active',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const startTime = new Date();
  let clientId = 'unknown';
  
  try {
    console.log('=== SECURE FORM SUBMISSION STARTED ===');
    
    // SECURITY: Get and validate request data
    const data = e.parameter || {};
    const headers = e.postData?.headers || {};
    const referer = headers.Referer || headers.referer || data.referer || '';
    
    console.log('Request origin:', referer);
    console.log('User agent:', data.userAgent);
    
    // SECURITY: Generate client identifier (more secure)
    clientId = generateSecureClientId(data, headers, e);
    console.log('Client ID:', clientId);
    
    // SECURITY: Step 1 - Origin Validation
    if (!validateOrigin(referer)) {
      logSecurityEvent('INVALID_ORIGIN', { origin: referer, clientId });
      return securityErrorResponse('Access denied: Invalid origin');
    }
    
    // SECURITY: Step 2 - API Key Authentication
    if (!validateAPIKey(data.apiKey)) {
      logSecurityEvent('INVALID_API_KEY', { apiKey: data.apiKey?.substring(0, 8) + '...', clientId });
      return securityErrorResponse('Access denied: Invalid authentication');
    }
    
    // SECURITY: Step 3 - Rate Limiting
    const rateLimitResult = checkAdvancedRateLimit(clientId);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { 
        clientId, 
        reason: rateLimitResult.reason,
        retryAfter: rateLimitResult.retryAfter 
      });
      return securityErrorResponse(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} minutes.`);
    }
    
    // SECURITY: Step 4 - Input Validation & Sanitization
    const validationResult = validateAndSanitizeInput(data);
    if (!validationResult.isValid) {
      logSecurityEvent('VALIDATION_FAILED', { 
        clientId, 
        errors: validationResult.errors,
        suspiciousFields: validationResult.suspiciousFields 
      });
      return errorResponse('Validation failed: ' + validationResult.errors.join(', '));
    }
    
    const sanitizedData = validationResult.data;
    
    // SECURITY: Step 5 - Suspicious Content Detection
    const suspiciousContent = detectSuspiciousContent(sanitizedData);
    if (suspiciousContent.length > 0) {
      logSecurityEvent('SUSPICIOUS_CONTENT', { 
        clientId, 
        suspiciousFields: suspiciousContent 
      });
      // Continue but flag for review
    }
    
    // Handle multiple services
    let services = processServices(sanitizedData.service);
    console.log('Processed services:', services);
    
    // Save to spreadsheet
    const saveResult = saveToSpreadsheet(sanitizedData, services, clientId, startTime);
    if (!saveResult.success) {
      throw new Error('Failed to save data: ' + saveResult.error);
    }
    
    // SECURITY: Record successful submission
    recordSubmission(clientId, 'SUCCESS');
    logSecurityEvent('FORM_SUBMITTED', { clientId, services, rowId: saveResult.rowId });
    
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
    
    // SECURITY: Log error without exposing sensitive details
    logSecurityEvent('SUBMISSION_ERROR', { 
      clientId, 
      error: error.message,
      stack: error.stack?.substring(0, 500) 
    });
    
    // Return generic error message to prevent information disclosure
    return errorResponse('Submission failed. Please try again later.');
  }
}

// SECURITY: Origin validation
function validateOrigin(referer) {
  if (!referer) return false;
  
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

// SECURITY: Generate secure client identifier
function generateSecureClientId(data, headers, e) {
  // Use multiple factors for identification
  const factors = [
    data.userAgent || 'unknown',
    data.screenResolution || 'unknown',
    data.timezone || 'unknown',
    data.language || 'unknown',
    Math.floor(Date.now() / (1000 * 60 * 15)) // 15-minute window
  ];
  
  // Create hash of combined factors
  const combined = factors.join('|');
  return 'client_' + Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, combined)
    .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
}

// SECURITY: Advanced rate limiting
function checkAdvancedRateLimit(clientId) {
  try {
    const now = new Date();
    const submissions = getRecentSubmissions();
    
    // Check global rate limits
    const globalMinute = submissions.filter(s => 
      (now - new Date(s.timestamp)) < 60000
    ).length;
    
    if (globalMinute >= RATE_LIMITS.GLOBAL_PER_MINUTE) {
      return { allowed: false, reason: 'global_minute', retryAfter: 1 };
    }
    
    const globalHour = submissions.filter(s => 
      (now - new Date(s.timestamp)) < 3600000
    ).length;
    
    if (globalHour >= RATE_LIMITS.GLOBAL_PER_HOUR) {
      return { allowed: false, reason: 'global_hour', retryAfter: 60 };
    }
    
    // Check client-specific rate limits
    const clientHour = submissions.filter(s => 
      s.clientId === clientId && (now - new Date(s.timestamp)) < 3600000
    ).length;
    
    if (clientHour >= RATE_LIMITS.CLIENT_PER_HOUR) {
      return { allowed: false, reason: 'client_hour', retryAfter: 60 };
    }
    
    const clientDay = submissions.filter(s => 
      s.clientId === clientId && (now - new Date(s.timestamp)) < 86400000
    ).length;
    
    if (clientDay >= RATE_LIMITS.CLIENT_PER_DAY) {
      return { allowed: false, reason: 'client_day', retryAfter: 1440 };
    }
    
    return { allowed: true };
    
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail secure - deny if rate limiting fails
    return { allowed: false, reason: 'system_error', retryAfter: 5 };
  }
}

// SECURITY: Enhanced input validation and sanitization
function validateAndSanitizeInput(data) {
  const errors = [];
  const suspiciousFields = [];
  const sanitized = {};
  
  // Validate and sanitize each field
  const fields = {
    name: { required: true, maxLength: VALIDATION_LIMITS.MAX_NAME_LENGTH },
    email: { required: true, maxLength: VALIDATION_LIMITS.MAX_EMAIL_LENGTH, type: 'email' },
    phone: { required: true, maxLength: VALIDATION_LIMITS.MAX_PHONE_LENGTH, type: 'phone' },
    address: { required: true, maxLength: VALIDATION_LIMITS.MAX_ADDRESS_LENGTH },
    referrer: { required: true, maxLength: 100 },
    service: { required: true, type: 'array' },
    otherDetails: { required: false, maxLength: VALIDATION_LIMITS.MAX_FIELD_LENGTH },
    notes: { required: false, maxLength: VALIDATION_LIMITS.MAX_NOTES_LENGTH }
  };
  
  for (const [fieldName, rules] of Object.entries(fields)) {
    const value = data[fieldName];
    
    // Check required fields
    if (rules.required && (!value || (typeof value === 'string' && value.trim().length === 0))) {
      errors.push(`${fieldName} is required`);
      continue;
    }
    
    if (value) {
      // Sanitize the value
      let sanitizedValue = sanitizeValue(value, fieldName);
      
      // Type-specific validation
      if (rules.type === 'email' && !isValidEmail(sanitizedValue)) {
        errors.push(`${fieldName} must be a valid email address`);
      } else if (rules.type === 'phone' && !isValidPhone(sanitizedValue)) {
        errors.push(`${fieldName} must be a valid phone number`);
      }
      
      // Length validation
      if (rules.maxLength && sanitizedValue.length > rules.maxLength) {
        errors.push(`${fieldName} is too long (max ${rules.maxLength} characters)`);
      }
      
      // Check for suspicious content
      if (containsSuspiciousContent(sanitizedValue)) {
        suspiciousFields.push(fieldName);
      }
      
      sanitized[fieldName] = sanitizedValue;
    }
  }
  
  // Add system fields
  sanitized.userAgent = sanitizeValue(data.userAgent || '', 'userAgent');
  sanitized.timestamp = new Date().toISOString();
  
  return {
    isValid: errors.length === 0,
    errors,
    suspiciousFields,
    data: sanitized
  };
}

// SECURITY: Advanced input sanitization
function sanitizeValue(value, fieldName) {
  if (Array.isArray(value)) {
    return value.map(v => sanitizeValue(v, fieldName));
  }
  
  if (typeof value !== 'string') {
    return String(value);
  }
  
  // Remove dangerous content
  let sanitized = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .replace(/vbscript:/gi, '') // Remove vbscript
    .replace(/<iframe\b[^>]*>/gi, '') // Remove iframes
    .replace(/<object\b[^>]*>/gi, '') // Remove objects
    .replace(/<embed\b[^>]*>/gi, '') // Remove embeds
    .trim();
  
  // Field-specific sanitization
  if (fieldName === 'email') {
    sanitized = sanitized.toLowerCase();
  } else if (fieldName === 'phone') {
    // Keep only digits, spaces, hyphens, parentheses, and plus
    sanitized = sanitized.replace(/[^\d\s\-\(\)\+]/g, '');
  }
  
  return sanitized;
}

// SECURITY: Suspicious content detection
function detectSuspiciousContent(data) {
  const suspicious = [];
  const suspiciousPatterns = [
    /\b(script|javascript|vbscript|onload|onerror)\b/i,
    /<[^>]*>/,  // HTML tags
    /\b(union|select|insert|update|delete|drop)\b/i,  // SQL injection
    /\b(eval|exec|system|cmd)\b/i,  // Code execution
    /(http|https|ftp):\/\/[^\s]+/i,  // URLs (suspicious in form data)
    /\b\d{16}\b/,  // Credit card numbers
    /\b\d{3}-\d{2}-\d{4}\b/  // SSN pattern
  ];
  
  for (const [field, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          suspicious.push(field);
          break;
        }
      }
    }
  }
  
  return suspicious;
}

// Enhanced validation functions
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,20}$/;
  return phoneRegex.test(phone);
}

function containsSuspiciousContent(value) {
  const suspiciousPatterns = [
    /<script/i, /javascript:/i, /vbscript:/i,
    /on\w+\s*=/i, /<iframe/i, /<object/i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(value));
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

// Save data to spreadsheet with error handling
function saveToSpreadsheet(data, services, clientId, startTime) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // Add headers
      sheet.getRange(1, 1, 1, 12).setValues([[
        'Timestamp', 'Name', 'Email', 'Phone', 'Address', 'Referrer', 
        'Services', 'Other Details', 'Notes', 'Client ID', 'User Agent', 'Submission ID'
      ]]);
      sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
      sheet.getRange(1, 1, 1, 12).setBackground('#f0f0f0');
    }
    
    // Generate unique submission ID
    const submissionId = 'SUB_' + Utilities.getUuid().substring(0, 8);
    
    const rowData = [
      startTime.toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.address || '',
      data.referrer || '',
      services,
      data.otherDetails || '',
      data.notes || '',
      clientId,
      data.userAgent || '',
      submissionId
    ];
    
    sheet.appendRow(rowData);
    const rowId = sheet.getLastRow();
    
    return { success: true, rowId, submissionId };
    
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
      logSheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'Event Type', 'Client ID', 'Details', 'Severity']
      ]);
      logSheet.getRange(1, 1, 1, 5).setFontWeight('bold');
      logSheet.getRange(1, 1, 1, 5).setBackground('#ffcccc');
    }
    
    const severity = getSeverityLevel(eventType);
    const detailsJson = JSON.stringify(details);
    
    logSheet.appendRow([
      new Date().toISOString(),
      eventType,
      details.clientId || 'unknown',
      detailsJson,
      severity
    ]);
    
    // Keep only last 1000 log entries
    if (logSheet.getLastRow() > 1000) {
      logSheet.deleteRows(2, 100); // Delete oldest 100 entries
    }
    
  } catch (error) {
    console.error('Security logging failed:', error);
  }
}

function getSeverityLevel(eventType) {
  const severityMap = {
    'INVALID_ORIGIN': 'HIGH',
    'INVALID_API_KEY': 'HIGH',
    'RATE_LIMIT_EXCEEDED': 'MEDIUM',
    'VALIDATION_FAILED': 'MEDIUM',
    'SUSPICIOUS_CONTENT': 'HIGH',
    'FORM_SUBMITTED': 'LOW',
    'SUBMISSION_ERROR': 'MEDIUM'
  };
  return severityMap[eventType] || 'LOW';
}

// Get recent submissions for rate limiting
function getRecentSubmissions() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet || sheet.getLastRow() <= 1) return [];
    
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    return data
      .filter(row => new Date(row[0]) > oneHourAgo)
      .map(row => ({
        timestamp: row[0],
        clientId: row[9]
      }));
      
  } catch (error) {
    console.error('Failed to get recent submissions:', error);
    return [];
  }
}

// Record submission for rate limiting
function recordSubmission(clientId, status) {
  // This is handled by the main spreadsheet save
  // Could be extended for separate tracking if needed
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

function errorResponse(message) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      message: message
    }))
    .setMimeType(ContentService.MimeType.JSON);
}
