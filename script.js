const mainPage = document.getElementById("mainPage");
const event1 = document.getElementById("event1");
const event2 = document.getElementById("event2");
const event5 = document.getElementById("event5");

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

function showEvent5(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    event5.style.display = "flex";
    event5.style.flexDirection = "column";
    window.scrollTo(0, 0);
}

function showMembers(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    document.getElementById("members-detail").style.display = "flex";
    document.getElementById("members-detail").style.flexDirection = "column";
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

// Load existing reservations from localStorage and spreadsheet on page load
function loadReservations() {
    console.log('Loading reservations from both localStorage and spreadsheet...');
    
    // First load from localStorage (for immediate display)
    const savedReservations = localStorage.getItem('swimReservations');
    if (savedReservations) {
        try {
        slotReservations = JSON.parse(savedReservations);
            console.log('Loaded from localStorage:', slotReservations);
        updateSlotDisplay();
        } catch (error) {
            console.error('Error parsing saved reservations:', error);
            localStorage.removeItem('swimReservations');
        }
    } else {
        console.log('No saved reservations in localStorage');
    }
    
    // Re-enabling sync since Google Apps Script is working
    loadFromSpreadsheet();
    
    // Set up periodic syncing every 30 seconds
    startPeriodicSync();
}

// Load reservations from Google Sheets and sync with localStorage
async function loadFromSpreadsheet() {
    console.log('Loading reservations from Google Sheets...');
    
    try {
        // Use the same Google Apps Script URL but with a GET request to fetch data
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwTLB_xpqtPFqW1oDFPvGz_O6Ou8Gm2UJ4RXVSKnzN_eaUM22TiFXlc9RULiu99rzLRmA/exec';
        
        console.log('Fetching Dallas data from:', `${scriptURL}?action=getReservations`);
        
        const response = await fetch(`${scriptURL}?action=getReservations&t=${Date.now()}`);
        
                if (response.ok) {
            const data = await response.json();
            console.log('Received data from Google Sheets:', data);
            
            if (data.success && data.reservations) {
                console.log('Before sync - Dallas slots:', Object.keys(slotReservations).length);
                
                // Merge Google Sheets data with localStorage (don't overwrite local data)
                Object.keys(data.reservations).forEach(slotId => {
                    if (!slotReservations[slotId]) {
                        slotReservations[slotId] = [];
                    }
                    // Add any reservations from Google Sheets that aren't already local
                    data.reservations[slotId].forEach(reservation => {
                        const exists = slotReservations[slotId].some(local => 
                            local.childName === reservation.childName && 
                            local.timeSlot === reservation.timeSlot
                        );
                        if (!exists) {
                            slotReservations[slotId].push(reservation);
                        }
                    });
                });
                
                console.log('After sync - Dallas slots:', Object.keys(slotReservations).length);
                console.log('Detailed reservations:', slotReservations);
                
                // Update localStorage with fresh data
        saveReservations();
        
                // Update the display
        updateSlotDisplay();
        
                console.log('Successfully synced with Google Sheets - found', Object.keys(data.reservations).length, 'slot groups');
            } else if (data.error) {
                console.warn('Google Sheets returned error:', data.error);
                updateSlotDisplay();
            } else {
                console.warn('Google Sheets returned unexpected format:', data);
                console.log('Expected: {success: true, reservations: {}}');
                console.log('Received:', data);
                updateSlotDisplay();
            }
        } else {
            console.warn('HTTP error from Google Sheets:', response.status, response.statusText);
            updateSlotDisplay();
        }
    } catch (error) {
        console.warn('Error fetching from Google Sheets, falling back to localStorage:', error);
        updateSlotDisplay();
    }
}

// Save reservations to localStorage
function saveReservations() {
    try {
        localStorage.setItem('swimReservations', JSON.stringify(slotReservations));
        console.log('Reservations saved to localStorage:', slotReservations);
    } catch (error) {
        console.error('Error saving reservations to localStorage:', error);
    }
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

// Function to check if a time slot has already passed
function isSlotPassed(slotId, eventType = 'southlake') {
    const now = new Date();
    
    // Define the event dates and time mappings
    const eventDates = {
        southlake: {
            'fri': new Date('2025-08-23'), // August 23, 2025
            'sat': new Date('2025-08-24')  // August 24, 2025
        },
        california: {
            'fri': new Date('2025-08-02'), // August 2, 2025
            'sat': new Date('2025-08-03')  // August 3, 2025
        }
    };
    
    // Extract day and time from slotId
    const [day, timeStr] = slotId.split('-');
    const eventDate = eventDates[eventType][day];
    
    if (!eventDate) {
        return false; // If we can't determine the date, allow the slot
    }
    
    // Parse the time string to get hours and minutes
    let hours, minutes;
    
    if (timeStr.includes('am')) {
        const timeNum = timeStr.replace('am', '');
        if (timeNum.includes('30')) {
            hours = parseInt(timeNum.replace('30', ''));
            minutes = 30;
        } else {
            hours = parseInt(timeNum);
            minutes = 0;
        }
        // Handle 12 AM edge case
        if (hours === 12) hours = 0;
    } else if (timeStr.includes('pm')) {
        const timeNum = timeStr.replace('pm', '');
        if (timeNum.includes('30')) {
            hours = parseInt(timeNum.replace('30', ''));
            minutes = 30;
        } else {
            hours = parseInt(timeNum);
            minutes = 0;
        }
        // Convert PM to 24-hour format (except 12 PM)
        if (hours !== 12) hours += 12;
    }
    
    // Create the full datetime for this slot
    const slotDateTime = new Date(eventDate);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    // Check if the slot time has passed
    return now > slotDateTime;
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
        spotsElement.className = 'spots';
    });
    

    
    // Check all slots for time-based availability and reservations
    const allSlotIds = [
        'fri-9am', 'fri-930am', 'fri-10am', 'fri-1030am', 'fri-11am',
        'sat-9am', 'sat-930am', 'sat-10am', 'sat-1030am', 'sat-11am'
    ];
    
    allSlotIds.forEach(slotId => {
        const slotElement = document.querySelector(`button[onclick*="selectSlot('${slotId}')"]`);
        
        if (slotElement) {
            const slotContainer = slotElement.closest('.slot');
            const spotsElement = slotContainer.querySelector('.spots');
            
                         // Check if this slot has already passed
             if (isSlotPassed(slotId, 'southlake')) {
                 slotElement.className = 'slot-btn passed';
                 slotElement.textContent = 'Passed';
                 slotElement.onclick = null;
                 spotsElement.textContent = 'Time has passed';
                 spotsElement.className = 'spots full';
                 console.log(`Slot ${slotId} marked as PASSED`);
                 return; // Skip reservation checking for passed slots
             }
            
            // Check reservations for available slots
            const reservations = slotReservations[slotId] || [];
            const remainingSlots = 2 - reservations.length;
            
            console.log(`Slot ${slotId}: ${reservations.length} reservations, ${remainingSlots} remaining`);
            

            
            if (remainingSlots === 0) {
                // Slot is full
                slotElement.className = 'slot-btn booked';
                slotElement.textContent = 'Full';
                slotElement.onclick = null;
                spotsElement.textContent = 'No spots available';
                spotsElement.className = 'spots full';
                console.log(`Slot ${slotId} marked as FULL`);
            } else if (remainingSlots === 1) {
                // One spot left
                slotElement.className = 'slot-btn available';
                slotElement.textContent = 'Sign Up';
                slotElement.onclick = () => selectSlot(slotId);
                spotsElement.textContent = '1 spot left';
                spotsElement.className = 'spots warning';
                console.log(`Slot ${slotId} marked as 1 SPOT LEFT`);
            } else {
                // Multiple spots available
                slotElement.className = 'slot-btn available';
                slotElement.textContent = 'Sign Up';
                slotElement.onclick = () => selectSlot(slotId);
                spotsElement.textContent = `${remainingSlots} spots available`;
                spotsElement.className = 'spots';
                console.log(`Slot ${slotId} marked as ${remainingSlots} SPOTS AVAILABLE`);
            }
        } else {
            console.log(`Could not find button for slot ${slotId}`);
        }
    });
}

