function doPost(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      message: 'ULTRA SIMPLE TEST WORKS!',
      receivedData: e.parameter
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  return ContentService
    .createTextOutput('ULTRA SIMPLE TEST SCRIPT IS RUNNING')
    .setMimeType(ContentService.MimeType.TEXT);
}
