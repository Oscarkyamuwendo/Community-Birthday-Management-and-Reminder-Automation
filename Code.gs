// Community Birthday Management and Reminder Automation
// Public template: replace the configuration placeholders before use.
// Do not commit real IDs, personal data, or credentials.

const CALENDAR_ID = "YOUR_GOOGLE_CALENDAR_ID";

const FORM_ID =
  "YOUR_GOOGLE_FORM_ID";

const RESPONSE_SPREADSHEET_ID =
  "YOUR_RESPONSE_SPREADSHEET_ID";

const RESPONSE_SHEET_NAME = "Form Responses 1";


// ============================================================
// CREATE BIRTHDAY FROM GOOGLE FORM SUBMISSION
// ============================================================

function processBirthdaySubmission(e) {

  if (!e || !e.response) {
    throw new Error(
      "This function must be triggered by a Google Form submission."
    );
  }

  const response = e.response;

  const responses = {};

  response.getItemResponses().forEach(function(itemResponse) {

    const question =
      itemResponse
        .getItem()
        .getTitle()
        .trim()
        .toLowerCase()
        .replace(/:\s*$/, "");

    const answer =
      itemResponse.getResponse();

    responses[question] = answer;
  });


  // ----------------------------------------------------------
  // Get information from the Form
  // ----------------------------------------------------------

  const firstName =
    String(responses["first name"] || "").trim();

  const lastName =
    String(responses["last name"] || "").trim();

  const email =
    String(responses["email address"] || "").trim();

  const birthDateValue =
    responses["birth date"];


  // ----------------------------------------------------------
  // Check required information
  // ----------------------------------------------------------

  if (!firstName || !lastName || !birthDateValue) {

    throw new Error(
      "Missing First Name, Last Name, or Birth Date."
    );
  }


  // ----------------------------------------------------------
  // Parse birthday
  // ----------------------------------------------------------

  const birthday =
    parseBirthday(birthDateValue);


  if (!birthday) {

    throw new Error(
      "Could not understand the birth date: " +
      birthDateValue
    );
  }


  // ----------------------------------------------------------
  // Open the configured Google Calendar
  // ----------------------------------------------------------

  const calendar =
    CalendarApp.getCalendarById(CALENDAR_ID);


  if (!calendar) {

    throw new Error(
      "The configured Google Calendar could not be accessed."
    );
  }

  const fullName =
    firstName + " " + lastName;

  const checkYear = new Date().getFullYear();

  const birthdayThisYear =
    new Date(
      checkYear,
      birthday.getMonth(),
      birthday.getDate()
    );

  const birthdayNextYear =
    new Date(
      checkYear + 1,
      birthday.getMonth(),
      birthday.getDate()
    );

  const existingEvents =
    calendar.getEventsForDay(birthdayThisYear)
      .concat(
        calendar.getEventsForDay(birthdayNextYear)
      );


for (const event of existingEvents) {
  if (
    event.getTitle().toLowerCase() ===
    ("🎂 birthday – " + fullName).toLowerCase()
  ) {
    saveEventIdToResponseSheet(
      response.getTimestamp(),
      event.getId(),
      firstName,
      lastName,
      email,
      birthDateValue
    );

    Logger.log(
      "Birthday already exists for " +
      fullName +
      ". Existing Calendar Event ID linked."
    );

    return;
  }
}


  const title =
    "🎂 Birthday – " + fullName;


  let description =
    "Community member birthday.\n\n" +
    "Name: " + fullName;


  if (email) {
    description += "\nEmail: " + email;
  }


  // ----------------------------------------------------------
  // Find next birthday
  // ----------------------------------------------------------

  const today = new Date();

  const currentYear =
    today.getFullYear();


  let firstBirthday =
    new Date(
      currentYear,
      birthday.getMonth(),
      birthday.getDate()
    );


  const todayOnly =
    new Date(
      currentYear,
      today.getMonth(),
      today.getDate()
    );


  if (firstBirthday < todayOnly) {

    firstBirthday =
      new Date(
        currentYear + 1,
        birthday.getMonth(),
        birthday.getDate()
      );
  }


  // ----------------------------------------------------------
  // Create yearly recurring birthday
  // ----------------------------------------------------------

  const recurrence =
    CalendarApp.newRecurrence()
      .addYearlyRule();


  const eventSeries =
    calendar.createAllDayEventSeries(
      title,
      firstBirthday,
      recurrence,
      {
        description: description
      }
    );


  // ----------------------------------------------------------
  // Birthday reminders
  // ----------------------------------------------------------

  eventSeries.addPopupReminder(
    7 * 24 * 60
  );

  eventSeries.addPopupReminder(
    24 * 60
  );


  // ----------------------------------------------------------
  // Save Calendar Event ID
  // ----------------------------------------------------------

  saveEventIdToResponseSheet(
    response.getTimestamp(),
    eventSeries.getId(),
    firstName,
    lastName,
    email,
    birthDateValue
  );


  Logger.log(
    "Birthday successfully created for " +
    fullName
  );
}


