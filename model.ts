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

/*

Students

*/

let STUDENTS_FIRST_ROW = 2;
let FIRST_PA_COLUMN = STUDENTS.fields.length + 1;

/*
to be refactored using getData_
Problem: has the pa flags that are generated by other functions
These flags need to be updated dynamically by examining the responses sheet of the
respective pa.
*/
function getAllStudents(): Student[] {
  var sheet = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (sheet == null) {
    sheetLog("getAllStudents: Sheet not found: " + STUDENTS.sheet);
    return [];
  }
  var values = sheet.getDataRange().getValues();
  var heading = values.shift();
  if (heading == null) {
    sheetLog("getAllStudents: No heading found in sheet: " + STUDENTS.sheet);
    return [];
  }
  var students = [];

  for (var index = 0; index < values.length; index++) {
    var value = values[index];
    var lastCol = value.length;
    let student: Student = {
      fname: value[0],
      lname: value[1],
      email: value[2],
      projectkey: value[3],
      personalkey: value[4],
      verified: value[5],
      submittedpa: {},
    };
    if (student.email == "") break;

    for (var col = FIRST_PA_COLUMN; col <= lastCol; col++) {
      var key = heading[col - 1];
      var val = value[col - 1];
      student.submittedpa[key] = val;
    }

    students.push(student);
  }
  return students;
}

function addStudent(reg: Student) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("addStudent: Sheet not found: " + STUDENTS.sheet);
    return;
  }
  ss.appendRow([
    reg.fname,
    reg.lname,
    reg.email,
    reg.projectkey,
    reg.personalkey,
    reg.verified,
  ]);
}

function saveStudent(student: Row<Student>) {
  var row = student.row;
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("saveStudent: Sheet not found: " + STUDENTS.sheet);
    return;
  }
  var data = student.data;
  var values = [
    data.fname,
    data.lname,
    data.email,
    data.projectkey,
    data.personalkey,
    data.verified,
  ];
  ss.getRange(row, 1, 1, values.length).setValues([values]);
}

function getStudent(email: string): Row<Student> | null {
  var students = getAllStudents();
  for (var i = 0; i < students.length; i++) {
    if (students[i].email == email) {
      var student = students[i];
      return { data: student, row: i + STUDENTS_FIRST_ROW };
    }
  }
  return null;
}

function getStudents(group: string): Student[] {
  return getAllStudents().filter(function (s) {
    return s.projectkey == group;
  });
}

function getGroup(studentEmail: string): string | null {
  var student = getStudent(studentEmail);
  if (student == null) return null;
  return student.data.projectkey;
}

function studentsHeading(): string[] {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("studentsHeading: Sheet not found: " + STUDENTS.sheet);
    return [];
  }
  var heading = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues();
  return heading[0];
}

function getStudentPAColumn_(pakey: string): number {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("getStudentPAColumn_: Sheet not found: " + STUDENTS.sheet);
    return 0;
  }
  var heading = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues();
  Logger.log(heading);
  Logger.log("heading " + heading[0] + " " + heading[0].length);
  for (var i = 0; i < heading[0].length; i++) {
    if (heading[0][i] == pakey) {
      return i + 1;
    }
  }
  return 0;
}

function addColumnToStudent(pakey: string): number {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("addColumnToStudent: Sheet not found: " + STUDENTS.sheet);
    return 0;
  }
  var col = ss.getLastColumn() + 1;
  ss.getRange(1, ss.getLastColumn() + 1).setValue(pakey);
  return col;
}

function setStudentSubmittedPA(
  student: Row<Student>,
  pakey: string,
  enabled: boolean,
) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("setStudentSubmittedPA: Sheet not found: " + STUDENTS.sheet);
    return;
  }
  var col = getStudentPAColumn_(pakey);
  if (col == 0) {
    col = addColumnToStudent(pakey);
  }

  ss.getRange(student.row, col).setValue(enabled);
}

function sortStudents() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (sheet == null) {
    sheetLog("sortStudents: Sheet not found: " + STUDENTS.sheet);
    return;
  }
  sheet
    .getDataRange()
    .offset(1, 0)
    .sort([
      { column: 4, ascending: true },
      { column: 2, ascending: true },
    ]);
}

