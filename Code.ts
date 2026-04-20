/**
 * Creates one form for each project and renames the gathering responses sheet
 * including the project name.
 * Enables filling the peer assessment till the deadline. Sends an email to students.
 * Sends 2 reminder emails before the deadline to those not submitted yet.
 * Reminder times/dates are defined at settings Closes the assessment form at the deadline.
 *
 * @param pa
 */
function openPA(pa: PeerAssessment) {
  var projects = getProjects();
  var questions = getQuestions();
  sortStudents(); // to make sure students to be assessed appear in the same order

  PropertiesService.getScriptProperties().setProperty("PA", pa.id);

  for (let project of projects) {
    let students = getStudents(project.key);
    if (students.length > 1) {
      setUpPeerAssessmentForm_(pa, project.key, questions, students);
    } else {
      sheetLog(
        `Not enough students in project: ${project.name}. Only ${students.length}!`,
      );
    }
  }

  createPATriggers_(pa);

  setState(pa, PaState.OPEN);
}

function renameSheets() {
  const projectKeys = getProjectKeys();
  for (let i = projectKeys.length - 1; i >= 0; i--) {
    const paid = PropertiesService.getScriptProperties().getProperty("PA");

    if (paid == null) {
      sheetLog("No PA found in script properties");
      return;
    }

    const pp = getPaProject(paid, projectKeys[i]);
    if (pp == null) {
      sheetLog(`No PA project row found for ${paid} and ${projectKeys[i]}.`);
      continue;
    }
    let sh = getFormResponseSheet_(pp.data.formId);
    sh.setName(paid + ":" + projectKeys[i] + " responses");
    sh.hideSheet();

    sheetLog(`TRIGGER: Renamed sheet for  ${paid} and ${projectKeys[i]}.`);
  }
}

function setAcceptingResponsesForProjects(paid: string, enabled: boolean) {
  const projectKeys = getProjectKeys();
  for (let projectKey of projectKeys) {
    const pp = getPaProject(paid, projectKey);
    if (pp == null) {
      sheetLog(
        `closePA: No PA project row found for ${paid} and ${projectKey}.`,
      );
      continue;
    }
    const form = FormApp.openById(pp.data.formId);
    form.setAcceptingResponses(enabled);
  }
}

function setNewDeadline(pa: PeerAssessment) {
  setAcceptingResponsesForProjects(pa.id, true);
  deletePATriggers();
  createPATriggers_(pa);

  setState(pa, PaState.OPEN);

  sendReminderToNonSubmissions(pa);
}

function createPATriggers_(pa: PeerAssessment) {
  const deadline = pa.deadline;

  const triggerClose = ScriptApp.newTrigger("closePATriggered")
    .timeBased()
    .at(deadline)
    .create();
  setupTriggerArguments(triggerClose, [pa.id], false);

  const triggerNow = ScriptApp.newTrigger(
    "sendReminderToNonSubmissionsTriggered",
  )
    .timeBased()
    .after(5000)
    .create();
  setupTriggerArguments(triggerNow, [pa.id], false);

  const time1 = getReminderTime(deadline, 1);
  const time2 = getReminderTime(deadline, 2);

  const trigger1 = ScriptApp.newTrigger("sendReminderToNonSubmissionsTriggered")
    .timeBased()
    .at(time1)
    .create();
  setupTriggerArguments(trigger1, [pa.id], false);

  const trigger2 = ScriptApp.newTrigger("sendReminderToNonSubmissionsTriggered")
    .timeBased()
    .at(time2)
    .create();
  setupTriggerArguments(trigger2, [pa.id], false);

  ScriptApp.newTrigger("renameSheets").timeBased().after(10000).create(); // make less, check name?
}

function sendReminderToNonSubmissionsTriggered(
  event: GoogleAppsScript.Events.AppsScriptEvent,
) {
  const functionArguments = handleTriggered(event.triggerUid);
  const pa = getPA(functionArguments);
  if (pa == null) {
    sheetLog("No PA found for id " + functionArguments);
    return;
  }
  sendReminderToNonSubmissions(pa);
}

function closePATriggered(event: GoogleAppsScript.Events.AppsScriptEvent) {
  const functionArguments = handleTriggered(event.triggerUid);
  const pa = getPA(functionArguments);
  if (pa == null) {
    sheetLog("No PA found for id " + functionArguments);
    return;
  }
  closePA(pa);
}