// ============================================================
// SAVE CALENDAR EVENT ID IN FORM RESPONSE SHEET
// ============================================================

function saveEventIdToResponseSheet(
  responseTimestamp,
  eventId,
  firstName,
  lastName,
  email,
  birthDateValue
) {
  const spreadsheet =
    SpreadsheetApp.openById(RESPONSE_SPREADSHEET_ID);

  const sheet =
    spreadsheet.getSheetByName(RESPONSE_SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'Sheet "' + RESPONSE_SHEET_NAME + '" was not found.'
    );
  }

  sheet.getRange(1, 12).setValue("Calendar Event ID");

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rows =
    sheet.getRange(2, 1, lastRow - 1, 12).getValues();

  const normalize = value =>
    String(value || "").trim().toLowerCase();

  const submittedBirthday = parseBirthday(birthDateValue);

  if (!submittedBirthday) {
    Logger.log("Could not parse submitted birthday.");
    return;
  }

  const candidates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sheetTimestamp = row[0];
    const sheetBirthday = parseBirthday(row[4]);
    const existingId = String(row[11] || "").trim();

    if (
      !(sheetTimestamp instanceof Date) ||
      !(responseTimestamp instanceof Date) ||
      !sheetBirthday
    ) {
      continue;
    }

    const difference = Math.abs(
      sheetTimestamp.getTime() -
      responseTimestamp.getTime()
    );

    const samePerson =
      normalize(row[1]) === normalize(firstName) &&
      normalize(row[2]) === normalize(lastName) &&
      normalize(row[3]) === normalize(email);

    const sameBirthday =
      sheetBirthday.getMonth() === submittedBirthday.getMonth() &&
      sheetBirthday.getDate() === submittedBirthday.getDate();

    const isUnlinked =
      existingId === "" || existingId === "0";

    if (
      difference <= 5 * 60 * 1000 &&
      samePerson &&
      sameBirthday &&
      isUnlinked
    ) {
      candidates.push({
        rowNumber: i + 2,
        difference: difference
      });
    }
  }

  if (candidates.length === 0) {
    Logger.log(
      "No matching unlinked response row found for " +
      firstName + " " + lastName
    );
    return;
  }

  candidates.sort((a, b) =>
    a.difference - b.difference ||
    b.rowNumber - a.rowNumber
  );

  const targetRow = candidates[0].rowNumber;
  sheet.getRange(targetRow, 12).setValue(eventId);

  Logger.log(
    "Calendar Event ID saved to row " + targetRow
  );
}


// ============================================================
// INSTALL GOOGLE FORM TRIGGER
// ============================================================

