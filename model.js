PROJECTS = {
  sheet: 'Projects',
  columns: ["NAME",	"KEY",	"No of Students",	"No of Verified Students"],
  fields: ["name", "key", "noStudents", "noVerifiedStudents"],
  hidden: false,
  protected: true,
  unprotected: 'A2:B'
}

STUDENTS = {
  sheet: 'Students',
  columns: ["FIRST NAME",	"LAST NAME",	"EMAIL",	"PROJECT KEY",	"PERSONAL KEY",	"VERIFIED"],
  fields: ["fname", "lname", "email", "projectkey", "personalkey", "verified"],
  hidden: false,
  protected: true,
  unprotected: 'A2:D'
}

PAS = {
  sheet: 'Peer Assessments',
  columns: ["NAME",	"KEY",	"DEADLINE",	"STATE"],
  fields: ["name", "id", "deadline", "state"],
  hidden: false,
  protected: true,
  unprotected: 'A2:C'
}

PA_PROJECTS = {
  sheet: 'PAs Projects',
  columns: ["PEER ASSESSMENT KEY",	"KEY	PROJECT KEY",	"GROUP GRADE",	"", "FORM ID", "FORM URL"],
  fields: ["pakey", "projectkey", "grade", "", "formId", "formURL"],
  hidden: false,
  protected: true,
  unprotected: 'C2:C'
}

QUESTIONS = {
  sheet: 'Questions',
  columns: ["QUESTION"],
  fields: ["question"],
  hidden: false,
  protected: true,
  unprotected: 'A2:A'
}

SETTINGS = {
  sheet: 'Settings',
  columns: ["PARAMETER", "KEY", "VALUE"],
  fields: ["PARAMETER", "KEY", "VALUE"],
  hidden: false,
  protected: true,
  unprotected: 'C2:C'
}

LINKS = {
  sheet: 'Links',
  columns: ["FORM" ,"URL", "ID"],
  fields: ["formName" ,"url", "id"],
  hidden: true,
  protected: true,
  unprotected: '',
}

LOG = {
  sheet: 'LOG',
  columns: [],
  hidden: true,
  protected: true,
  unprotected: '',
}

SHEETS = [STUDENTS, PROJECTS, PAS, PA_PROJECTS, QUESTIONS, SETTINGS, LINKS, LOG]


/*
reads the data from any model sheet. Ignores the heading.
 sheetModel should have:
  .sheet
  .fields
Returns an array of objects using the fields as attributes.
Stops reading if no values in any field.
*/
function getData_(sheetModel) {
  var sp = SpreadsheetApp.getActive().getSheetByName(sheetModel.sheet);
  var values = sp.getDataRange().getValues();
  var heading = values.shift();
  var entries = [];
  for(var i=0; i<values.length; i++) {
    var value = values[i]
    var entry = {};
    var isData = false;
    
    for(var c=0; c<value.length; c++) {
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
    entries[i] = entry;
  }
  return entries;
}


/*

Questions

*/

function getQuestions() {
  return getData_(QUESTIONS).map(function (q) {
    return q.question;
  });
}

/*

Students

*/

STUDENTS_FIRST_ROW = 2
FIRST_PA_COLUMN = STUDENTS.fields.length + 1

/*
to be refactored using getData_
Problem: has the pa flags that are generated by other functions
These flags need to be updated dynamically by examining the responses sheet of the 
respective pa.
*/
function getAllStudents() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  var values = sheet.getDataRange().getValues();
  var heading = values.shift();
  var students = [];

  for (var index=0; index < values.length; index++) {
    var value = values[index];
    var lastCol = value.length;
    var student = {
      fname: value[0], 
      lname: value[1],
      email: value[2],
      projectkey: value[3],
      personalkey: value[4],
      verified: value[5],
    }
    if (student.email == "") 
      break;

    student.submittedpa = {}

    for(var col=FIRST_PA_COLUMN; col <= lastCol; col++) {
      var key = heading[col-1];
      var val = value[col-1];
      student.submittedpa[key] = val;
    }    
    
    students.push(student); 
  }
  return students;
}

function addStudent(reg) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  ss.appendRow(
    [reg.fname, reg.lname, reg.email, reg.projectkey, reg.personalkey, false]
  )
}

function saveStudent(student) {
  var row = student.row
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  var data = student.data
  var values = 
    [data.fname, data.lname, data.email, data.projectkey, data.personalkey, data.verified];
  ss.getRange(row, 1, 1, values.length).setValues([values]);
}