function closePA(pa: PeerAssessment) {
  var projectKeys = getProjectKeys();
  for (let projectKey of projectKeys) {
    let pp = getPaProject(pa.id, projectKey);
    if (pp == null) {
      sheetLog(
        `closePA: No PA project row found for ${pa.id} and ${projectKey}.`,
      );
      continue;
    }
    let form = FormApp.openById(pp.data.formId);
    form.setAcceptingResponses(false);
    form.setCustomClosedFormMessage(
      `The peer assessment ${pa.name} has closed due to past deadline.`,
    );
  }
  sendEmailClosedToInstructor_(pa);

  setState(pa, PaState.CLOSED);
}

function deletePATriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (
      triggers[i].getHandlerFunction() ==
      "sendReminderToNonSubmissionsTriggered"
    ) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
    if (triggers[i].getHandlerFunction() == "closePATriggered") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function deleteAllTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
}

function sendEmailClosedToInstructor_(pa: PeerAssessment) {
  var email = Session.getActiveUser().getEmail();
  var url = SpreadsheetApp.getActive().getUrl();
  if (email == "") {
    Logger.log("FAILED TO GET " + Session.getActiveUser().getEmail());
    return;
  }
  sendEmailWrapper(email, `PA: Assessment  ${pa.name}  has closed.`, url);
}

function sendReminderToNonSubmissions(pa: PeerAssessment) {
  let st = getStudentsWhoDidNotSubmit(pa);

  if (st.length == 0) {
    return;
  }

  var confirm = true;

  try {
    // if called within a trigger
    confirm = showAlertBeforeMail_(st);
  } catch (e) {}

  if (confirm) {
    for (let s = 0; s < st.length; s++) {
      sendReminderPA_(pa, st[s]);
    }
  }
}

function getStudentsWhoDidNotSubmit(pa: PeerAssessment) {
  let isDomain = getSettings().domain;
  var studentsWhoDidNotSubmit: Student[] = [];
  var projectKeys = getProjectKeys();
  for (let projectKey of projectKeys) {
    var students = getStudents(projectKey).filter((s) => {
      if (isDomain) {
        return s.verified && !s.submittedpa[pa.id]; // don't send to unverified even in the case of domain users; they did not do the registration
      }
      return s.verified && !s.submittedpa[pa.id];
    });
    for (let student of students) {
      studentsWhoDidNotSubmit.push(student);
    }
  }
  return studentsWhoDidNotSubmit;
}

function sendReminderForConfirmation() {
  var notVerified: Student[] = notVerifiedStudents();

  var confirm = showAlertBeforeMail_(notVerified);

  if (confirm) {
    for (let s of notVerified) {
      if (s.personalkey == "") {
        var student = getStudent(s.email);
        if (student == null) {
          sheetLog(
            "sendReminderForConfirmation: No student found for email " +
              s.email,
          );
          continue;
        }

        student.data.personalkey = generateUniqueKey();
        s.personalkey = student.data.personalkey;
        saveStudent(student);
      }
      sendEmailForConfirmation_(s);
    }
  }
}

function notVerifiedStudents(): Student[] {
  let notVerified: Student[] = [];
  let projectKeys = getProjectKeys();
  for (let projectKey of projectKeys) {
    let students = getStudents(projectKey).filter((s) => !s.verified);
    for (let student of students) {
      notVerified.push(student);
    }
  }
  return notVerified;
}

