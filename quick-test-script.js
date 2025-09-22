/**
 * QUICK TEST SCRIPT - Accepts any form data
 * Use this to test if the basic connection works
 */

function doPost(e) {
  try {
    console.log('=== QUICK TEST SUBMISSION ===');
    console.log('Received data:', e.parameter);
    
    // Just return success for any data received
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Quick test successful!',
        receivedData: e.parameter
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Quick test error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: 'Quick test failed: ' + error.message
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput('Quick test script is running')
    .setMimeType(ContentService.MimeType.TEXT);
}
