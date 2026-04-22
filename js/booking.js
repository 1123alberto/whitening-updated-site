// ============================================
// i-smile | Booking Widget Logic
// ============================================
// Standalone booking system for book.html
// Supports service pre-selection via URL param
// ============================================

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxvNNqsHihbc9SuLPb4r2Tlin8Tne6AQ8rF38ubQd6k9YY6xaopouajXa7Wuf60-iD43Q/exec';

/**
 * Local Blocking Configuration
 * dates: Array of YYYY-MM-DD strings to block entire days.
 * slots: Object with YYYY-MM-DD keys and arrays of HH:MM strings to block specific slots.
 */
const BLOCKED_CONFIG = {
    dates: ['2026-04-10', '2026-04-11', '2026-04-13', '2026-04-14', '2026-05-01'],
    slots: {} 
};

let selectedDate = null;
let selectedTime = null;
let selectedDuration = 90;
let selectedServiceLabel = 'Whitening';
let currentViewDate = new Date();
let monthlyBusyData = {}; 
let isFetchingBusyDays = false;
let prefetchPromise = null;

// Initialize to 1st of current month
currentViewDate.setDate(1);
currentViewDate.setHours(0, 0, 0, 0);

// Service definitions
const services = [
    { key: 'consult', duration: 30, i18nKey: 'service_consult' },
    { key: 'whitening', duration: 90, i18nKey: 'service_whitening' },
    { key: 'veneers', duration: 60, i18nKey: 'service_veneers_consult' },
    { key: 'aligners', duration: 60, i18nKey: 'service_aligners_consult' },
];