function setStudentVerified(student: Row<Student>, enabled: boolean) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  if (ss == null) {
    sheetLog("setStudentVerified: Sheet not found: " + STUDENTS.sheet);
    return;
  }
  ss.getRange(student.row, 6).setValue(enabled);
}

/**
 * Returns the number of students in projectkey who submitted the pakey
 *
 * @param projectkey
 * @param pakey
 */
function numStudentsSubmitted(projectkey: string, pakey: string): number {
  var st = getStudents(projectkey).filter(function (s) {
    return s.submittedpa[pakey] == true;
  });
  return st.length;
}

/*

Projects

*/

function addProject(proj: Project) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PROJECTS.sheet);
  if (ss == null) {
    sheetLog("addProject: Sheet not found: " + PROJECTS.sheet);
    return;
  }
  ss.appendRow([proj.name, proj.key]);
}

function getProjectRows() {
  return getRows_<Project>(PROJECTS);
}

function getProjects(): Project[] {
  return getData_<Project>(PROJECTS);
}

function isProjectkey(projectkey: string): boolean {
  var projects = getData_<Project>(PROJECTS);

  for (var p = 0; p < projects.length; p++) {
    if (projects[p].key == projectkey) return true;
  }
  return false;
}

function getProjectKeys(): string[] {
  return getProjectRows().map((row) => row.data.key);
}

/*

Grades per pa, project

*/

let PA_FIRST_ROW = 2;

function deletePALinks() {
  var sp = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  if (sp == null) {
    sheetLog("deletePALinks: Sheet not found: " + PA_PROJECTS.sheet);
    return;
  }
  var c1 = getSheetColumn_(PA_PROJECTS, "formId");
  var c2 = getSheetColumn_(PA_PROJECTS, "formURL");
  var numRows = sp.getLastRow() - 1;

  if (numRows > 0) {
    sp.getRange(2, c1, numRows).clearContent();
    sp.getRange(2, c2, numRows).clearContent();
  }
}

function getSheetColumn_(sheet: Sheet, colName: string): number {
  for (var i = 0; i < sheet.fields.length; i++) {
    if (sheet.fields[i] == colName) {
      return i + 1;
    }
  }
  return 0;
}

function getPaProjects(): Row<PaProject>[] {
  return getRows_<PaProject>(PA_PROJECTS);
}

function getPaProject(paid: string, projectkey: string): Row<PaProject> | null {
  var pps = getPaProjects().filter(
    (pp) => pp.data.pakey == paid && pp.data.projectkey == projectkey,
  );
  if (pps.length == 1) {
    return pps[0];
  }
  if (pps.length > 1) {
    throw new Error(
      "More than one entries in the " +
        PA_PROJECTS.sheet +
        " sheet have same " +
        paid +
        " and " +
        projectkey +
        " keys!",
    );
  }
  return null;
}

function getGroupGrade(paid: string, projectkey: string): number | null {
  var pp = getPaProject(paid, projectkey);
  if (pp == null) {
    return null;
  }
  return pp.data.grade;
}

function addPaProject(paid: string, projectkey: string) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  if (sheet == null) {
    sheetLog("addPaProject: Sheet not found: " + PA_PROJECTS.sheet);
    return null;
  }
  sheet.appendRow([paid, projectkey]);
  return getPaProject(paid, projectkey);
}

function savePeerAssessmentLinks(
  paid: string,
  projectkey: string,
  form: GoogleAppsScript.Forms.Form,
) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  if (sheet == null) {
    sheetLog("savePeerAssessmentLinks: Sheet not found: " + PA_PROJECTS.sheet);
    return;
  }
  var pp = getPaProject(paid, projectkey);
  if (pp == null) {
    sheetLog("Not found: " + paid + "," + projectkey);
    pp = addPaProject(paid, projectkey);
    if (pp == null) {
      sheetLog("Failed to add PA, Proj: " + paid + "," + projectkey);
      return;
    }
    sheetLog("PA, Proj added: " + paid + "," + projectkey);
  }

  sheet.getRange(pp.row, 5).setValue(form.getId());
  sheet.getRange(pp.row, 6).setValue(form.getPublishedUrl());
}

