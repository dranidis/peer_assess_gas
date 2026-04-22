// ── Sheet Logger Adapter ───────────────────────────────────────────────────────
//
// Implements ILogger by appending to the spreadsheet log sheet.

/** Adapter that routes ILogger calls to the sheet log. */
const sheetLogger: ILogger = {
  log(message: string): void {
    sheetLog(message);
  },
};
