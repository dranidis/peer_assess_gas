// ── Sheet PA-Project Repository ────────────────────────────────────────────────
//
// Helper functions and Sheet*Repository implementation for PA-project entries.

function deletePALinks() {
  var sp = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  if (sp == null) {
    sheetLog("deletePALinks: Sheet not found: " + PA_PROJECTS.sheet);
    return;
  }
  var c1 = getSheetColumn_(PA_PROJECTS, "formId");
  var c2 = getSheetColumn_(PA_PROJECTS, "formURL");
  var numRows = sp.getLastRow() - 1;

  if (numRows > 0) {
    sp.getRange(2, c1, numRows).clearContent();
    sp.getRange(2, c2, numRows).clearContent();
  }
}

function getPaProjects(): Row<PaProject>[] {
  return getRows_<PaProject>(PA_PROJECTS);
}

function getPaProject(paid: string, projectkey: string): Row<PaProject> | null {
  var pps = getPaProjects().filter(
    (pp) => pp.data.pakey == paid && pp.data.projectkey == projectkey,
  );
  if (pps.length == 1) {
    return pps[0];
  }
  if (pps.length > 1) {
    throw new Error(
      "More than one entries in the " +
        PA_PROJECTS.sheet +
        " sheet have same " +
        paid +
        " and " +
        projectkey +
        " keys!",
    );
  }
  return null;
}

function getGroupGrade(paid: string, projectkey: string): number | null {
  var pp = getPaProject(paid, projectkey);
  if (pp == null) {
    return null;
  }
  return pp.data.grade;
}

function addPaProject(paid: string, projectkey: string) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  if (sheet == null) {
    sheetLog("addPaProject: Sheet not found: " + PA_PROJECTS.sheet);
    return null;
  }
  sheet.appendRow([paid, projectkey]);
  return getPaProject(paid, projectkey);
}

function savePeerAssessmentLinks(
  paid: string,
  projectkey: string,
  formId: string,
  publishedUrl: string,
) {
  var sheet = SpreadsheetApp.getActive().getSheetByName(PA_PROJECTS.sheet);
  if (sheet == null) {
    sheetLog("savePeerAssessmentLinks: Sheet not found: " + PA_PROJECTS.sheet);
    return;
  }
  var pp = getPaProject(paid, projectkey);
  if (pp == null) {
    sheetLog("Not found: " + paid + "," + projectkey);
    pp = addPaProject(paid, projectkey);
    if (pp == null) {
      sheetLog("Failed to add PA, Proj: " + paid + "," + projectkey);
      return;
    }
    sheetLog("PA, Proj added: " + paid + "," + projectkey);
  }

  sheet.getRange(pp.row, 5).setValue(formId);
  sheet.getRange(pp.row, 6).setValue(publishedUrl);
}

function getProjectkeyFromFormId(paFormId: string) {
  var pps = getPaProjects();

  for (var p = 0; p < pps.length; p++) {
    if (pps[p].data.formId == paFormId) return pps[p].data.projectkey;
  }
  return null;
}

function getPaProjectFromFormId(paFormId: string): Row<PaProject> | null {
  var pps = getPaProjects();

  for (var p = 0; p < pps.length; p++) {
    if (pps[p].data.formId == paFormId) return pps[p];
  }
  return null;
}

class SheetPaProjectRepository implements IPaProjectRepository {
  getAll(): Row<PaProject>[] {
    return getPaProjects();
  }
  find(paId: string, projectkey: string): Row<PaProject> | null {
    return getPaProject(paId, projectkey);
  }
  findByFormId(formId: string): Row<PaProject> | null {
    return getPaProjectFromFormId(formId);
  }
  getGroupGrade(paId: string, projectkey: string): number | null {
    return getGroupGrade(paId, projectkey);
  }
  getProjectkeyFromFormId(formId: string): string | null {
    return getProjectkeyFromFormId(formId);
  }
  add(paId: string, projectkey: string): Row<PaProject> | null {
    return addPaProject(paId, projectkey);
  }
  saveLinks(
    paId: string,
    projectkey: string,
    formId: string,
    publishedUrl: string,
  ): void {
    savePeerAssessmentLinks(paId, projectkey, formId, publishedUrl);
  }
  deleteLinks(): void {
    deletePALinks();
  }
}
