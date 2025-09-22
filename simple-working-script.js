/**
 * SIMPLE WORKING Google Apps Script
 * Minimal validation to get form working
 */

const SPREADSHEET_ID = '1t6gNYzi-eCrfbB8aIThMY4Kv-wITc3govLwohNtNvZU';
const SHEET_NAME = 'Form Submissions';

function doGet(e) {
  return ContentService
    .createTextOutput('Script is running')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    console.log('=== SIMPLE FORM SUBMISSION ===');
    console.log('Raw e.parameter:', e.parameter);
    
    const data = e.parameter || {};
    console.log('Received data:', data);
    
    // MINIMAL validation - only check if we have basic data
    if (!data.name && !data.email) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          message: 'Name and email are required'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Handle services
    let services = '';
    if (data.service) {
      if (Array.isArray(data.service)) {
        services = data.service.join(', ');
      } else if (typeof data.service === 'string') {
        if (data.service.includes(',')) {
          services = data.service.split(',').map(s => s.trim()).join(', ');
        } else {
          services = data.service;
        }
      }
    }
    
    console.log('Processed services:', services);
    
    // Save to spreadsheet
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
      sheet.getRange(1, 1, 1, 9).setValues([[
        'Timestamp', 'Name', 'Email', 'Phone', 'Address', 'Referrer', 
        'Services', 'Other Details', 'Notes'
      ]]);
      sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    }
    
    const rowData = [
      new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.address || '',
      data.referrer || 'not provided',  // Accept any referrer value
      services,
      data.otherDetails || '',
      data.notes || ''
    ];
    
    console.log('Adding row:', rowData);
    sheet.appendRow(rowData);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Form submitted successfully!',
        servicesProcessed: services
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Error: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