function setupFormSubmitTrigger() {

  const form =
    FormApp.openById(FORM_ID);


  // Remove existing birthday triggers
  const triggers =
    ScriptApp.getProjectTriggers();


  for (const trigger of triggers) {

    if (
      trigger.getHandlerFunction() ===
      "processBirthdaySubmission"
    ) {

      ScriptApp.deleteTrigger(trigger);
    }
  }


  // Create trigger directly on the Google Form
  ScriptApp.newTrigger(
    "processBirthdaySubmission"
  )
    .forForm(form)
    .onFormSubmit()
    .create();


  Logger.log(
    "Google Form submission trigger created successfully."
  );
}


// ============================================================
// BIRTH DATE PARSER
// ============================================================

function parseBirthday(value) {

  // Google Sheets / Forms may provide a Date object
  if (
    Object.prototype.toString.call(value) ===
      "[object Date]" &&
    !isNaN(value.getTime())
  ) {

    return new Date(
      2000,
      value.getMonth(),
      value.getDate()
    );
  }


  let text =
    String(value)
      .trim()
      .toLowerCase();


  if (!text) {
    return null;
  }


  // Remove 1st, 2nd, 3rd, 4th, etc.
  text =
    text.replace(
      /(\d+)(st|nd|rd|th)/g,
      "$1"
    );


  // Try normal JavaScript date parsing first.
  // This handles values such as:
  // 9/19/2000
  // 09/19/2000
  // September 19, 2000

  const parsed =
    new Date(text);


  if (!isNaN(parsed.getTime())) {

    return new Date(
      2000,
      parsed.getMonth(),
      parsed.getDate()
    );
  }


  // Normalize separators
  text =
    text.replace(/[\/\-.]/g, " ");


  text =
    text.replace(/,/g, " ");


  text =
    text.replace(/\s+/g, " ").trim();


  const months = {

    january: 0,
    jan: 0,

    february: 1,
    feb: 1,

    march: 2,
    mar: 2,

    april: 3,
    apr: 3,

    may: 4,

    june: 5,
    jun: 5,

    july: 6,
    jul: 6,

    august: 7,
    aug: 7,

    september: 8,
    sep: 8,
    sept: 8,

    october: 9,
    oct: 9,

    november: 10,
    nov: 10,

    december: 11,
    dec: 11
  };


  const parts =
    text.split(" ");


  let day = null;
  let month = null;


  // Look for month name
  for (const part of parts) {

    if (
      Object.prototype.hasOwnProperty.call(
        months,
        part
      )
    ) {

      month =
        months[part];
    }
  }


  const numbers =
    parts
      .filter(part => /^\d+$/.test(part))
      .map(part => parseInt(part, 10));


  if (month !== null) {

    for (const number of numbers) {

      if (
        number >= 1 &&
        number <= 31
      ) {

        day = number;
        break;
      }
    }

  } else if (numbers.length >= 2) {

    /*
      For numeric dates where JavaScript couldn't
      parse the value, use day/month if the first
      number is greater than 12.

      Otherwise use month/day.
    */

    if (
      numbers[0] > 12 &&
      numbers[1] <= 12
    ) {

      day = numbers[0];
      month = numbers[1] - 1;

    } else {

      month = numbers[0] - 1;
      day = numbers[1];
    }
  }


  if (
    day === null ||
    month === null ||
    day < 1 ||
    day > 31 ||
    month < 0 ||
    month > 11
  ) {

    return null;
  }


  return new Date(
    2000,
    month,
    day
  );
}

const BIRTHDAY_POST_EMAIL = "YOUR_REMINDER_RECIPIENT_EMAIL";

