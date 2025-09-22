# Google Apps Script Setup for Form Submission

This document explains how to set up the Google Apps Script to properly receive form submissions from the Holy City Clean Co. website.

## Form Fields Being Sent

The form sends the following fields to your Google Apps Script:

### Required Fields:
- `name` - Customer's full name
- `email` - Customer's email address
- `phone` - Customer's phone number
- `address` - Customer's address
- `referrer` - How they heard about the business
- `service` - Array of selected services (can be multiple values)

### Optional Fields:
- `otherDetails` - Description of other services (only filled if "Other" service is selected)
- `notes` - Additional comments from customer

### System Fields:
- `timestamp` - When the form was submitted
- `userAgent` - Browser information
- `pageReferrer` - Where they came from

## Sample Google Apps Script Code

Here's the Google Apps Script code you should use to handle the form submissions:

```javascript
function doPost(e) {
  try {
    // Get the spreadsheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    
    // Get form data - handle both parameter and postData scenarios
    let data = {};
    
    // Try to get data from parameters first (URL-encoded)
    if (e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    }
    // If no parameters, try to parse from postData (FormData)
    else if (e.postData && e.postData.contents) {
      try {
        // Try to parse as JSON first
        data = JSON.parse(e.postData.contents);
      } catch (jsonError) {
        // If not JSON, try to parse as URL-encoded
        const params = new URLSearchParams(e.postData.contents);
        for (const [key, value] of params) {
          if (data[key]) {
            // Handle multiple values (like checkboxes)
            if (Array.isArray(data[key])) {
              data[key].push(value);
            } else {
              data[key] = [data[key], value];
            }
          } else {
            data[key] = value;
          }
        }
      }
    }
    
    // Log all received data for debugging
    console.log('Raw e.parameter:', e.parameter);
    console.log('Raw e.postData:', e.postData);
    console.log('Processed data:', data);
    console.log('Other details field:', data.otherDetails);
    console.log('Service field:', data.service);
    
    // Create headers if they don't exist
    if (sheet.getLastRow() === 0) {
      const headers = [
        'Timestamp',
        'Name', 
        'Email', 
        'Phone', 
        'Address', 
        'How Heard About Us',
        'Services',
        'Other Service Details',
        'Comments/Notes',
        'User Agent',
        'Page Referrer'
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    // Handle services array - convert to comma-separated string
    let services = '';
    if (data.service) {
      if (Array.isArray(data.service)) {
        services = data.service.join(', ');
      } else if (typeof data.service === 'string') {
        // Handle comma-separated string from URL encoding
        services = data.service.split(',').map(s => s.trim()).join(', ');
      } else {
        services = data.service.toString();
      }
    }
    
    // Prepare row data
    const rowData = [
      data.timestamp || new Date().toISOString(),
      data.name || '',
      data.email || '',
      data.phone || '',
      data.address || '',
      data.referrer || '',
      services,
      data.otherDetails || '',  // This is the field that should receive "Other" descriptions
      data.notes || '',
      data.userAgent || '',
      data.pageReferrer || ''
    ];
    
    // Add the row
    sheet.appendRow(rowData);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'Data saved successfully'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Error processing form submission:', error);
    console.log('Error details:', error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({success: false, message: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Important Notes:

1. **otherDetails Field**: Make sure your Google Apps Script specifically handles the `otherDetails` field. This contains the description when "Other" service is selected.

2. **Services Array**: The `service` field can contain multiple values, so it needs to be handled as an array.

3. **Column Mapping**: Make sure the column order in your spreadsheet matches the order in the `rowData` array above.

4. **Debugging**: Check the Google Apps Script logs to see if the `otherDetails` field is being received properly.

## Testing the Setup:

1. Submit a form with "Other" selected and some text in the description field
2. Check the Google Apps Script logs to see what data was received
3. Verify that the `otherDetails` field appears in your spreadsheet

If the `otherDetails` field is still not appearing, the issue is likely in the Google Apps Script configuration rather than the frontend code.