// ── Eager Prefetch ──
// Fires immediately on script load to eliminate GAS cold-start delay.
(function prefetchCurrentMonth() {
    if (GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL_HERE')) return;
    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    const key = `${year}-${month}`;
    isFetchingBusyDays = true;
    prefetchPromise = fetch(`${GOOGLE_SCRIPT_URL}?action=getBusyDays&year=${year}&month=${month}`)
        .then(r => r.json())
        .then(data => {
            monthlyBusyData[key] = data.busyDays || [];
            // Silently update if calendar is already visible
            if (document.getElementById('calendar-grid')) renderCalendar();
        })
        .catch(() => { monthlyBusyData[key] = []; })
        .finally(() => { 
            isFetchingBusyDays = false;
            prefetchPromise = null; 
        });
})();

// ── Step Navigation ──
function goToStep(stepNumber) {
    document.querySelectorAll('.booking-step').forEach(el => el.style.display = 'none');

    let stepId = `booking-step-${stepNumber}`;
    if (stepNumber === 'service') stepId = 'booking-step-service';

    const stepEl = document.getElementById(stepId);
    if (stepEl) {
        stepEl.style.display = 'block';
    }

    if (stepNumber === 1) {
        renderCalendar();
    }
}
window.goToStep = goToStep;

// ── Adaptive Month Loading ──
async function fetchMonthlyBusyDays(year, month) {
    if (GOOGLE_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_URL_HERE")) return;
    const key = `${year}-${month}`;

    // If a prefetch for this specific month is already running, wait for it
    if (prefetchPromise && !monthlyBusyData.hasOwnProperty(key)) {
        await prefetchPromise;
        return;
    }

    if (isFetchingBusyDays) return;
    isFetchingBusyDays = true;

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getBusyDays&year=${year}&month=${month}`);
        const data = await response.json();
        monthlyBusyData[key] = data.busyDays || [];
        renderCalendar();
    } catch (e) {
        monthlyBusyData[key] = [];
    } finally {
        isFetchingBusyDays = false;
    }
}

// ── Calendar Rendering ──
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month');
    if (!grid || !monthLabel) return;
    grid.innerHTML = '';

    const year = currentViewDate.getFullYear();
    const month = currentViewDate.getMonth() + 1;
    const key = `${year}-${month}`;

    if (!monthlyBusyData.hasOwnProperty(key)) {
        fetchMonthlyBusyDays(year, month);
    }
    const busyDays = monthlyBusyData[key] || [];

    // Weekday headers
    const daysEl = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ'];
    const daysEn = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDays = window.currentLang === 'el' ? daysEl : daysEn;

    activeDays.forEach(d => {
        const div = document.createElement('div');
        div.className = 'day-header';
        div.textContent = d;
        grid.appendChild(div);
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate Grid Start (Monday of the first week)
    const gridStart = new Date(currentViewDate);
    const dayOfWeek = gridStart.getDay();
    const padding = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    gridStart.setDate(gridStart.getDate() - padding);

    // Month Label
    monthLabel.textContent = currentViewDate.toLocaleString(document.documentElement.lang, { month: 'long', year: 'numeric' });

    // Generate 35 days (5 weeks)
    for (let i = 0; i < 35; i++) {
        const date = new Date(gridStart);
        date.setDate(date.getDate() + i);

        const btn = document.createElement('button');
        btn.className = 'date-btn';
        btn.textContent = date.getDate();

        const dateStr = formatDateAPI(date);
        const isPast = date < today;
        const isCurrentMonth = date.getMonth() === currentViewDate.getMonth();
        const isSunday = date.getDay() === 0;
        const isBlocked = BLOCKED_CONFIG.dates.includes(dateStr) || busyDays.includes(dateStr);

        if (isPast || isSunday || isBlocked || !isCurrentMonth) {
            btn.classList.add('disabled');
        } else {
            btn.onclick = () => selectDate(date);
        }

        if (selectedDate && date.getTime() === selectedDate.getTime()) {
            btn.classList.add('active');
        }

        grid.appendChild(btn);
    }

    // Nav button states
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');
    if (prevBtn && nextBtn) {
        const currentMonthFirst = new Date(today);
        currentMonthFirst.setDate(1);
        currentMonthFirst.setHours(0, 0, 0, 0);
        prevBtn.disabled = currentViewDate <= currentMonthFirst;
        prevBtn.style.opacity = prevBtn.disabled ? "0.3" : "1";

        const nextMonthLimit = new Date(currentMonthFirst);
        nextMonthLimit.setMonth(nextMonthLimit.getMonth() + 1);
        nextBtn.disabled = currentViewDate >= nextMonthLimit;
        nextBtn.style.opacity = nextBtn.disabled ? "0.3" : "1";
    }
}

// ── Date Selection ──
function selectDate(date) {
    selectedDate = date;
    renderCalendar();
    goToStep('service');
}

// ── Service Selection ──
function selectService(serviceKey, duration) {
    selectedDuration = duration;
    selectedServiceLabel = translations[window.currentLang][`service_${serviceKey}`] ||
                           translations[window.currentLang][`service_${serviceKey}_consult`] ||
                           serviceKey;
    fetchAndShowSlots(selectedDate);
}
window.selectService = selectService;

// ── Date Formatting ──
function formatDateDisplay(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(document.documentElement.lang, options);
}

function formatDateAPI(date) {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ── Fetch Time Slots ──
async function fetchAndShowSlots(date) {
    document.getElementById('calendar-loader').style.display = 'flex';
    document.getElementById('selected-date-display').textContent = formatDateDisplay(date);

    const slotsGrid = document.getElementById('time-slots-grid');
    slotsGrid.style.display = 'grid';
    slotsGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
    slotsGrid.style.gap = '0.75rem';
    slotsGrid.innerHTML = '';

    // Saturday logic
    if (date.getDay() === 6) {
        document.getElementById('calendar-loader').style.display = 'none';
        slotsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;" data-i18n="sat_phone_only">${translations[window.currentLang].sat_phone_only}</p>`;
        goToStep(2);
        return;
    }

    try {
        let availableSlots = [];

        if (GOOGLE_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_URL_HERE")) {
            await new Promise(r => setTimeout(r, 800));
            availableSlots = [];
            const now = new Date();
            const minTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
            for (let h = 10; h <= 19; h++) {
                if (h === 14 || h === 15 || h === 16) continue;
                const slotTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0);
                if (slotTime > minTime) {
                    availableSlots.push(`${h}:00`);
                }
            }
        } else {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSlots&date=${formatDateAPI(date)}&duration=${selectedDuration}`, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                availableSlots = data.slots || [];
            } else {
                const text = await response.text();
                console.error("Non-JSON response from Google Apps Script.", text.substring(0, 500));
                throw new Error("Invalid response format from server.");
            }
        }

        // Filter against local blocked slots
        const dateStr = formatDateAPI(date);
        if (BLOCKED_CONFIG.slots[dateStr]) {
            availableSlots = availableSlots.filter(s => !BLOCKED_CONFIG.slots[dateStr].includes(s));
        }

        if (availableSlots.length === 0) {
            const msgEl = window.currentLang === 'el' 
                ? 'Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημερομηνία. Για επείγοντα περιστατικά παρακαλούμε καλέστε στο <a href="tel:2109312651" style="font-weight:bold; text-decoration:underline;">210 931 2651</a>.' 
                : 'No slots available for this date. For emergencies please call <a href="tel:2109312651" style="font-weight:bold; text-decoration:underline;">210 931 2651</a>.';
            slotsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; line-height: 1.6;">${msgEl}</p>`;
        } else {
            availableSlots.forEach(time => {
                const btn = document.createElement('button');
                btn.className = 'time-slot-btn';
                btn.textContent = time;
                btn.onclick = () => selectTime(time);
                slotsGrid.appendChild(btn);
            });
        }
    } catch (error) {
        console.error("Error fetching slots:", error);
        slotsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: red;">Error loading availability. Please check console (F12).</p>`;
    } finally {
        document.getElementById('calendar-loader').style.display = 'none';
        goToStep(2);
    }
}