function sendBirthdayPostReminders() {

  const calendar =
    CalendarApp.getCalendarById(CALENDAR_ID);

  if (!calendar) {
    throw new Error(
      "The configured Google Calendar could not be accessed."
    );
  }

  const spreadsheet =
    SpreadsheetApp.openById(
      RESPONSE_SPREADSHEET_ID
    );

  const sheet =
    spreadsheet.getSheetByName(
      RESPONSE_SHEET_NAME
    );

  if (!sheet) {
    throw new Error(
      'Sheet "' +
      RESPONSE_SHEET_NAME +
      '" was not found.'
    );
  }


  // ----------------------------------------------------------
  // Make sure tracking headers exist
  // ----------------------------------------------------------

  sheet.getRange("N1")
    .setValue("7-Day Reminder Sent");

  sheet.getRange("O1")
    .setValue("1-Day Reminder Sent");


  const today = new Date();

  const currentYear =
    today.getFullYear();


  // ----------------------------------------------------------
  // Check birthdays 7 days from today
  // ----------------------------------------------------------

  checkBirthdayReminder(
    calendar,
    sheet,
    7,
    14
  );


  // ----------------------------------------------------------
  // Check birthdays 1 day from today
  // ----------------------------------------------------------

  checkBirthdayReminder(
    calendar,
    sheet,
    1,
    15
  );
}

function checkBirthdayReminder(
  calendar,
  sheet,
  daysAhead,
  trackingColumn
) {
  const today = new Date();

  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + daysAhead);

  const events = calendar.getEventsForDay(targetDate);

  if (events.length === 0) return;

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return;

  const data =
    sheet.getRange(2, 1, lastRow - 1, 15).getValues();

  events.forEach(function(event) {

    const title = event.getTitle();

    if (!title.startsWith("🎂 Birthday –")) {
      return;
    }

    const eventId = event.getId();

    let matchingRow = -1;

    // Match using Calendar Event ID in column L
    for (let i = 0; i < data.length; i++) {

      const savedEventId =
        String(data[i][11] || "").trim();

      if (savedEventId === eventId) {
        matchingRow = i + 2;
        break;
      }
    }

    if (matchingRow === -1) {

      Logger.log(
        "Could not find Form Response for Calendar Event ID: " +
        eventId
      );

      return;
    }

    const firstName =
      String(data[matchingRow - 2][1] || "").trim();

    const lastName =
      String(data[matchingRow - 2][2] || "").trim();

    const birthdayName =
      (firstName + " " + lastName).trim();

    if (!birthdayName) {
      Logger.log(
        "No name found for Calendar Event ID: " +
        eventId
      );

      return;
    }

    const trackingCell =
      sheet.getRange(
        matchingRow,
        trackingColumn
      );

const sentValue =
  trackingCell.getValue();

let sentYear = "";

if (
  sentValue instanceof Date &&
  !isNaN(sentValue.getTime())
) {
  sentYear =
    String(sentValue.getFullYear());

} else if (sentValue) {

  sentYear =
    String(sentValue)
      .substring(0, 4);
}

const birthdayYear =
  String(targetDate.getFullYear());

const alreadySent =
  sentYear === birthdayYear;

if (alreadySent) {

  Logger.log(
    daysAhead +
    "-day reminder already sent for " +
    birthdayName +
    " in " +
    birthdayYear
  );

  return;
}

    const birthdayDate =
      Utilities.formatDate(
        targetDate,
        Session.getScriptTimeZone(),
        "EEEE, dd MMMM yyyy"
      );

    const birthdayPost =
      "🎉 HAPPY BIRTHDAY! 🎂\n\n" +
      "Today we celebrate " +
      birthdayName +
      " on their special day.\n\n" +
      "May God continue to bless you, " +
      "guide you and strengthen you as " +
      "you begin another year of life.\n\n" +
      "We pray that this new year will be " +
      "filled with God's grace, joy, peace " +
      "and many blessings.\n\n" +
      "Happy Birthday! 🎂🎉🙏\n\n" +
      "Your Community";

    let subject;

    if (daysAhead === 7) {

      subject =
        "🎂 Birthday Post – 7 Days – " +
        birthdayName;

    } else {

      subject =
        "⏰ Birthday Tomorrow – " +
        birthdayName;
    }

    let message;

    if (daysAhead === 7) {

      message =
        "Hello,\n\n" +
        "This is a 7-day birthday-post " +
        "reminder from your community.\n\n" +
        "🎂 BIRTHDAY\n" +
        "Name: " + birthdayName + "\n" +
        "Date: " + birthdayDate + "\n\n" +
        "Please prepare the birthday post " +
        "for the church group.\n\n";

    } else {

      message =
        "Hello,\n\n" +
        "This is the final birthday-post " +
        "reminder from your community.\n\n" +
        "⏰ BIRTHDAY TOMORROW\n" +
        "Name: " + birthdayName + "\n" +
        "Date: " + birthdayDate + "\n\n" +
        "Please review and post the birthday " +
        "message tomorrow.\n\n";
    }

    message +=
      "━━━━━━━━━━━━━━━━━━━━\n" +
      "SUGGESTED POST\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      birthdayPost +
      "\n\n" +
      "━━━━━━━━━━━━━━━━━━━━\n\n" +
      "Thank you.\n" +
      "Your Community";

    MailApp.sendEmail(
      BIRTHDAY_POST_EMAIL,
      subject,
      message
    );

    trackingCell.setValue(
      Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyy-MM-dd HH:mm"
      )
    );

    Logger.log(
      daysAhead +
      "-day reminder sent for " +
      birthdayName
    );
  });
}