function getStudent(email) {
  var students = getAllStudents()
  for(var i=0; i < students.length; i++) {
    if (students[i].email == email) {
      var student = students[i]
      return {data:student, row: i + STUDENTS_FIRST_ROW}
    }
  }
  return null;
}

function getStudents(group) {
  return getAllStudents()
    .filter(function (s) {
      return s.projectkey == group
    })
}

function getGroup(studentEmail) {
  var student = getStudent(studentEmail)
  if (student == null)
    return null
  return student.data.projectkey;
}

// function setStudentsSubmitted(enabled) {
//   var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
//   var last = ss.getLastRow()
//   for (s = STUDENTS_FIRST_ROW; s <= last; s++) {
//     ss.getRange(s, 7).setValue(enabled);
//   }
// }

function studentsHeading() {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  var heading = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues();
  return heading[0]
}

function getStudentPAColumn_(pakey) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  var heading = ss.getRange(1, 1, 1, ss.getLastColumn()).getValues();
  Logger.log(heading);
  Logger.log("heading " + heading[0] + " " + heading[0].length);
  for (var i=0; i < heading[0].length; i++) {
    if (heading[0][i] == pakey) {
      return i+1
    }
  }
  return 0
}

function addColumnToStudent(pakey) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  var col = ss.getLastColumn() + 1
  ss.getRange(1, ss.getLastColumn() + 1).setValue(pakey);
  return col
}

function setStudentSubmittedPA(student, pakey, enabled) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  var col = getStudentPAColumn_(pakey)
  if (col == 0) {
    col = addColumnToStudent(pakey)
  }
  
  ss.getRange(student.row, col).setValue(enabled)
}

function sortStudents() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet) 
  sheet.getDataRange()
    .offset(1, 0)
    .sort([{column: 4, ascending: true}, {column: 2, ascending: true}])
}

function setStudentVerified(student, enabled) {
  var ss = SpreadsheetApp.getActive().getSheetByName(STUDENTS.sheet);
  ss.getRange(student.row, 6).setValue(enabled)
}

/**
Returns the number of students in projectkey who submitted the pakey
*/

function numStudentsSubmitted(projectkey, pakey) {
  var st = getStudents(projectkey).filter( function(s) {
    return s.submittedpa[pakey] == true
  })
  return st.length;
}


/*

Projects

*/

PROJECTS_FIRST_ROW = 2

function getProjects() {
  var i = PROJECTS_FIRST_ROW;
  return getData_(PROJECTS).map(function(p) {
    return {data: {name: p.name, key: p.key}, row: i++}
  })
}

function isProjectkey(projectkey) {
  var projects = getData_(PROJECTS);
  
  for (var p=0; p < projects.length; p++) {
    if (projects[p].key == projectkey) 
      return true;
  }
  return false;
}


/*

Grades per pa, project

*/

PA_FIRST_ROW = 2

function deletePALinks() {
  var sp = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  var c1 = getSheetColumn_(PA_PROJECTS, "formId");
  var c2 = getSheetColumn_(PA_PROJECTS, "formURL");
  var numRows = sp.getLastRow() - 1;

  sp.getRange(2, c1, numRows).clearContent();
  sp.getRange(2, c2, numRows).clearContent();
}

function getSheetColumn_(sheet, colName) {
  for(var i=0; i < sheet.fields.length; i++) {
    if (sheet.fields[i] == colName) {
      return i+1;
    }
  }
  return 0;
}

function getPaProjects() {
  var i = PA_FIRST_ROW;
  return getData_(PA_PROJECTS).map(function(p) {
    return {data: p, row: i++}
  })
}

function getPaProject(paid, projectkey) {
  var pps = getPaProjects().filter(function(pp) {
    return pp.data.pakey == paid && pp.data.projectkey == projectkey
  });
  if (pps.length == 1) {
    return pps[0];
  }
  if (pps.length > 1) {
    throw new Error( "More than one entries in the " + PA_PROJECTS.sheet + " sheet have same " + paid + " and " +  projectkey + " keys!"); 
  }
  return null;
}

function getGroupGrade(paid, projectkey) {
  var pp = getPaProject(paid, projectkey); 
  if (pp == null) {
    return null;
  }
  return pp.data.grade;
}

function addPaProject(paid, projectkey) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  sheet.appendRow([paid, projectkey]);
  return getPaProject(paid, projectkey);
}

function savePeerAssessmentLinks(paid, projectkey, form) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  var pp = getPaProject(paid, projectkey)
  if (pp == null) {
    sheetLog("Not found: " + paid + "," + projectkey);
    pp = addPaProject(paid, projectkey);
    sheetLog("PA, Proj added: " + paid + "," + projectkey);
  }
    
  sheet.getRange(pp.row, 5).setValue(form.getId())
  sheet.getRange(pp.row, 6).setValue(form.getPublishedUrl())
}
  
