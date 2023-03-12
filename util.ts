function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function getFormFromSubmissionEvent(e) {
  return FormApp.openByUrl(e.range.getSheet().getFormUrl());
}

function getFormResponse_(e) {
  let googleForm = getFormFromSubmissionEvent(e);

  // Get the form response based on the timestamp
  let timestamp = new Date(e.namedValues.Timestamp[0]);
  let formResponse = googleForm.getResponses(timestamp).pop();

  if (formResponse == null ) {
    sheetLog("getEditResponseUrl_(e): Main method to get formResponse failed");
//    happens sometimes. Timestamp from namedValues is a bit later than the timestamp in the sheet
    // probably due to lack of milliseconds in sheet
    let sheet = SpreadsheetApp.getActive().getSheetByName(e.range.getSheet().getName())
    let row = e.range.getRow()
    let timestamp = sheet.getRange(row, 1).getValue();
    let formResponse = googleForm.getResponses(timestamp).pop();
    if (formResponse == null)
      return null;

    // make sure the email in the sheet is the same with the enamedvalues
    // to avoid sending the form to another user
    if (e.namedValues.email != sheet.getRange(row, 2).getValue())
        return formResponse;
  }
  return formResponse
}

function getFormResponseSheet_(formId) {
  const sheets = SpreadsheetApp.getActive().getSheets().filter(
    function (sheet) {
      let url = sheet.getFormUrl()
      if (url != null) {
        let form = FormApp.openByUrl(url)
        return form.getId() === formId;
      }
      return false;
    });
  return sheets[0]; // a `Sheet` or `undefined`
}


function generateRandomKey(): string {
  let length = 5;
  let text = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  text = ""; //Reset text to empty string
  for(let i=0;i<length;i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  Logger.log(text);
  return text
}

/**
 * Generates a unique alphanumeric key for student personal key
 * with length 5
 */
function generateUniqueKey(): string {
  let key = generateRandomKey();
  while(isProjectkey(key)) {
    key = generateRandomKey();
  }
  return key;
}

function deleteAllSheetsWithForms() {
  let sheets = SpreadsheetApp.getActive().getSheets();
  for(let sh = 0; sh < sheets.length; sh++) {
    let url = sheets[sh].getFormUrl()
    if (url != null) {
      let form = FormApp.openByUrl(url);
      Logger.log("Sheet %s URL %s", sheets[sh].getName(), form.getId());
      form.removeDestination();
      SpreadsheetApp.getActive().deleteSheet(sheets[sh]);
      DriveApp.getFileById(form.getId()).setTrashed(true);
    }
  }
}
/**
 * Returns a string of lenght len containing the initial str argument
 * and the rest of the string filled with _.
 * If the lenght is less than the length of the original,
 * returns the original string.
 *
 * @param str original string
 * @param len lenght of returned string
 */
function fillWithUnderScore(str: string, len: number): string {
  let strLen = str.length;
  for(let i = 0; i < len - strLen; i++) {
    str += "_";
  }
  return str;
}