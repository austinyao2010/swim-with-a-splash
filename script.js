const mainPage = document.getElementById("mainPage");
const event1 = document.getElementById("event1");
const event2 = document.getElementById("event2");

function showEvent1(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    event1.style.display = "flex";
    event1.style.flexDirection = "column";
    window.scrollTo(0, 0);
}

function showEvent2(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    event2.style.display = "flex";
    event2.style.flexDirection = "column";
    window.scrollTo(0, 0);
}

function showMembers(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    document.getElementById("members-detail").style.display = "flex";
    document.getElementById("members-detail").style.flexDirection = "column";
    window.scrollTo(0, 0);
}

function showFeedback(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    document.getElementById("feedback-page").style.display = "flex";
    document.getElementById("feedback-page").style.flexDirection = "column";
    window.scrollTo(0, 0);
}

// Smooth scroll to section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}



// Slot management system
let slotReservations = {};

// Load existing reservations from cookies and spreadsheet on page load
function loadReservations() {
    console.log('Loading reservations from both cookies and spreadsheet...');
    
    // First load from cookies (for immediate display)
    const savedReservations = getCookie('swimReservations');
    if (savedReservations) {
        slotReservations = JSON.parse(savedReservations);
        console.log('Loaded from cookies:', slotReservations);
        updateSlotDisplay();
    } else {
        console.log('No saved reservations in cookies');
    }
    
    // Then sync with spreadsheet (this will override with actual data)
    loadFromSpreadsheet();
}

// Load reservations from Google Sheets
function loadFromSpreadsheet() {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzyXr4oxh4NUXJPEa8_MABMNgYfyoNkcj51O5eFUyBoY-dB9iqXXFGCSO0z6zCTY7MgRw/exec';
    
    fetch(scriptURL + '?action=getReservations', {
        method: 'GET'
    })
    .then(response => response.json())
    .then(data => {
        console.log('Loaded from spreadsheet:', data);
        
        // Convert spreadsheet data to our format
        const spreadsheetReservations = {};
        
        data.forEach(row => {
            const timeSlot = row.timeSlot;
            const slotId = getSlotIdFromDisplay(timeSlot);
            
            if (slotId) {
                if (!spreadsheetReservations[slotId]) {
                    spreadsheetReservations[slotId] = [];
                }
                
                spreadsheetReservations[slotId].push({
                    childName: row.childName,
                    age: row.age,
                    swimmingLevel: row.swimmingLevel,
                    goals: row.goals,
                    phone: row.phone,
                    location: row.location,
                    additionalInfo: row.additionalInfo,
                    timestamp: row.timestamp,
                    timeSlot: row.timeSlot
                });
            }
        });
        
        // Update our local data with spreadsheet data
        slotReservations = spreadsheetReservations;
        
        // Save to cookies
        saveReservations();
        
        // Update display
        updateSlotDisplay();
        
        console.log('Successfully synced with spreadsheet');
    })
    .catch(error => {
        console.error('Error loading from spreadsheet:', error);
        console.log('Continuing with cookie data only');
    });
}

// Save reservations to cookies
function saveReservations() {
    setCookie('swimReservations', JSON.stringify(slotReservations), 30); // 30 days
}