function addSelectedBirthdayToCalendar() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet()
      .getActiveSheet();

  if (sheet.getName() !== RESPONSE_SHEET_NAME) {
    throw new Error(
      'Please select a row in "Form Responses 1".'
    );
  }

  const row =
    sheet.getActiveRange().getRow();

  if (row < 2) {
    throw new Error(
      "Please select a birthday row, not the header."
    );
  }

  const firstName =
    String(sheet.getRange(row, 2).getValue() || "").trim();

  const lastName =
    String(sheet.getRange(row, 3).getValue() || "").trim();

  const birthDateValue =
    sheet.getRange(row, 5).getValue();

  const existingEventId =
    String(sheet.getRange(row, 12).getValue() || "").trim();

  if (!firstName) {
    throw new Error("First Name is missing.");
  }

  if (!birthDateValue || birthDateValue === "-") {
    throw new Error("Birth Date is missing.");
  }

  if (existingEventId && existingEventId !== "0") {
    Logger.log(
      "This row already has a Calendar Event ID: " +
      existingEventId
    );
    return;
  }

  const birthday =
    parseBirthday(birthDateValue);

  if (!birthday) {
    throw new Error(
      "The Birth Date could not be understood."
    );
  }

  const calendar =
    CalendarApp.getCalendarById(CALENDAR_ID);

  if (!calendar) {
    throw new Error(
      "The configured Google Calendar could not be accessed."
    );
  }

  const fullName =
    (firstName + " " + lastName).trim();

  const title =
    "🎂 Birthday – " + fullName;

  const year =
    new Date().getFullYear();

  const birthdayThisYear =
    new Date(
      year,
      birthday.getMonth(),
      birthday.getDate()
    );

  const birthdayNextYear =
    new Date(
      year + 1,
      birthday.getMonth(),
      birthday.getDate()
    );

  const existingEvents =
    calendar.getEventsForDay(birthdayThisYear)
      .concat(
        calendar.getEventsForDay(birthdayNextYear)
      );

  for (const event of existingEvents) {

    if (
      event.getTitle().toLowerCase() ===
      title.toLowerCase()
    ) {

      sheet.getRange(row, 12)
        .setValue(event.getId());

      Logger.log(
        "Existing birthday found and linked: " +
        fullName
      );

      return;
    }
  }

  const event =
  calendar.createAllDayEventSeries(
    title,
    birthday,
    CalendarApp.newRecurrence()
      .addYearlyRule()
  );

  event.addPopupReminder(7 * 24 * 60);
  event.addPopupReminder(24 * 60);

  sheet.getRange(row, 12)
    .setValue(event.getId());

  Logger.log(
    "Birthday added to calendar and linked: " +
    fullName
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("🎂 Birthday Tools")
    .addItem(
      "Add selected birthday to Calendar",
      "addSelectedBirthdayToCalendar"
    )
    .addItem(
      "Sync selected birthday",
      "syncSelectedBirthday"
    )
    .addToUi();
}

