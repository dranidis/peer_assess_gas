/**

Creates one form for each project and renames the gathering responses sheet including the project name.
Enables filling the peer assessment till the deadline.
Sends an email to students.
Sends a reminder 3 days before and at the day of the deadline to those not submitted yet.
Closes the assessment form at the deadline.

*/

function openPA(pa) {
  var sp = SpreadsheetApp.getActive()
  var projects = getProjects();
  PropertiesService.getScriptProperties().setProperty("PA", pa.id)

  for (var i = 0; i < projects.length; i++) {
    setUpPeerAssessmentForm_(pa, projects[i])
  }
  ScriptApp.newTrigger('renameSheets').timeBased().after(2000).create(); // make less, check name?

  setAcceptingResponsesForProjects(pa.id, true);

  createPATriggers_(pa)

  setOpen(pa);
}

function renameSheets() {
  var projects = getProjects();
  for (var i = projects.length - 1; i >= 0; i--) {
    var paid = PropertiesService.getScriptProperties().getProperty("PA")

    var pp = getPaProject(paid, projects[i].data.key)
    var sh = getFormResponseSheet_(pp.data.formId)
    sh.setName(paid + ":" + projects[i].data.key + " responses")
    sh.hideSheet();
  }
}

function setAcceptingResponsesForProjects(paid, enabled) {
  var projects = getProjects();
  for (var p = 0; p < projects.length; p++) {
    var pp = getPaProject(paid, projects[p].data.key);
    var form = FormApp.openById(pp.data.formId);
    form.setAcceptingResponses(enabled);
  }
}

function setNewDeadline(pa, value) {
  setAcceptingResponsesForProjects(pa.id, true);
  deletePATriggers();
  createPATriggers_(pa);

  setOpen(pa);

  sendReminderToNonSubmissions(pa);
}


function createPATriggers_(pa) {
  var deadline = pa.deadline;

  var triggerNow = ScriptApp.newTrigger('sendReminderToNonSubmissionsTriggered')
    .timeBased().after(2000).create();
  setupTriggerArguments(triggerNow, [pa.id], false);

  var time1 = getReminderTime(deadline, 1);
  var time2 = getReminderTime(deadline, 2);

  var trigger1 = ScriptApp.newTrigger('sendReminderToNonSubmissionsTriggered')
    .timeBased().at(time1).create();
  setupTriggerArguments(trigger1, [pa.id], false);

  var trigger2 = ScriptApp.newTrigger('sendReminderToNonSubmissionsTriggered')
    .timeBased().at(time2).create();
  setupTriggerArguments(trigger2, [pa.id], false);

  var triggerClose = ScriptApp.newTrigger('closePATriggered').timeBased().at(deadline).create();
  setupTriggerArguments(triggerClose, [pa.id], false);
}

function sendReminderToNonSubmissionsTriggered(event) {
  var functionArguments = handleTriggered(event.triggerUid);
  var pa = getPA(functionArguments);
  sendReminderToNonSubmissions(pa);
}

function closePATriggered(event) {
  var functionArguments = handleTriggered(event.triggerUid);
  var pa = getPA(functionArguments);
  closePA(pa);
}

function closePA(pa) {
  var projects = getProjects();
  for (var p = 0; p < projects.length; p++) {
    var pp = getPaProject(pa.id, projects[p].data.key);
    var form = FormApp.openById(pp.data.formId);
    form.setAcceptingResponses(false);
    form.setCustomClosedFormMessage("The peer assessment " + pa.name + " has closed due to past deadline.")
  }
  sendEmailClosedToInstructor_(pa);

  setClosed(pa);
}

function deletePATriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() == "sendReminderToNonSubmissionsTriggered") {
      ScriptApp.deleteTrigger(triggers[i])
    }
    if (triggers[i].getHandlerFunction() == "closePATriggered") {
      ScriptApp.deleteTrigger(triggers[i])
    }
  }
}

function sendEmailClosedToInstructor_(pa) {
  var email = Session.getActiveUser().getEmail();
  var url = SpreadsheetApp.getActive().getUrl();
  if (email == "") {
    Logger.log("FAILED TO GET " + Session.getActiveUser().getEmail());
    return;
  }
  GmailApp.sendEmail(
    email,
    "PA: Assessment " + pa.name + " has closed.",
    url)
}