// Cookie helper functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = name + '=' + value + ';expires=' + expires.toUTCString() + ';path=/';
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Update the visual display of all slots
function updateSlotDisplay() {
    console.log('Updating slot display with reservations:', slotReservations);
    
    // First, reset all slots to default state
    document.querySelectorAll('.slot-btn').forEach(btn => {
        btn.className = 'slot-btn available';
        btn.textContent = 'Sign Up';
        // Restore onclick functionality
        const slotId = btn.getAttribute('onclick')?.match(/selectSlot\('([^']+)'\)/)?.[1];
        if (slotId) {
            btn.onclick = () => selectSlot(slotId);
        }
    });
    
    document.querySelectorAll('.spots').forEach(spotsElement => {
        spotsElement.textContent = '2 spots available';
        spotsElement.style.color = '#28a745';
    });
    
    // Then update based on actual reservations
    Object.keys(slotReservations).forEach(slotId => {
        const reservations = slotReservations[slotId];
        const remainingSlots = 2 - reservations.length;
        
        console.log(`Slot ${slotId}: ${reservations.length} reservations, ${remainingSlots} remaining`);
        
        // Find the button by its onclick attribute
        const slotElement = document.querySelector(`button[onclick*="selectSlot('${slotId}')"]`);
        
        if (slotElement) {
            const slotContainer = slotElement.closest('.slot');
            const spotsElement = slotContainer.querySelector('.spots');
            
            if (remainingSlots === 0) {
                // Slot is full
                slotElement.className = 'slot-btn booked';
                slotElement.textContent = 'Full';
                slotElement.onclick = null;
                spotsElement.textContent = 'No spots available';
                spotsElement.style.color = '#dc3545';
                console.log(`Slot ${slotId} marked as FULL`);
            } else if (remainingSlots === 1) {
                // One spot left
                slotElement.className = 'slot-btn available';
                slotElement.textContent = 'Sign Up';
                slotElement.onclick = () => selectSlot(slotId);
                spotsElement.textContent = '1 spot available';
                spotsElement.style.color = '#ffc107';
                console.log(`Slot ${slotId} marked as 1 SPOT LEFT`);
            } else {
                // Multiple spots available
                slotElement.className = 'slot-btn available';
                slotElement.textContent = 'Sign Up';
                slotElement.onclick = () => selectSlot(slotId);
                spotsElement.textContent = `${remainingSlots} spots available`;
                spotsElement.style.color = '#28a745';
                console.log(`Slot ${slotId} marked as ${remainingSlots} SPOTS AVAILABLE`);
            }
        } else {
            console.log(`Could not find button for slot ${slotId}`);
        }
    });
}

