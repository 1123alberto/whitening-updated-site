# Google Apps Script Setup Guide

Follow these steps to connect your website's custom booking form directly to your Google Calendar. This will create a free, private API that checks your real-time availability and creates new appointments automatically.

## 1. Create the Script
1. Go to [script.google.com](https://script.google.com/) and sign in with the Google Account that holds your clinic's Calendar.
2. Click **New Project**.
3. Name the project (e.g., "i-smile Booking API").
4. Delete any code in the editor, and paste the entire code block below:

```javascript
// --- CONFIGURATION ---
const DURATIONS = {
  'Whitening': 90,
  'Esthetic Consult': 60
};
const DEFAULT_DURATION = 90; 
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
  '2026-04-10', '2026-04-11', '2026-05-01'
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

/**
 * Handles the GET request to fetch available slots OR fetch appointment details
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getSlots';

    if (action === 'getSlots') {
      const dateStr = e.parameter.date; 
      const duration = parseInt(e.parameter.duration) || DEFAULT_DURATION;
      
      if (!dateStr) return respondJSON({ error: "No date provided." });

      const [year, month, day] = dateStr.split('-').map(Number);
      const targetDate = new Date(year, month - 1, day);
      const dayOfWeek = targetDate.getDay();
      
      const hours = CLINIC_HOURS[dayOfWeek];
      if (!hours || BLOCKED_DATES.includes(dateStr)) {
        return respondJSON({ date: dateStr, slots: [] }); 
      }

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
      
      let availableSlots = [];
      const now = new Date(); 
      const minSlotTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6-hour buffer

      let currentSlotTime = new Date(year, month - 1, day, hours.start, 0, 0);
      const endOfWorkDay = new Date(year, month - 1, day, hours.end, 0, 0);

      while (currentSlotTime < endOfWorkDay) {
        const slotEnd = new Date(currentSlotTime.getTime() + duration * 60000);
        
        if (slotEnd <= endOfWorkDay && currentSlotTime > minSlotTime) {
          const h = currentSlotTime.getHours();
          if (h !== 14 && h !== 15 && h !== 16) {
            let isOverlapping = false;
            for (const busy of busyPeriods) {
              if (currentSlotTime < busy.end && slotEnd > busy.start) {
                isOverlapping = true; break;
              }
            }
            
            if (!isOverlapping) {
              const hs = currentSlotTime.getHours().toString().padStart(2, '0');
              const ms = currentSlotTime.getMinutes().toString().padStart(2, '0');
              availableSlots.push(`${hs}:${ms}`);
            }
          }
        }
        currentSlotTime = new Date(currentSlotTime.getTime() + 60 * 60000);
      }
      
      return respondJSON({ date: dateStr, slots: availableSlots });

    } else if (action === 'getAppointment') {
      const uid = e.parameter.uid;
      if (!uid) return respondJSON({ error: "Missing UID" });

      const now = new Date();
      const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      const allCals = getCalendars();
      
      for (const cal of allCals) {
        const events = cal.getEvents(now, future);
        for (const ev of events) {
          const desc = ev.getDescription() || "";
          if (desc.includes(`UID: ${uid}`)) {
            return respondJSON({
              success: true,
              event: {
                title: ev.getTitle(),
                start: ev.getStartTime().toISOString(),
                description: desc,
                service: ev.getTitle().split(' - ')[0] || "Treatment",
                name: ev.getTitle().split(' - ')[1] || "Patient"
              }
            });
          }
        }
      }
      return respondJSON({ error: "Appointment not found." });
    }
  } catch (err) {
    return respondJSON({ error: "Script Error: " + err.toString() });
  }
}

/**
 * Handles the POST request to create or cancel the booking
 */
function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);

    if (postData.action === 'book') {
      const { date, time, duration, service, name, email, phone, rescheduleUid } = postData;
      const uid = Math.random().toString(36).substring(2, 9).toUpperCase(); 
      
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      
      const startTime = new Date(year, month - 1, day, hour, minute);
      const endTime = new Date(startTime.getTime() + (duration || DEFAULT_DURATION) * 60000);
      
      const title = `${service || 'Whitening'} - ${name}`;
      const description = `Νέο Ραντεβού από Website\n\nΥπηρεσία: ${service}\nΌνομα: ${name}\nΤηλέφωνο: ${phone}\nEmail: ${email}\n\nUID: ${uid}`;
      
      getPrimaryCalendar().createEvent(title, startTime, endTime, { description: description });
      
      if (rescheduleUid) {
        cancelAppointmentByUID(rescheduleUid, true); 
      }

      sendAdminNotification(name, email, phone, `${date} ${time}`, service);
      sendInitialConfirmationEmail(email, name, startTime, service, uid);
      scheduleReminderEmail(email, name, startTime, service, uid);
      
      return respondJSON({ success: true, message: "Appointment created.", id: uid });

    } else if (postData.action === 'cancel') {
      const result = cancelAppointmentByUID(postData.uid);
      return respondJSON(result);
    }
  } catch (error) { return respondJSON({ error: error.toString() }); }
}

function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// -- Scheduled Email Engine --

function scheduleReminderEmail(email, name, dateObj, service, uid) {
  const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "HH:mm");
  const reminderTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 9, 0, 0);
  
  if (reminderTime <= new Date()) {
    sendReminderEmail(email, name, service, dateStr);
  } else {
    const trigger = ScriptApp.newTrigger('processReminderEmail').timeBased().at(reminderTime).create();
    const triggerId = trigger.getUniqueId();
    
    const props = PropertiesService.getScriptProperties();
    props.setProperty('reminder_' + triggerId, JSON.stringify({
      email: email, name: name, service: service, time: dateStr, uid: uid
    }));
    props.setProperty('event_to_trigger_' + uid, triggerId);
  }
}

function processReminderEmail(e) {
  const triggerId = e.triggerUid;
  const props = PropertiesService.getScriptProperties();
  const dataStr = props.getProperty('reminder_' + triggerId);
  
  if (dataStr) {
    const data = JSON.parse(dataStr);
    sendReminderEmail(data.email, data.name, data.service, data.time);
    props.deleteProperty('reminder_' + triggerId);
  }
  
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getUniqueId() === triggerId) {
      ScriptApp.deleteTrigger(triggers[i]);
      break;
    }
  }
}

function sendReminderEmail(email, name, service, timeStr) {
  const subject = `Υπενθύμιση Ραντεβού: ${service} (i-smile) / Appointment Reminder`;
  const body = `Γεια σας ${name},\n\nΣας υπενθυμίζουμε το σημερινό σας ραντεβού για: ${service} στις ${timeStr}.\n\nΜε εκτίμηση,\nH Ομάδα του i-smile\n\n---\n\nHello ${name},\n\nThis is a reminder for your appointment today: ${service} at ${timeStr}.\n\nSincerely,\nThe i-smile Team`;
  GmailApp.sendEmail(email, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function sendInitialConfirmationEmail(email, name, dateObj, service, uid) {
  const subject = `Επιβεβαίωση Ραντεβού: ${service} (i-smile) / Confirmation`;
  const dateStr = Utilities.formatDate(dateObj, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  const websiteUrl = 'https://i-smile.gr'; 
  const manageLink = `${websiteUrl}/manage.html?uid=${uid}`;
  
  const body = `Γεια σας ${name},\n\nΕυχαριστούμε για την κράτησή σας! Το ραντεβού σας για ${service} επιβεβαιώθηκε για τις: ${dateStr}.\n\nΧρειάζεται να ακυρώσετε ή να αλλάξετε το ραντεβού σας;\nΔιαχειριστείτε το εδώ: ${manageLink}\n\nΜε εκτίμηση,\nH Ομάδα του i-smile\n\n---\n\nHello ${name},\n\nThank you for your booking! Your appointment for ${service} is confirmed for: ${dateStr}.\n\nNeed to cancel or change your appointment?\nManage it here: ${manageLink}\n\nSincerely,\nThe i-smile Team`;
  GmailApp.sendEmail(email, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function sendAdminNotification(name, email, phone, slotStr, service) {
  const adminEmail = '1123alberto@gmail.com'; 
  const subject = `★ New ${service} Appointment - ${name}`;
  const body = `DETAILS:\n- Service: ${service}\n- Name: ${name}\n- Email: ${email}\n- Phone: ${phone}\n- Date/Time: ${slotStr}`;
  GmailApp.sendEmail(adminEmail, subject, body, { from: SENDER_ALIAS, name: SENDER_NAME });
}

function cancelAppointmentByUID(uid, silent = false) {
  try {
    const props = PropertiesService.getScriptProperties();
    const triggerId = props.getProperty('event_to_trigger_' + uid);
    
    if (triggerId) {
      const triggers = ScriptApp.getProjectTriggers();
      for (let i = 0; i < triggers.length; i++) {
        if (triggers[i].getUniqueId() === triggerId) { ScriptApp.deleteTrigger(triggers[i]); break; }
      }
      props.deleteProperty('reminder_' + triggerId);
      props.deleteProperty('event_to_trigger_' + uid);
    }
    
    const now = new Date();
    const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const allCals = getCalendars();
    
    for (const cal of allCals) {
      const events = cal.getEvents(now, future);
      for (const ev of events) {
        if (ev.getDescription().includes(`UID: ${uid}`)) {
          const title = ev.getTitle();
          const start = ev.getStartTime();
          ev.deleteEvent();
          if (!silent) {
            GmailApp.sendEmail('1123alberto@gmail.com', `★ APPOINTMENT CANCELED: ${title}`, 
              `The following appointment has been canceled:\n\nUID: ${uid}\nTime: ${start}`);
          }
          return { success: true };
        }
      }
    }
    return { error: "Appointment not found." };
  } catch (e) { return { error: e.toString() }; }
}
```

## 2. Deploy the Script as a Web App
1. At the top right of the Apps Script editor, click the blue **Deploy** button, then select **New deployment**.
2. Click the "**Select type**" gear icon, and check **Web app**.
3. Under **Description**, type "Booking API V2".
4. Under **Execute as**, ensure it is set to **Me (your email)**.
5. Under **Who has access**, select **Anyone**.
6. Click **Deploy**. (Grant permissions if asked).
7. Copy the **Web app URL** and update it in your `main.js`.
