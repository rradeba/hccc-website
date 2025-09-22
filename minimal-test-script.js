/**
 * MINIMAL TEST VERSION - Google Apps Script
 * This is a stripped-down version to test basic functionality
 */

function doGet(e) {
  return ContentService
    .createTextOutput('Test script is running')
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    console.log('=== MINIMAL TEST STARTED ===');
    console.log('e.parameter:', e.parameter);
    console.log('e.postData:', e.postData);
    
    // Just return success without doing anything else
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Minimal test successful - data received',
        receivedData: e.parameter
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Even minimal test failed:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Minimal test failed: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
