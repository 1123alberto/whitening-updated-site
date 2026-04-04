# Custom Google Calendar Booking Widget Blueprint

This document contains everything needed to replicate the interactive 4-step Google Calendar Booking integration into another website. You can provide this file to an AI assistant in your other project and instruct it to: *"Integrate this booking system blueprint into my website."*

---

## 1. System Requirements & Features
- **Frontend**: A 4-step interactive widget (Calendar -> Time Slots -> User Details -> Success Confirmation).
- **Backend API**: Connected natively to a Google Apps Script Web App that reads directly from a Google Calendar.
- **Constraints**: 
  - Prevents booking on Sundays.
  - 6-hour minimum buffer (prevents booking times less than 6 hours into the future).
- **Automated Emails**: Sends an automated script email directly from the clinic's Gmail at **9:00 AM** on the exact morning of the client's scheduled appointment.

---

## 2. Frontend HTML Structure
Paste this where you want the booking widget to appear:

```html
<!-- Booking Widget -->
<section id="booking" class="booking-section bg-light">
    <div class="container container-narrow">
        <div class="section-header text-center">
            <h2 class="section-title">Κλείστε το Ραντεβού σας</h2>
            <p class="section-desc">Επιλέξτε ημερομηνία και ώρα για τη συνεδρία σας.</p>
        </div>
        
        <div class="booking-widget">
            <!-- Step 1: Calendar -->
            <div id="booking-step-1" class="booking-step active">
                <div class="calendar-header">
                    <button id="prev-week" class="calendar-nav-btn">&larr;</button>
                    <h3 id="calendar-month" class="calendar-month">...</h3>
                    <button id="next-week" class="calendar-nav-btn">&rarr;</button>
                </div>
                <div class="calendar-grid" id="calendar-grid">
                    <!-- JS will populate the 14 days here -->
                </div>
                <div class="booking-loader" id="calendar-loader" style="display: none;">
                    <div class="spinner"></div><p>Έλεγχος διαθεσιμότητας...</p>
                </div>
            </div>

            <!-- Step 2: Time Slots -->
            <div id="booking-step-2" class="booking-step" style="display: none;">
                <button class="back-btn" onclick="goToStep(1)">&larr; <span>Πίσω στο Ημερολόγιο</span></button>
                <h3 class="step-title" id="selected-date-display">...</h3>
                <div class="time-slots-grid" id="time-slots-grid">
                    <!-- JS will populate available times -->
                </div>
            </div>

            <!-- Step 3: Details Form -->
            <div id="booking-step-3" class="booking-step" style="display: none;">
                <button class="back-btn" onclick="goToStep(2)">&larr; <span>Πίσω στις Ώρες</span></button>
                <h3 class="step-title">Στοιχεία Επικοινωνίας</h3>
                <p class="selected-slot-info mb-4 text-center">
                    <strong id="final-date-time">...</strong>
                </p>
                
                <form id="booking-form" class="custom-form">
                    <div class="form-group">
                        <label for="b-name">Ονοματεπώνυμο *</label>
                        <input type="text" id="b-name" required placeholder="π.χ. Μαρία Παπαδοπούλου">
                    </div>
                    <div class="form-group">
                        <label for="b-email">Email *</label>
                        <input type="email" id="b-email" required placeholder="maria@example.com">
                    </div>
                    <div class="form-group">
                        <label for="b-phone">Κινητό Τηλέφωνο *</label>
                        <input type="tel" id="b-phone" required placeholder="6930000000">
                    </div>
                    
                    <button type="submit" class="btn btn-primary w-100" id="submit-booking-btn">
                        <span>Επιβεβαίωση Ραντεβού</span>
                    </button>
                    <div class="booking-loader mt-4" id="submit-loader" style="display: none;">
                        <div class="spinner"></div><p>Καταχώρηση...</p>
                    </div>
                </form>
            </div>

            <!-- Step 4: Success Message -->
            <div id="booking-step-4" class="booking-step text-center" style="display: none;">
                <div class="success-icon">✓</div>
                <h3 class="step-title">Το ραντεβού σας επιβεβαιώθηκε!</h3>
                <p>Θα λάβετε σύντομα ένα email επιβεβαίωσης. Σας περιμένουμε!</p>
                <button class="btn btn-secondary mt-4" onclick="location.reload()">Νέο Ραντεβού</button>
            </div>
        </div>
    </div>
</section>
```

---

## 3. Frontend JavaScript Logic
Attach this code to control the widget UI and simulate fetching availability:

