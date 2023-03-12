/**
 * Adds a custom menu with items to show the sidebar and dialog.
 *
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  /*
    run as Add on
  */
  //  SpreadsheetApp.getUi()
  //      .createAddonMenu()
  //      .addItem('Install', 'install')
  //      //.addItem('AddMenu', 'addMenu')
  //      .addToUi();

  /*
    run as doc-script
  */
  addMenu();

  if (!checkInstalled()) {
    Browser.msgBox('PA will now install all necessary sheets. Click OK and wait until'
    + ' you see the message "Installation is complete."\n'
    + ' If the message does not appear (this could be due to time-out) reload the page.');
    installSheetsItem();
  }

}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 *
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}

function createSheet_(sheetModel: Sheet) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(sheetModel.sheet);

  if (sheet == null)
    sheet = ss.insertSheet(sheetModel.sheet);

  if (sheetModel.hidden)
    sheet.hideSheet();

  if (sheetModel.columns.length > 0) {
    sheet.getRange(1, 1, 1, sheetModel.columns.length)
      .setValues([sheetModel.columns])
      .setBackground("black")
      .setFontWeight("bold")
      .setFontColor("white");

    sheet.autoResizeColumns(1, sheetModel.columns.length)
  }


  if (sheetModel.protected) {
    var protection = sheet.protect().setDescription(sheetModel.sheet + " protection");
    if (sheetModel.unprotected != '') {
      var unprotected = sheet.getRange(sheetModel.unprotected);
      protection.setUnprotectedRanges([unprotected]);
    }
    protection.setWarningOnly(true);
  }
}

function install() {
  var ss = SpreadsheetApp.getActive();

  SHEETS.forEach(createSheet_);

  installSettings();
  installQuestions();
  addFormulas_();


  // addMenu(); // SpreadsheetApp.getUi() canno get called from script unless in onOpen()
}

function installForms() {
  installFormSubmitTrigger(); // not on addon

  Logger.log("Curent registration form Id: " + getRegistrationFormId());

  var regForm = getRegistrationFormId();
  if (regForm == '' || regForm === "undefined" || regForm == null) {

    var projects = getProjects();
    if (projects.length == 0) {
      Browser.msgBox('You have to enter the project first in the "PROJECTS" sheet!\n');
      return;
    }
    installRegistrationForm();
  } else {
    Browser.msgBox('There is already a registration link in the Links sheet.\n');
    return;
  }

  var verForm = getVerificationFormId();
  if (verForm == '' || verForm === "undefined" || verForm == null) {
    installVerificationForm();
  } else {
    Browser.msgBox('There is already a registration link in the Links sheet.\n');
    return;
  }

}

function addFormulas_() {
  var sh = SpreadsheetApp.getActive().getSheetByName(PROJECTS.sheet);
  // number of students in each project
  sh.getRange("C2").setFormula('=ArrayFormula(IF(ISBLANK(B2:B), "", COUNTIF(Students!A:D, B2:B)))')
  // no of students who confirmed their accounts
  sh.getRange("D2").setFormula('=ArrayFormula(IF(ISBLANK(B2:B), "", COUNTIFS(Students!D:D, B2:B, Students!F:F, "=true")))')
  //  // no of students who filled the assessment
  //  sh.getRange("g1").setFormula('=ArrayFormula(IF(ISBLANK(B1:B), "", COUNTIFS(Students!D:D, B1:B, Students!G:G, "=true")))')
}

function installFormSubmitTrigger() {
  var ss = SpreadsheetApp.getActive();
  // first delete all triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i])
  }
  ScriptApp.newTrigger('onFormSubmit').forSpreadsheet(ss).onFormSubmit()
    .create();
}