function sendReminderToNonSubmissions(pa) {
  var st = []
  var projects = getProjects();
  for (var p = 0; p < projects.length; p++) {
    var students = getStudents(projects[p].data.key).filter(function (s) {
      if (getSettings().domain) {
        return !s.submittedpa[pa.id];
      }
      return s.verified && !s.submittedpa[pa.id]
    })
    for (var s = 0; s < students.length; s++) {
      st.push(students[s])
    }
  }

  if (st.length == 0) {
    return;
  }

  var confirm = true;

  try { // if called within a trigger
    confirm = showAlertBeforeMail_(st);
  } catch (e) {
  }

  if (confirm) {
    for (var s = 0; s < st.length; s++) {
      sendReminderPA_(pa, st[s])
    }
  }
}

function sendReminderForConfirmation() {
  var st = []
  var projects = getProjects();
  for (var p = 0; p < projects.length; p++) {
    var students = getStudents(projects[p].data.key).filter(function (s) {
      return !s.verified
    })
    for (var s = 0; s < students.length; s++) {
      st.push(students[s])
    }
  }

  var confirm = showAlertBeforeMail_(st);

  if (confirm) {
    for (var s = 0; s < st.length; s++) {
      if (st[s].personalkey == "") {
        var student = getStudent(st[s].email);
        student.data.personalkey = generateUniqueKey();
        st[s].personalkey = student.data.personalkey;
        saveStudent(student);
      }
      sendEmailForConfirmation_(st[s].fname, st[s].email, st[s].personalkey)
    }
  }
}


function processPAForProject_(peerass, project, newSheetName, settings, questions, final) {
  var paProject = getPaProject(peerass.id, project.data.key);
  if (paProject == null) {
    Browser.msgBox("Peer assessment has not been opened for project " + project.data.name)
    return;
  }

  var formId = paProject.data.formId;
  var projectkey = project.data.key;

  var self = settings.self;
  var weight = settings.weight;
  var penalty = settings.penalty;

  if (isNaN(weight)) {
    throw new Error("weight NaN")
  }

  var debug = false;
  var pa = getPAresults(formId, projectkey, self, debug)

  var students = getStudents(projectkey);
  var queLen = questions.length;

  var sh = SpreadsheetApp.getActive().getSheetByName(newSheetName);

  var finalSh = null;
  if (final)
    finalSh = SpreadsheetApp.getActive().getSheetByName(getFinalSheetName(peerass));

  var groupGrade = getGroupGrade(peerass.id, project.data.key);

  sh.appendRow(["PROJECT:", project.data.name])
  sh.appendRow(["Group grade", groupGrade])

  var headingArr = ["email", "proj key", "Final Grade", "Penalty", "Adj Grade", "Total PA score"];
  for (var q = 0; q < questions.length; q++) {
    headingArr.push("Q" + (q + 1));
  }
  sh.appendRow(headingArr);

  for (var i = 0; i < students.length; i++) {
    var e = students[i].email;
    var pen = pa.penalty[e] ? 1 * penalty : 0

    var gradeBefore = calculateGrade(groupGrade, Number(pa.scores[e][0]), weight, 0);
    gradeBefore = gradeBefore > 100 ? 100 : gradeBefore;

    var grade = calculateGrade(groupGrade, Number(pa.scores[e][0]), weight, pen);
    grade = grade > 100 ? 100 : grade;

    // ROUNDING UP
    gradeBefore = Math.round(gradeBefore)
    grade = Math.round(grade)
    for (var k = 0; k < pa.scores[e].length; k++) {
      pa.scores[e][k] = Math.round(100 * pa.scores[e][k]) / 100;
    }

    values = [e, project.data.key, grade, pen, gradeBefore];
    values = values.concat(pa.scores[e]);
    sh.appendRow(values);

    if (final) {
      Logger.log([e, grade, pa.scores[e][0]])
      finalSh.appendRow([e, grade, pa.scores[e][0]])
    }
  }
}

/*

Calculates the pa results for the given assessment.
A sheet is created with the assessment's name for viewing the results.

If final is true the results are considered final and ready to be announced
to students. An extra sheet is created with students emails and the 
total grade and total PA score for the assessment.

*/
function processPA(pa, final) {
  var sp = SpreadsheetApp.getActive();

  var newSheetName = "PA: " + pa.id;
  try {
    sp.insertSheet(newSheetName, sp.getNumSheets() + 1);
  } catch (e) {
    // already exists, so clear it
    sp.getSheetByName(newSheetName).clearContents();
  }

  if (final) {
    prepareFinalSheet(pa)
  }

  var projects = getProjects();
  var questions = getQuestions();

  var sh = SpreadsheetApp.getActive().getSheetByName(newSheetName);
  sp.setActiveSheet(sh)

  var settings = getSettings();
  sh.appendRow(["Peer assessment:", pa.name])
  sh.appendRow(["PA settings:",
    "weight", settings.weight,
    "penalty", settings.penalty,
    "self-assessment", settings.self,
  ])

  for (p = 0; p < projects.length; p++) {
    processPAForProject_(pa, projects[p], newSheetName, settings, questions, final)
  }
  if (final) {
    setState(pa, state.FINALIZED);
    protectFinal_(pa)
  }
}

