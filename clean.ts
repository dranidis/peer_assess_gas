/**
 * For all projects, unlinks the peer assessment forms and
 * deletes the sheet gathering responses.
 * Also clears all links/ids of PA forms.
 */
function deletePASheets() {
  let projectKeys = getProjectKeys();
  let pas = getPAs();
  for (let pa of pas) {
    for (let projectKey of projectKeys) {
      let pp = getPaProject(pa.id, projectKey);
      if (pp == null || pp.data.formId == "") {
        continue;
      }

      let form = FormApp.openById(pp.data.formId);

      let sheet = getFormResponseSheet_(form.getId());
      form.removeDestination();
      SpreadsheetApp.getActive().deleteSheet(sheet);

      DriveApp.getFileById(form.getId()).setTrashed(true);
    }
  }
  deletePALinks();
}

function deleteRegVerSheets() {
  deleteRegistrationSheet_();
  deleteVerificationSheet_();
  deleteLinks();
}

function deleteRegistrationSheet_() {
  let form = FormApp.openById(getRegistrationFormId());
  let sheet = getFormResponseSheet_(form.getId());
  form.removeDestination();
  SpreadsheetApp.getActive().deleteSheet(sheet);
  DriveApp.getFileById(form.getId()).setTrashed(true);
}

function deleteVerificationSheet_() {
  let form = FormApp.openById(getVerificationFormId());
  let sheet = getFormResponseSheet_(form.getId());
  form.removeDestination();
  SpreadsheetApp.getActive().deleteSheet(sheet);
  DriveApp.getFileById(form.getId()).setTrashed(true);
}
