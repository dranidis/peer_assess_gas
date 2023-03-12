function sendEmailForConfirmation_(student: Student) {
  let name = student.fname;
  let email = student.email;
  let key = student.personalkey;

  let ss = SpreadsheetApp.getActive().getSheetByName('Links');

  let link = FormApp.openById(getVerificationFormId()).getPublishedUrl();

  let template = HtmlService.createTemplateFromFile("html/confirmation.html");
  template.name = name;
  template.link = link;
  template.key = key;

  //  Logger.log(template.evaluate().getContent())

  sendEmailWrapper(
    email,
    "PA: Confirm your registration",
    'In order to complete your registration please visit this ' + link + '"',
    {                        // body
      htmlBody: template.evaluate().getContent()                 // advanced options
    }
  );
}

function sendSubmissionMail(student: Student, paname: string, editURL: string) {
  var template = HtmlService.createTemplateFromFile("html/pasubmission.html");
  template.email = student.email;
  template.name = student.fname;
  template.link = editURL;
  template.pa = paname;
  template.project = student.projectkey;

  //  Logger.log(template.evaluate().getContent())
  sendEmailWrapper(
    student.email,
    "PA: Successful submission of peer assessment",
    'Congratulations! You have successfully completed your peer assessment',
    {                        // body
      htmlBody: template.evaluate().getContent()                 // advanced options
    })
}

function sendEmailForSuccess(student: Student) {
  var ss = SpreadsheetApp.getActive().getSheetByName('Links');
  var template = HtmlService.createTemplateFromFile("html/successful.html");
  template.name = student.fname
  template.key = student.personalkey
  sendEmailWrapper(
    student.email,
    "PA: Successful registration",
    'Congratulations! You have successfully completed your registration.\nKeep your ' +
    student.personalkey +
    ' for completing peer assessments.',
    {
      htmlBody: template.evaluate().getContent()
    })
}

function sendReminderPA_(pa: PeerAssessment, student: Student) {
  var sp = SpreadsheetApp.getActive();
  var deadline = new Date(pa.deadline);

  let pp = getPaProject(pa.id, student.projectkey);
  if (pp == null) {
    sheetLog(`sendReminderPA_: No PA project row found for ${pa.id} and ${student.projectkey}.`);
    return;
  }

  let formId = pp.data.formId;
  let link = FormApp.openById(formId).getPublishedUrl();
  let email = student.email;

  let template = HtmlService.createTemplateFromFile("html/reminder.html");
  template.name = student.fname;
  template.link = link;
  template.key = "";
  template.deadline = deadline;
  template.paname = pa.name;

  if (!getSettings().domain) {
    template.key = "Your personal key is: " + student.personalkey + ". "
  }

  //  Logger.log(template.evaluate().getContent())

  sendEmailWrapper(
    email,
    "PA: Reminder for peer assessment: " + pa.name,
    'This is a reminder that you need to complete your peer assessment. Note that there is a penalty for not completing the peer assessment.',
    {                        // body
      htmlBody: template.evaluate().getContent()                 // advanced options
    })

}

function sendEmailResults(pa: PeerAssessment, student: Student, grade: number, pascore: number) {
  var settings = getSettings();

  var template = HtmlService.createTemplateFromFile("html/announce.html");
  template.name = student.fname;
  template.pa = pa.name;

  if (settings.mailpa) {
    template.pascore = "Your peer assessment score is " + pascore + ".";
  } else {
    template.pascore = "";
  }

  if (settings.mailgrade) {
    template.grade = "Your peer adjusted grade is " + grade + ".";
  } else {
    template.grade = "";
  }


  //  Logger.log(template.evaluate().getContent())

  sendEmailWrapper(
    student.email,
    "PA: Results for peer assessment: " + pa.name,
    '',
    {                        // body
      htmlBody: template.evaluate().getContent()                 // advanced options
    })
}


function sendEmailWrapper(
  recipient: string,
  subject: string,
  body: string,
  options?: GoogleAppsScript.Gmail.GmailAdvancedOptions) {

  if (testMode) {
    Logger.log("TEST MODE ON; Mocking emails");
    sheetLog('MOCKING EMAIL SENT (with options)');
    sheetLog("TO: " + recipient + "\nSUBJECT: " + subject + "\nBODY: " + body + "\nOPTIONS: " + JSON.stringify(options));
    return;
  }

  if (typeof options !== 'undefined') {
    GmailApp.sendEmail(recipient, subject, body, options);
  } else {
    GmailApp.sendEmail(recipient, subject, body);
  }
}