function setupSpreadsheetOpenTrigger() {

  const spreadsheet =
    SpreadsheetApp.openById(
      RESPONSE_SPREADSHEET_ID
    );

  const triggers =
    ScriptApp.getProjectTriggers();

  for (const trigger of triggers) {

    if (
      trigger.getHandlerFunction() ===
      "onOpen"
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger("onOpen")
    .forSpreadsheet(spreadsheet)
    .onOpen()
    .create();

  Logger.log(
    "Spreadsheet open trigger created successfully."
  );
}

function syncSelectedBirthday() {

  const sheet =
    SpreadsheetApp.getActiveSpreadsheet()
      .getActiveSheet();

  if (sheet.getName() !== RESPONSE_SHEET_NAME) {
    throw new Error(
      'Please select a row in "Form Responses 1".'
    );
  }

  const row =
    sheet.getActiveRange().getRow();

  if (row < 2) {
    throw new Error(
      "Please select a birthday row, not the header."
    );
  }

  const firstName =
    String(
      sheet.getRange(row, 2).getValue() || ""
    ).trim();

  const lastName =
    String(
      sheet.getRange(row, 3).getValue() || ""
    ).trim();

  const birthDateValue =
    sheet.getRange(row, 5).getValue();

  const eventId =
    String(
      sheet.getRange(row, 12).getValue() || ""
    ).trim();

  if (!firstName) {
    throw new Error("First Name is missing.");
  }

  if (!birthDateValue || birthDateValue === "-") {
    throw new Error("Birth Date is missing.");
  }

  if (!eventId || eventId === "0") {
    throw new Error(
      "This person has no Calendar Event ID. Use 'Add selected birthday to Calendar' first."
    );
  }

  const birthday =
    parseBirthday(birthDateValue);

  if (!birthday) {
    throw new Error(
      "The Birth Date could not be understood."
    );
  }

  const calendar =
    CalendarApp.getCalendarById(CALENDAR_ID);

  if (!calendar) {
    throw new Error(
      "The configured Google Calendar could not be accessed."
    );
  }

  const event =
    calendar.getEventSeriesById(eventId);

  if (!event) {
    throw new Error(
      "The Calendar birthday event could not be found."
    );
  }

  const currentYear =
    new Date().getFullYear();

  const currentEvent =
    calendar.getEventsForDay(
      new Date(
        currentYear,
        birthday.getMonth(),
        birthday.getDate()
      )
    );

  const fullName =
    (firstName + " " + lastName).trim();

  const newTitle =
    "🎂 Birthday – " + fullName;

  /*
   * First check whether the existing
   * recurring event already has the
   * correct birthday date.
   */

  let dateAlreadyCorrect = false;

  for (const item of currentEvent) {

    if (item.getId() === eventId) {
      dateAlreadyCorrect = true;
      break;
    }
  }

  if (dateAlreadyCorrect) {

    event.setTitle(newTitle);

    Logger.log(
      "Birthday date already correct. " +
      "Calendar title synchronized for " +
      fullName
    );

    return;
  }

  /*
   * The birthday date has changed.
   *
   * Delete the old recurring series
   * and create a new annual series.
   */

  event.deleteEventSeries();

  const newEvent =
  calendar.createAllDayEventSeries(
    newTitle,
    birthday,
    CalendarApp.newRecurrence()
      .addYearlyRule()
  );

  newEvent.addPopupReminder(
    7 * 24 * 60
  );

  newEvent.addPopupReminder(
    24 * 60
  );

  sheet.getRange(row, 12)
    .setValue(newEvent.getId());

  Logger.log(
    "Birthday date changed and Calendar event recreated for " +
    fullName
  );
}