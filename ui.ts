function addMenu() {
  let ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('PA')
    .addSubMenu(ui.createMenu('Peer assessments')
      .addItem('Open', 'openPAitem')
      .addItem('Update deadlines', 'updateDeadlineMenuItem')
      .addItem('Calculate', 'calculateItem')
      .addItem('Finalize', 'finalizeItem')
    )
    .addSeparator()
    .addSubMenu(ui.createMenu('e-Mails')
      .addItem('Send reminder to those who did not verify the account', 'menuItem3')
      .addItem('Send reminder to those who did not submit the peer assessment', 'menuItem2')
      .addItem('Send final peer assessment results', 'announceItem')
    )
    .addSubMenu(ui.createMenu('Links')
      .addItem('Registration URL', 'showRegItem')
    )
    .addSubMenu(ui.createMenu('Install')
      // .addItem('Install all sheets', 'installSheetsItem')
      .addItem('Install Registration & Verification form', 'installFormsItem')
    )
    .addItem('Help', 'showSidebar')
    .addToUi();
}

function getPAselected(pas: PeerAssessment[]): PeerAssessment {
  let activeSheet = SpreadsheetApp.getActiveSheet();

  let selection = activeSheet.getSelection();

  if (selection.getActiveSheet().getName() != PAS.sheet) {
    Browser.msgBox('Please click on a row with a peer assessment in the ' + PAS.sheet + ' sheet.');
    return;
  }
  let row = selection.getCurrentCell().getRow();
  let index = row - 2
  if (index < 0 || index >= pas.length) {
    Browser.msgBox('Please click on a row with a peer assessment.');
    return null
  }

  //  return pa;
  return pas[index];
}

function checkInstalled() {
  let logSheet = SpreadsheetApp.getActive().getSheetByName(LOG.sheet);
  if (logSheet) {
    return logSheet.getRange(1, 1).getValue() === 'INSTALLED';
  }
  return false;
}

function installSheetsItem() {
  install();
  SpreadsheetApp.getActive().getSheetByName(LOG.sheet).getRange(1, 1).setValue('INSTALLED');

  Browser.msgBox('Installation is complete.\n Click PA -> Help to read the instructions how to setup the peer assessment.\n');
}

function installFormsItem() {
  installForms();
}

function openPAitem() {
  let pas = getPAs();
  let pa;
  if (pas.length == 1)
    pa = pas[0];
  else
    pa = getPAselected(pas);

  //  if (pa.open) {
  if (pa.state != PaState.INACTIVE && pa.state != "") {
    Browser.msgBox('The peer assessment ' + pa.name + " has already been opened.");
    return;
  }

  // TODO: CHECK if date is correctly entered
  //
  // try {
  //   //var time = new Date(pa.dealine.getTime());
  //   var time = pa.dealine.getTime();
  // } catch (e) {
  //   Browser.msgBox("Execution is aborted. Deadline: '" + pa.deadline + "' has not been properly entered.\n " +
  //   e.message)
  //   return;
  // }

  // //return;


  if (showAlertBeforeOpen_(pa)) {
    openPA(pa);
  }
}

/**
 currently fixed to first row in Peer Assessments
*/
function updateDeadlineMenuItem() {
  var pas = getPAs();
  var pa;
  if (pas.length == 1)
    pa = pas[0];
  else
    pa = getPAselected(pas);

  if (pa == null)
    return;

  if (pa.state != PaState.OPEN && pa.state != PaState.CLOSED) {
    SpreadsheetApp.getActiveSpreadsheet().toast('The peer assessment ' + pa.name + "'s deadline cannot get updated." +
      "\nFinished or inactive projects cannot change.");
    return;
  }

  if (pa.deadline.getTime() < (new Date()).getTime()) {
    SpreadsheetApp.getActiveSpreadsheet().toast("Deadline of " + pa.name + " is in the past! ");
    return;
  }

  setNewDeadline(pa);

  SpreadsheetApp.getActiveSpreadsheet().toast("Deadline of " + pa.name + " changed to " + pa.deadline);
}


function calculateItem() {
  let pas = getPAs();
  let pa;
  if (pas.length == 1)
    pa = pas[0];
  else
    pa = getPAselected(pas);
  if (pa == null)
    return;

  if (pa.state == PaState.FINALIZED) {
    Browser.msgBox('The results for ' + pa.name + " are already announced.");
    return;
  }
  if (pa.state != PaState.OPEN && pa.state != PaState.CLOSED && pa.state != PaState.FINALIZED) {
    Browser.msgBox('There are no results for ' + pa.name + ".");
    return;
  }
  processPA(pa, false);
}

