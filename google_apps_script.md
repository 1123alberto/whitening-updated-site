# Google Apps Script Setup Guide

Follow these steps to connect your website's custom booking form directly to your Google Calendar. This will create a free, private API that checks your real-time availability and creates new appointments automatically.

## 1. Create the Script
1. Go to [script.google.com](https://script.google.com/) and sign in with the Google Account that holds your clinic's Calendar.
2. Click **New Project**.
3. Name the project (e.g., "i-smile Booking API").
4. Delete any code in the editor, and paste the entire code block below:

```javascript
// --- CONFIGURATION ---
// Set the duration of a single appointment in minutes
const SERVICE_DURATION = 90; 

// The exact name of your calendar. Leave as '' to use your primary default calendar.
const CALENDAR_NAME = ''; 

// Define Clinic Hours (Military time: 10 = 10:00 AM, 20 = 8:00 PM)
const CLINIC_HOURS = {
  1: { start: 10, end: 20 }, // Monday
  2: { start: 10, end: 20 }, // Tuesday
  3: { start: 10, end: 20 }, // Wednesday
  4: { start: 10, end: 20 }, // Thursday
  5: { start: 10, end: 20 }, // Friday
  6: null,                   // Saturday (Closed / Phone only)
  0: null                    // Sunday (Closed)
};

// Add specific dates you want to block out entirely (Format: 'YYYY-MM-DD')
const BLOCKED_DATES = [
   '2026-04-16',
   '2026-04-17',
   '2026-04-18',
   '2026-04-19',
   '2026-04-20',
   '2026-04-21',
   '2026-05-01'
];
// ----------------------

function getCalendar() {
  if (CALENDAR_NAME === '') {
    return CalendarApp.getDefaultCalendar();
  } else {
    const cals = CalendarApp.getCalendarsByName(CALENDAR_NAME);
    return cals.length > 0 ? cals[0] : CalendarApp.getDefaultCalendar();
  }
}

// Handles the GET request to fetch available slots
function doGet(e) {
  const dateStr = e.parameter.date; // Expecting YYYY-MM-DD
  
  if (!dateStr) {
    return respondJSON({ error: "No date provided." });
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();
  
  // 1. Check if clinic is open that day
  const hours = CLINIC_HOURS[dayOfWeek];
  if (!hours || BLOCKED_DATES.includes(dateStr)) {
    return respondJSON({ date: dateStr, slots: [] }); // Closed or Blocked
  }

  // 2. Fetch existing calendar events for that day
  const cal = getCalendar();
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59);
  const events = cal.getEvents(startOfDay, endOfDay);
  
  // Create a sorted list of busy periods
  const busyPeriods = events.map(ev => ({
    start: ev.getStartTime(),
    end: ev.getEndTime()
  })).sort((a, b) => a.start - b.start);
  
  // 3. Generate all possible time slots for the day
  let availableSlots = [];
  let currentSlotTime = new Date(year, month - 1, day, hours.start, 0, 0);
  const endOfWorkDay = new Date(year, month - 1, day, hours.end, 0, 0);
  
  const now = new Date(); // To avoid booking slots in the past if checking today's date
  const minSlotTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6-hour minimum buffer

  while (currentSlotTime < endOfWorkDay) {
    const slotEnd = new Date(currentSlotTime.getTime() + SERVICE_DURATION * 60000);
    
    if (slotEnd <= endOfWorkDay && currentSlotTime > minSlotTime) {
      // Check if this slot overlaps with any busy period
      let isOverlapping = false;
      for (const busy of busyPeriods) {
        // Overlap condition:
        if (currentSlotTime < busy.end && slotEnd > busy.start) {
          isOverlapping = true;
          break;
        }
      }
      
      if (!isOverlapping) {
        // Format time as HH:MM
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
      
      const cal = getCalendar();
      cal.createEvent(title, startTime, endTime, { description: description });
      
      // Schedule reminder email
      scheduleReminderEmail(email, name, startTime);
      
      return respondJSON({ success: true, message: "Appointment created." });
    }
    return respondJSON({ error: "Invalid action." });
  } catch (error) {
    return respondJSON({ error: error.toString() });
  }
}

// Helper to construct JSON response
function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Schedules a reminder email at 9:00 AM on the day of the appointment
function scheduleReminderEmail(email, name, dateObj) {
  const reminderTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 9, 0, 0);
  const now = new Date();
  
  if (reminderTime <= now) {
    // If it's already past 9:00 AM, send immediately
    sendReminderEmail(email, name);
  } else {
    // Schedule trigger
    const trigger = ScriptApp.newTrigger('processReminderEmail')
      .timeBased()
      .at(reminderTime)
      .create();
      
    // Save data using trigger ID
    PropertiesService.getScriptProperties().setProperty(
      'reminder_' + trigger.getUniqueId(),
      JSON.stringify({email: email, name: name})
    );
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
  const subject = "Υπενθύμιση Ραντεβού Λεύκανσης (i-smile)";
  const body = "Γεια σας " + name + ",\n\nΣας υπενθυμίζουμε το σημερινό σας ραντεβού για λεύκανση δοντιών.\n\nΜε εκτίμηση,\nH Ομάδα του i-smile.";
  MailApp.sendEmail(email, subject, body);
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
