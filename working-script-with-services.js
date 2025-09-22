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
      status: 'ready'
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
    console.log('Service field type:', typeof data.service);
    
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
    
    // Basic validation - only check for required fields
    if (!data.name || !data.email) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Name and email are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
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
      data.referrer || '',
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
        message: 'Error: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