function selectSlot(slotId) {
    // Check if time slot has already passed
    if (isSlotPassed(slotId, 'southlake')) {
        alert('This time slot has already passed. Please select a future time slot.');
        return;
    }
    
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
        'fri-9am': 'Saturday, August 23rd, 2025 - 9:00 AM - 9:30 AM (Southlake, Texas)',
        'fri-930am': 'Saturday, August 23rd, 2025 - 9:30 AM - 10:00 AM (Southlake, Texas)',
        'fri-10am': 'Saturday, August 23rd, 2025 - 10:00 AM - 10:30 AM (Southlake, Texas)',
        'fri-1030am': 'Saturday, August 23rd, 2025 - 10:30 AM - 11:00 AM (Southlake, Texas)',
        'fri-11am': 'Saturday, August 23rd, 2025 - 11:00 AM - 11:30 AM (Southlake, Texas)',
        'sat-9am': 'Sunday, August 24th, 2025 - 9:00 AM - 9:30 AM (Southlake, Texas)',
        'sat-930am': 'Sunday, August 24th, 2025 - 9:30 AM - 10:00 AM (Southlake, Texas)',
        'sat-10am': 'Sunday, August 24th, 2025 - 10:00 AM - 10:30 AM (Southlake, Texas)',
        'sat-1030am': 'Sunday, August 24th, 2025 - 10:30 AM - 11:00 AM (Southlake, Texas)',
        'sat-11am': 'Sunday, August 24th, 2025 - 11:00 AM - 11:30 AM (Southlake, Texas)'
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
    // Get all current reservations
    const allReservations = [];
    
    Object.keys(slotReservations).forEach(slotId => {
        slotReservations[slotId].forEach((reservation, index) => {
            allReservations.push({
                slotId: slotId,
                index: index,
                reservation: reservation,
                displayText: `${reservation.childName} (Age ${reservation.age}) - ${reservation.timeSlot}`
            });
        });
    });
    
    if (allReservations.length === 0) {
        alert('No reservations found to cancel.');
        return;
    }
    
    // Create a selection dialog
    let message = 'Select which reservation to cancel:\n\n';
    allReservations.forEach((item, index) => {
        message += `${index + 1}. ${item.displayText}\n`;
    });
    message += '\nEnter the number of the reservation to cancel (or 0 to cancel):';
    
    const selection = prompt(message);
    
    if (selection === null || selection === '0' || selection === '') {
        return; // User cancelled
    }
    
    const selectionNum = parseInt(selection) - 1;
    
    if (selectionNum < 0 || selectionNum >= allReservations.length || isNaN(selectionNum)) {
        alert('Invalid selection. Please try again.');
        return;
    }
    
    const selectedReservation = allReservations[selectionNum];
    
    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to cancel this reservation?\n\n${selectedReservation.displayText}\n\nThis action cannot be undone.`);
    
    if (!confirmDelete) {
        return;
    }
    
    // Remove the reservation
    slotReservations[selectedReservation.slotId].splice(selectedReservation.index, 1);
    
    // If no reservations left for this slot, remove the slot entirely
    if (slotReservations[selectedReservation.slotId].length === 0) {
        delete slotReservations[selectedReservation.slotId];
    }
    
    // Send cancellation to Google Sheets
    sendCancellationToGoogleSheets(selectedReservation.reservation);
    
    // Save updated reservations
    saveReservations();
    
    // Update display
    updateSlotDisplay();
    
    // Clear the selected slot and hide form
    document.getElementById('selected-slot').value = '';
    document.getElementById('registration-form').style.display = 'none';
    
    // Show success message
    alert(`Reservation for ${selectedReservation.reservation.childName} has been successfully cancelled.`);
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
        event: formData.get('event') || 'Southridge Lakes Swim Lessons – August 23–24, 2025 (Southlake, Texas)',
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
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwTLB_xpqtPFqW1oDFPvGz_O6Ou8Gm2UJ4RXVSKnzN_eaUM22TiFXlc9RULiu99rzLRmA/exec';
    
    const formData = new FormData();
    formData.append('event', reservation.event || 'Southridge Lakes Swim Lessons – August 23–24, 2025 (Southlake, Texas)');
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
        'Saturday, August 23rd, 2025 - 9:00 AM - 9:30 AM (Southlake, Texas)': 'fri-9am',
        'Saturday, August 23rd, 2025 - 9:30 AM - 10:00 AM (Southlake, Texas)': 'fri-930am',
        'Saturday, August 23rd, 2025 - 10:00 AM - 10:30 AM (Southlake, Texas)': 'fri-10am',
        'Saturday, August 23rd, 2025 - 10:30 AM - 11:00 AM (Southlake, Texas)': 'fri-1030am',
        'Saturday, August 23rd, 2025 - 11:00 AM - 11:30 AM (Southlake, Texas)': 'fri-11am',
        'Sunday, August 24th, 2025 - 9:00 AM - 9:30 AM (Southlake, Texas)': 'sat-9am',
        'Sunday, August 24th, 2025 - 9:30 AM - 10:00 AM (Southlake, Texas)': 'sat-930am',
        'Sunday, August 24th, 2025 - 10:00 AM - 10:30 AM (Southlake, Texas)': 'sat-10am',
        'Sunday, August 24th, 2025 - 10:30 AM - 11:00 AM (Southlake, Texas)': 'sat-1030am',
        'Sunday, August 24th, 2025 - 11:00 AM - 11:30 AM (Southlake, Texas)': 'sat-11am'
    };
    return slotMap[displayText];
}

function backToMain() {
    mainPage.style.display = "flex";
    event1.style.display = "none";
    event2.style.display = "none";
    event3.style.display = "none";
    document.getElementById("event4").style.display = "none";
    event5.style.display = "none";
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

// Load reservations when event4 (California) is shown
function showEvent4(event) {
    if (event) event.preventDefault();
    // Save current scroll position before switching pages
    sessionStorage.setItem('mainPageScroll', window.pageYOffset);
    mainPage.style.display = "none";
    document.getElementById("event4").style.display = "flex";
    document.getElementById("event4").style.flexDirection = "column";
    loadReservationsCA(); // Load existing reservations for California
    
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
        email: formData.get('parent-email') || 'Not provided',
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
    const scriptURL = 'https://script.google.com/macros/s/AKfycbx-XNKN1CLp9lE-wNsKqe3E38eA3BDaUgoKS4ZpjZE0I8_zqAr79e4JD7sV6_GiM9K_xw/exec';
    
    const formData = new FormData();
    formData.append('parentName', feedback.parentName);
    formData.append('childName', feedback.childName);
    formData.append('eventAttended', feedback.eventAttended);
    formData.append('feedbackMessage', feedback.feedbackMessage);
    formData.append('rating', feedback.rating);
    formData.append('permission', feedback.permission);
    formData.append('parentEmail', feedback.email);
    formData.append('timestamp', feedback.timestamp);
    
    fetch(scriptURL, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (response.ok) {
            console.log('Feedback submitted to Google Sheets successfully');
            const nameDisplay = feedback.parentName === 'Anonymous' ? 'Anonymous' : feedback.parentName;
            showFeedbackSuccessMessage(`Thank you for sharing your experience${nameDisplay !== 'Anonymous' ? ', ' + nameDisplay : ''}! Your feedback helps us improve and inspire other families. We appreciate you being part of our swimming community! 🌊`);
        } else {
            console.error('Error submitting feedback to Google Sheets');
            showFeedbackSuccessMessage('Thank you for your feedback! We received your submission.');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showFeedbackSuccessMessage('Thank you for your feedback! We received your submission.');
    });
}

// Show feedback success message on screen
function showFeedbackSuccessMessage(message) {
    // Create success message element
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 20px 30px;
        border-radius: 15px;
        box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
        z-index: 10000;
        font-size: 16px;
        font-weight: 600;
        text-align: center;
        max-width: 500px;
        width: 90%;
        animation: slideDown 0.5s ease-out;
    `;
    
    // Add CSS animation
    if (!document.getElementById('feedback-success-styles')) {
        const style = document.createElement('style');
        style.id = 'feedback-success-styles';
        style.textContent = `
            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            @keyframes slideUp {
                from {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-20px);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    successDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
            <span style="font-size: 24px;">✅</span>
            <span>${message}</span>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(successDiv);
    
    // Remove after 5 seconds with fade out animation
    setTimeout(() => {
        successDiv.style.animation = 'slideUp 0.5s ease-out';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 500);
    }, 5000);
    
    // Allow manual dismissal on click
    successDiv.addEventListener('click', () => {
        successDiv.style.animation = 'slideUp 0.5s ease-out';
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 500);
    });
}

// Automatically populate feedback form with available events
function populateEventOptions() {
    const eventSelect = document.getElementById('event-attended');
    if (!eventSelect) return;
    
    // Clear existing options except the first one
    while (eventSelect.children.length > 1) {
        eventSelect.removeChild(eventSelect.lastChild);
    }
    
    const events = [];
    
    // Automatically detect ALL events from the main page (both upcoming and past)
    console.log('Scanning for events...');
    
    // Get all event titles from both upcoming and past events sections
    const allEventTitles = document.querySelectorAll('#events .card .card h3');
    
    allEventTitles.forEach(eventTitle => {
        const titleText = eventTitle.textContent.trim();
        console.log('Found event title:', titleText);
        
        // Skip section headers
        if (titleText.includes('Upcoming Events') || titleText.includes('Past Events')) {
            return;
        }
        
        // Extract specific event details including dates for the dropdown
        let cleanName = titleText;
        
        // Current/Upcoming Events with specific dates
        if (titleText.includes('California Swim Lessons – August 2–3, 2025')) {
            cleanName = "California Swim Lessons - August 2-3, 2025";
        } else if (titleText.includes('Dallas Swim Lessons – August 23–24, 2025')) {
            cleanName = "Dallas Swim Lessons - August 23-24, 2025";
        }
        // Past Events with specific dates
        else if (titleText.includes('Chestnut Hill Swim Lessons – August 14–16, 2023')) {
            cleanName = "Chestnut Hill Swim Lessons - August 14-16, 2023 (Mason, Ohio)";
        } else if (titleText.includes('Chestnut Hill Swim Lessons – May 18–19, 2024')) {
            cleanName = "Chestnut Hill Swim Lessons - May 18-19, 2024 (Mason, Ohio)";
        }
        // Generic fallback that preserves the full event name
        else {
            // Clean up the formatting but keep all the details
            cleanName = titleText
                .replace(/–/g, '-') // Replace em dash with regular dash
                .replace(/\s+/g, ' ') // Normalize spaces
                .trim();
        }
        
        events.push({
            title: titleText,
            value: cleanName,
            isUpcoming: titleText.includes('2025')
        });
        
        console.log('Added event:', cleanName);
    });
    
    // Sort events by date (newest first)
    events.sort((a, b) => {
        const yearA = parseInt(a.value.match(/\d{4}/)?.[0] || '0');
        const yearB = parseInt(b.value.match(/\d{4}/)?.[0] || '0');
        if (yearA !== yearB) return yearB - yearA;
        
        // If same year, sort by month
        const monthOrder = { 'August': 8, 'May': 5, 'September': 9 };
        const monthA = monthOrder[a.value.split(' ')[0]] || 0;
        const monthB = monthOrder[b.value.split(' ')[0]] || 0;
        return monthB - monthA;
    });
    
    // Add each event as an option
    events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.value;
        option.textContent = event.value;
        eventSelect.appendChild(option);
    });
    
    // Add "Other" option at the end
    const otherOption = document.createElement('option');
    otherOption.value = "Other";
    otherOption.textContent = "Other";
    eventSelect.appendChild(otherOption);
    
    console.log('Populated feedback form with events:', events.map(e => e.value));
}

// Auto-populate when feedback page is shown
function showFeedback(event) {
    if (event) event.preventDefault();
    mainPage.style.display = "none";
    document.getElementById("feedback-page").style.display = "flex";
    document.getElementById("feedback-page").style.flexDirection = "column";
    
    // Populate event options dynamically
    populateEventOptions();
    
    window.scrollTo(0, 0);
}

// California Event Functions
let slotReservationsCA = {};

// Load existing reservations for California from localStorage and Google Sheets
function loadReservationsCA() {
    console.log('Loading California reservations from localStorage and Google Sheets...');
    
    // First load from localStorage (for immediate display)
    const savedReservations = localStorage.getItem('swimReservationsCA');
    if (savedReservations) {
        try {
            slotReservationsCA = JSON.parse(savedReservations);
            console.log('Loaded CA reservations from localStorage:', slotReservationsCA);
            updateSlotDisplayCA();
        } catch (error) {
            console.error('Error parsing saved CA reservations:', error);
            localStorage.removeItem('swimReservationsCA');
        }
    } else {
        console.log('No saved CA reservations in localStorage');
    }
    
    // Then sync with Google Sheets
    loadFromSpreadsheetCA();
}

// Load California reservations from Google Sheets and sync with localStorage
async function loadFromSpreadsheetCA() {
    console.log('Loading CA reservations from Google Sheets...');
    
    try {
        // Use the same Google Apps Script URL but with a GET request to fetch CA data
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwTLB_xpqtPFqW1oDFPvGz_O6Ou8Gm2UJ4RXVSKnzN_eaUM22TiFXlc9RULiu99rzLRmA/exec';
        
        console.log('Fetching CA data from:', `${scriptURL}?action=getReservationsCA`);
        
        const response = await fetch(`${scriptURL}?action=getReservationsCA&t=${Date.now()}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Received CA data from Google Sheets:', data);
            
            if (data.success && data.reservations) {
                // Merge Google Sheets data with localStorage (don't overwrite local data)
                Object.keys(data.reservations).forEach(slotId => {
                    if (!slotReservationsCA[slotId]) {
                        slotReservationsCA[slotId] = [];
                    }
                    // Add any reservations from Google Sheets that aren't already local
                    data.reservations[slotId].forEach(reservation => {
                        const exists = slotReservationsCA[slotId].some(local => 
                            local.childName === reservation.childName && 
                            local.timeSlot === reservation.timeSlot
                        );
                        if (!exists) {
                            slotReservationsCA[slotId].push(reservation);
                        }
                    });
                });
                
                // Update localStorage with fresh data
                saveReservationsCA();
                
                // Update the display
                updateSlotDisplayCA();
                
                console.log('Successfully synced CA data with Google Sheets - found', Object.keys(data.reservations).length, 'slot groups');
            } else if (data.error) {
                console.warn('Google Sheets returned CA error:', data.error);
                updateSlotDisplayCA();
            } else {
                console.warn('Google Sheets returned unexpected CA format:', data);
                updateSlotDisplayCA();
            }
        } else {
            console.warn('HTTP error from Google Sheets CA:', response.status, response.statusText);
            updateSlotDisplayCA();
        }
    } catch (error) {
        console.warn('Error fetching CA data from Google Sheets, falling back to localStorage:', error);
        updateSlotDisplayCA();
    }
}

