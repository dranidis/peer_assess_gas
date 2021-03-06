function setUpPeerAssessmentForm_(pa, project, questions) {
    var ss = SpreadsheetApp.getActive();

    var form = FormApp.create('Peer Assessment Form: ' + pa.name + " for " + project.data.key);
    form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
    form.setAllowResponseEdits(true)
        .setLimitOneResponsePerUser(true)
        .setConfirmationMessage('Check your email for successful submission of the peer assessment!')

    if (getSettings().domain) {
        form.setRequireLogin(true)
            .setCollectEmail(true)
    } else {
        form.setRequireLogin(false)
        var emailVal = FormApp.createTextValidation().requireTextIsEmail().build();
        var emailItem = form.addTextItem().setTitle('email').setRequired(true)
        emailItem.setValidation(emailVal)

        var keyItem = form.addTextItem().setTitle('personal key').setRequired(true);
    }

    var students = getStudents(project.data.key);
    var studentNames = []
    for (var s = 0; s < students.length; s++) {
        studentNames[s] = students[s].fname + " " + students[s].lname;
    }

    for (var i = 0; i < questions.length; i++) {
        var item = form.addGridItem().setTitle(questions[i])
            .setRows(studentNames)
            .setRequired(true)
            .setColumns([1, 2, 3, 4, 5])
            .setHelpText("1: Strongly Disagree - 5: Strongly Agree");
    }

    for (var i = 0; i < students.length; i++) {
        var item = form.addParagraphTextItem();
        item.setTitle("Comments for " + studentNames[i])
        .setHelpText("Comments are welcome and required in cases of extreme assessment (i.e. 1 or 5)")
    }
    savePeerAssessmentLinks(pa.id, project.data.key, form);
    form.setAcceptingResponses(true);
}

function renameSheetReg() {
    var sh = getFormResponseSheet_(getRegistrationFormId());
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
        var item = form.addTextItem().setTitle('email').setRequired(true)
        var emailVal = FormApp.createTextValidation().requireTextIsEmail().build();
        item.setValidation(emailVal);
    }

    // form.addTextItem().setTitle('project key').setRequired(true);
    var item = form.addMultipleChoiceItem();
    item.setTitle('Select your project').setRequired(true);

    item.setChoiceValues(getProjectKeys())
    .showOtherOption(false);

    ScriptApp.newTrigger('renameSheetReg').timeBased().after(2000).create(); // make less, check name?

    setRegistrationLink(form);
}

function renameSheetVer() {
    var sh = getFormResponseSheet_(getVerificationFormId());
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
        
    var emailVal = FormApp.createTextValidation().requireTextIsEmail().build();
    form.addTextItem().setTitle('email').setRequired(true).setValidation(emailVal);
    form.addTextItem().setTitle('personal key').setRequired(true);

    ScriptApp.newTrigger('renameSheetVer').timeBased().after(5000).create(); // make less, check name?

    var linksSheet = SpreadsheetApp.getActive().getSheetByName(LINKS.sheet);
    linksSheet.getRange("B3").setValue(form.getPublishedUrl())
    linksSheet.getRange("C3").setValue(form.getId())
    linksSheet.getRange("A3").setValue("Verification")
}
