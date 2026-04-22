let PROJECTS: Sheet = {
  sheet: "Projects",
  columns: [
    fillWithUnderScore("NAME", 20),
    fillWithUnderScore("KEY", 20),
    "No of Students",
    "No of Verified Students",
  ],
  fields: ["name", "key", "noStudents", "noVerifiedStudents"],
  hidden: false,
  protected: true,
  unprotected: "A2:B",
};

let STUDENTS: Sheet = {
  sheet: "Students",
  columns: [
    fillWithUnderScore("FIRST NAME", 15),
    fillWithUnderScore("LAST NAME", 15),
    fillWithUnderScore("EMAIL", 35),
    fillWithUnderScore("PROJECT KEY", 20),
    "PERSONAL KEY",
    "VERIFIED",
  ],
  fields: ["fname", "lname", "email", "projectkey", "personalkey", "verified"],
  hidden: false,
  protected: true,
  unprotected: "A2:D",
};

let PAS: Sheet = {
  sheet: "Peer Assessments",
  columns: [
    fillWithUnderScore("NAME", 20),
    fillWithUnderScore("KEY", 15),
    "DEADLINE (YYYY-MM-DD HH:MM)",
    "STATE",
  ],
  fields: ["name", "id", "deadline", "state"],
  hidden: false,
  protected: true,
  unprotected: "A2:C",
};

let PA_PROJECTS: Sheet = {
  sheet: "PAs Projects",
  columns: [
    "PEER ASSESSMENT KEY",
    "PROJECT KEY",
    "GROUP GRADE",
    "",
    "FORM ID",
    "FORM URL",
  ],
  fields: ["pakey", "projectkey", "grade", "", "formId", "formURL"],
  hidden: false,
  protected: true,
  unprotected: "C2:C",
};

let QUESTIONS: Sheet = {
  sheet: "Questions",
  columns: ["QUESTION"],
  fields: ["question"],
  hidden: false,
  protected: true,
  unprotected: "A2:A",
};

let SETTINGS: Sheet = {
  sheet: "Settings",
  columns: ["PARAMETER", "KEY", "VALUE"],
  fields: ["PARAMETER", "KEY", "VALUE"],
  hidden: false,
  protected: true,
  unprotected: "C2:C",
};

let LINKS: Sheet = {
  sheet: "Links",
  columns: ["FORM", "URL", "ID"],
  fields: ["formName", "url", "id"],
  hidden: true,
  protected: true,
  unprotected: "",
};

let LOG: Sheet = {
  sheet: "LOG",
  fields: ["event", "date"],
  columns: [],
  hidden: true,
  protected: true,
  unprotected: "",
};

let SHEETS = [
  STUDENTS,
  PROJECTS,
  PAS,
  PA_PROJECTS,
  QUESTIONS,
  SETTINGS,
  LINKS,
  LOG,
];

/**
 * Reads the data from any model sheet. Ignores the heading.
 * Returns an array of objects using the fields as attributes.
 *
 * Stops reading if no values in any field.
 *
 * @param sheetModel
 */
function getData_<T>(sheetModel: Sheet): T[] {
  let sp = SpreadsheetApp.getActive().getSheetByName(sheetModel.sheet);
  if (sp == null) {
    sheetLog("Sheet not found: " + sheetModel.sheet);
    return [];
  }
  let values = sp.getDataRange().getValues();
  values.shift();
  let entries: T[] = [];
  for (let value of values) {
    let entry: any = {};
    var isData = false;

    for (let c = 0; c < value.length; c++) {
      /*
      skip a field if is empty. Used for empty columns in spreadsheet.
      */
      if (sheetModel.fields[c] == "") {
        continue;
      }
      if (value[c] != "") {
        isData = true;
      }
      entry[sheetModel.fields[c]] = value[c];
    }
    if (!isData) {
      break;
    }
    entries.push(<T>entry);
  }
  return entries;
}

/**
 * getRows<T> returns the entries in the sheet as
 * an array of objects of type T.
 * By default is starts reading on the 2nd row.
 *
 * @param sheet
 * @param firstDataRow First row of data (default 2)
 */
function getRows_<T>(sheet: Sheet, firstDataRow = 2): Row<T>[] {
  let i = firstDataRow;
  return getData_<T>(sheet).map(function (entry) {
    return { data: entry, row: i++ };
  });
}

/*

Questions

*/