// Save California reservations to localStorage
function saveReservationsCA() {
    try {
        localStorage.setItem('swimReservationsCA', JSON.stringify(slotReservationsCA));
        console.log('CA Reservations saved to localStorage:', slotReservationsCA);
    } catch (error) {
        console.error('Error saving CA reservations to localStorage:', error);
    }
}

// Update the visual display of all California slots
function updateSlotDisplayCA() {
    console.log('Updating CA slot display with reservations:', slotReservationsCA);
    
    // First, reset all slots to default state
    document.querySelectorAll('#event4 .slot-btn').forEach(btn => {
        btn.className = 'slot-btn available';
        btn.textContent = 'Sign Up';
        // Restore onclick functionality
        const slotId = btn.getAttribute('onclick')?.match(/selectSlotCA\('([^']+)'\)/)?.[1];
        if (slotId) {
            btn.onclick = () => selectSlotCA(slotId);
        }
    });
    
    document.querySelectorAll('#event4 .spots').forEach(spotsElement => {
        spotsElement.textContent = '2 spots available';
        spotsElement.className = 'spots';
    });
    
    // Check all slots for time-based availability and reservations
    const allSlotIds = [
        'fri-9am', 'fri-930am', 'fri-10am', 'fri-1030am', 'fri-11am', 'fri-1130am',
        'fri-1pm', 'fri-130pm', 'fri-2pm', 'fri-230pm', 'fri-3pm', 'fri-330pm',
        'sat-9am', 'sat-930am', 'sat-10am', 'sat-1030am', 'sat-11am', 'sat-1130am',
        'sat-1pm', 'sat-130pm', 'sat-2pm', 'sat-230pm', 'sat-3pm', 'sat-330pm'
    ];
    
    allSlotIds.forEach(slotId => {
        const slotElement = document.querySelector(`#event4 button[onclick*="selectSlotCA('${slotId}')"]`);
        
        if (slotElement) {
            const slotContainer = slotElement.closest('.slot');
            const spotsElement = slotContainer.querySelector('.spots');
            
                         // Check if this slot has already passed
             if (isSlotPassed(slotId, 'california')) {
                 slotElement.className = 'slot-btn passed';
                 slotElement.textContent = 'Passed';
                 slotElement.onclick = null;
                 spotsElement.textContent = 'Time has passed';
                 spotsElement.className = 'spots full';
                 console.log(`CA Slot ${slotId} marked as PASSED`);
                 return; // Skip reservation checking for passed slots
             }
            
            // Check reservations for available slots
            const reservations = slotReservationsCA[slotId] || [];
            const remainingSlots = 2 - reservations.length;
            
            console.log(`CA Slot ${slotId}: ${reservations.length} reservations, ${remainingSlots} remaining`);
            
            if (remainingSlots === 0) {
                slotElement.className = 'slot-btn booked';
                slotElement.textContent = 'Full';
                slotElement.onclick = null;
                spotsElement.textContent = 'No spots available';
                spotsElement.className = 'spots full';
            } else if (remainingSlots === 1) {
                slotElement.className = 'slot-btn available';
                slotElement.textContent = 'Sign Up';
                slotElement.onclick = () => selectSlotCA(slotId);
                spotsElement.textContent = '1 spot left';
                spotsElement.className = 'spots warning';
            } else {
                slotElement.className = 'slot-btn available';
                slotElement.textContent = 'Sign Up';
                slotElement.onclick = () => selectSlotCA(slotId);
                spotsElement.textContent = `${remainingSlots} spots available`;
                spotsElement.className = 'spots';
            }
        } else {
            console.log(`Could not find button for CA slot ${slotId}`);
        }
    });
}

