// ── Sheet Project Repository ───────────────────────────────────────────────────
//
// Helper functions and Sheet*Repository implementation for projects.

function addProject(proj: Project) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PROJECTS.sheet);
  if (ss == null) {
    sheetLog("addProject: Sheet not found: " + PROJECTS.sheet);
    return;
  }
  ss.appendRow([proj.name, proj.key]);
}

function getProjectRows() {
  return getRows_<Project>(PROJECTS);
}

function getProjects(): Project[] {
  return getData_<Project>(PROJECTS);
}

function isProjectkey(projectkey: string): boolean {
  var projects = getData_<Project>(PROJECTS);

  for (var p = 0; p < projects.length; p++) {
    if (projects[p].key == projectkey) return true;
  }
  return false;
}

function getProjectKeys(): string[] {
  return getProjectRows().map((row) => row.data.key);
}

class SheetProjectRepository implements IProjectRepository {
  getAll(): Project[] {
    return getProjects();
  }
  getRows(): Row<Project>[] {
    return getProjectRows();
  }
  add(project: Project): void {
    addProject(project);
  }
  isValidKey(key: string): boolean {
    return isProjectkey(key);
  }
  getKeys(): string[] {
    return getProjectKeys();
  }
}
