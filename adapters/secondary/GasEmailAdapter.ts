// ── GAS Email Adapter ──────────────────────────────────────────────────────────
//
// Implements IEmailAdapter using HtmlService and GmailApp.

class GasEmailAdapter implements IEmailAdapter {
  renderTemplate(templateFile: string, vars: Record<string, unknown>): string {
    const t = HtmlService.createTemplateFromFile(templateFile);
    Object.assign(t, vars);
    return t.evaluate().getContent();
  }

  send(
    to: string,
    subject: string,
    body: string,
    options?: EmailSendOptions,
  ): void {
    if (testMode) {
      Logger.log("TEST MODE ON; Mocking emails");
      sheetLog("MOCKING EMAIL SENT");
      sheetLog(
        "TO: " +
          to +
          "\nSUBJECT: " +
          subject +
          "\nBODY: " +
          body +
          "\nOPTIONS: " +
          JSON.stringify(options),
      );
      return;
    }

    if (options !== undefined) {
      GmailApp.sendEmail(
        to,
        subject,
        body,
        options as GoogleAppsScript.Gmail.GmailAdvancedOptions,
      );
    } else {
      GmailApp.sendEmail(to, subject, body);
    }
  }
}