function selectSlotCA(slotId) {
    // Check if time slot has already passed
    if (isSlotPassed(slotId, 'california')) {
        alert('This time slot has already passed. Please select a future time slot.');
        return;
    }
    
    // Check if slot is available
    const reservations = slotReservationsCA[slotId] || [];
    if (reservations.length >= 2) {
        alert('This time slot is full. Please select another time.');
        return;
    }
    
    // Reset all buttons to their current state
    updateSlotDisplayCA();
    
    // Mark selected slot
    const selectedBtn = document.querySelector(`#event4 button[onclick*="selectSlotCA('${slotId}')"]`);
    if (selectedBtn) {
        selectedBtn.className = 'slot-btn selected';
        selectedBtn.textContent = 'Selected ✓';
    }
    
    // Update the selected slot display
    const slotDisplay = {
        'fri-9am': 'Friday, August 9th, 2025 - 9:00 AM - 9:30 AM (California)',
        'fri-930am': 'Friday, August 9th, 2025 - 9:30 AM - 10:00 AM (California)',
        'fri-10am': 'Friday, August 9th, 2025 - 10:00 AM - 10:30 AM (California)',
        'fri-1030am': 'Friday, August 9th, 2025 - 10:30 AM - 11:00 AM (California)',
        'fri-11am': 'Friday, August 9th, 2025 - 11:00 AM - 11:30 AM (California)',
        'fri-1130am': 'Friday, August 9th, 2025 - 11:30 AM - 12:00 PM (California)',
        'fri-1pm': 'Friday, August 9th, 2025 - 1:00 PM - 1:30 PM (California)',
        'fri-130pm': 'Friday, August 9th, 2025 - 1:30 PM - 2:00 PM (California)',
        'fri-2pm': 'Friday, August 9th, 2025 - 2:00 PM - 2:30 PM (California)',
        'fri-230pm': 'Friday, August 9th, 2025 - 2:30 PM - 3:00 PM (California)',
        'fri-3pm': 'Friday, August 9th, 2025 - 3:00 PM - 3:30 PM (California)',
        'fri-330pm': 'Friday, August 9th, 2025 - 3:30 PM - 4:00 PM (California)',
        'sat-9am': 'Saturday, August 10th, 2025 - 9:00 AM - 9:30 AM (California)',
        'sat-930am': 'Saturday, August 10th, 2025 - 9:30 AM - 10:00 AM (California)',
        'sat-10am': 'Saturday, August 10th, 2025 - 10:00 AM - 10:30 AM (California)',
        'sat-1030am': 'Saturday, August 10th, 2025 - 10:30 AM - 11:00 AM (California)',
        'sat-11am': 'Saturday, August 10th, 2025 - 11:00 AM - 11:30 AM (California)',
        'sat-1130am': 'Saturday, August 10th, 2025 - 11:30 AM - 12:00 PM (California)',
        'sat-1pm': 'Saturday, August 10th, 2025 - 1:00 PM - 1:30 PM (California)',
        'sat-130pm': 'Saturday, August 10th, 2025 - 1:30 PM - 2:00 PM (California)',
        'sat-2pm': 'Saturday, August 10th, 2025 - 2:00 PM - 2:30 PM (California)',
        'sat-230pm': 'Saturday, August 10th, 2025 - 2:30 PM - 3:00 PM (California)',
        'sat-3pm': 'Saturday, August 10th, 2025 - 3:00 PM - 3:30 PM (California)',
        'sat-330pm': 'Saturday, August 10th, 2025 - 3:30 PM - 4:00 PM (California)'
    };
    
    document.getElementById('selected-slot-ca').value = slotDisplay[slotId];
    
    // Show the registration form
    document.getElementById('registration-form-ca').style.display = 'block';
    
    // Smooth scroll to the form
    document.getElementById('registration-form-ca').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Handle California form submission
function handleRegistrationCA(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const selectedSlot = document.getElementById('selected-slot-ca').value;
    
    if (!selectedSlot) {
        alert('Please select a time slot first.');
        return;
    }
    
    // Extract slot ID from the selected slot text
    const slotId = getSlotIdFromDisplayCA(selectedSlot);
    
    // Check if slot is still available
    const reservations = slotReservationsCA[slotId] || [];
    if (reservations.length >= 2) {
        alert('This time slot is no longer available. Please select another time.');
        return;
    }
    
    // Create reservation data
    const reservation = {
        event: formData.get('event') || 'California Swim Lessons – August 9–10, 2025 (California)',
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
    if (!slotReservationsCA[slotId]) {
        slotReservationsCA[slotId] = [];
    }
    slotReservationsCA[slotId].push(reservation);
    
    // Save to localStorage
    saveReservationsCA();
    
    // Update display
    updateSlotDisplayCA();
    
    // Send to Google Sheets
    submitToGoogleSheets(reservation);
    
    // Reset form
    event.target.reset();
    document.getElementById('selected-slot-ca').value = '';
    document.getElementById('registration-form-ca').style.display = 'none';
    
    // Show success message
    alert(`Registration successful! ${reservation.childName} is registered for ${selectedSlot}. You will receive a confirmation shortly.`);
}

// Helper function to get slot ID from display text for California
function getSlotIdFromDisplayCA(displayText) {
    const slotMap = {
        'Friday, August 9th, 2025 - 9:00 AM - 9:30 AM (California)': 'fri-9am',
        'Friday, August 9th, 2025 - 9:30 AM - 10:00 AM (California)': 'fri-930am',
        'Friday, August 9th, 2025 - 10:00 AM - 10:30 AM (California)': 'fri-10am',
        'Friday, August 9th, 2025 - 10:30 AM - 11:00 AM (California)': 'fri-1030am',
        'Friday, August 9th, 2025 - 11:00 AM - 11:30 AM (California)': 'fri-11am',
        'Friday, August 9th, 2025 - 11:30 AM - 12:00 PM (California)': 'fri-1130am',
        'Friday, August 9th, 2025 - 1:00 PM - 1:30 PM (California)': 'fri-1pm',
        'Friday, August 9th, 2025 - 1:30 PM - 2:00 PM (California)': 'fri-130pm',
        'Friday, August 9th, 2025 - 2:00 PM - 2:30 PM (California)': 'fri-2pm',
        'Friday, August 9th, 2025 - 2:30 PM - 3:00 PM (California)': 'fri-230pm',
        'Friday, August 9th, 2025 - 3:00 PM - 3:30 PM (California)': 'fri-3pm',
        'Friday, August 9th, 2025 - 3:30 PM - 4:00 PM (California)': 'fri-330pm',
        'Saturday, August 10th, 2025 - 9:00 AM - 9:30 AM (California)': 'sat-9am',
        'Saturday, August 10th, 2025 - 9:30 AM - 10:00 AM (California)': 'sat-930am',
        'Saturday, August 10th, 2025 - 10:00 AM - 10:30 AM (California)': 'sat-10am',
        'Saturday, August 10th, 2025 - 10:30 AM - 11:00 AM (California)': 'sat-1030am',
        'Saturday, August 10th, 2025 - 11:00 AM - 11:30 AM (California)': 'sat-11am',
        'Saturday, August 10th, 2025 - 11:30 AM - 12:00 PM (California)': 'sat-1130am',
        'Saturday, August 10th, 2025 - 1:00 PM - 1:30 PM (California)': 'sat-1pm',
        'Saturday, August 10th, 2025 - 1:30 PM - 2:00 PM (California)': 'sat-130pm',
        'Saturday, August 10th, 2025 - 2:00 PM - 2:30 PM (California)': 'sat-2pm',
        'Saturday, August 10th, 2025 - 2:30 PM - 3:00 PM (California)': 'sat-230pm',
        'Saturday, August 10th, 2025 - 3:00 PM - 3:30 PM (California)': 'sat-3pm',
        'Saturday, August 10th, 2025 - 3:30 PM - 4:00 PM (California)': 'sat-330pm'
    };
    return slotMap[displayText];
}

function removeReservationCA() {
    // Get all current California reservations
    const allReservations = [];
    
    Object.keys(slotReservationsCA).forEach(slotId => {
        slotReservationsCA[slotId].forEach((reservation, index) => {
            allReservations.push({
                slotId: slotId,
                index: index,
                reservation: reservation,
                displayText: `${reservation.childName} (Age ${reservation.age}) - ${reservation.timeSlot}`
            });
        });
    });
    
    if (allReservations.length === 0) {
        alert('No California reservations found to cancel.');
        return;
    }
    
    // Create a selection dialog
    let message = 'Select which California reservation to cancel:\n\n';
    allReservations.forEach((item, index) => {
        message += `${index + 1}. ${item.displayText}\n`;
    });
    message += '\nEnter the number of the reservation to cancel (or 0 to cancel):';
    
    const selection = prompt(message);
    
    if (selection === null || selection === '0' || selection === '') {
        return; // User cancelled
    }
    
    const selectionNum = parseInt(selection) - 1;
    
    if (selectionNum < 0 || selectionNum >= allReservations.length || isNaN(selectionNum)) {
        alert('Invalid selection. Please try again.');
        return;
    }
    
    const selectedReservation = allReservations[selectionNum];
    
    // Confirm deletion
    const confirmDelete = confirm(`Are you sure you want to cancel this California reservation?\n\n${selectedReservation.displayText}\n\nThis action cannot be undone.`);
    
    if (!confirmDelete) {
        return;
    }
    
    // Remove the reservation
    slotReservationsCA[selectedReservation.slotId].splice(selectedReservation.index, 1);
    
    // If no reservations left for this slot, remove the slot entirely
    if (slotReservationsCA[selectedReservation.slotId].length === 0) {
        delete slotReservationsCA[selectedReservation.slotId];
    }
    
    // Send cancellation to Google Sheets
    sendCancellationToGoogleSheetsCA(selectedReservation.reservation);
    
    // Save updated reservations
    saveReservationsCA();
    
    // Update display
    updateSlotDisplayCA();
    
    // Clear the selected slot and hide form
    document.getElementById('selected-slot-ca').value = '';
    document.getElementById('registration-form-ca').style.display = 'none';
    
    // Show success message
    alert(`California reservation for ${selectedReservation.reservation.childName} has been successfully cancelled.`);
}

// Send cancellation to Google Sheets for Dallas events
function sendCancellationToGoogleSheets(reservation) {
    // Replace this URL with your Google Apps Script web app URL (same as registration)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwTLB_xpqtPFqW1oDFPvGz_O6Ou8Gm2UJ4RXVSKnzN_eaUM22TiFXlc9RULiu99rzLRmA/exec';
    
    
    const formData = new FormData();
    formData.append('action', 'cancel');
    formData.append('event', reservation.event || 'Southridge Lakes Swim Lessons – August 23–24, 2025 (Southlake, Texas)');
    formData.append('childName', reservation.childName);
    formData.append('email', reservation.email);
    formData.append('timeSlot', reservation.timeSlot);
    
    fetch(scriptURL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === 'cancelled') {
            console.log('Cancellation processed successfully in Google Sheets');
        } else {
            console.error('Error processing cancellation in Google Sheets');
        }
    })
    .catch(error => {
        console.error('Error sending cancellation to Google Sheets:', error);
    });
}

