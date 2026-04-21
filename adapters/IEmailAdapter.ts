// ── Email Adapter Port ─────────────────────────────────────────────────────────
//
// Wraps HtmlService (template rendering) and GmailApp (sending).
// No Google API types leak through this interface, making callers testable
// with a simple stub or spy implementation.

interface EmailSendOptions {
  htmlBody?: string;
}

interface IEmailAdapter {
  /**
   * Renders an HtmlService template file with the given variables and returns
   * the resulting HTML string.
   */
  renderTemplate(templateFile: string, vars: Record<string, unknown>): string;

  /**
   * Sends an email. In test mode, implementations should log rather than send.
   */
  send(
    to: string,
    subject: string,
    body: string,
    options?: EmailSendOptions,
  ): void;
}
