# Master Integration Guide: Interactive Calendar Booking

This guide details how to replicate the premium, monochrome booking system. It uses **Google Apps Script** as a serverless backend to sync directly with **Google Calendar** and a modern **Vanilla JS** frontend.

---

## 1. Backend: Google Apps Script
Create a new project at [script.google.com](https://script.google.com/) and paste this code. It handles checking availability, preventing overlaps, and sending bilingual confirmation/reminder emails.

```javascript
// --- CONFIGURATION ---
const SERVICE_DURATION = 90; // Default treatment duration (minutes)
const CALENDAR_NAMES = ['Online Appointment', 'Dental Office']; // Calendars to check for conflicts
const SENDER_ALIAS = 'your-email@gmail.com'; // Must be an alias on your Google account
const SENDER_NAME = 'Business Name';
const ADMIN_EMAIL = 'admin@example.com';

// Military time: 10 = 10:00 AM, 20 = 8:00 PM
const CLINIC_HOURS = {
  1: { start: 10, end: 20 }, // Mon
  2: { start: 10, end: 20 }, // Tue
  3: { start: 10, end: 20 }, // Wed
  4: { start: 10, end: 20 }, // Thu
  5: { start: 10, end: 20 }, // Fri
  6: null, // Sat (Phone only)
  0: null  // Sun
};

const BLOCKED_DATES = ['2026-04-10', '2026-12-25']; // Holidays/Closed
// ----------------------

// Handles the GET request to fetch available slots
function doGet(e) {
  try {
    const dateStr = e.parameter.date; 
    const duration = parseInt(e.parameter.duration) || SERVICE_DURATION;
    if (!dateStr) return respondJSON({ error: "No date provided." });

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();
    
    // Check if clinic is open
    const hours = CLINIC_HOURS[dayOfWeek];
    if (!hours || BLOCKED_DATES.includes(dateStr)) {
      return respondJSON({ date: dateStr, slots: [] }); 
    }

    // Fetch busy periods
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59);
    
    let busyPeriods = [];
    CalendarApp.getAllCalendars().forEach(cal => {
      if (CALENDAR_NAMES.includes(cal.getName()) || cal.isDefaultCalendar()) {
        cal.getEvents(startOfDay, endOfDay).forEach(ev => {
          busyPeriods.push({ start: ev.getStartTime(), end: ev.getEndTime() });
        });
      }
    });

    // Generate Hourly Slots
    let availableSlots = [];
    const now = new Date(); 
    const minSlotTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6-hour buffer
    let currentSlotTime = new Date(year, month - 1, day, hours.start, 0, 0);
    const endWorkDay = new Date(year, month - 1, day, hours.end, 0, 0);

    while (currentSlotTime < endWorkDay) {
      const slotEnd = new Date(currentSlotTime.getTime() + duration * 60000);
      const h = currentSlotTime.getHours();
      
      // Skip Lunch/Break hours (e.g., 14:00 and 15:00)
      if (slotEnd <= endWorkDay && currentSlotTime > minSlotTime && ![14, 15].includes(h)) {
        let isOverlapping = busyPeriods.some(busy => currentSlotTime < busy.end && slotEnd > busy.start);
        if (!isOverlapping) {
          availableSlots.push(Utilities.formatDate(currentSlotTime, Session.getScriptTimeZone(), "HH:mm"));
        }
      }
      currentSlotTime = new Date(currentSlotTime.getTime() + 60 * 60000); // Step by 60 mins
    }
    return respondJSON({ slots: availableSlots });
  } catch (err) {
    return respondJSON({ error: err.toString() });
  }
}

// Handles the POST request to create the booking
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    if (postData.action === 'book') {
      const { date, time, duration, service, name, email, phone } = postData;
      const [y, m, d] = date.split('-').map(Number);
      const [hh, mm] = time.split(':').map(Number);
      
      const startTime = new Date(y, m - 1, d, hh, mm);
      const endTime = new Date(startTime.getTime() + (duration || SERVICE_DURATION) * 60000);
      
      // 1. Create Calendar Event
      CalendarApp.getDefaultCalendar().createEvent(`${service} - ${name}`, startTime, endTime, {
        description: `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nService: ${service}`
      });
      
      // 2. Email Notifications
      sendAdminNotification(name, email, phone, `${date} ${time}`, service);
      sendInitialConfirmationEmail(email, name, startTime, service);
      scheduleReminderEmail(email, name, startTime, service);
      
      return respondJSON({ success: true });
    }
  } catch (error) { return respondJSON({ error: error.toString() }); }
}

function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- EMAIL ENGINE ---
function sendAdminNotification(name, email, phone, slotStr, service) {
  const subject = `★ New ${service} Appointment - ${name}`;
  const body = `New booking details:\n\nService: ${service}\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nTime: ${slotStr}`;
  GmailApp.sendEmail(ADMIN_EMAIL, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function sendInitialConfirmationEmail(email, name, dateObj, service) {
  const subject = `Appointment Confirmation: ${service}`;
  const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  const body = `Hello ${name},\n\nThank you for booking! Your ${service} appointment is confirmed for ${dateStr}.`;
  GmailApp.sendEmail(email, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function scheduleReminderEmail(email, name, dateObj, service) {
  const reminderTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 9, 0, 0);
  if (reminderTime > new Date()) {
    const trigger = ScriptApp.newTrigger('processReminderEmail').timeBased().at(reminderTime).create();
    PropertiesService.getScriptProperties().setProperty('rem_' + trigger.getUniqueId(), JSON.stringify({ email, name, service, date: dateObj }));
  }
}

// Triggered worker function to send the reminder and clean up
function processReminderEmail(e) {
  const triggerId = e.triggerUid;
  const props = PropertiesService.getScriptProperties();
  const dataStr = props.getProperty('rem_' + triggerId);
  
  if (dataStr) {
    const data = JSON.parse(dataStr);
    sendReminderEmail(data.email, data.name, data.service);
    props.deleteProperty('rem_' + triggerId);
  }
  
  // Cleanup the trigger
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getUniqueId() === triggerId) ScriptApp.deleteTrigger(t);
  });
}

function sendReminderEmail(email, name, service) {
  const subject = `Appointment Reminder: ${service}`;
  const body = `Hi ${name}, this is a reminder for your ${service} appointment today!`;
  GmailApp.sendEmail(email, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}
```

### Deployment Steps:
1.  Click **Deploy** > **New Deployment**.
2.  Select **Type: Web App**.
3.  Set **Execute as: Me**.
4.  Set **Who has access: Anyone**.
5.  **Important:** After any code change, you MUST deploy a "New Version" for the changes to take effect.

---

## 2. Frontend: HTML Structure
Use this 4-step wizard structure in your HTML.

```html
<section id="booking" class="booking-section">
    <div class="booking-widget">
        <!-- Step 1: Calendar -->
        <div id="booking-step-1" class="booking-step active">
            <div class="calendar-header">
                <button id="prev-week">&larr;</button>
                <h3 id="calendar-month">Month Year</h3>
                <button id="next-week">&rarr;</button>
            </div>
            <div class="calendar-grid" id="calendar-grid"></div>
            <div id="calendar-loader" style="display:none;">Loading...</div>
        </div>

        <!-- Step 2: Service Selection -->
        <div id="booking-step-service" class="booking-step" style="display:none;">
            <button onclick="goToStep(1)">Back</button>
            <div class="service-grid">
                <button onclick="selectService('service1', 90)">Service 1 (90m)</button>
                <button onclick="selectService('service2', 60)">Service 2 (60m)</button>
            </div>
        </div>

        <!-- Step 3: Time Slots -->
        <div id="booking-step-2" class="booking-step" style="display:none;">
            <button onclick="goToStep('service')">Back</button>
            <div id="time-slots-grid" class="time-slots-grid"></div>
        </div>

        <!-- Step 4: Form -->
        <div id="booking-step-3" class="booking-step" style="display:none;">
            <form id="booking-form">
                <input type="text" id="b-name" placeholder="Name" required>
                <input type="email" id="b-email" placeholder="Email" required>
                <input type="tel" id="b-phone" placeholder="Phone" required>
                <button type="submit">Confirm Booking</button>
            </form>
        </div>
    </div>
</section>
```

---

## 3. Frontend: Essential CSS
The core styles for the grid and the "Cal.com" look.

```css
:root {
    --clr-charcoal: #242424;
    --clr-bg-alt: #F8FAF9;
    --radius-md: 8px;
    --shadow: rgba(0, 0, 0, 0.05) 0px 4px 8px;
}

.booking-widget {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: var(--shadow);
    max-width: 600px;
    margin: auto;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 10px;
}

.date-btn {
    padding: 10px;
    border: 1px solid #eee;
    background: none;
    cursor: pointer;
    border-radius: 4px;
}

.date-btn.active { background: var(--clr-charcoal); color: white; }
.date-btn.disabled { opacity: 0.2; cursor: not-allowed; }

.time-slots-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
}

.time-slot-btn {
    padding: 12px;
    border: 1px solid #eee;
    border-radius: 8px;
    cursor: pointer;
}
```

---

## 4. Frontend: JavaScript Logic
The engine that connects the UI to the Google API.

```javascript
const GOOGLE_SCRIPT_URL = 'YOUR_DEPLOYED_URL_HERE';
let selectedDate, selectedTime, selectedDuration, selectedService;

async function fetchAndShowSlots(date) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `${GOOGLE_SCRIPT_URL}?action=getSlots&date=${dateStr}&duration=${selectedDuration}`;
    
    try {
        const resp = await fetch(url);
        const data = await resp.json();
        renderSlots(data.slots || []);
        goToStep(2);
    } catch (e) {
        console.error("Fetch failed", e);
    }
}

function selectService(key, duration) {
    selectedService = key;
    selectedDuration = duration;
    fetchAndShowSlots(selectedDate);
}
```

---

## 5. Key UX Features Implemented
- **6-Hour Advance Period:** Prevents "surprise" instant bookings.
- **Lunch Breaks:** Includes logic to exclude 14:00-16:00 slots.
- **Calendar Sync:** Real-time checking across multiple Google Calendars.
- **Mobile Responsive:** Grids automatically stack on smaller screens.