function processPAForProject_(
  peerass: PeerAssessment,
  project: Project,
  newSheetName: string,
  settings: Settings,
  questions: string[],
  isFinal: boolean,
) {
  const paProject = getPaProject(peerass.id, project.key);
  if (paProject == null) {
    Browser.msgBox(
      "Peer assessment has not been opened for project " + project.name,
    );
    return;
  }

  const formId = paProject.data.formId;
  const projectkey = project.key;

  const self = settings.self;
  const weight = settings.weight;
  const penalty = settings.penalty;

  if (isNaN(weight)) {
    throw new Error("weight NaN");
  }

  const debug = false;
  const students = getStudents(projectkey);
  const rawResponses = getFormResponses(formId, settings.domain);
  const responseMap = buildResponseMap(rawResponses);
  const paResults = calcPAScores(
    responseMap,
    students,
    questions,
    self,
    settings.domain,
    debug,
  );

  const queLen = questions.length;

  const sh = SpreadsheetApp.getActive().getSheetByName(newSheetName);
  if (sh == null) {
    Browser.msgBox("Sheet not found: " + newSheetName);
    return;
  }

  let finalSh = null;
  if (isFinal) {
    finalSh = SpreadsheetApp.getActive().getSheetByName(
      getFinalSheetName(peerass),
    );
  }

  const groupGrade = getGroupGrade(peerass.id, project.key);
  if (groupGrade == null) {
    Browser.msgBox(
      `Group grade not found for PA ${peerass.name} and project ${project.name}.`,
    );
    return;
  }

  sh.appendRow(["PROJECT:", project.name]);
  sh.appendRow(["Group grade", groupGrade]);

  var headingArr = [
    "email",
    "proj key",
    "Final Grade",
    "Penalty",
    "Adj Grade",
    "Total PA score",
  ];
  for (var q = 0; q < questions.length; q++) {
    headingArr.push("Q" + (q + 1));
  }
  sh.appendRow(headingArr);

  for (var i = 0; i < students.length; i++) {
    var email = students[i].email;
    var pen = paResults.penalty[email] ? 1 * penalty : 0;

    var gradeBefore = calculateGrade(
      groupGrade,
      Number(paResults.scores[email][0]),
      weight,
      0,
    );
    gradeBefore = gradeBefore > 100 ? 100 : gradeBefore;

    var grade = calculateGrade(
      groupGrade,
      Number(paResults.scores[email][0]),
      weight,
      pen,
    );
    grade = grade > 100 ? 100 : grade;

    // ROUNDING UP
    gradeBefore = Math.round(gradeBefore);
    grade = Math.round(grade);
    for (var k = 0; k < paResults.scores[email].length; k++) {
      paResults.scores[email][k] =
        Math.round(100 * paResults.scores[email][k]) / 100;
    }

    let values = [email, project.key, grade, pen, gradeBefore];
    values = values.concat(paResults.scores[email]);
    sh.appendRow(values);

    if (isFinal) {
      Logger.log([email, grade, paResults.scores[email][0]]);
      if (finalSh == null) {
        Browser.msgBox("Final sheet not found: " + getFinalSheetName(peerass));
        return;
      }
      finalSh.appendRow([
        projectkey,
        students[i].lname,
        email,
        grade,
        pen,
        paResults.scores[email][0],
      ]);
    }
  }
}

/**
 * Calculates the pa results for the given assessment.
 * A sheet is created with the assessment's name for viewing the results.
 * If final is true the results are considered final and ready to be announced
 * to students. An extra sheet is created with students emails and the
 * total grade and total PA score for the assessment.
 *
 * @param pa
 * @param isFinal
 */
function processPA(pa: PeerAssessment, isFinal: boolean) {
  var sp = SpreadsheetApp.getActive();

  var newSheetName: string = "PA: " + pa.id;
  try {
    sp.insertSheet(newSheetName, sp.getNumSheets() + 1);
  } catch (e) {
    // already exists, so clear it
    const sheet = sp.getSheetByName(newSheetName);
    if (sheet == null) {
      Browser.msgBox("Sheet not found: " + newSheetName);
      return;
    }
    sheet.clearContents();
  }

  if (isFinal) {
    prepareFinalSheet(pa);
  }

  var projects = getProjects();
  var questions = getQuestions();

  var sh = SpreadsheetApp.getActive().getSheetByName(newSheetName);
  if (sh == null) {
    Browser.msgBox("Sheet not found: " + newSheetName);
    return;
  }
  sp.setActiveSheet(sh);

  var settings = getSettings();
  sh.appendRow(["Peer assessment:", pa.name]);
  sh.appendRow([
    "PA settings:",
    "weight",
    settings.weight,
    "penalty",
    settings.penalty,
    "self-assessment",
    settings.self,
  ]);

  for (let project of projects) {
    processPAForProject_(
      pa,
      project,
      newSheetName,
      settings,
      questions,
      isFinal,
    );
  }
  if (isFinal) {
    setState(pa, PaState.FINALIZED);
    protectFinal_(pa);
  }
}