// Send cancellation to Google Sheets for California events
function sendCancellationToGoogleSheetsCA(reservation) {
    // Replace this URL with your Google Apps Script web app URL (same as registration)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbwTLB_xpqtPFqW1oDFPvGz_O6Ou8Gm2UJ4RXVSKnzN_eaUM22TiFXlc9RULiu99rzLRmA/exec';
    
    const formData = new FormData();
    formData.append('action', 'cancel');
    formData.append('event', reservation.event || 'California Swim Lessons – August 9–10, 2025 (California)');
    formData.append('childName', reservation.childName);
    formData.append('email', reservation.email);
    formData.append('timeSlot', reservation.timeSlot);
    
    fetch(scriptURL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.result === 'cancelled') {
            console.log('California cancellation processed successfully in Google Sheets');
        } else {
            console.error('Error processing California cancellation in Google Sheets');
        }
    })
    .catch(error => {
        console.error('Error sending California cancellation to Google Sheets:', error);
    });
}

// Periodic sync functionality
let syncInterval = null;

function startPeriodicSync() {
    // Clear any existing interval
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Re-enabling periodic sync since Google Apps Script is working
    syncInterval = setInterval(() => {
        console.log('Performing periodic sync...');
        
        // Always sync both events to ensure mobile gets updates
        loadFromSpreadsheet();
        loadFromSpreadsheetCA();
    }, 30000); // 30 seconds
    
    console.log('Periodic sync re-enabled (every 30 seconds)');
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('Periodic sync stopped');
    }
}

