// ── Sheet PA Repository ────────────────────────────────────────────────────────
//
// Helper functions and Sheet*Repository implementation for peer assessments.

let PA_FIRST_ROW = 2;

function addPa(reg: PeerAssessment) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (ss == null) {
    sheetLog("addPa: Sheet not found: " + PAS.sheet);
    return;
  }
  ss.appendRow([reg.name, reg.id, reg.deadline, reg.state]);
}

function readPA(row: number): PeerAssessment | null {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (ss == null) {
    sheetLog("readPA: Sheet not found: " + PAS.sheet);
    return null;
  }
  if (row > ss.getLastRow()) return null;
  var read = ss.getRange(row, 1, 1, 4).getValues();
  var values = read[0];
  var pa: PeerAssessment = {
    name: values[0],
    id: values[1],
    deadline: values[2],
    state: values[3],
  };
  return pa;
}

function getPAs(): PeerAssessment[] {
  return getData_<PeerAssessment>(PAS);
}

function getPA(paId: string) {
  var pas = getPAs().filter(function (p) {
    return p.id == paId;
  });
  if (pas.length > 0) return pas[0];

  return null;
}

function setState(pa: PeerAssessment, newState: PaState) {
  var ss = SpreadsheetApp.getActive().getSheetByName(PAS.sheet);
  if (ss == null) {
    sheetLog("setState: Sheet not found: " + PAS.sheet);
    return;
  }
  var last = ss.getLastRow();
  for (var row = PA_FIRST_ROW; row <= last; row++) {
    var paRow = readPA(row);
    if (paRow == null) continue;
    if (paRow.id == pa.id) {
      ss.getRange(row, 4).setValue(newState);
      return;
    }
  }
}

function getFinalSheetName(pa: PeerAssessment) {
  return "Final PA: " + pa.id;
}

function prepareFinalSheet(pa: PeerAssessment) {
  var sp = SpreadsheetApp.getActive();
  sp.insertSheet(getFinalSheetName(pa), sp.getNumSheets() + 1);
  var sh = sp.getSheetByName(getFinalSheetName(pa));
  if (sh == null) {
    sheetLog("prepareFinalSheet: Sheet not found: " + getFinalSheetName(pa));
    return;
  }
  sh.appendRow(["proj", "name", "email", "Grade", "Penalty", "PA score"]);
}

class SheetPaRepository implements IPaRepository {
  getAll(): PeerAssessment[] {
    return getPAs();
  }
  findById(id: string): PeerAssessment | null {
    return getPA(id);
  }
  add(pa: PeerAssessment): void {
    addPa(pa);
  }
  setState(pa: PeerAssessment, newState: PaState): void {
    setState(pa, newState);
  }
}
