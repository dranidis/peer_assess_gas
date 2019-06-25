function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

function getFormFromSubmissionEvent(e) {
  return FormApp.openByUrl(e.range.getSheet().getFormUrl());
}

function getFormResponse_(e) {
  var googleForm = getFormFromSubmissionEvent(e);
  
  // Get the form response based on the timestamp
  var timestamp = new Date(e.namedValues.Timestamp[0]);
  var formResponse = googleForm.getResponses(timestamp).pop();
  
  if (formResponse == null ) {
    sheetLog("getEditResponseUrl_(e): Main method to get formResponse failed");
//    happens sometimes. Timestamp from namedValues is a bit later than the timestamp in the sheet
    // probably due to lack of milliseconds in sheet
    var sheet = SpreadsheetApp.getActive().getSheetByName(e.range.getSheet().getName())
    var row = e.range.getRow()
    var timestamp = sheet.getRange(row, 1).getValue();
    var formResponse = googleForm.getResponses(timestamp).pop();
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
      var url = sheet.getFormUrl()
      if (url != null) {
        var form = FormApp.openByUrl(url)
        return form.getId() === formId;
      }
      return false;
    });
  return sheets[0]; // a `Sheet` or `undefined`
}


function generateRandomKey() {
  var length = 5;
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  text = ""; //Reset text to empty string
  for(var i=0;i<length;i++){
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  Logger.log(text);
  return text
}

/**

generates a unique key for student personal key

*/
function generateUniqueKey() {
  var key = generateRandomKey();
  while(isProjectkey(key)) {
    key = generateRandomKey();
  }
  return key;
}

function deleteAllSheetsWithForms() {
  var sheets = SpreadsheetApp.getActive().getSheets();
  for(var sh = 0; sh < sheets.length; sh++) {
    var url = sheets[sh].getFormUrl()
    if (url != null) {
      var form = FormApp.openByUrl(url);
      Logger.log("Sheet %s URL %s", sheets[sh].getName(), form.getId());
      form.removeDestination();
      SpreadsheetApp.getActive().deleteSheet(sheets[sh]);
      DriveApp.getFileById(form.getId()).setTrashed(true);
    }    
  }
}
