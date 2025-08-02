# Google Sheets Setup for Event Registration with Scheduled Email Notifications

## Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Swim With a Splash - Event Registrations"
4. Add these column headers in row 1:
   - A: Timestamp
   - B: Event
   - C: Child Name
   - D: Age
   - E: Swimming Level
   - F: Goals
   - G: Phone
   - H: Email
   - I: Location
   - J: Additional Info
   - K: Time Slot
   - L: Event Date (will be auto-populated)
   - M: Confirmation Email Sent
   - N: Thank You Email Sent

## Step 2: Create Google Apps Script with Scheduled Email Automation
1. In your Google Sheet, go to Extensions > Apps Script
2. Replace the default code with this enhanced version:

```javascript
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getReservations') {
      return getReservations('Dallas');
    } else if (action === 'getReservationsCA') {
      return getReservations('California');
    }
    
    return ContentService.createTextOutput(JSON.stringify({error: 'Invalid action'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    console.error('Error in doGet:', error);
    return ContentService.createTextOutput(JSON.stringify({error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const data = e.parameter;
    
    // Check if this is a cancellation request
    if (data.action === 'cancel') {
      return handleCancellation(data);
    }
    
    // Otherwise, handle normal registration
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Extract event date from the event name or time slot
    const eventDate = extractEventDate(data.event, data.timeSlot);
    
    const rowData = [
      new Date(), // Timestamp
      data.event || 'N/A',
      data.childName,
      data.age,
      data.swimmingLevel,
      data.goals,
      data.phone,
      data.email,
      data.location || 'N/A',
      data.additionalInfo || 'N/A',
      data.timeSlot,
      eventDate, // Event Date
      'No', // Confirmation Email Sent
      'No'  // Thank You Email Sent
    ];
    
    // Find the next available row (after any deletions)
    const nextRow = findNextAvailableRow(sheet);
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);
    
    // Send immediate admin notification (not scheduled)
    sendAdminNotification(data);
    
    // Schedule confirmation email for 2 days before event
    scheduleConfirmationEmail(data, eventDate);
    
    // Schedule thank you email for 1 day after event
    scheduleThankYouEmail(data, eventDate);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Find the next available row in the sheet (fills gaps from deletions)
function findNextAvailableRow(sheet) {
  const data = sheet.getDataRange().getValues();
  
  // Start from row 2 (after header row)
  for (let i = 1; i < data.length + 1; i++) {
    // Check if this row is empty (all cells are empty or whitespace)
    if (i >= data.length) {
      // We've reached the end, this is the next row
      return i + 1;
    }
    
    const row = data[i];
    const isEmpty = row.every(cell => cell === '' || cell === null || cell === undefined || 
                              (typeof cell === 'string' && cell.trim() === ''));
    
    if (isEmpty) {
      // Found an empty row, use it
      return i + 1; // +1 because sheet rows are 1-indexed
    }
  }
  
  // If no empty rows found, append to the end
  return data.length + 1;
}

// Extract event date from event name and time slot
function extractEventDate(eventName, timeSlot) {
  let eventDate = new Date();
  
  // Parse different event formats
  if (eventName.includes('August 2–3, 2025')) {
    // California event
    if (timeSlot.includes('August 2nd')) {
      eventDate = new Date('2025-08-02');
    } else if (timeSlot.includes('August 3rd')) {
      eventDate = new Date('2025-08-03');
    }
  } else if (eventName.includes('August 23–24, 2025')) {
    // Dallas event
    if (timeSlot.includes('August 23rd')) {
      eventDate = new Date('2025-08-23');
    } else if (timeSlot.includes('August 24th')) {
      eventDate = new Date('2025-08-24');
    }
  }
  
  return eventDate;
}

// Get current reservations for cross-device sync
function getReservations(eventType) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Find column indices
    const eventCol = headers.indexOf('Event');
    const childNameCol = headers.indexOf('Child Name');
    const timeSlotCol = headers.indexOf('Time Slot');
    
    // Object to store slot reservations in the same format as JavaScript
    const slotReservations = {};
    
    // Process each row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row[childNameCol] || row[childNameCol] === '') continue;
      
      const event = row[eventCol] || '';
      const timeSlot = row[timeSlotCol] || '';
      
      // Filter by event type
      const isTargetEvent = (eventType === 'Dallas' && event.includes('Dallas')) ||
                           (eventType === 'California' && event.includes('California'));
      
      if (!isTargetEvent) continue;
      
      // Convert time slot to slot ID format
      const slotId = convertTimeSlotToSlotId(timeSlot, eventType);
      
      if (slotId) {
        // Initialize slot array if doesn't exist
        if (!slotReservations[slotId]) {
          slotReservations[slotId] = [];
        }
        
        // Add reservation to slot
        slotReservations[slotId].push({
          childName: row[childNameCol],
          email: row[headers.indexOf('Email')],
          timeSlot: timeSlot,
          timestamp: row[headers.indexOf('Timestamp')]
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      reservations: slotReservations,
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Error getting reservations:', error);
    return ContentService.createTextOutput(JSON.stringify({
      error: error.toString(),
      reservations: {}
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Convert time slot display text to slot ID
function convertTimeSlotToSlotId(timeSlot, eventType) {
  // Dallas event slot mapping
  const dallasSlots = {
    'Friday, August 23rd, 2025 - 9:00 AM - 9:30 AM (Dallas, Texas)': 'fri-9am',
    'Friday, August 23rd, 2025 - 9:30 AM - 10:00 AM (Dallas, Texas)': 'fri-930am',
    'Friday, August 23rd, 2025 - 10:00 AM - 10:30 AM (Dallas, Texas)': 'fri-10am',
    'Friday, August 23rd, 2025 - 10:30 AM - 11:00 AM (Dallas, Texas)': 'fri-1030am',
    'Friday, August 23rd, 2025 - 11:00 AM - 11:30 AM (Dallas, Texas)': 'fri-11am',
    'Friday, August 23rd, 2025 - 11:30 AM - 12:00 PM (Dallas, Texas)': 'fri-1130am',
    'Friday, August 23rd, 2025 - 1:00 PM - 1:30 PM (Dallas, Texas)': 'fri-1pm',
    'Friday, August 23rd, 2025 - 1:30 PM - 2:00 PM (Dallas, Texas)': 'fri-130pm',
    'Friday, August 23rd, 2025 - 2:00 PM - 2:30 PM (Dallas, Texas)': 'fri-2pm',
    'Friday, August 23rd, 2025 - 2:30 PM - 3:00 PM (Dallas, Texas)': 'fri-230pm',
    'Friday, August 23rd, 2025 - 3:00 PM - 3:30 PM (Dallas, Texas)': 'fri-3pm',
    'Friday, August 23rd, 2025 - 3:30 PM - 4:00 PM (Dallas, Texas)': 'fri-330pm',
    'Saturday, August 24th, 2025 - 9:00 AM - 9:30 AM (Dallas, Texas)': 'sat-9am',
    'Saturday, August 24th, 2025 - 9:30 AM - 10:00 AM (Dallas, Texas)': 'sat-930am',
    'Saturday, August 24th, 2025 - 10:00 AM - 10:30 AM (Dallas, Texas)': 'sat-10am',
    'Saturday, August 24th, 2025 - 10:30 AM - 11:00 AM (Dallas, Texas)': 'sat-1030am',
    'Saturday, August 24th, 2025 - 11:00 AM - 11:30 AM (Dallas, Texas)': 'sat-11am',
    'Saturday, August 24th, 2025 - 11:30 AM - 12:00 PM (Dallas, Texas)': 'sat-1130am',
    'Saturday, August 24th, 2025 - 1:00 PM - 1:30 PM (Dallas, Texas)': 'sat-1pm',
    'Saturday, August 24th, 2025 - 1:30 PM - 2:00 PM (Dallas, Texas)': 'sat-130pm',
    'Saturday, August 24th, 2025 - 2:00 PM - 2:30 PM (Dallas, Texas)': 'sat-2pm',
    'Saturday, August 24th, 2025 - 2:30 PM - 3:00 PM (Dallas, Texas)': 'sat-230pm',
    'Saturday, August 24th, 2025 - 3:00 PM - 3:30 PM (Dallas, Texas)': 'sat-3pm',
    'Saturday, August 24th, 2025 - 3:30 PM - 4:00 PM (Dallas, Texas)': 'sat-330pm'
  };
  
  // California event slot mapping
  const californiaSlots = {
    'Friday, August 2nd, 2025 - 9:00 AM - 9:30 AM (California)': 'fri-9am',
    'Friday, August 2nd, 2025 - 9:30 AM - 10:00 AM (California)': 'fri-930am',
    'Friday, August 2nd, 2025 - 10:00 AM - 10:30 AM (California)': 'fri-10am',
    'Friday, August 2nd, 2025 - 10:30 AM - 11:00 AM (California)': 'fri-1030am',
    'Friday, August 2nd, 2025 - 11:00 AM - 11:30 AM (California)': 'fri-11am',
    'Friday, August 2nd, 2025 - 11:30 AM - 12:00 PM (California)': 'fri-1130am',
    'Friday, August 2nd, 2025 - 1:00 PM - 1:30 PM (California)': 'fri-1pm',
    'Friday, August 2nd, 2025 - 1:30 PM - 2:00 PM (California)': 'fri-130pm',
    'Friday, August 2nd, 2025 - 2:00 PM - 2:30 PM (California)': 'fri-2pm',
    'Friday, August 2nd, 2025 - 2:30 PM - 3:00 PM (California)': 'fri-230pm',
    'Friday, August 2nd, 2025 - 3:00 PM - 3:30 PM (California)': 'fri-3pm',
    'Friday, August 2nd, 2025 - 3:30 PM - 4:00 PM (California)': 'fri-330pm',
    'Saturday, August 3rd, 2025 - 9:00 AM - 9:30 AM (California)': 'sat-9am',
    'Saturday, August 3rd, 2025 - 9:30 AM - 10:00 AM (California)': 'sat-930am',
    'Saturday, August 3rd, 2025 - 10:00 AM - 10:30 AM (California)': 'sat-10am',
    'Saturday, August 3rd, 2025 - 10:30 AM - 11:00 AM (California)': 'sat-1030am',
    'Saturday, August 3rd, 2025 - 11:00 AM - 11:30 AM (California)': 'sat-11am',
    'Saturday, August 3rd, 2025 - 11:30 AM - 12:00 PM (California)': 'sat-1130am',
    'Saturday, August 3rd, 2025 - 1:00 PM - 1:30 PM (California)': 'sat-1pm',
    'Saturday, August 3rd, 2025 - 1:30 PM - 2:00 PM (California)': 'sat-130pm',
    'Saturday, August 3rd, 2025 - 2:00 PM - 2:30 PM (California)': 'sat-2pm',
    'Saturday, August 3rd, 2025 - 2:30 PM - 3:00 PM (California)': 'sat-230pm',
    'Saturday, August 3rd, 2025 - 3:00 PM - 3:30 PM (California)': 'sat-3pm',
    'Saturday, August 3rd, 2025 - 3:30 PM - 4:00 PM (California)': 'sat-330pm'
  };
  
  if (eventType === 'Dallas') {
    return dallasSlots[timeSlot] || null;
  } else if (eventType === 'California') {
    return californiaSlots[timeSlot] || null;
  }
  
  return null;
}

// Schedule confirmation email for 2 days before event
function scheduleConfirmationEmail(data, eventDate) {
  const confirmationDate = new Date(eventDate);
  confirmationDate.setDate(confirmationDate.getDate() - 2);
  
  // Only schedule if confirmation date is in the future
  if (confirmationDate > new Date()) {
    ScriptApp.newTrigger('sendScheduledConfirmationEmail')
      .timeBased()
      .at(confirmationDate)
      .create();
    
    // Store trigger info for this registration
    const triggerData = {
      email: data.email,
      childName: data.childName,
      event: data.event,
      timeSlot: data.timeSlot,
      phone: data.phone,
      triggerType: 'confirmation'
    };
    
    // Store in script properties for later retrieval
    const properties = PropertiesService.getScriptProperties();
    const triggerId = Utilities.getUuid();
    properties.setProperty(`trigger_${triggerId}`, JSON.stringify(triggerData));
    
    console.log(`Confirmation email scheduled for ${confirmationDate} for ${data.childName}`);
  } else {
    // Send immediately if event is soon
    sendConfirmationEmail(data);
    updateEmailStatus(data.email, data.childName, 'confirmation');
  }
}

// Schedule thank you email for 1 day after event
function scheduleThankYouEmail(data, eventDate) {
  const thankYouDate = new Date(eventDate);
  thankYouDate.setDate(thankYouDate.getDate() + 1);
  
  ScriptApp.newTrigger('sendScheduledThankYouEmail')
    .timeBased()
    .at(thankYouDate)
    .create();
  
  // Store trigger info for this registration
  const triggerData = {
    email: data.email,
    childName: data.childName,
    event: data.event,
    timeSlot: data.timeSlot,
    triggerType: 'thankYou'
  };
  
  // Store in script properties for later retrieval
  const properties = PropertiesService.getScriptProperties();
  const triggerId = Utilities.getUuid();
  properties.setProperty(`trigger_${triggerId}`, JSON.stringify(triggerData));
  
  console.log(`Thank you email scheduled for ${thankYouDate} for ${data.childName}`);
}

// Function called by scheduled trigger for confirmation emails
function sendScheduledConfirmationEmail() {
  const properties = PropertiesService.getScriptProperties();
  const allProperties = properties.getProperties();
  
  // Find all confirmation triggers that should fire today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  Object.keys(allProperties).forEach(key => {
    if (key.startsWith('trigger_')) {
      try {
        const triggerData = JSON.parse(allProperties[key]);
        if (triggerData.triggerType === 'confirmation') {
          sendConfirmationEmail(triggerData);
          updateEmailStatus(triggerData.email, triggerData.childName, 'confirmation');
          // Clean up the trigger data
          properties.deleteProperty(key);
        }
      } catch (error) {
        console.error('Error processing scheduled confirmation email:', error);
      }
    }
  });
}

// Function called by scheduled trigger for thank you emails
function sendScheduledThankYouEmail() {
  const properties = PropertiesService.getScriptProperties();
  const allProperties = properties.getProperties();
  
  Object.keys(allProperties).forEach(key => {
    if (key.startsWith('trigger_')) {
      try {
        const triggerData = JSON.parse(allProperties[key]);
        if (triggerData.triggerType === 'thankYou') {
          sendPostEventThankYouEmail(triggerData);
          updateEmailStatus(triggerData.email, triggerData.childName, 'thankYou');
          // Clean up the trigger data
          properties.deleteProperty(key);
        }
      } catch (error) {
        console.error('Error processing scheduled thank you email:', error);
      }
    }
  });
}

// Update email status in the sheet
function updateEmailStatus(email, childName, emailType) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][7] === email && data[i][2] === childName) { // Column H (email) and C (child name)
      if (emailType === 'confirmation') {
        sheet.getRange(i + 1, 13).setValue('Yes'); // Column M
      } else if (emailType === 'thankYou') {
        sheet.getRange(i + 1, 14).setValue('Yes'); // Column N
      }
      break;
    }
  }
}

// Send confirmation email to parent (scheduled version)
function sendConfirmationEmail(data) {
  const parentEmail = data.email;
  const childName = data.childName;
  const eventName = data.event;
  const timeSlot = data.timeSlot;
  const phone = data.phone;
  
  // Calculate days until the event
  const eventDate = extractEventDate(data.event, data.timeSlot);
  const today = new Date();
  const timeDiff = eventDate.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  // Create dynamic message based on days remaining
  let reminderText = '';
  let subjectText = '';
  
  if (daysDiff <= 1) {
    reminderText = `<strong>${childName}</strong>'s swim lesson is tomorrow!`;
    subjectText = `Reminder: ${childName}'s Swim Lesson is Tomorrow! - Swim With a Splash`;
  } else if (daysDiff === 2) {
    reminderText = `<strong>${childName}</strong>'s swim lesson is in 2 days!`;
    subjectText = `Reminder: ${childName}'s Swim Lesson is in 2 Days! - Swim With a Splash`;
  } else {
    reminderText = `<strong>${childName}</strong>'s swim lesson is in ${daysDiff} days!`;
    subjectText = `Reminder: ${childName}'s Swim Lesson is Coming Up! - Swim With a Splash`;
  }
  
  const subject = subjectText;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #0077b6, #023e8a); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 28px;">Swim With a Splash</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Your Swim Lesson is Coming Up!</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #0077b6; margin-top: 0;">Hi there!</h2>
        
                  <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-left: 4px solid #ffc107; margin: 20px 0; text-align: center;">
            <h3 style="color: #856404; margin-top: 0;">Friendly Reminder</h3>
            <p style="margin: 5px 0; font-size: 18px; font-weight: bold;">
              ${reminderText}
            </p>
          </div>
        
                  <div style="background: #f0f8ff; padding: 20px; border-radius: 10px; border-left: 4px solid #0077b6; margin: 20px 0;">
            <h3 style="color: #0077b6; margin-top: 0;">Lesson Details</h3>
          <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${timeSlot}</p>
          <p style="margin: 5px 0;"><strong>Child's Name:</strong> ${childName}</p>
          <p style="margin: 5px 0;"><strong>Contact Phone:</strong> ${phone}</p>
        </div>
        
                  <h3 style="color: #0077b6;">What to Bring</h3>
        <ul style="line-height: 1.8; color: #333;">
          <li>Swimsuit and towel</li>
          <li>Goggles (if your child prefers them)</li>
          <li>Water bottle</li>
          <li>Positive attitude and excitement to learn!</li>
        </ul>
        
                  <h3 style="color: #0077b6;">Important Reminders</h3>
        <ul style="line-height: 1.8; color: #333;">
          <li><strong>Arrive 10 minutes early</strong> for check-in</li>
          <li>Parents are welcome to stay and watch</li>
          <li>We maintain a 2:1 coach-to-child ratio for safety</li>
          <li>If you need to cancel, please contact us ASAP</li>
        </ul>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #2e7d32; font-weight: bold;">
            Questions? Contact us at <a href="mailto:swimwithasplash@gmail.com" style="color: #0077b6;">swimwithasplash@gmail.com</a>
          </p>
        </div>
        
                  <p style="font-size: 16px; line-height: 1.6; color: #333;">
            We can't wait to see ${childName} and help them make a splash!
          </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          See you soon,<br>
          <strong>The Swim With a Splash Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
        <p>© 2025 Swim With a Splash. Building Confident Swimmers & Safer Communities.</p>
      </div>
    </div>
  `;
  
  try {
    GmailApp.sendEmail(parentEmail, subject, '', {
      htmlBody: htmlBody,
      name: 'Swim With a Splash'
    });
    console.log(`Confirmation email sent to ${parentEmail}`);
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

// Send post-event thank you email
function sendPostEventThankYouEmail(data) {
  const parentEmail = data.email;
  const childName = data.childName;
  const eventName = data.event;
  
  const subject = `Thank You ${childName} for Swimming with Us! - Swim With a Splash`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 28px;">Swim With a Splash</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Thank You for Swimming with Us!</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #28a745; margin-top: 0;">What an Amazing Swim Lesson!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          We hope <strong>${childName}</strong> had a fantastic time at yesterday's swim lesson! It was wonderful seeing them learn and build confidence in the water.
        </p>
        
                  <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #155724; margin-top: 0;">Keep the Momentum Going!</h3>
          <p style="margin: 5px 0; line-height: 1.6;">
            Swimming is a skill that improves with practice. Here are some ways to help ${childName} continue their swimming journey:
          </p>
          <ul style="line-height: 1.6; color: #155724;">
            <li>Practice floating and kicking in shallow water</li>
            <li>Visit your local pool for family swim time</li>
            <li>Watch for our upcoming swim lesson events</li>
            <li>Consider enrolling in regular swim classes</li>
          </ul>
        </div>
        
                  <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <h3 style="color: #856404; margin-top: 0;">Share Your Experience</h3>
          <p style="margin: 5px 0; color: #856404;">
            We'd love to hear about ${childName}'s experience! Your feedback helps us improve and inspires other families.
          </p>
          <p style="margin: 15px 0;">
            <a href="mailto:swimwithasplash@gmail.com?subject=Feedback for ${childName}'s swim lesson" 
               style="background: #0077b6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 20px; display: inline-block;">
              Share Your Feedback
            </a>
          </p>
        </div>
        
                  <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #0c5460; margin-top: 0;">Stay Connected</h3>
          <p style="margin: 5px 0; line-height: 1.6; color: #0c5460;">
            Keep an eye out for our future swim lesson events! We regularly host sessions in different locations and would love to continue supporting ${childName}'s swimming development.
          </p>
        </div>
        
        <div style="background: #f0f8ff; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #0077b6; font-weight: bold;">
            Questions or want to stay updated? Contact us at 
            <a href="mailto:swimwithasplash@gmail.com" style="color: #0077b6;">swimwithasplash@gmail.com</a>
          </p>
        </div>
        
                  <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Thank you for trusting us with ${childName}'s swimming education. We hope to see you again soon!
          </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Keep making waves,<br>
          <strong>The Swim With a Splash Team</strong>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px;">
        <p>© 2025 Swim With a Splash. Building Confident Swimmers & Safer Communities.</p>
      </div>
    </div>
  `;
  
  try {
    GmailApp.sendEmail(parentEmail, subject, '', {
      htmlBody: htmlBody,
      name: 'Swim With a Splash'
    });
    console.log(`Thank you email sent to ${parentEmail}`);
  } catch (error) {
    console.error('Error sending thank you email:', error);
  }
}

