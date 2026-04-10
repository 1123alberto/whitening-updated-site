# Proposal: Automated Appointment Management (Cancellations & Reschedules)

## 1. Objective
Transform the current one-way booking system into a fully managed cycle where patients can independently cancel or change their appointments with one click, reducing manual administrative work for the clinic.

---

## 2. User Experience Flow

### Phase A: The Booking
When a patient books a service, the confirmation email will now include a dynamic, secure link:
> *"Need to change or cancel? [Click here to manage your booking]"*

### Phase B: The Management Portal
Clicking the link takes the user to a standalone, branded "i-smile" page (hosted on Google Apps Script). 
*   **Information Displayed:** Service name, Date, and Time.
*   **Actions:** 
    *   **Cancel Appointment**: A "Confirm Cancellation" button.
    *   **Reschedule**: A button that leads back to the main website.

### Phase C: Rescheduling (The "Auto-Fill" Logic)
If they choose to reschedule:
1.  The system cancels the old appointment automatically.
2.  It redirects the user back to `i-smile.gr#booking`.
3.  **Magic Part:** Their Name, Email, and Phone number are **already filled out** in the form. They only need to pick a new date/time.

---

## 3. Technical Architecture

### Google Apps Script Upgrades
*   **New Action `manage`**: A `doGet` parameter that renders a small HTML interface using `HtmlService`.
*   **New Action `cancel`**: A function that:
    1.  Deletes the event from Google Calendar using the unique `eventId`.
    2.  Finds and deletes the scheduled 9:00 AM reminder trigger so the user isn't annoyed after canceling.
    3.  Sends a notification to the Clinic Admin.
*   **Property Storage**: Use `PropertiesService` to link `eventId` to the specific `triggerId`.

### Website Upgrades (`main.js`)
*   Add a small "URL Parser" that checks for `?reschedule=true&name=...` and automatically populates the booking form fields.

---

## 4. Policy & Security

*   **Security**: No passwords required. Access is granted via a unique, non-guessable URL token in the patient's private email.
*   **Lock-out Period**: Optional logic to prevent cancellations if the appointment is less than 24 hours away (e.g., "Please call the clinic for late cancellations").
*   **Notifications**: The clinic admin receives an instant "★ APPOINTMENT CANCELED" email to stay informed.

---

## 5. Next Steps
1.  **Approval**: Confirm if this flow meets your needs.
2.  **Implementation**: I will update the Google Apps Script first, then adjust the website logic.
3.  **Testing**: We will perform a test booking and try to cancel it via the email link.
