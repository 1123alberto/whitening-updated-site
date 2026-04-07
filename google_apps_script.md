# Google Apps Script Setup Guide

Follow these steps to connect your website's custom booking form directly to your Google Calendar. This will create a free, private API that checks your real-time availability and creates new appointments automatically.

## 1. Create the Script
1. Go to [script.google.com](https://script.google.com/) and sign in with the Google Account that holds your clinic's Calendar.
2. Click **New Project**.
3. Name the project (e.g., "i-smile Booking API").
4. Delete any code in the editor, and paste the entire code block below:

```javascript
// --- CONFIGURATION ---
const SERVICE_DURATION = 90; // Whitening treatment is 90 minutes
const CALENDAR_NAMES = ['Online Appointment', 'Dental Office', "M's calendar"]; 
const SENDER_ALIAS = '1123alberto@gmail.com'; 
const SENDER_NAME = 'Λεύκανση - Whitening';

// Military time: 10 = 10:00 AM, 20 = 8:00 PM
const CLINIC_HOURS = {
  1: { start: 10, end: 20 }, // Mon
  2: { start: 10, end: 20 }, // Tue
  3: { start: 10, end: 20 }, // Wed
  4: { start: 10, end: 20 }, // Thu
  5: { start: 10, end: 20 }, // Fri
  6: null, // Sat
  0: null  // Sun
};

// Add specific dates you want to block out entirely (Format: 'YYYY-MM-DD')
const BLOCKED_DATES = [
  '2026-04-16', '2026-04-17', '2026-04-18', '2026-04-19', 
  '2026-04-20', '2026-04-21', '2026-05-01'
];
// ----------------------

function getCalendars() {
  const cals = [];
  CALENDAR_NAMES.forEach(name => {
    const list = CalendarApp.getCalendarsByName(name);
    if (list.length > 0) cals.push(list[0]);
  });
  if (cals.length === 0) cals.push(CalendarApp.getDefaultCalendar());
  return cals;
}

function getPrimaryCalendar() {
  const list = CalendarApp.getCalendarsByName(CALENDAR_NAMES[0]);
  return list.length > 0 ? list[0] : CalendarApp.getDefaultCalendar();
}

// Handles the GET request to fetch available slots
function doGet(e) {
  const dateStr = e.parameter.date; 
  if (!dateStr) return respondJSON({ error: "No date provided." });

  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();
  
  // 1. Check if clinic is open that day
  const hours = CLINIC_HOURS[dayOfWeek];
  if (!hours || BLOCKED_DATES.includes(dateStr)) {
    return respondJSON({ date: dateStr, slots: [] }); 
  }

  // 2. Fetch existing calendar events for that day
  const allCals = getCalendars();
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59);
  
  let busyPeriods = [];
  allCals.forEach(cal => {
    const events = cal.getEvents(startOfDay, endOfDay);
    events.forEach(ev => {
      busyPeriods.push({
        start: ev.getStartTime(),
        end: ev.getEndTime()
      });
    });
  });
  busyPeriods.sort((a, b) => a.start - b.start);
  
  // 3. Generate all possible time slots for the day
  let availableSlots = [];
  const now = new Date(); 
  const minSlotTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6-hour buffer

  // Generate slots for 90-minute intervals
  let currentSlotTime = new Date(year, month - 1, day, hours.start, 0, 0);
  const endOfWorkDay = new Date(year, month - 1, day, hours.end, 0, 0);

  while (currentSlotTime < endOfWorkDay) {
    const slotEnd = new Date(currentSlotTime.getTime() + SERVICE_DURATION * 60000);
    
    if (slotEnd <= endOfWorkDay && currentSlotTime > minSlotTime) {
      if (currentSlotTime.getHours() === 14) { // Lunch break
        currentSlotTime = new Date(currentSlotTime.getTime() + SERVICE_DURATION * 60000);
        continue;
      }

      let isOverlapping = false;
      for (const busy of busyPeriods) {
        if (currentSlotTime < busy.end && slotEnd > busy.start) {
          isOverlapping = true; break;
        }
      }
      
      if (!isOverlapping) {
        const h = currentSlotTime.getHours().toString().padStart(2, '0');
        const m = currentSlotTime.getMinutes().toString().padStart(2, '0');
        availableSlots.push(`${h}:${m}`);
      }
    }
    
    // Jump forward by the duration interval to create non-overlapping sequential slots
    currentSlotTime = new Date(currentSlotTime.getTime() + SERVICE_DURATION * 60000);
  }
  
  return respondJSON({ date: dateStr, slots: availableSlots });
}

// Handles the POST request to create the booking
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    if (postData.action === 'book') {
      const { date, time, name, email, phone } = postData;
      
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      
      const startTime = new Date(year, month - 1, day, hour, minute);
      const endTime = new Date(startTime.getTime() + SERVICE_DURATION * 60000);
      
      const title = `Λεύκανση - ${name}`;
      const description = `Νέο Ραντεβού από Website\n\nΌνομα: ${name}\nΤηλέφωνο: ${phone}\nEmail: ${email}`;
      
      getPrimaryCalendar().createEvent(title, startTime, endTime, { description: description });
      
      // Admin Notification
      sendAdminNotification(name, email, phone, `${date} ${time}`);
      
      // Client Confirmation & Reminder
      sendInitialConfirmationEmail(email, name, startTime);
      scheduleReminderEmail(email, name, startTime);
      
      return respondJSON({ success: true, message: "Appointment created." });
    }
  } catch (error) { return respondJSON({ error: error.toString() }); }
}

// Helper to construct JSON response
function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// -- Scheduled Email Engine --
// Schedules a reminder email at 9:00 AM on the day of the appointment
function scheduleReminderEmail(email, name, dateObj) {
  const reminderTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 9, 0, 0);
  if (reminderTime <= new Date()) {
    sendReminderEmail(email, name);
  } else {
    const trigger = ScriptApp.newTrigger('processReminderEmail').timeBased().at(reminderTime).create();
    PropertiesService.getScriptProperties().setProperty('reminder_' + trigger.getUniqueId(), JSON.stringify({email: email, name: name}));
  }
}

// Triggered worker function to send the email and clean up
function processReminderEmail(e) {
  const triggerId = e.triggerUid;
  const props = PropertiesService.getScriptProperties();
  const dataStr = props.getProperty('reminder_' + triggerId);
  
  if (dataStr) {
    const data = JSON.parse(dataStr);
    sendReminderEmail(data.email, data.name);
    props.deleteProperty('reminder_' + triggerId);
  }
  
  // Clean up the trigger so it doesn't clutter the project
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(triggers[i]);
      break;
    }
  }
}

function sendReminderEmail(email, name) {
  const subject = "Υπενθύμιση Ραντεβού Λεύκανσης (i-smile) / Whitening Reminder";
  const body = `Γεια σας ${name},
  
Σας υπενθυμίζουμε το σημερινό σας ραντεβού για λεύκανση δοντιών.

---
Hello ${name},

This is a reminder for your teeth whitening appointment today.

Με εκτίμηση / Sincerely,
H Ομάδα του i-smile.`;

  GmailApp.sendEmail(email, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function sendInitialConfirmationEmail(email, name, dateObj) {
  const subject = "Επιβεβαίωση Ραντεβού Λεύκανσης (i-smile) / Whitening Confirmation";
  const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  
  const body = `Γεια σας ${name},

Ευχαριστούμε για την κράτησή σας! Το ραντεβού σας για λεύκανση δοντιών επιβεβαιώθηκε για τις: ${dateStr}.

---
Hello ${name},

Thank you for your booking! Your teeth whitening appointment is confirmed for: ${dateStr}.

Σας περιμένουμε / We look forward to seeing you.

Με εκτίμηση / Sincerely,
H Ομάδα του i-smile.`;

  GmailApp.sendEmail(email, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function sendAdminNotification(name, email, phone, slotStr) {
  const adminEmail = '1123alberto@gmail.com'; 
  const subject = "★ New Whitening Appointment - " + name;
  const body = `You have a new whitening appointment!

DETAILS:
- Name: ${name}
- Email: ${email}
- Phone: ${phone}
- Date/Time: ${slotStr}`;

  GmailApp.sendEmail(adminEmail, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}
```

## 2. Deploy the Script as a Web App
1. At the top right of the Apps Script editor, click the blue **Deploy** button, then select **New deployment**.
2. Click the "**Select type**" gear icon, and check **Web app**.
3. Under **Description**, type "Booking API V1".
4. Under **Execute as**, ensure it is set to **Me (your email)**. *(This ensures it writes to your calendar)*.
5. Under **Who has access**, select **Anyone**. *(Crucial, otherwise your website cannot read availability!)*.
6. Click **Deploy**.
7. Google will ask for permission to access your calendar. Click **Review permissions**, select your account, click **Advanced**, and then click **Go to [Project Name] (unsafe)**. Allow the permissions.
8. After it finishes, you will be given a **Web app URL**. Copy this long URL.

## 3. Link it to Your Website
1. Open up the `main.js` file of your website.
2. Find line 158 which looks like this:
   `const GOOGLE_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE";`
3. Replace `"YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"` with the long URL you copied from Google Apps Script. 
4. Save the file. Your dynamic calendar is now officially live and connected to your personal Calendar!