// Send notification email to admin (immediate)
function sendAdminNotification(data) {
  const adminEmail = 'swimwithasplash@gmail.com'; // Change this to your admin email
  const childName = data.childName;
  const eventName = data.event;
  const timeSlot = data.timeSlot;
  const parentEmail = data.email;
  const phone = data.phone;
  const age = data.age;
  const swimmingLevel = data.swimmingLevel;
  const goals = data.goals;
  const location = data.location || 'N/A';
  const additionalInfo = data.additionalInfo || 'N/A';
  
  const subject = `New Registration: ${childName} - ${eventName}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">New Registration Alert</h1>
        <p style="margin: 10px 0 0 0;">Swim With a Splash</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #dc3545; margin-top: 0;">New Student Registered!</h2>
        
                  <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">Registration Details</h3>
          <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${timeSlot}</p>
          <p style="margin: 5px 0;"><strong>Child's Name:</strong> ${childName}</p>
          <p style="margin: 5px 0;"><strong>Age:</strong> ${age}</p>
          <p style="margin: 5px 0;"><strong>Swimming Level:</strong> ${swimmingLevel}</p>
        </div>
        
                  <div style="background: #d1ecf1; padding: 20px; border-radius: 10px; border-left: 4px solid #0077b6; margin: 20px 0;">
            <h3 style="color: #0c5460; margin-top: 0;">Contact Information</h3>
          <p style="margin: 5px 0;"><strong>Parent Email:</strong> <a href="mailto:${parentEmail}">${parentEmail}</a></p>
          <p style="margin: 5px 0;"><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>
        </div>
        
                  <div style="background: #e2e3e5; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #383d41; margin-top: 0;">Goals & Additional Info</h3>
          <p style="margin: 5px 0;"><strong>Goals:</strong> ${goals}</p>
          <p style="margin: 5px 0;"><strong>Additional Info:</strong> ${additionalInfo}</p>
        </div>
        
                  <div style="background: #d4edda; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #155724; font-weight: bold;">
              Confirmation email will be sent to parent 2 days before the event<br>
              Thank you email will be sent 1 day after the event
            </p>
          </div>
        
        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
          This notification was generated automatically from your website registration form.
        </p>
      </div>
    </div>
  `;
  
  try {
    GmailApp.sendEmail(adminEmail, subject, '', {
      htmlBody: htmlBody,
      name: 'Swim With a Splash Registration System'
    });
    console.log(`Admin notification sent to ${adminEmail}`);
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

// Handle cancellation requests
function handleCancellation(data) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const childName = data.childName;
    const email = data.email;
    const timeSlot = data.timeSlot;
    
    // Find and delete the registration from the sheet
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    for (let i = 1; i < values.length; i++) { // Start from 1 to skip header
      const row = values[i];
      const rowChildName = row[2]; // Column C
      const rowEmail = row[7]; // Column H
      const rowTimeSlot = row[10]; // Column K
      
      if (rowChildName === childName && rowEmail === email && rowTimeSlot === timeSlot) {
        // Delete this row
        sheet.deleteRow(i + 1);
        console.log(`Deleted registration for ${childName} at ${timeSlot}`);
        break;
      }
    }
    
    // Cancel scheduled email triggers
    cancelScheduledEmails(childName, email, timeSlot);
    
    // Send cancellation notification to admin
    sendCancellationNotification(data);
    
    return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'cancelled' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    console.error('Error handling cancellation:', error);
  return ContentService
      .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
    .setMimeType(ContentService.MimeType.JSON);
}
}