function protectFinal_(pa) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(getFinalSheetName(pa));
  sheet.getRange(1, 1, 1, sheet.getLastColumn())
    .setBackground("black")
    .setFontWeight("bold")
    .setFontColor("white");

  var protection = sheet.protect().setDescription(
    getFinalSheetName(pa) + " protection. Results are finalized. They cannot be edited!");
  protection.setWarningOnly(true);
  sheet.autoResizeColumns(1, 3);

}

function announcePA(pa) {
  var sh = SpreadsheetApp.getActive().getSheetByName(getFinalSheetName(pa));
  var values = sh.getDataRange().offset(1, 0).getValues();
  var students = getAllStudents();

  for (var i = 0; i < values.length; i++) {
    var email = values[i][0];
    var grade = values[i][1];
    var pascore = values[i][2];
    grade = Math.round(grade)
    pascore = Math.round(100 * pascore) / 100;

    if (email != "") {
      var student = students.filter(function (s) {
        return s.email == email
      })[0];

      if (student.verified)
        sendEmailResults(pa, student, grade, pascore);
    }
  }
}

function handlePeerAss_(e, projectkey, pakey) {
  var ss = SpreadsheetApp.getActive().getSheetByName(e.range.getSheet().getName());

  var emailData = ss.getRange(e.range.getRow(), 2).getValue();
  var emailData = emailData.toLowerCase();

  // TODO: needs refactoring
  if (getSettings().domain) {
    var verification = {
      email: emailData,
      // personalkey: ss.getRange(e.range.getRow(), 3).getValue()
    }
    sheetLog("email: " + verification.email)
    // sheetLog("personalkey: " + verification.personalkey)

    var student = getStudent(verification.email)
    if (student == null) {
      // TODO
      // check case personal key exists!!!

      sheetLog("Student not found " + verification.email);
      GmailApp.sendEmail(verification.email, 'PA: Not registered',
        'You have to register first to use the peer assessment. ');
      return;
    }

    sheetLog(student)

    //  var editURL = getEditResponseUrl_(e)
    var formResponse = getFormResponse_(e)
    var editURL = formResponse.getEditResponseUrl();
    sheetLog("EDITURL: " + editURL);

    // if (student.data.personalkey != verification.personalkey) {
    //   sheetLog("Wrong key for student " + student);
    //   GmailApp.sendEmail(verification.email, 'PA: Wrong personal key', 'Your personal key is: ' + student.data.personalkey +
    //     '. Edit your response in ' + editURL);
    //   return;
    // }

    var responsesName = e.range.getSheet().getName();

    if (student.data.projectkey != projectkey) {
      sheetLog("Student not in project: '" + student.data.projectkey + "' '" + projectkey + "'")
      return;
    }

    var pa = getPA(pakey);

    if (editURL != null) {
      sendSubmissionMail(student.data.email, student.data.fname, pa.name, projectkey, editURL)
    }

    // pa passed as an argument
    setStudentSubmittedPA(student, pakey, true)

    sheetLog("PA Submitted");
    return;
  }

  var verification = {
    email: emailData,
    personalkey: ss.getRange(e.range.getRow(), 3).getValue()
  }
  sheetLog("email: " + verification.email)
  sheetLog("personalkey: " + verification.personalkey)

  var student = getStudent(verification.email)
  if (student == null) {
    // TODO
    // check case personal key exists!!!

    sheetLog("Student not found " + verification.email);
    GmailApp.sendEmail(verification.email, 'PA: email not found',
      'Your email was not found. If you are sure you have used the correct email please contact the administrator of the system.');
    return;
  }

  sheetLog(student)

  //  var editURL = getEditResponseUrl_(e)
  var formResponse = getFormResponse_(e)
  var editURL = formResponse.getEditResponseUrl();
  sheetLog("EDITURL: " + editURL);

  if (student.data.personalkey != verification.personalkey) {
    sheetLog("Wrong key for student " + student);
    GmailApp.sendEmail(verification.email, 'PA: Wrong personal key', 'Your personal key is: ' + student.data.personalkey +
      '. Edit your response in ' + editURL);
    return;
  }

  var responsesName = e.range.getSheet().getName();

  if (student.data.projectkey != projectkey) {
    sheetLog("Student not in project: '" + student.data.projectkey + "' '" + projectkey + "'")
    return;
  }

  var pa = getPA(pakey);

  if (editURL != null) {
    sendSubmissionMail(student.data.email, student.data.fname, pa.name, projectkey, editURL)
  }

  // pa passed as an argument
  setStudentSubmittedPA(student, pakey, true)

  sheetLog("PA Submitted");
}