function installQuestions() {
  var setSh = SpreadsheetApp.getActive().getSheetByName(QUESTIONS.sheet);
  if (setSh == null) {
    sheetLog("Sheet not found: " + QUESTIONS.sheet);
    return;
  }
  var values = [
    ["Completed an equal (or even more) share of work."],
    ["Produced high quality work."],
    [
      "Work performed was very useful and contributed significantly to the final product.",
    ],
    ["Was very positive and pleasant to work with (excellent partner)."],
    [
      "Was extremely eager to plan and execute tasks and the project as a whole.",
    ],
    [
      "Took a leadership role organizing others, encouraging group participation, supporting when necessary and solving problems.",
    ],
    [
      "Routinely monitored the effectiveness of the group and made suggestions to make it more effective.",
    ],
    ["Took active role on initiating ideas or actions."],
    [
      "Respected differences of opinions and backgrounds. Was willing to negotiate and compromise when necessary.",
    ],
    ["Was willing to work with others for the purpose of the group success."],
    [
      "Routinely used time well throughout the project to ensure things get done on time and met deadlines and responsibilities.",
    ],
    [
      "Always appeared for group-work. Was present at project meetings and teamwork.",
    ],
  ];
  setSh.getRange(2, 1, values.length, 1).setValues(values);
  setSh.autoResizeColumns(1, 1);
}

function getQuestions(): string[] {
  return getData_<any>(QUESTIONS).map(function (q) {
    return q.question;
  });
}

function getSheetColumn_(sheet: Sheet, colName: string): number {
  for (var i = 0; i < sheet.fields.length; i++) {
    if (sheet.fields[i] == colName) {
      return i + 1;
    }
  }
  return 0;
}

/*

Links

*/
function getLinks() {
  return getData_<any>(LINKS).reduce(function (object, s) {
    object[s.formName] = s.id;
    return object;
  }, {});
}

function setRegistrationLink(form: GoogleAppsScript.Forms.Form) {
  var linksSheet = SpreadsheetApp.getActive().getSheetByName(LINKS.sheet);
  if (linksSheet == null) {
    sheetLog("setRegistrationLink: Sheet not found: " + LINKS.sheet);
    return;
  }
  linksSheet.getRange("B2").setValue(form.getPublishedUrl());
  linksSheet.getRange("C2").setValue(form.getId());
  linksSheet.getRange("A2").setValue("Registration");
}

function getRegistrationFormId() {
  var links = getLinks();
  Logger.log("LINKS : " + links);
  return getLinks().Registration;
}

function getVerificationFormId() {
  return getLinks().Verification;
}

function deleteLinks() {
  var sp = SpreadsheetApp.getActive().getSheetByName(LINKS.sheet);
  if (sp == null) {
    sheetLog("deleteLinks: Sheet not found: " + LINKS.sheet);
    return;
  }
  var c1 = getSheetColumn_(LINKS, "url");
  var c2 = getSheetColumn_(LINKS, "id");
  var numRows = sp.getLastRow() - 1;

  sp.getRange(2, c1, numRows).clearContent();
  sp.getRange(2, c2, numRows).clearContent();
}

/*

Log

*/

function sheetLog(string: any) {
  var ss = SpreadsheetApp.getActive().getSheetByName(LOG.sheet);
  if (ss == null) {
    Logger.log("sheetLog: Sheet not found: " + LOG.sheet);
    return;
  }
  ss.appendRow([string]);
}

function logAllResponses_(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  var ss = SpreadsheetApp.getActive().getSheetByName(LOG.sheet);
  if (ss == null) {
    Logger.log("logAllResponses_: Sheet not found: " + LOG.sheet);
    return;
  }
  ss.appendRow([JSON.stringify(e), new Date()]);
}

/*

Settings

*/
function installSettings() {
  var setSh = SpreadsheetApp.getActive().getSheetByName(SETTINGS.sheet);
  if (setSh == null) {
    sheetLog("installSettings: Sheet not found: " + SETTINGS.sheet);
    return;
  }
  var values = [
    ["PA weight", "weight", 0.6],
    ["PA non-submission penalty", "penalty", 0.2],
    ["PA self-assessment calculated", "self", false],
    [
      "PA Reminder1 Send email X timeunits before the deadline",
      "reminder1",
      24,
    ],
    ["PA Reminder2 Send email X timeunits before the deadline", "reminder2", 6],
    ["Time unit for reminders (min/hour/day)", "timeunit", "hour"],
    ["Announce PA-score", "mailpa", false],
    ["Announce final grade", "mailgrade", false],
    [
      "Google Domain emails (do not need verifications and keys)",
      "domain",
      true,
    ],
  ];
  setSh.getRange(2, 1, values.length, 3).setValues(values);
  setSh.autoResizeColumns(1, 3);
}

function getSettings(): Settings {
  return getData_<any>(SETTINGS).reduce(function (object, s) {
    object[s.KEY] = s.VALUE;
    return object;
  }, {});
}