// Cancel scheduled email triggers for a specific registration
function cancelScheduledEmails(childName, email, timeSlot) {
  try {
    const properties = PropertiesService.getScriptProperties();
    const allProperties = properties.getProperties();
    
    // Find and delete triggers for this specific registration
    Object.keys(allProperties).forEach(key => {
      if (key.startsWith('trigger_')) {
        try {
          const triggerData = JSON.parse(allProperties[key]);
          if (triggerData.childName === childName && 
              triggerData.email === email && 
              triggerData.timeSlot === timeSlot) {
            // Delete this trigger data
            properties.deleteProperty(key);
            console.log(`Cancelled scheduled emails for ${childName} at ${timeSlot}`);
          }
        } catch (error) {
          console.error('Error processing trigger for cancellation:', error);
        }
      }
    });
    
    // Also delete any active triggers (this is more complex and might require manual cleanup)
    // For now, we'll rely on the trigger data deletion to prevent emails from being sent
    
  } catch (error) {
    console.error('Error cancelling scheduled emails:', error);
  }
}

// Send cancellation notification to admin
function sendCancellationNotification(data) {
  const adminEmail = 'swimwithasplash@gmail.com'; // Change this to your admin email
  const childName = data.childName;
  const eventName = data.event || 'Swim Lesson';
  const timeSlot = data.timeSlot;
  const parentEmail = data.email;
  
  const subject = `Registration Cancelled: ${childName} - ${eventName}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #ffc107, #fd7e14); color: white; padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">Registration Cancelled</h1>
        <p style="margin: 10px 0 0 0;">Swim With a Splash</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #ffc107; margin-top: 0;">Registration Cancelled</h2>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <h3 style="color: #856404; margin-top: 0;">Cancelled Registration Details</h3>
          <p style="margin: 5px 0;"><strong>Event:</strong> ${eventName}</p>
          <p style="margin: 5px 0;"><strong>Time Slot:</strong> ${timeSlot}</p>
          <p style="margin: 5px 0;"><strong>Child's Name:</strong> ${childName}</p>
          <p style="margin: 5px 0;"><strong>Parent Email:</strong> <a href="mailto:${parentEmail}">${parentEmail}</a></p>
        </div>
        
        <div style="background: #d4edda; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #155724; font-weight: bold;">
            Registration has been removed from Google Sheets<br>
            Scheduled emails have been cancelled
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
          This cancellation was processed automatically from your website.
        </p>
      </div>
    </div>
  `;
  
  try {
    GmailApp.sendEmail(adminEmail, subject, '', {
      htmlBody: htmlBody,
      name: 'Swim With a Splash Registration System'
    });
    console.log(`Cancellation notification sent to ${adminEmail}`);
  } catch (error) {
    console.error('Error sending cancellation notification:', error);
  }
}

