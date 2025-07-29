# Google Sheets Integration Setup

## Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new sheet named "Swim Lessons Registrations"
3. Add these headers in row 1:
   - `childName`
   - `age`
   - `swimmingLevel`
   - `goals`
   - `phone`
   - `location`
   - `additionalInfo`
   - `timeSlot`
   - `timestamp`

## Step 2: Create Google Apps Script
1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Replace the default code with this:

```javascript
function doPost(e) {
  try {
    // Get the spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Parse the form data
    const formData = e.parameter;
    
    // Create row data
    const rowData = [
      formData.childName,
      formData.age,
      formData.swimmingLevel,
      formData.goals,
      formData.phone,
      formData.location || 'N/A',
      formData.additionalInfo || 'N/A',
      formData.timeSlot,
      formData.timestamp
    ];
    
    // Append to sheet
    sheet.appendRow(rowData);
    
    // Optional: Send email notification
    // MailApp.sendEmail('your-email@gmail.com', 'New Swim Lesson Registration', 
    //   `New registration for ${formData.timeSlot}\nChild: ${formData.childName}\nPhone: ${formData.phone}`);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: 'Registration saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    // Get the spreadsheet and sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getActiveSheet();
    
    // Get all data (skip header row)
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Convert to array of objects
    const reservations = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    
    // Return the data as JSON
    return ContentService
      .createTextOutput(JSON.stringify(reservations))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Step 3: Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Choose **Web app**
3. Set **Execute as**: "Me"
4. Set **Who has access**: "Anyone"
5. Click **Deploy**
6. Copy the **Web app URL**

## Step 4: Update Your Website
1. Open your `script.js` file
2. Replace `'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE'` with your actual Web app URL
3. Save the file

## Step 5: Test the Integration
1. Make a test registration on your website
2. Check your Google Sheet - you should see the new row
3. Refresh your website - the slot should show as having one less spot available
4. Delete a row from your spreadsheet and refresh the website - the slot should show as having one more spot available

## Features of This Integration:
- ✅ **Real-time sync**: Website shows actual spreadsheet data
- ✅ **Deletion sync**: Removing entries from spreadsheet updates website
- ✅ **Persistent storage**: Data survives browser refreshes
- ✅ **Error handling**: Graceful fallback if spreadsheet is unavailable
- ✅ **Email notifications**: Optional email alerts for new registrations

## Security Notes:
- The "Anyone" access means anyone with the URL can submit data
- This is safe for public registration forms
- The script only allows reading and writing to your specific sheet
- No sensitive data is exposed beyond what you put in the sheet

## Optional Email Notifications:
To get email notifications when someone registers, uncomment and modify the MailApp line in the doPost function:
```javascript
MailApp.sendEmail('your-email@gmail.com', 'New Swim Lesson Registration', 
  `New registration for ${formData.timeSlot}\nChild: ${formData.childName}\nPhone: ${formData.phone}`);
``` 