function getCurrentPage() {
    if (document.getElementById('event3').style.display !== 'none') {
        return 'event3';
    } else if (document.getElementById('event4').style.display !== 'none') {
        return 'event4';
    } else {
        return 'main';
    }
}

// Clear all localStorage data (for debugging/reset)
function clearAllReservations() {
    localStorage.removeItem('swimReservations');
    localStorage.removeItem('swimReservationsCA');
    slotReservations = {};
    slotReservationsCA = {};
    updateSlotDisplay();
    updateSlotDisplayCA();
    console.log('All local reservations cleared');
}

// Debug function to check current state
function debugReservationState() {
    console.log('=== RESERVATION DEBUG INFO ===');
    console.log('Dallas reservations:', slotReservations);
    console.log('California reservations:', slotReservationsCA);
    console.log('localStorage Dallas:', localStorage.getItem('swimReservations'));
    console.log('localStorage California:', localStorage.getItem('swimReservationsCA'));
    console.log('Current page:', getCurrentPage());
    console.log('Sync interval active:', syncInterval !== null);
    console.log('================================');
}

// Make functions globally accessible
window.debugReservationState = debugReservationState;

// Manual test function for Google Sheets connectivity
// Debug function to check current reservation state
function debugCurrentState() {
    console.log('=== CURRENT RESERVATION STATE ===');
    console.log('Dallas reservations:', slotReservations);
    console.log('California reservations:', slotReservationsCA);
    console.log('LocalStorage Dallas:', localStorage.getItem('slotReservations'));
    console.log('LocalStorage California:', localStorage.getItem('slotReservationsCA'));
}