function finalizeItem() {
  let pas = getPAs();
  let pa;
  if (pas.length == 1)
    pa = pas[0];
  else
    pa = getPAselected(pas);
  if (pa == null)
    return;

  if (pa.state != PaState.CLOSED) {
    Browser.msgBox('Only CLOSED assessments can be finalized. ');
    return;
  }
  processPA(pa, true);
}


function announceItem() {
  let pas = getPAs();
  let pa;
  if (pas.length == 1)
    pa = pas[0];
  else
    pa = getPAselected(pas);
  if (pa == null)
    return;

  if (pa.state != PaState.FINALIZED) {
    Browser.msgBox('Only FINALIZED results can be sent to students. ');
    return;
  }
  announcePA(pa);
}

function showRegItem() {
  let registrationFormId = getRegistrationFormId();
  if (registrationFormId != null)
    Browser.msgBox(FormApp.openById(getRegistrationFormId()).getPublishedUrl());
  else
    Browser.msgBox('There is no registration URL. Click PA -> Install -> Install Registration & Verification form.');
}

function menuItem2() {
  let pas = getPAs();
  let pa;
  if (pas.length == 1)
    pa = pas[0];
  else
    pa = getPAselected(pas);
  if (pa == null)
    return;

  if (pa.state != PaState.OPEN) {
    Browser.msgBox('The assessment ' + pa.name + " is not OPEN. ");
    return;
  }


  sendReminderToNonSubmissions(pa);
}

function menuItem3() {
  sendReminderForConfirmation();
}

function showSidebar() {
  //  var html = HtmlService.createHtmlOutputFromFile('html/help.html')
  let template = HtmlService.createTemplateFromFile('html/help.html');
  template.grades = PA_PROJECTS.sheet
  template.pa = PAS.sheet
  let html = template.evaluate()
    .setTitle('Help')
    .setWidth(500);

  Logger.log(html.getContent());
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
    .showSidebar(html);
}


/*

onEdit

*/
function onEdit(e) {
  let range = e.range;
  let shName = range.getSheet().getName();
  let row = range.getRow();
  let col = range.getColumn();
  let value = range.getValue();

  Logger.log("EDITED " + shName + ":" + row + "," + col)

  if (shName == PAS.sheet) {
    let deadlineCol = 3;
    if (col == deadlineCol) {
      let pa = readPA(row);
      if (pa == null)
        return;

      Logger.log(pa);
      if (pa.deadline.getTime() < (new Date()).getTime()) {
        Browser.msgBox("Deadline of " + pa.name + " is in the past! ");
        return;
      }
      if (pa.state != PaState.OPEN && pa.state != PaState.CLOSED) {
        return;
      }
      Browser.msgBox("Run 'PA -> Peer Assessments -> Updates Deadlines' from the menu to update " + pa.name + "'s deadline to " + value);
    }
  }
}

function getPaIdFromUI() {
  let ui = SpreadsheetApp.getUi();
  let response = ui.prompt('Peer assessment id?');

  // Process the user's response.
  if (response.getSelectedButton() == ui.Button.OK) {
    Logger.log('The user\'s name is %s.', response.getResponseText());
    return response.getResponseText();
  } else {
    Logger.log('The user clicked the close button in the dialog\'s title bar.');
    return "";
  }
}

function showAlertBeforeMail_(students: Student[]) {
  Logger.log("EMAIL TO " + students)
  let ui = SpreadsheetApp.getUi(); // Same variations.

  let stString = students.map(s => s.email).join('; ');

  let result = ui.alert(
    'You are going to send emails to ' + students.length + ' students.',
    stString + '\n\n' + 'Are you sure you want to continue?',
    ui.ButtonSet.YES_NO);

  // Process the user's response.
  return result == ui.Button.YES
}

function showAlertBeforeOpen_(pa: PeerAssessment) {
  let ui = SpreadsheetApp.getUi();

  let result = ui.alert(
    'Opening the peer assessment ' + pa.name,
    'The peer assessment contains ' +
    getQuestions().length +
    ' questions. Are you sure you want to continue?',
    ui.ButtonSet.YES_NO);

  // Process the user's response.
  return result == ui.Button.YES
}