function getProjectkeyFromFormId(paFormId) {
  var pps = getPaProjects();
  
  for (var p=0; p < pps.length; p++) {
    if (pps[p].data.formId == paFormId) 
      return pps[p].data.projectkey;
  }
  return null;
}

function getPaProjectFromFormId(paFormId) {
  var pps = getPaProjects();
  
  for (var p=0; p < pps.length; p++) {
    if (pps[p].data.formId == paFormId) 
      return pps[p];
  }
  return null;
}


/*

Peer assessments

States: inactive -> open -> closed -> finished

*/

PA_FIRST_ROW = 2

state = {
  INACTIVE: 'INACTIVE',
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  FINALIZED: 'FINALIZED'
}

function readPA(row) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (row > ss.getLastRow())
    return null;
  var read = ss.getRange(row, 1, 1, 4).getValues();
  var values = read[0];
  var pa = {
    name: values[0], 
    id: values[1],
    deadline: values[2],
    state: values[3]
  }
  return pa;
}

function getPAs() {
  return getData_(PAS);
}

function getPA(paId) {
  var pas = getPAs().filter(function (p) {
    return p.id == paId;
  })
  if (pas.length > 0)
    return pas[0]
   
  return null;
}

function setOpen(pa) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  var last = ss.getLastRow();
  for (var row = PA_FIRST_ROW; row <= last; row++) {
    if (readPA(row).id == pa.id) {
      ss.getRange(row, 4).setValue(state.OPEN);
      return;
    }
  }
}

function setClosed(pa) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  var last = ss.getLastRow();
  for (var row = PA_FIRST_ROW; row <= last; row++) {
    if (readPA(row).id == pa.id) {
      ss.getRange(row, 4).setValue(state.CLOSED);
      return;
    }
  }
}

function setState(pa, state) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  var last = ss.getLastRow();
  for (var row = PA_FIRST_ROW; row <= last; row++) {
    if (readPA(row).id == pa.id) {
      ss.getRange(row, 4).setValue(state);
      return;
    }
  }
}

function getFinalSheetName(pa) {
  return "Final PA: " + pa.id;
}
/*

Links

*/
function getLinks() {
  return getData_(LINKS).reduce(function(object, s) {
    object[s.formName] = s.id;
    return object;
  }, {});
}

function setRegistrationLink(form) {
  var linksSheet = SpreadsheetApp.getActive().getSheetByName(LINKS.sheet);
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
  var c1 = getSheetColumn_(LINKS, "url");
  var c2 = getSheetColumn_(LINKS, "id");
  var numRows = sp.getLastRow() - 1;

  sp.getRange(2, c1, numRows).clearContent();
  sp.getRange(2, c2, numRows).clearContent();
}

/*

Log

*/

function sheetLog(string) {
  var ss = SpreadsheetApp.getActive().getSheetByName(LOG.sheet)
  ss.appendRow([string])
}
                 
function logAllResponses_(e) {
  var ss = SpreadsheetApp.getActive().getSheetByName(LOG.sheet);
  ss.appendRow([JSON.stringify(e), new Date()])
}


/*

Settings 

*/
function installSettings() {
  var setSh = SpreadsheetApp.getActive().getSheetByName(SETTINGS.sheet);
  var values = [
    ["PA weight", "weight", .6],
    ["PA non-submission penalty", "penalty", .2],
    ["PA self-assessment calculated", "self", false],
    ["PA Reminder1 Send email X timeunits before the deadline", "reminder1", 24],
    ["PA Reminder2 Send email X timeunits before the deadline", "reminder2", 6],
    ["Time unit for reminders (min/hour/day)", "timeunit", "hour"],
    ["Announce PA-score", "mailpa", true],
    ["Announce final grade", "mailgrade", true],
    ["Google Domain emails (do not need verifications and keys)", "domain", true],
  ];
  setSh.getRange(2, 1, values.length, 3).setValues(values);
  setSh.autoResizeColumns(1,3);
}

function getSettings() {
  return getData_(SETTINGS).reduce(function(object, s) {
    object[s.KEY] = s.VALUE;
    return object;
  }, {});
}

function prepareFinalSheet(pa) {
  var sp = SpreadsheetApp.getActive();
  sp.insertSheet(getFinalSheetName(pa), sp.getNumSheets()+1)
  var sh = sp.getSheetByName(getFinalSheetName(pa))
  sh.appendRow(["email", "Grade", "PA score"])
}