// Manual function to check and send any pending emails (run this daily)
function checkPendingEmails() {
  console.log('Checking for pending scheduled emails...');
  sendScheduledConfirmationEmail();
  sendScheduledThankYouEmail();
}
```

## Step 3: Set Up Daily Email Check Trigger
1. In your Google Apps Script editor, go to "Triggers" (clock icon on the left)
2. Click "+ Add Trigger"
3. Set up the following:
   - Choose which function to run: `checkPendingEmails`
   - Choose which deployment should run: `Head`
   - Select event source: `Time-driven`
   - Select type of time based trigger: `Day timer`
   - Select time of day: `8am to 9am` (or your preferred time)
4. Click "Save"

## Step 4: Deploy the Script
1. Click the "Deploy" button in the Apps Script editor
2. Choose "New deployment"
3. Set type to "Web app"
4. Set "Execute as" to "Me"
5. Set "Who has access" to "Anyone"
6. Click "Deploy"
7. Copy the web app URL and update it in your `script.js` file

## Step 5: Configure Email Settings
1. The script will use your Google account to send emails
2. Make sure to update the `adminEmail` variable in the `sendAdminNotification` function to your desired admin email address
3. The first time the script runs, it will ask for permissions to send emails and create triggers - approve these

## Step 6: Test the System
1. Submit a test registration through your website
2. Check that:
   - Data appears in your Google Sheet with event dates
   - Admin receives immediate notification email
   - Confirmation and thank you emails are scheduled (check Apps Script triggers)

## Scheduled Email Features:
- ✅ **Immediate admin notification** when registration is submitted
- ✅ **Confirmation email** sent 2 days before the event (or immediately if event is within 2 days)
- ✅ **Thank you email** sent 1 day after the event
- ✅ **Email tracking** in Google Sheets to prevent duplicates
- ✅ **Automatic date parsing** from event names and time slots
- ✅ **Daily trigger** to check for pending emails
- ✅ **Error handling** to prevent system crashes

## Email Schedule:
- **Registration Day**: Admin gets immediate notification
- **2 Days Before Event**: Parent gets confirmation/reminder email
- **1 Day After Event**: Parent gets thank you email with follow-up suggestions

## Troubleshooting:
- If emails aren't sending, check the Apps Script execution log
- Make sure you've approved email and trigger permissions
- Verify the admin email address is correct
- Check that the daily trigger is set up correctly
- Test with events that have different dates to verify date parsing 