function protectFinal_(pa: PeerAssessment) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(getFinalSheetName(pa));
  if (sheet == null) {
    Browser.msgBox("Final sheet not found: " + getFinalSheetName(pa));
    return;
  }
  sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .setBackground("black")
    .setFontWeight("bold")
    .setFontColor("white");

  var protection = sheet
    .protect()
    .setDescription(
      getFinalSheetName(pa) +
        " protection. Results are finalized. They cannot be edited!",
    );
  protection.setWarningOnly(true);
  sheet.autoResizeColumns(1, 3);
}

function announcePA(pa: PeerAssessment) {
  var sh = SpreadsheetApp.getActive().getSheetByName(getFinalSheetName(pa));
  if (sh == null) {
    Browser.msgBox("Final sheet not found: " + getFinalSheetName(pa));
    return;
  }
  var values = sh.getDataRange().offset(1, 0).getValues();
  var students = getAllStudents();

  for (var i = 0; i < values.length; i++) {
    var email = values[i][0];
    var grade = values[i][1];
    var pascore = values[i][2];
    grade = Math.round(grade);
    pascore = Math.round(100 * pascore) / 100;

    if (email != "") {
      var student = students.filter(function (s) {
        return s.email == email;
      })[0];

      if (student.verified) sendEmailResults(pa, student, grade, pascore);
    }
  }
}

function handlePeerAss_(
  e: GoogleAppsScript.Events.SheetsOnFormSubmit,
  projectkey: string,
  pakey: string,
) {
  var pa = getPA(pakey);

  if (pa == null) {
    sheetLog("PA not found for pakey " + pakey);
    return;
  }

  var ss = SpreadsheetApp.getActive().getSheetByName(
    e.range.getSheet().getName(),
  );

  if (ss == null) {
    sheetLog("Sheet not found: " + e.range.getSheet().getName());
    return;
  }

  var emailData = ss.getRange(e.range.getRow(), 2).getValue();
  var emailData = emailData.toLowerCase();

  const domain = getSettings().domain;

  let verification = {
    email: emailData,
    personalkey: domain ? null : ss.getRange(e.range.getRow(), 3).getValue(),
  };
  sheetLog("email: " + verification.email);
  sheetLog("personalkey: " + verification.personalkey);

  var studentRow = getStudent(verification.email);
  if (studentRow == null) {
    // TODO
    // check case personal key exists!!!

    sheetLog("Student not found " + verification.email);
    if (domain) {
      sendEmailWrapper(
        verification.email,
        "PA: Not registered",
        "You have to register first to use the peer assessment. ",
      );
    } else {
      sendEmailWrapper(
        verification.email,
        "PA: email not found",
        "Your email was not found. If you are sure you have used the correct email please contact the administrator of the system.",
      );
    }
    return;
  }

  sheetLog(studentRow);

  var formResponse = getFormResponse_(e);
  if (formResponse == null) {
    sheetLog("Form response not found for event " + e);
    return;
  }
  var editURL = formResponse.getEditResponseUrl();
  sheetLog("EDITURL: " + editURL);

  if (!domain) {
    if (studentRow.data.personalkey != verification.personalkey) {
      sheetLog("Wrong key for student " + studentRow);
      sendEmailWrapper(
        verification.email,
        "PA: Wrong personal key",
        "Your personal key is: " +
          studentRow.data.personalkey +
          ". Edit your response in " +
          editURL,
      );
      return;
    }
  }

  if (studentRow.data.projectkey != projectkey) {
    sheetLog(
      "Student not in project: '" +
        studentRow.data.projectkey +
        "' '" +
        projectkey +
        "'",
    );
    return;
  }

  if (editURL != null) {
    sendSubmissionMail(studentRow.data, pa.name, editURL);
  }

  // pa passed as an argument
  setStudentSubmittedPA(studentRow, pakey, true);

  sheetLog("PA Submitted");
}