```javascript
const GOOGLE_SCRIPT_URL = "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE"; 

let selectedDate = null;
let selectedTime = null;
let currentWeekStart = new Date();

// Initialize week to today
currentWeekStart.setHours(0,0,0,0);
const day = currentWeekStart.getDay();
const diff = currentWeekStart.getDate() - day + (day === 0 ? -6 : 1);
currentWeekStart.setDate(diff);

function goToStep(stepNumber) {
    document.querySelectorAll('.booking-step').forEach(el => el.style.display = 'none');
    document.getElementById(`booking-step-${stepNumber}`).style.display = 'block';
    if (stepNumber === 1) renderCalendar();
}
window.goToStep = goToStep;

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month');
    grid.innerHTML = '';
    
    // Day Headers
    ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'].forEach(d => {
        const div = document.createElement('div');
        div.className = 'day-header';
        div.textContent = d;
        grid.appendChild(div);
    });

    const today = new Date();
    today.setHours(0,0,0,0);
    let monthName = "";
    
    // Generate 35 days (5 weeks)
    for (let i = 0; i < 35; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        
        if (i === 0 || i === 7) { 
            const m = date.toLocaleString('el-GR', { month: 'long', year: 'numeric' });
            if (!monthName.includes(m)) monthName += (monthName ? " - " : "") + m;
        }

        const btn = document.createElement('button');
        btn.className = 'date-btn';
        btn.textContent = date.getDate();
        
        // Disable past dates, Sundays (0)
        if (date < today || date.getDay() === 0) {
            btn.classList.add('disabled');
        } else {
            btn.onclick = () => selectDate(date);
        }
        
        if (selectedDate && date.getTime() === selectedDate.getTime()) {
            btn.classList.add('active');
        }
        
        grid.appendChild(btn);
    }
    monthLabel.textContent = monthName;
}

function selectDate(date) {
    selectedDate = date;
    fetchAndShowSlots(date);
}

function formatDateAPI(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('el-GR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function fetchAndShowSlots(date) {
    document.getElementById('calendar-loader').style.display = 'flex';
    document.getElementById('selected-date-display').textContent = formatDateDisplay(date);
    
    const slotsGrid = document.getElementById('time-slots-grid');
    slotsGrid.innerHTML = '';
    
    // Phone only on Saturdays
    if (date.getDay() === 6) {
        document.getElementById('calendar-loader').style.display = 'none';
        slotsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Για ραντεβού το Σάββατο, επικοινωνήστε τηλεφωνικά.</p>`;
        goToStep(2);
        return;
    }
    
    try {
        let availableSlots = [];
        
        if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
            await new Promise(r => setTimeout(r, 800)); // Test mode simulation delay
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const hourLimit = isWeekend ? 0 : 20; 
            
            for(let h = 10; h < hourLimit; h++) {
                if (h === 14) continue; // Lunch
                if (h % 2 !== 0 && h !== 10) continue; 
                
                const now = new Date();
                const minTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hour buffer
                
                const slotTime1 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0);
                if (slotTime1 > minTime) availableSlots.push(`${h}:00`);
                
                if (h + 1 < hourLimit) {
                    const slotTime2 = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 30, 0);
                    if (slotTime2 > minTime) availableSlots.push(`${h}:30`);
                }
            }
        } else {
            // Live google fetch
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSlots&date=${formatDateAPI(date)}`);
            const data = await response.json();
            availableSlots = data.slots; 
        }

        if (availableSlots.length === 0) {
            slotsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημερομηνία.</p>`;
        } else {
            availableSlots.forEach(time => {
                const btn = document.createElement('button');
                btn.className = 'time-slot-btn';
                btn.textContent = time;
                btn.onclick = () => selectTime(time);
                slotsGrid.appendChild(btn);
            });
        }
        
    } finally {
        document.getElementById('calendar-loader').style.display = 'none';
        goToStep(2);
    }
}