// ── Time Selection ──
function selectTime(time) {
    selectedTime = time;
    document.getElementById('final-date-time').textContent = `${formatDateDisplay(selectedDate)} | ${time} (${selectedServiceLabel})`;
    goToStep(3);
}

// ── URL-based Service Pre-selection ──
function checkServiceParam() {
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service');

    if (service) {
        // Highlight the matching service button after render
        setTimeout(() => {
            const serviceButtons = document.querySelectorAll('.service-btn');
            serviceButtons.forEach(btn => {
                if (btn.dataset.service === service) {
                    btn.classList.add('preselected');
                }
            });
        }, 100);
    }

    // Check for reschedule params
    if (params.get('reschedule') === 'true') {
        const name = params.get('name');
        const email = params.get('email');
        const phone = params.get('phone');
        window.rescheduleUid = params.get('uid');

        if (name) document.getElementById('b-name').value = decodeURIComponent(name);
        if (email) document.getElementById('b-email').value = decodeURIComponent(email);
        if (phone) document.getElementById('b-phone').value = decodeURIComponent(phone);

        const descEl = document.querySelector('[data-i18n="book_page_desc"]');
        if (descEl) {
            descEl.innerHTML = `<span style="display:inline-block; background-color:#fef3c7; color:#92400e; padding:2px 8px; border-radius:4px; font-weight:700; margin-right:8px;">${window.currentLang === 'el' ? 'ΑΛΛΑΓΗ' : 'RESCHEDULE'}</span> ${window.currentLang === 'el' ? 'Παρακαλώ επιλέξτε τη νέα ημερομηνία και ώρα.' : 'Please select your new date and time.'}`;
        }
    }
}

// ── Language Change Handler ──
window.onLanguageChange = function() {
    try {
        renderCalendar();
        if (selectedDate) {
            const dateDisplay = document.getElementById('selected-date-display');
            if (dateDisplay) dateDisplay.textContent = formatDateDisplay(selectedDate);
            if (selectedTime) {
                const finalDisplay = document.getElementById('final-date-time');
                if (finalDisplay) finalDisplay.textContent = `${formatDateDisplay(selectedDate)} | ${selectedTime}`;
            }
        }
    } catch (e) { }
};

// ── Initialize Booking ──
document.addEventListener("DOMContentLoaded", () => {
    // Week navigation
    const prevBtn = document.getElementById('prev-week');
    const nextBtn = document.getElementById('next-week');

    if (prevBtn) {
        prevBtn.onclick = () => {
            currentViewDate.setMonth(currentViewDate.getMonth() - 1);
            renderCalendar();
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            currentViewDate.setMonth(currentViewDate.getMonth() + 1);
            renderCalendar();
        };
    }

    // Initial render
    renderCalendar();

    // Check for service pre-selection / reschedule
    checkServiceParam();

    // Form Submission
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const btn = document.getElementById('submit-booking-btn');
            const loader = document.getElementById('submit-loader');

            const payload = {
                action: 'book',
                date: formatDateAPI(selectedDate),
                time: selectedTime,
                duration: selectedDuration,
                service: selectedServiceLabel,
                name: document.getElementById('b-name').value,
                email: document.getElementById('b-email').value,
                phone: document.getElementById('b-phone').value,
                rescheduleUid: window.rescheduleUid || null
            };

            btn.disabled = true;
            loader.style.display = 'flex';

            try {
                if (!GOOGLE_SCRIPT_URL.includes("YOUR_GOOGLE_APPS_SCRIPT_URL_HERE")) {
                    await fetch(GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } else {
                    await new Promise(r => setTimeout(r, 1500));
                }
                goToStep(4);
            } catch (error) {
                alert(window.currentLang === 'el' ? "Σφάλμα συστήματος. Δοκιμάστε ξανά." : "System error. Please try again.");
            } finally {
                btn.disabled = false;
                loader.style.display = 'none';
            }
        });
    }
});