function selectSlot(slotId) {
    // Check if slot is available
    const reservations = slotReservations[slotId] || [];
    if (reservations.length >= 2) {
        alert('This time slot is full. Please select another time.');
        return;
    }
    
    // Reset all buttons to their current state
    updateSlotDisplay();
    
    // Mark selected slot
    const selectedBtn = document.querySelector(`button[onclick*="selectSlot('${slotId}')"]`);
    if (selectedBtn) {
        selectedBtn.className = 'slot-btn selected';
        selectedBtn.textContent = 'Selected ✓';
    }
    
    // Update the selected slot display
    const slotDisplay = {
        'fri-9am': 'Friday, August 23rd, 2025 - 9:00 AM - 10:00 AM (Dallas, Texas)',
        'fri-10am': 'Friday, August 23rd, 2025 - 10:00 AM - 11:00 AM (Dallas, Texas)',
        'fri-11am': 'Friday, August 23rd, 2025 - 11:00 AM - 12:00 PM (Dallas, Texas)',
        'fri-1pm': 'Friday, August 23rd, 2025 - 1:00 PM - 2:00 PM (Dallas, Texas)',
        'fri-2pm': 'Friday, August 23rd, 2025 - 2:00 PM - 3:00 PM (Dallas, Texas)',
        'fri-3pm': 'Friday, August 23rd, 2025 - 3:00 PM - 4:00 PM (Dallas, Texas)',
        'sat-9am': 'Saturday, August 24th, 2025 - 9:00 AM - 10:00 AM (Dallas, Texas)',
        'sat-10am': 'Saturday, August 24th, 2025 - 10:00 AM - 11:00 AM (Dallas, Texas)',
        'sat-11am': 'Saturday, August 24th, 2025 - 11:00 AM - 12:00 PM (Dallas, Texas)',
        'sat-1pm': 'Saturday, August 24th, 2025 - 1:00 PM - 2:00 PM (Dallas, Texas)',
        'sat-2pm': 'Saturday, August 24th, 2025 - 2:00 PM - 3:00 PM (Dallas, Texas)',
        'sat-3pm': 'Saturday, August 24th, 2025 - 3:00 PM - 4:00 PM (Dallas, Texas)'
    };
    
    document.getElementById('selected-slot').value = slotDisplay[slotId];
    
    // Show the registration form
    document.getElementById('registration-form').style.display = 'block';
    
    // Smooth scroll to the form
    document.getElementById('registration-form').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

function removeReservation() {
    // Reset all buttons to their current state
    updateSlotDisplay();
    
    // Clear the selected slot
    document.getElementById('selected-slot').value = '';
    
    // Hide the registration form
    document.getElementById('registration-form').style.display = 'none';
    
    // Show confirmation message
    alert('Reservation removed successfully! You can select a new time slot.');
}

// Handle form submission
function handleRegistration(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const selectedSlot = document.getElementById('selected-slot').value;
    
    if (!selectedSlot) {
        alert('Please select a time slot first.');
        return;
    }
    
    // Extract slot ID from the selected slot text
    const slotId = getSlotIdFromDisplay(selectedSlot);
    
    // Check if slot is still available
    const reservations = slotReservations[slotId] || [];
    if (reservations.length >= 2) {
        alert('This time slot is no longer available. Please select another time.');
        return;
    }
    
    // Create reservation data
    const reservation = {
        childName: formData.get('child-name'),
        age: formData.get('child-age'),
        swimmingLevel: formData.get('swimming-level'),
        goals: formData.get('goals'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        location: formData.get('location'),
        additionalInfo: formData.get('additional-info'),
        timestamp: new Date().toISOString(),
        timeSlot: selectedSlot
    };
    
    // Add reservation to the slot
    if (!slotReservations[slotId]) {
        slotReservations[slotId] = [];
    }
    slotReservations[slotId].push(reservation);
    
    // Save to cookies
    saveReservations();
    
    // Update display
    updateSlotDisplay();
    
    // Send to Google Sheets
    submitToGoogleSheets(reservation);
    
    // Reset form
    event.target.reset();
    document.getElementById('selected-slot').value = '';
    document.getElementById('registration-form').style.display = 'none';
    
    // Show success message
    alert(`Registration successful! ${reservation.childName} is registered for ${selectedSlot}. You will receive a confirmation shortly.`);
}

// Submit reservation to Google Sheets
function submitToGoogleSheets(reservation) {
    // Replace this URL with your Google Apps Script web app URL
    const scriptURL = 'https://script.google.com/macros/s/AKfycbz-wyoRnq2bg_FEj4NzbB-pIE3T95txw3sZkw21nqpFCbKleSxazUmI0wAgjfE8azf_dw/exec';
    
    const formData = new FormData();
    formData.append('childName', reservation.childName);
    formData.append('age', reservation.age);
    formData.append('swimmingLevel', reservation.swimmingLevel);
    formData.append('goals', reservation.goals);
    formData.append('phone', reservation.phone);
    formData.append('email', reservation.email);
    formData.append('location', reservation.location || 'N/A');
    formData.append('additionalInfo', reservation.additionalInfo || 'N/A');
    formData.append('timeSlot', reservation.timeSlot);
    formData.append('timestamp', reservation.timestamp);
    
    fetch(scriptURL, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            console.log('Reservation submitted to Google Sheets successfully');
        } else {
            console.error('Error submitting to Google Sheets');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

// Helper function to get slot ID from display text
function getSlotIdFromDisplay(displayText) {
    const slotMap = {
        'Friday, August 23rd, 2025 - 9:00 AM - 10:00 AM (Dallas, Texas)': 'fri-9am',
        'Friday, August 23rd, 2025 - 10:00 AM - 11:00 AM (Dallas, Texas)': 'fri-10am',
        'Friday, August 23rd, 2025 - 11:00 AM - 12:00 PM (Dallas, Texas)': 'fri-11am',
        'Friday, August 23rd, 2025 - 1:00 PM - 2:00 PM (Dallas, Texas)': 'fri-1pm',
        'Friday, August 23rd, 2025 - 2:00 PM - 3:00 PM (Dallas, Texas)': 'fri-2pm',
        'Friday, August 23rd, 2025 - 3:00 PM - 4:00 PM (Dallas, Texas)': 'fri-3pm',
        'Saturday, August 24th, 2025 - 9:00 AM - 10:00 AM (Dallas, Texas)': 'sat-9am',
        'Saturday, August 24th, 2025 - 10:00 AM - 11:00 AM (Dallas, Texas)': 'sat-10am',
        'Saturday, August 24th, 2025 - 11:00 AM - 12:00 PM (Dallas, Texas)': 'sat-11am',
        'Saturday, August 24th, 2025 - 1:00 PM - 2:00 PM (Dallas, Texas)': 'sat-1pm',
        'Saturday, August 24th, 2025 - 2:00 PM - 3:00 PM (Dallas, Texas)': 'sat-2pm',
        'Saturday, August 24th, 2025 - 3:00 PM - 4:00 PM (Dallas, Texas)': 'sat-3pm'
    };
    return slotMap[displayText];
}

function backToMain() {
    mainPage.style.display = "flex";
    event1.style.display = "none";
    event2.style.display = "none";
    event3.style.display = "none";
    document.getElementById("members-detail").style.display = "none";
    document.getElementById("feedback-page").style.display = "none";
    
    // Restore scroll position if it was saved
    const savedScroll = sessionStorage.getItem('mainPageScroll');
    if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('mainPageScroll'); // Clean up
    }
}

// Load reservations when event3 is shown
function showEvent3(event) {
    if (event) event.preventDefault();
    // Save current scroll position before switching pages
    sessionStorage.setItem('mainPageScroll', window.pageYOffset);
    mainPage.style.display = "none";
    document.getElementById("event3").style.display = "flex";
    document.getElementById("event3").style.flexDirection = "column";
    loadReservations(); // Load existing reservations
    
    // Scroll to top of the page
    window.scrollTo(0, 0);
}

// Load reservations when page loads (in case of refresh)
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking for event3 visibility...');
    // Check if we're on the event3 page
    const event3Element = document.getElementById("event3");
    if (event3Element) {
        const display = getComputedStyle(event3Element).display;
        console.log('Event3 display style:', display);
        if (display !== "none") {
            console.log('Event3 is visible, loading reservations...');
            loadReservations();
        } else {
            console.log('Event3 is hidden');
        }
    } else {
        console.log('Event3 element not found');
    }
});

// Handle feedback form submission
function submitFeedback(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const feedback = {
        parentName: formData.get('parent-name') || 'Anonymous',
        childName: formData.get('child-name') || 'Not provided',
        eventAttended: formData.get('event-attended'),
        feedbackMessage: formData.get('feedback-message'),
        rating: formData.get('rating'),
        permission: formData.get('permission'),
        email: formData.get('email') || 'Not provided',
        timestamp: new Date().toISOString()
    };
    
    // Send to Google Sheets
    submitFeedbackToGoogleSheets(feedback);
    
    // Reset the form
    event.target.reset();
}

// Submit feedback to Google Sheets
function submitFeedbackToGoogleSheets(feedback) {
    // Replace this URL with your Google Apps Script web app URL for feedback
    const scriptURL = 'YOUR_FEEDBACK_GOOGLE_APPS_SCRIPT_URL_HERE';
    
    const formData = new FormData();
    formData.append('parentName', feedback.parentName);
    formData.append('childName', feedback.childName);
    formData.append('eventAttended', feedback.eventAttended);
    formData.append('feedbackMessage', feedback.feedbackMessage);
    formData.append('rating', feedback.rating);
    formData.append('permission', feedback.permission);
    formData.append('email', feedback.email);
    formData.append('timestamp', feedback.timestamp);
    
    fetch(scriptURL, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            console.log('Feedback submitted to Google Sheets successfully');
            const nameDisplay = feedback.parentName === 'Anonymous' ? 'Anonymous' : feedback.parentName;
            alert(`Thank you for sharing your experience${nameDisplay !== 'Anonymous' ? ', ' + nameDisplay : ''}! Your feedback helps us improve and inspire other families. We appreciate you being part of our swimming community! 🌊`);
        } else {
            console.error('Error submitting feedback to Google Sheets');
            alert('Thank you for your feedback! We received your submission.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Thank you for your feedback! We received your submission.');
    });
}