async function testGoogleSheetsConnection() {
    console.log('=== TESTING GOOGLE SHEETS CONNECTION ===');
    
    try {
        const scriptURL = 'https://script.google.com/macros/s/AKfycbwTLB_xpqtPFqW1oDFPvGz_O6Ou8Gm2UJ4RXVSKnzN_eaUM22TiFXlc9RULiu99rzLRmA/exec';
        
        console.log('Testing Dallas endpoint...');
        const dallasResponse = await fetch(`${scriptURL}?action=getReservations`);
        console.log('Dallas response status:', dallasResponse.status);
        
        if (dallasResponse.ok) {
            const dallasData = await dallasResponse.json();
            console.log('Dallas data:', dallasData);
        } else {
            console.error('Dallas request failed:', await dallasResponse.text());
        }
        
        console.log('Testing California endpoint...');
        const caResponse = await fetch(`${scriptURL}?action=getReservationsCA`);
        console.log('California response status:', caResponse.status);
        
        if (caResponse.ok) {
            const caData = await caResponse.json();
            console.log('California data:', caData);
        } else {
            console.error('California request failed:', await caResponse.text());
        }
        
    } catch (error) {
        console.error('Connection test failed:', error);
    }
    
    console.log('=== TEST COMPLETE ===');
}

// Make functions globally accessible
window.testGoogleSheetsConnection = testGoogleSheetsConnection;
window.clearAllReservations = clearAllReservations;

