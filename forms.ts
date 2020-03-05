/**
 * Create the assessment form, connects it to the sheet and saves the link to a sheet
 *
 * @param pa
 * @param project
 * @param questions
 * @param students
 */
function setUpPeerAssessmentForm_(pa: PeerAssessment, project: Row<Project>, questions: string[], students: Student[]) {
  var ss = SpreadsheetApp.getActive();
  let studentNames: string[] = students.map(s => s.fname + " " + s.lname);

  var form = createPeerAssessmentForm(
    'Peer Assessment Form: ' + pa.name + " for " + project.data.key,
    getSettings().domain,
    studentNames,
    questions
  );

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  savePeerAssessmentLinks(pa.id, project.data.key, form);
}

/**
 * Creates a form with the given title and student names and questions.
 *
 * @param title
 * @param isDomain
 * @param studentNames
 * @param questions
 */
function createPeerAssessmentForm(title: string, isDomain: boolean, studentNames: string[], questions: string[]): GoogleAppsScript.Forms.Form {
  var form = FormApp.create(title);

  form.setAllowResponseEdits(true)
      .setLimitOneResponsePerUser(true)
      .setConfirmationMessage('Check your email for successful submission of the peer assessment!')

  if (isDomain) {
      form.setRequireLogin(true)
          .setCollectEmail(true)
  } else {
      form.setRequireLogin(false)
      var emailVal = FormApp.createTextValidation().requireTextIsEmail()
        .build(); // NECESSARY ALTHOUGH TS does not recognize it!

      var emailItem = form.addTextItem().setTitle('email').setRequired(true);
      emailItem.setValidation(emailVal);

      var keyItem = form.addTextItem().setTitle('personal key').setRequired(true);
  }

  for (let question of questions) {
    let item = form.addGridItem().setTitle(question)
          .setRows(studentNames)
          .setRequired(true)
          .setColumns(['1', '2', '3', '4', '5'])
          .setHelpText("1: Strongly Disagree - 5: Strongly Agree");
  }

  for (let studentName of studentNames) {
      let item = form.addParagraphTextItem();
      item.setTitle("Comments for " + studentName)
      .setHelpText("Comments are welcome and required in cases of extreme assessment (i.e. 1 or 5)")
  }

  form.setAcceptingResponses(true);
  return form;
}





function renameSheetReg() {
  let sh = getFormResponseSheet_(getRegistrationFormId());
  sh.setName("Registration responses")
  sh.hideSheet();
}

function installRegistrationForm() {
    var ss = SpreadsheetApp.getActive();
    var form = FormApp.create('PA: Registration form')
        .setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId())
        .setAllowResponseEdits(true)
        .setLimitOneResponsePerUser(true)
        .setConfirmationMessage('Check your email in order to verify your registration!')


    form.addTextItem().setTitle('First name').setRequired(true);
    form.addTextItem().setTitle('Last name').setRequired(true);

    if (getSettings().domain) {
        form.setRequireLogin(true)
            .setCollectEmail(true)
        // not supported?
        // .setConfirmationMessage('Check your email in order to check if your registration is successful!');
    } else {
        /*
        allow users outside the domain to use the form
        */
        form.setRequireLogin(false);
        let item = form.addTextItem().setTitle('email').setRequired(true)
        var emailVal = FormApp.createTextValidation().requireTextIsEmail()
          .build(); // NECESSARY ALTHOUGH TS shows error

        item.setValidation(emailVal);
    }

    // form.addTextItem().setTitle('project key').setRequired(true);
    let item = form.addMultipleChoiceItem();
    item.setTitle('Select your project').setRequired(true);

    item.setChoiceValues(getProjectKeys())
    .showOtherOption(false);

    ScriptApp.newTrigger('renameSheetReg').timeBased().after(1000).create(); // make less, check name?

    setRegistrationLink(form);
}

function renameSheetVer() {
  let sh = getFormResponseSheet_(getVerificationFormId());
  sh.setName("Verification responses")
  sh.hideSheet();
}

function installVerificationForm() {
    var ss = SpreadsheetApp.getActive();
    var form = FormApp.create('PA: Verification form')
        .setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId())
        .setAllowResponseEdits(true)
        .setLimitOneResponsePerUser(false)
        .setConfirmationMessage('Check your email to see if the registration is completed!')
        /*
        allow users outside the domain to use the form
        */
        .setRequireLogin(false);

    var emailVal = FormApp.createTextValidation().requireTextIsEmail()
    .build(); // NECESSARY ALTHOUGH TS shows error!

    form.addTextItem().setTitle('email').setRequired(true).setValidation(emailVal);
    form.addTextItem().setTitle('personal key').setRequired(true);

    var linksSheet = SpreadsheetApp.getActive().getSheetByName(LINKS.sheet);
    linksSheet.getRange("B3").setValue(form.getPublishedUrl());
    linksSheet.getRange("C3").setValue(form.getId());
    linksSheet.getRange("A3").setValue("Verification");

    ScriptApp.newTrigger('renameSheetVer').timeBased().after(1000).create(); // make less, check name?
}