function handleRegistration(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  sheetLog("Starting Registration");
  var ss = SpreadsheetApp.getActive().getSheetByName(
    e.range.getSheet().getName(),
  );
  if (ss == null) {
    sheetLog("Sheet not found: " + e.range.getSheet().getName());
    return;
  }

  let reg: Student;
  if (getSettings().domain) {
    reg = {
      email: ss.getRange(e.range.getRow(), 2).getValue(),
      fname: ss.getRange(e.range.getRow(), 3).getValue(),
      lname: ss.getRange(e.range.getRow(), 4).getValue(),
      projectkey: ss.getRange(e.range.getRow(), 5).getValue(),
      personalkey: generateUniqueKey(),
      verified: false,
      submittedpa: {},
    };
  } else {
    reg = {
      fname: ss.getRange(e.range.getRow(), 2).getValue(),
      lname: ss.getRange(e.range.getRow(), 3).getValue(),
      email: ss.getRange(e.range.getRow(), 4).getValue(),
      projectkey: ss.getRange(e.range.getRow(), 5).getValue(),
      personalkey: generateUniqueKey(),
      verified: false,
      submittedpa: {},
    };
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
    addStudent(reg);
    var student = getStudent(reg.email);
    if (student == null) {
      sheetLog("handleRegistration: No student found for email " + reg.email);
      return;
    }
    setStudentVerified(student, true);
    sendEmailForSuccess(student.data);
    Logger.log("VER: " + reg.email + " Verified");
  } else {
    reg.email = "" + reg.email;
    sendEmailForConfirmation_(reg);

    addStudent(reg);
    sheetLog("REG: Student " + reg.lname + " added");
  }
}

function handleVerification(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  sheetLog("Starting verification");

  var ss = SpreadsheetApp.getActive().getSheetByName(
    e.range.getSheet().getName(),
  );

  if (ss == null) {
    sheetLog("Sheet not found: " + e.range.getSheet().getName());
    return;
  }
  var emailData = ss.getRange(e.range.getRow(), 2).getValue();
  var emailData = emailData.toLowerCase();

  var verification = {
    email: emailData,
    personalkey: ss.getRange(e.range.getRow(), 3).getValue(),
  };

  var student = getStudent(verification.email);
  if (student == null) {
    sheetLog("VER: Student not found " + verification.email);
    sendEmailWrapper(
      verification.email,
      "PA: this email is not registered in the system",
      "Please use the registered email. Contact the administrator of the PA system in case you dont know how to proceed.",
    );
    return;
  }
  Logger.log(student);

  if (student.data.verified) {
    sheetLog("VER: Student " + student.data.email + " already verified");
    return;
  }

  if (student.data.personalkey != verification.personalkey) {
    sheetLog("VER: Wrong key for student " + student);
    sendEmailWrapper(
      verification.email,
      "Wrong personal key",
      "Please check your registration email",
    );
    return;
  }
  setStudentVerified(student, true);

  sendEmailForSuccess(student.data);

  Logger.log("VER: " + verification.email + " Verified");
}

function isEmptyResponses_(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  Logger.log(e.values);
  for (var i = 1; i < e.values.length; i++) {
    // first is timestamp
    Logger.log(e.values[i]);
    if (e.values[i] != "") return false;
  }
  return true;
}

/**
 * @param {Object} e The event parameter for form submission to a spreadsheet;
 *     see https://developers.domain.com/apps-script/understanding_events
 */
function onFormSubmit(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  var responsesName = e.range.getSheet().getName();

  const formSubmissionEvent = getFormFromSubmissionEvent(e);
  if (formSubmissionEvent == null) {
    sheetLog("Form submission event not found for sheet: " + responsesName);
    return;
  }
  var formId = formSubmissionEvent.getId();

  logAllResponses_(e);

  // There are multiple onFormSubmit triggered calls on one form submit.
  // They have empty fields. They will not be handled
  if (isEmptyResponses_(e)) {
    sheetLog("REJECTED: " + e.namedValues);
    return;
  }

  if (formId == getRegistrationFormId()) {
    handleRegistration(e);
    return;
  }

  if (formId == getVerificationFormId()) {
    handleVerification(e);
    return;
  }

  var projectkey = getProjectkeyFromFormId(formId);
  sheetLog("Project key: " + projectkey);
  if (projectkey != null) {
    sheetLog("PA");

    var pp = getPaProjectFromFormId(formId);
    if (pp == null) {
      sheetLog("No PA project found for form id " + formId);
      return;
    }
    handlePeerAss_(e, projectkey, pp.data.pakey);
    return;
  }

  sheetLog("UNHANDLED submission");
}