// Start syncing when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏊‍♂️ Swim With a Splash - Script Loaded Successfully!');
    console.log('Available debug commands: debugReservationState(), testGoogleSheetsConnection(), clearAllReservations()');
    console.log('Page loaded, starting reservation sync...');
    loadReservations();
    loadReservationsCA();
    
    // Add debug info after a short delay
    setTimeout(() => {
        debugReservationState();
    }, 2000);
    
    // Re-enabling mobile sync triggers since Google Apps Script is working
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('Page became visible - forcing sync for mobile');
            loadFromSpreadsheet();
            loadFromSpreadsheetCA();
        }
    });
    
    window.addEventListener('focus', function() {
        console.log('Window gained focus - forcing sync for mobile');
        loadFromSpreadsheet();
        loadFromSpreadsheetCA();
    });
    
    let lastSyncTime = 0;
    const forceSyncOnInteraction = function() {
        const now = Date.now();
        if (now - lastSyncTime > 10000) { // Only sync once per 10 seconds
            console.log('User interaction detected - forcing sync');
            loadFromSpreadsheet();
            loadFromSpreadsheetCA();
            lastSyncTime = now;
        }
    };
    
    document.addEventListener('touchstart', forceSyncOnInteraction);
    document.addEventListener('click', forceSyncOnInteraction);
});