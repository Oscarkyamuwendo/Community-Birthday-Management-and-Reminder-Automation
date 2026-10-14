# Community Birthday Management and Reminder Automation

A Google Apps Script project that connects Google Forms, Google Sheets, and Google Calendar to reduce repetitive birthday administration for a community group. It is based on a practical community workflow and has been sanitized into a reusable public template.

## Features

- Processes Google Form submissions and reads first name, last name, email address, and birth date.
- Creates an annual all-day birthday event in a configured Google Calendar.
- Checks the target birthday dates for an existing event with the same title before creating a new one.
- Saves the Calendar event ID in column L of the response sheet so a record can be linked to its event.
- Includes a date parser for common date formats.
- Includes a manual spreadsheet menu for adding a selected birthday and synchronizing a selected birthday when the date or name changes.
- Sends email reminders to a configured recipient 7 days and 1 day before a birthday, with a suggested birthday message.
- Tracks reminder send timestamps in columns N and O to reduce repeat sends for the same year.
- Includes helper functions to install form-submit and spreadsheet-open triggers.

## Workflow

1. A person submits the Google Form.
2. `processBirthdaySubmission(e)` reads the submission.
3. The script checks the Calendar for a matching birthday event.
4. If appropriate, it creates a yearly all-day event and stores the event ID in the matching response row.
5. A time-driven trigger runs `sendBirthdayPostReminders()` daily. The function checks birthdays coming up in 7 days and 1 day, sends the reminder email, and records the send timestamp.
6. An authorized spreadsheet user can use the **🎂 Birthday Tools** menu to add or synchronize a selected birthday.

## Files

- `Code.gs` — Google Apps Script source.
- `CONTRIBUTING.md` — contribution and pull-request guidance.
- `SECURITY.md` — reporting and handling sensitive information.
- `CODE_OF_CONDUCT.md` — expected community behavior.
- `.gitignore` — common local/editor files to exclude.

## Requirements

- A Google account with permission to access the target Form, response spreadsheet, and Calendar.
- A Google Form with question titles matching the code’s expected names: `First Name`, `Last Name`, `Email Address`, and `Birth Date`. The script normalizes case and removes a trailing colon, but different question wording must be mapped in the code.
- A response sheet named `Form Responses 1`.
- The response columns used by the script must match this layout:

| Column | Expected content |
|---|---|
| A | Form submission timestamp |
| B | First name |
| C | Last name |
| D | Email address |
| E | Birth date |
| L | Calendar Event ID |
| N | 7-Day Reminder Sent |
| O | 1-Day Reminder Sent |

Check the actual Form Responses sheet before using the script. If your form’s column layout differs, update the column references before deployment.

## Setup

1. Open [Google Apps Script](https://script.google.com/) and create a project.
2. Copy `Code.gs` into the project.
3. At the top of the script, replace these placeholders with values for your own environment:
   - `YOUR_GOOGLE_CALENDAR_ID`
   - `YOUR_GOOGLE_FORM_ID`
   - `YOUR_RESPONSE_SPREADSHEET_ID`
   - `YOUR_REMINDER_RECIPIENT_EMAIL`
4. Confirm that the Form question titles and spreadsheet column layout match the requirements above.
5. Review the code and requested Google permissions. Run `setupFormSubmitTrigger()` once to install the Form submission trigger. Approve the required permissions.
6. Run `setupSpreadsheetOpenTrigger()` once if you want the custom spreadsheet menu to be installed through an open trigger.
7. Create a **time-driven trigger** for `sendBirthdayPostReminders()` and set it to run daily. This is required for automated email reminders; the function does not schedule itself.
8. Confirm the script time zone in **Project Settings** matches the Calendar/community time zone.

Do not run the form-submission handler manually from the Apps Script editor; it expects a real form-submit event object.

## Important implementation notes

- The current implementation uses the event title and birthday date to detect an existing event. Review this behavior if your Calendar has similarly named events.
- The date parser accepts several common formats, but ambiguous numeric dates can be interpreted differently by locale. Use a consistent date format and verify it against your form settings.
- The reminder tracking records a timestamp and uses its year to decide whether a reminder has already been sent for that year.
- The script uses Google Apps Script services and requires appropriate access to the Calendar, Form, and spreadsheet.
- This repository is a reusable example, not a turnkey deployment. Configuration, permissions, column mappings, and reminder trigger setup must be reviewed for each environment.

## Privacy and data protection

Use synthetic or anonymized data in screenshots, issues, pull requests, and demos. Do not commit real names, birth dates, email addresses, Form IDs, spreadsheet IDs, Calendar IDs, access tokens, or other private information. Keep the working production script and public portfolio copy separate.

## Contributions

Bug reports, documentation improvements, and suggestions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

No license has been added yet. Do not assume the code may be reused, modified, or redistributed until the repository owner has confirmed the appropriate license and any permissions needed for the original project.
