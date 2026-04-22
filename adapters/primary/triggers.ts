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
  var projects = projectRepo.getAll();
  var questions = getQuestions();
  studentRepo.sort(); // to make sure students to be assessed appear in the same order

  PropertiesService.getScriptProperties().setProperty("PA", pa.id);

  for (let project of projects) {
    let students = studentRepo.findByProject(project.key);
    if (students.length > 1) {
      setUpPeerAssessmentForm_(pa, project.key, questions, students);
    } else {
      sheetLog(
        `Not enough students in project: ${project.name}. Only ${students.length}!`,
      );
    }
  }

  createPATriggers_(pa);

  paRepo.setState(pa, PaState.OPEN);
}

function renameSheets() {
  const projectKeys = projectRepo.getKeys();
  const paid = PropertiesService.getScriptProperties().getProperty("PA");

  for (let i = projectKeys.length - 1; i >= 0; i--) {
    if (paid == null) {
      sheetLog("No PA found in script properties");
      return;
    }

    const pp = paProjectRepo.find(paid, projectKeys[i]);
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
  paService.setFormsAcceptingResponses(paid, enabled);
}

function setNewDeadline(pa: PeerAssessment) {
  paService.setFormsAcceptingResponses(pa.id, true);
  deletePATriggers();
  createPATriggers_(pa);

  paRepo.setState(pa, PaState.OPEN);

  sendReminderToNonSubmissions(pa);
}

function createPATriggers_(pa: PeerAssessment) {
  const deadline = pa.deadline;

  const triggerClose = ScriptApp.newTrigger(closePATriggered.name)
    .timeBased()
    .at(deadline)
    .create();
  setupTriggerArguments(triggerClose, [pa.id], false);

  const triggerNow = ScriptApp.newTrigger(
    sendReminderToNonSubmissionsTriggered.name,
  )
    .timeBased()
    .after(5000)
    .create();
  setupTriggerArguments(triggerNow, [pa.id], false);

  const time1 = getReminderTime(deadline, 1);
  const time2 = getReminderTime(deadline, 2);

  const trigger1 = ScriptApp.newTrigger(
    sendReminderToNonSubmissionsTriggered.name,
  )
    .timeBased()
    .at(time1)
    .create();
  setupTriggerArguments(trigger1, [pa.id], false);

  const trigger2 = ScriptApp.newTrigger(
    sendReminderToNonSubmissionsTriggered.name,
  )
    .timeBased()
    .at(time2)
    .create();
  setupTriggerArguments(trigger2, [pa.id], false);

  ScriptApp.newTrigger(renameSheets.name).timeBased().after(10000).create(); // make less, check name?
}

function sendReminderToNonSubmissionsTriggered(
  event: GoogleAppsScript.Events.AppsScriptEvent,
) {
  const functionArguments = handleTriggered(event.triggerUid);
  const pa = paRepo.findById(functionArguments);
  if (pa == null) {
    sheetLog("No PA found for id " + functionArguments);
    return;
  }
  sendReminderToNonSubmissions(pa);
}

function closePATriggered(event: GoogleAppsScript.Events.AppsScriptEvent) {
  const functionArguments = handleTriggered(event.triggerUid);
  const pa = paRepo.findById(functionArguments);
  if (pa == null) {
    sheetLog("No PA found for id " + functionArguments);
    return;
  }
  closePA(pa);
}

function closePA(pa: PeerAssessment) {
  const instructorEmail = Session.getActiveUser().getEmail();
  if (!instructorEmail) {
    Logger.log("FAILED TO GET instructor email");
  }
  const spreadsheetUrl = SpreadsheetApp.getActive().getUrl();
  paService.closePA(pa, instructorEmail, spreadsheetUrl);
}

function deletePATriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (
      triggers[i].getHandlerFunction() ==
      sendReminderToNonSubmissionsTriggered.name
    ) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
    if (triggers[i].getHandlerFunction() == closePATriggered.name) {
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

function sendReminderToNonSubmissions(pa: PeerAssessment) {
  const students = paService.getStudentsWhoDidNotSubmit(pa);
  if (students.length === 0) return;

  let confirm = true;
  try {
    // showAlertBeforeMail_ throws when called from a trigger — treat that as confirmed
    confirm = showAlertBeforeMail_(students);
  } catch (e) {}

  if (confirm) {
    paService.sendPaReminders(pa, students);
  }
}

function sendReminderForConfirmation() {
  const notVerified = paService.notVerifiedStudents();
  const confirm = showAlertBeforeMail_(notVerified);
  if (confirm) {
    paService.sendConfirmationReminders(
      notVerified,
      formAdapter.getPublishedUrl(getVerificationFormId()),
    );
  }
}

function processPAForProject_(
  peerass: PeerAssessment,
  project: Project,
  newSheetName: string,
  settings: Settings,
  questions: string[],
  isFinal: boolean,
) {
  const paProject = paProjectRepo.find(peerass.id, project.key);
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
  const students = studentRepo.findByProject(projectkey);
  const rawResponses = formAdapter.getFormResponses(formId, settings.domain);
  const paResults = paScoreService.calcPAScores(
    rawResponses,
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

  const groupGrade = paProjectRepo.getGroupGrade(peerass.id, project.key);
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

    var gradeBefore = paScoreService.calculateGrade(
      groupGrade,
      Number(paResults.scores[email][0]),
      weight,
      0,
    );
    gradeBefore = gradeBefore > 100 ? 100 : gradeBefore;

    var grade = paScoreService.calculateGrade(
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

  var projects = projectRepo.getAll();
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
    paRepo.setState(pa, PaState.FINALIZED);
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
  var students = studentRepo.getAll();

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

      if (student.verified)
        emailService.sendResults(pa, student, grade, pascore);
    }
  }
}

function handlePeerAss_(
  e: GoogleAppsScript.Events.SheetsOnFormSubmit,
  projectkey: string,
  pakey: string,
) {
  const pa = paRepo.findById(pakey);
  if (pa == null) {
    sheetLog("PA not found for pakey " + pakey);
    return;
  }

  const ss = SpreadsheetApp.getActive().getSheetByName(
    e.range.getSheet().getName(),
  );
  if (ss == null) {
    sheetLog("Sheet not found: " + e.range.getSheet().getName());
    return;
  }

  const email = (
    ss.getRange(e.range.getRow(), 2).getValue() as string
  ).toLowerCase();
  const domain = getSettings().domain;
  const personalkey = domain
    ? null
    : ss.getRange(e.range.getRow(), 3).getValue();

  sheetLog("email: " + email);
  sheetLog("personalkey: " + personalkey);

  const formResponse = getFormResponse_(e);
  if (formResponse == null) {
    sheetLog("Form response not found for event " + e);
    return;
  }
  const editUrl = formResponse.getEditResponseUrl();
  sheetLog("EDITURL: " + editUrl);

  paService.handlePaSubmission(
    pa,
    projectkey,
    pakey,
    email,
    personalkey,
    editUrl,
    domain,
  );
}

function handleRegistration(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  sheetLog("Starting Registration");
  const ss = SpreadsheetApp.getActive().getSheetByName(
    e.range.getSheet().getName(),
  );
  if (ss == null) {
    sheetLog("Sheet not found: " + e.range.getSheet().getName());
    return;
  }

  const isDomain = getSettings().domain;
  const row = e.range.getRow();
  const reg: Student = isDomain
    ? {
        email: ss.getRange(row, 2).getValue(),
        fname: ss.getRange(row, 3).getValue(),
        lname: ss.getRange(row, 4).getValue(),
        projectkey: ss.getRange(row, 5).getValue(),
        personalkey: generateUniqueKey(),
        verified: false,
        submittedpa: {},
      }
    : {
        fname: ss.getRange(row, 2).getValue(),
        lname: ss.getRange(row, 3).getValue(),
        email: "" + ss.getRange(row, 4).getValue(),
        projectkey: ss.getRange(row, 5).getValue(),
        personalkey: generateUniqueKey(),
        verified: false,
        submittedpa: {},
      };

  if (studentRepo.findByEmail(reg.email) != null) {
    sheetLog("REG: Student email already in students");
    return;
  }
  if (!projectRepo.isValidKey(reg.projectkey)) {
    sheetLog("REG: Project key Not found");
    return;
  }

  paService.registerStudent(
    reg,
    formAdapter.getPublishedUrl(getVerificationFormId()),
    isDomain,
  );
}

function handleVerification(e: GoogleAppsScript.Events.SheetsOnFormSubmit) {
  sheetLog("Starting verification");

  const ss = SpreadsheetApp.getActive().getSheetByName(
    e.range.getSheet().getName(),
  );
  if (ss == null) {
    sheetLog("Sheet not found: " + e.range.getSheet().getName());
    return;
  }

  const row = e.range.getRow();
  const email = (ss.getRange(row, 2).getValue() as string).toLowerCase();
  const personalkey = ss.getRange(row, 3).getValue();

  paService.verifyStudent(email, personalkey);
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

  var projectkey = paProjectRepo.getProjectkeyFromFormId(formId);
  sheetLog("Project key: " + projectkey);
  if (projectkey != null) {
    sheetLog("PA");

    var pp = paProjectRepo.findByFormId(formId);
    if (pp == null) {
      sheetLog("No PA project found for form id " + formId);
      return;
    }
    handlePeerAss_(e, projectkey, pp.data.pakey);
    return;
  }

  sheetLog("UNHANDLED submission");
}