function handleRegistration(e) {
  sheetLog("Starting Registration")
  var ss = SpreadsheetApp.getActive().getSheetByName(e.range.getSheet().getName());

  var reg = {}
  if (getSettings().domain) {
    reg = {
      email: ss.getRange(e.range.getRow(), 2).getValue(),
      fname: ss.getRange(e.range.getRow(), 3).getValue(),
      lname: ss.getRange(e.range.getRow(), 4).getValue(),
      projectkey: ss.getRange(e.range.getRow(), 5).getValue(),
      personalkey: generateUniqueKey()
    }
  } else {
    reg = {
      fname: ss.getRange(e.range.getRow(), 2).getValue(),
      lname: ss.getRange(e.range.getRow(), 3).getValue(),
      email: ss.getRange(e.range.getRow(), 4).getValue(),
      projectkey: ss.getRange(e.range.getRow(), 5).getValue(),
      personalkey: generateUniqueKey()
    }

  }

  if (getStudent(reg.email) != null) {
    sheetLog("REG: Student email already in students");
    return;
  }
  if (!isProjectkey(reg.projectkey)) {
    sheetLog("REG: Project key Not found");
    return;
  }

  // TODO
  // needs cleaning. Addes the students then gets the students. HACKY
  // Also a different email should be sent to Google users
  // not having the key.
  if (getSettings().domain) {
    // no verification needed
    addStudent(reg)
    var student = getStudent(reg.email)
    setStudentVerified(student, true);
    sendEmailForSuccess(student.data);
    Logger.log("VER: " + reg.email + " Verified");
  } else {
    var email = "" + reg.email
    sendEmailForConfirmation_(reg.fname, email, reg.personalkey)

    addStudent(reg)
    sheetLog("REG: Student " + reg.lname + " added");
  }
}


function handleVerification(e) {
  sheetLog("Starting verification")

  var ss = SpreadsheetApp.getActive().getSheetByName(e.range.getSheet().getName());

  var emailData = ss.getRange(e.range.getRow(), 2).getValue();
  var emailData = emailData.toLowerCase();

  var verification = {
    email: emailData,
    personalkey: ss.getRange(e.range.getRow(), 3).getValue()
  }

  var student = getStudent(verification.email)
  if (student == null) {
    sheetLog("VER: Student not found " + verification.email);
    GmailApp.sendEmail(verification.email, 'PA: this email is not registered in the system',
      'Please use the registered email. Contact the administrator of the PA system in case you dont know how to proceed.');
    return;
  }
  Logger.log(student)

  if (student.data.verified) {
    sheetLog("VER: Student " + student.data.email + " already verified");
    return;
  }

  if (student.data.personalkey != verification.personalkey) {
    sheetLog("VER: Wrong key for student " + student);
    GmailApp.sendEmail(verification.email, 'Wrong personal key', 'Please check your registration email');
    return;
  }
  setStudentVerified(student, true);

  sendEmailForSuccess(student.data);

  Logger.log("VER: " + verification.email + " Verified");
}

function isEmptyResponses_(e) {
  Logger.log(e.values);
  for (var i = 1; i < e.values.length; i++) { // first is timestamp
    Logger.log(e.values[i]);
    if (e.values[i] != "")
      return false;
  }
  return true;
}

/**
 * @param {Object} e The event parameter for form submission to a spreadsheet;
 *     see https://developers.domain.com/apps-script/understanding_events
 */
function onFormSubmit(e) {
  var responsesName = e.range.getSheet().getName();

  var formId = getFormFromSubmissionEvent(e).getId()

  logAllResponses_(e);

  // There are multiple onFormSubmit triggered calls on one form submit. 
  // They have empty fields. They will not be handled
  if (isEmptyResponses_(e)) {
    sheetLog("REJECTED: " + e.namedValues)
    return;
  }

  if (formId == getRegistrationFormId()) {
    handleRegistration(e);
    return;
  }

  if (formId == getVerificationFormId()) {
    handleVerification(e)
    return;
  }

  var projectkey = getProjectkeyFromFormId(formId);
  sheetLog("Project key: " + projectkey)
  if (projectkey != null) {
    sheetLog("PA")

    var pp = getPaProjectFromFormId(formId)
    handlePeerAss_(e, projectkey, pp.data.pakey)
    return;
  }

  sheetLog("UNHANDLED submission");
}