function getProjectkeyFromFormId(paFormId: string) {
  var pps = getPaProjects();

  for (var p = 0; p < pps.length; p++) {
    if (pps[p].data.formId == paFormId) return pps[p].data.projectkey;
  }
  return null;
}

function getPaProjectFromFormId(paFormId: string): Row<PaProject> | null {
  var pps = getPaProjects();

  for (var p = 0; p < pps.length; p++) {
    if (pps[p].data.formId == paFormId) return pps[p];
  }
  return null;
}

/*

Peer assessments

States: inactive -> open -> closed -> finished

*/

PA_FIRST_ROW = 2;

function addPa(reg: PeerAssessment) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (ss == null) {
    sheetLog("addPa: Sheet not found: " + PAS.sheet);
    return;
  }
  ss.appendRow([reg.name, reg.id, reg.deadline, reg.state]);
}

function readPA(row: number): PeerAssessment | null {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (ss == null) {
    sheetLog("readPA: Sheet not found: " + PAS.sheet);
    return null;
  }
  if (row > ss.getLastRow()) return null;
  var read = ss.getRange(row, 1, 1, 4).getValues();
  var values = read[0];
  var pa: PeerAssessment = {
    name: values[0],
    id: values[1],
    deadline: values[2],
    state: values[3],
  };
  return pa;
}

function getPAs(): PeerAssessment[] {
  return getData_<PeerAssessment>(PAS);
}

function getPA(paId: string) {
  var pas = getPAs().filter(function (p) {
    return p.id == paId;
  });
  if (pas.length > 0) return pas[0];

  return null;
}

function setState(pa: PeerAssessment, newState: PaState) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (ss == null) {
    sheetLog("setState: Sheet not found: " + PAS.sheet);
    return;
  }
  var last = ss.getLastRow();
  for (var row = PA_FIRST_ROW; row <= last; row++) {
    var paRow = readPA(row);
    if (paRow == null) continue;
    if (paRow.id == pa.id) {
      ss.getRange(row, 4).setValue(newState);
      return;
    }
  }
}

function getFinalSheetName(pa: PeerAssessment) {
  return "Final PA: " + pa.id;
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

function prepareFinalSheet(pa: PeerAssessment) {
  var sp = SpreadsheetApp.getActive();
  sp.insertSheet(getFinalSheetName(pa), sp.getNumSheets() + 1);
  var sh = sp.getSheetByName(getFinalSheetName(pa));
  if (sh == null) {
    sheetLog("prepareFinalSheet: Sheet not found: " + getFinalSheetName(pa));
    return;
  }
  sh.appendRow(["proj", "name", "email", "Grade", "Penalty", "PA score"]);
}

/**
 * Fetches raw responses from a Google Form and converts ItemResponse objects
 * to plain data (strings / string arrays).
 *
 * This is the infrastructure boundary: all FormApp API calls for response
 * retrieval are isolated here so that paalg.ts remains free of Google API calls.
 *
 * @param formId  The Google Form ID
 * @param domain  true to read respondent email from session; false when email is a text field
 */
function getFormResponses(
  formId: string,
  domain: boolean,
): { emails: string[]; responses: Array<Array<string | string[]>> } {
  const form = FormApp.openById(formId);
  const formResponses = form.getResponses();
  const responses: Array<Array<string | string[]>> = [];
  const emails: string[] = [];

  for (let i = 0; i < formResponses.length; i++) {
    const formResponse = formResponses[i];
    emails[i] = domain ? formResponse.getRespondentEmail() : "";
    Logger.log("getFormResponses respondent email: " + emails[i]);

    const itemResponses = formResponse.getItemResponses();
    responses[i] = [];
    for (let j = 0; j < itemResponses.length; j++) {
      responses[i][j] = itemResponses[j].getResponse() as string | string[];
    }
    Logger.log("getFormResponses responses: " + responses[i]);
  }

  return { emails, responses };
}