function selectTime(time) {
    selectedTime = time;
    document.getElementById('final-date-time').textContent = `${formatDateDisplay(selectedDate)} | ${time}`;
    goToStep(3);
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('prev-week').onclick = () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const currentWeekStartForToday = new Date(today);
        currentWeekStartForToday.setDate(diff);

        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() - 28);
        currentWeekStart = newStart < currentWeekStartForToday ? currentWeekStartForToday : newStart;
        renderCalendar();
    };
    
    document.getElementById('next-week').onclick = () => {
        const today = new Date();
        const maxFutureDate = new Date(today);
        maxFutureDate.setDate(today.getDate() + 35);

        const newStart = new Date(currentWeekStart);
        newStart.setDate(newStart.getDate() + 28);
        if (newStart < maxFutureDate) {
            currentWeekStart = newStart;
            renderCalendar();
        }
    };

    renderCalendar();

    // Form Submission
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('submit-booking-btn');
        const loader = document.getElementById('submit-loader');
        
        btn.disabled = true;
        loader.style.display = 'flex';
        
        const payload = {
            action: 'book',
            date: formatDateAPI(selectedDate),
            time: selectedTime,
            name: document.getElementById('b-name').value,
            email: document.getElementById('b-email').value,
            phone: document.getElementById('b-phone').value
        };
        
        try {
            if (GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                await new Promise(r => setTimeout(r, 1500)); // Test mode
            }
            goToStep(4);
        } catch (error) {
            alert("Σφάλμα συστήματος. Παρακαλώ δοκιμάστε ξανά.");
        } finally {
            btn.disabled = false;
            loader.style.display = 'none';
        }
    });
});
```

---

## 4. Google Apps Script Backend (Calendar API + Auto Email)
Paste this into a new Google Apps Script deployed as a Web App to enable live API checking and the 9:00 AM triggered email.

```javascript
// --- CONFIGURATION ---
const SERVICE_DURATION = 90; 
const CALENDAR_NAME = ''; 

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

const BLOCKED_DATES = [];
// ----------------------

function getCalendar() {
  if (CALENDAR_NAME === '') return CalendarApp.getDefaultCalendar();
  const cals = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  return cals.length > 0 ? cals[0] : CalendarApp.getDefaultCalendar();
}

function doGet(e) {
  const dateStr = e.parameter.date; 
  if (!dateStr) return respondJSON({ error: "No date provided." });

  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();
  
  const hours = CLINIC_HOURS[dayOfWeek];
  if (!hours || BLOCKED_DATES.includes(dateStr)) {
    return respondJSON({ date: dateStr, slots: [] }); 
  }

  const cal = getCalendar();
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59);
  
  const busyPeriods = cal.getEvents(startOfDay, endOfDay).map(ev => ({
    start: ev.getStartTime(),
    end: ev.getEndTime()
  })).sort((a, b) => a.start - b.start);
  
  let availableSlots = [];
  let currentSlotTime = new Date(year, month - 1, day, hours.start, 0, 0);
  const endOfWorkDay = new Date(year, month - 1, day, hours.end, 0, 0);
  
  const now = new Date(); 
  const minSlotTime = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6-hour minimum buffer

  while (currentSlotTime < endOfWorkDay) {
    const slotEnd = new Date(currentSlotTime.getTime() + SERVICE_DURATION * 60000);
    
    if (slotEnd <= endOfWorkDay && currentSlotTime > minSlotTime) {
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
    currentSlotTime = new Date(currentSlotTime.getTime() + SERVICE_DURATION * 60000);
  }
  return respondJSON({ date: dateStr, slots: availableSlots });
}

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    if (postData.action === 'book') {
      const { date, time, name, email, phone } = postData;
      
      const [year, month, day] = date.split('-').map(Number);
      const [hour, minute] = time.split(':').map(Number);
      
      const startTime = new Date(year, month - 1, day, hour, minute);
      const endTime = new Date(startTime.getTime() + SERVICE_DURATION * 60000);
      
      const title = `Ραντεβού - ${name}`;
      const description = `Νέο Ραντεβού από Website\n\nΌνομα: ${name}\nΤηλέφωνο: ${phone}\nEmail: ${email}`;
      
      getCalendar().createEvent(title, startTime, endTime, { description: description });
      scheduleReminderEmail(email, name, startTime);
      
      return respondJSON({ success: true, message: "Appointment created." });
    }
  } catch (error) { return respondJSON({ error: error.toString() }); }
}

function respondJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// -- Scheduled Email Engine --
function scheduleReminderEmail(email, name, dateObj) {
  const reminderTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 9, 0, 0);
  if (reminderTime <= new Date()) {
    sendReminderEmail(email, name);
  } else {
    const trigger = ScriptApp.newTrigger('processReminderEmail').timeBased().at(reminderTime).create();
    PropertiesService.getScriptProperties().setProperty('reminder_' + trigger.getUniqueId(), JSON.stringify({email: email, name: name}));
  }
}

function processReminderEmail(e) {
  const triggerId = e.triggerUid;
  const props = PropertiesService.getScriptProperties();
  const dataStr = props.getProperty('reminder_' + triggerId);
  
  if (dataStr) {
    const data = JSON.parse(dataStr);
    sendReminderEmail(data.email, data.name);
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

function sendReminderEmail(email, name) {
  MailApp.sendEmail(email, "Υπενθύμιση Ραντεβού (Κλινική)", `Γεια σας ${name},\n\nΣας υπενθυμίζουμε το σημερινό σας ραντεβού στο ιατρείο μας.\n\nΜε εκτίμηση,\nH Ομάδα μας.`);
}
```
