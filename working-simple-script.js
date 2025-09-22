/**
 * WORKING Simple Google Apps Script
 * Based on the version that was working before
 */

// Replace with your actual Google Sheet ID
const SPREADSHEET_ID = '1t6gNYzi-eCrfbB8aIThMY4Kv-wITc3govLwohNtNvZU';
const SHEET_NAME = 'Form Submissions';

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
    
    // SECURITY: Basic API key check
    if (data.apiKey !== API_SECRET) {
      console.log('Invalid API key:', data.apiKey?.substring(0, 10) + '...');
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Authentication failed'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // SECURITY: Basic origin check
    const referer = data.referer || '';
    if (referer && !ALLOWED_ORIGINS.some(origin => referer.startsWith(origin))) {
      console.log('Invalid origin:', referer);
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Invalid origin'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle multiple services
    let services = '';
    if (data.service) {
      if (typeof data.service === 'string') {
        // Check if it's comma-separated (multiple services)
        if (data.service.includes(',')) {
          console.log('Multiple services detected (comma-separated)');
          services = data.service.split(',').map(s => s.trim()).join(', ');
        } else {
          console.log('Single service detected');
          services = data.service;
        }
      } else if (Array.isArray(data.service)) {
        console.log('Services received as array');
        services = data.service.join(', ');
      }
    }
    
    console.log('Processed services:', services);
    
    // Simple validation - only check for basic required fields
    const requiredFields = ['name', 'email', 'phone', 'address'];
    for (const field of requiredFields) {
      if (!data[field] || data[field].trim().length === 0) {
        console.log(`Missing required field: ${field}`);
        return ContentService
          .createTextOutput(JSON.stringify({
            success: false,
            message: `${field} is required`
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    // Referrer field - accept empty, 'unspecified', or any value
    let referrer = data.referrer || 'unspecified';
    if (referrer.trim().length === 0) {
      referrer = 'unspecified';
    }
    console.log('Final referrer value:', referrer);
    
    // Access the spreadsheet
    console.log('Opening spreadsheet...');
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      console.log('Creating new sheet');
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      // Add headers
      sheet.getRange(1, 1, 1, 10).setValues([[
        'Timestamp', 'Name', 'Email', 'Phone', 'Address', 'Referrer', 'Services', 'Other Details', 'Notes', 'User Agent'
      ]]);
      sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
    }
    
    // Prepare data for insertion
    const rowData = [
      new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.address || '',
      referrer,
      services, // This should now contain all selected services
      data.otherDetails || '',
      data.notes || '',
      data.userAgent || ''
    ];
    
    console.log('Adding row to sheet:', rowData);
    sheet.appendRow(rowData);
    console.log('Data saved successfully!');
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Form submitted successfully!',
        servicesProcessed: services // Include this for debugging
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Error stack:', error.stack);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Submission error: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
