/*
For all projects, unlinks the peer assessment forms and deletes the sheet gathering responses
Also clears all links/ids of PA forms.
*/
function deletePASheets() {
    var projects = getProjects();
    var pas = getPAs();
    for (var i = 0; i < pas.length; i++) {
        for (var p = 0; p < projects.length; p++) {

            var pp = getPaProject(pas[i].id, projects[p].data.key);

            if (pp.data.formId == "")
                continue;

            var form = FormApp.openById(pp.data.formId);

            var sheet = getFormResponseSheet_(form.getId());
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
    var form = FormApp.openById(getRegistrationFormId());
    var sheet = getFormResponseSheet_(form.getId());
    form.removeDestination();
    SpreadsheetApp.getActive().deleteSheet(sheet);
    DriveApp.getFileById(form.getId()).setTrashed(true);
}

function deleteVerificationSheet_() {
    var form = FormApp.openById(getVerificationFormId());
    var sheet = getFormResponseSheet_(form.getId());
    form.removeDestination();
    SpreadsheetApp.getActive().deleteSheet(sheet);
    DriveApp.getFileById(form.getId()).setTrashed(true);
}
