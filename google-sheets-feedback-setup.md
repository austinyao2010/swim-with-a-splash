# Google Sheets Setup for Feedback Form with Email Notifications

## Step 1: Create Google Sheet for Feedback
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Swim With a Splash - Parent Feedback"
4. Add these column headers in row 1:
   - A: Timestamp
   - B: Parent Name
   - C: Child Name
   - D: Parent Email
   - E: Event Attended
   - F: Rating
   - G: Feedback Message
   - H: Permission to Share

## Step 2: Create Google Apps Script with Email Automation
1. In your Google Sheet, go to Extensions > Apps Script
2. Replace the default code with this enhanced version:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = e.parameter;
    
    const rowData = [
      new Date(), // Timestamp
      data.parentName || 'Anonymous',
      data.childName || 'N/A',
      data.parentEmail || 'Not provided',
      data.eventAttended,
      data.rating,
      data.feedbackMessage,
      data.permission
    ];
    
    sheet.appendRow(rowData);
    
    // Send thank you email to parent (if email provided)
    if (data.parentEmail && data.parentEmail.trim() !== '') {
      sendThankYouEmail(data);
    }
    
    // Send notification email to admin
    sendFeedbackNotification(data);
    
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

// Send thank you email to parent
function sendThankYouEmail(data) {
  const parentEmail = data.parentEmail;
  const parentName = data.parentName || 'there';
  const childName = data.childName || 'your child';
  const eventAttended = data.eventAttended;
  const rating = data.rating;
  
  const subject = `Thank You for Your Feedback - Swim With a Splash`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #28a745, #20c997); color: white; padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 28px;">Swim With a Splash</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Thank You for Your Feedback!</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #28a745; margin-top: 0;">Hi ${parentName}!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Thank you so much for taking the time to share your experience with our swim lessons. Your feedback helps us continue to improve and provide the best possible experience for all our young swimmers!
        </p>
        
        <div style="background: #f0f8ff; padding: 20px; border-radius: 10px; border-left: 4px solid #28a745; margin: 20px 0;">
          <h3 style="color: #28a745; margin-top: 0;">Your Feedback Summary</h3>
          <p style="margin: 5px 0;"><strong>Event:</strong> ${eventAttended}</p>
          <p style="margin: 5px 0;"><strong>Child:</strong> ${childName}</p>
          <p style="margin: 5px 0;"><strong>Rating:</strong> ${getStarRating(rating)}</p>
        </div>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Keep Swimming with Us!</h3>
          <p style="margin: 5px 0; line-height: 1.6;">
            We hope ${childName} had a wonderful time learning and building confidence in the water. 
            Keep an eye out for our upcoming events - we'd love to continue supporting ${childName}'s swimming journey!
          </p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #856404; font-weight: bold;">
            Questions or want to register for future events? Contact us at 
            <a href="mailto:swimwithasplash@gmail.com" style="color: #0077b6;">swimwithasplash@gmail.com</a>
          </p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Thank you again for being part of the Swim With a Splash community!
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; color: #333;">
          Best regards,<br>
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

// Send notification email to admin about new feedback
function sendFeedbackNotification(data) {
  const adminEmail = 'swimwithasplash@gmail.com'; // Change this to your admin email
  const parentName = data.parentName || 'Anonymous';
  const childName = data.childName || 'N/A';
  const eventAttended = data.eventAttended;
  const rating = data.rating;
  const feedbackMessage = data.feedbackMessage;
  const permission = data.permission;
  const parentEmail = data.parentEmail || 'Not provided';
  
  const subject = `New Feedback Received - ${rating}/5 Stars - ${eventAttended}`;
  
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9ff;">
      <div style="background: linear-gradient(135deg, #ffc107, #fd7e14); color: white; padding: 20px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px;">New Feedback Received</h1>
        <p style="margin: 10px 0 0 0;">Swim With a Splash</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
        <h2 style="color: #ffc107; margin-top: 0;">Parent Shared Their Experience!</h2>
        
        <div style="background: ${getRatingColor(rating)}; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #333;">Rating: ${rating}/5 Stars</h3>
        </div>
        
        <div style="background: #e9ecef; padding: 20px; border-radius: 10px; border-left: 4px solid #6c757d; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Family Information</h3>
          <p style="margin: 5px 0;"><strong>Parent Name:</strong> ${parentName}</p>
          <p style="margin: 5px 0;"><strong>Child Name:</strong> ${childName}</p>
          <p style="margin: 5px 0;"><strong>Event Attended:</strong> ${eventAttended}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${parentEmail}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; border-left: 4px solid #0077b6; margin: 20px 0;">
          <h3 style="color: #0077b6; margin-top: 0;">Their Feedback</h3>
          <p style="margin: 0; line-height: 1.6; font-style: italic; color: #333;">
            "${feedbackMessage}"
          </p>
        </div>
        
        <div style="background: ${permission === 'yes' ? '#d4edda' : '#f8d7da'}; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: ${permission === 'yes' ? '#155724' : '#721c24'}; font-weight: bold;">
            ${permission === 'yes' ? 'Permission granted to share this feedback publicly' : 'Keep this feedback private'}
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
          This notification was generated automatically from your website feedback form.
        </p>
      </div>
    </div>
  `;
  
  try {
    GmailApp.sendEmail(adminEmail, subject, '', {
      htmlBody: htmlBody,
      name: 'Swim With a Splash Feedback System'
    });
    console.log(`Feedback notification sent to ${adminEmail}`);
  } catch (error) {
    console.error('Error sending feedback notification:', error);
  }
}

// Helper function to convert rating number to text
function getStarRating(rating) {
  return `${rating}/5 Stars`;
}

// Helper function to get background color based on rating
function getRatingColor(rating) {
  const ratingNum = parseInt(rating);
  if (ratingNum >= 5) return '#d4edda'; // Green for excellent
  if (ratingNum >= 4) return '#cce5ff'; // Light blue for very good
  if (ratingNum >= 3) return '#fff3cd'; // Yellow for good
  if (ratingNum >= 2) return '#ffeaa7'; // Orange for fair
  return '#f8d7da'; // Light red for poor
}
```

## Step 3: Deploy the Script
1. Click the "Deploy" button in the Apps Script editor
2. Choose "New deployment"
3. Set type to "Web app"
4. Set "Execute as" to "Me"
5. Set "Who has access" to "Anyone"
6. Click "Deploy"
7. Copy the web app URL

## Step 4: Update Your Website's Feedback Form
You'll need to update the `submitFeedback` function in your `script.js` to use this new URL. The function should send data to your new Google Apps Script endpoint.

## Step 5: Configure Email Settings
1. Update the `adminEmail` variable in the script to your desired admin email
2. The first time the script runs, approve email permissions
3. Consider adding an optional email field to your feedback form if you want to send thank you emails

## Email Features Included:
- ✅ **Thank you emails** to parents (if email provided)
- ✅ **Admin notifications** with complete feedback details
- ✅ **Star ratings** displayed visually in emails
- ✅ **Permission tracking** for public sharing
- ✅ **Color-coded ratings** for quick assessment
- ✅ **Professional formatting** with brand consistency

## Optional: Add Email Field to Feedback Form
If you want to collect parent emails for thank you messages, add this field to your feedback form in `index.html`:

```html
<div class="form-group">
  <label for="parent-email">Your Email (Optional - for thank you message)</label>
  <input type="email" id="parent-email" name="parent-email" placeholder="your.email@example.com">
</div>
```

## Troubleshooting:
- Check Apps Script execution logs for errors
- Verify email permissions are approved
- Ensure admin email address is correct
- Test with a sample submission 