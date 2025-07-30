# Google Sheets Setup for Event Registration

## Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Swim With a Splash - Event Registrations"
4. Add these column headers in row 1:
   - A: Timestamp
   - B: Child Name
   - C: Age
   - D: Swimming Level
   - E: Goals
   - F: Phone
   - G: Email
   - H: Location
   - I: Additional Info
   - J: Time Slot

## Step 2: Create Google Apps Script
1. In your Google Sheet, go to Extensions > Apps Script
2. Replace the default code with this:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = e.parameter;
    
    const rowData = [
      new Date(), // Timestamp
      data.childName,
      data.age,
      data.swimmingLevel,
      data.goals,
      data.phone,
      data.email,
      data.location || 'N/A',
      data.additionalInfo || 'N/A',
      data.timeSlot
    ];
    
    sheet.appendRow(rowData);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // For getting registration data (if needed)
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## Step 3: Deploy as Web App
1. Click "Deploy" > "New deployment"
2. Choose "Web app"
3. Set:
   - Execute as: "Me"
   - Who has access: "Anyone"
4. Click "Deploy"
5. Copy the Web App URL

## Step 4: Update Website
Replace the registration submission URL in script.js with your new Web App URL.

## Step 5: Test
Submit a test registration form to ensure data is being saved to your Google Sheet. 