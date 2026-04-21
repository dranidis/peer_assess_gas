// ── Form Adapter Port ──────────────────────────────────────────────────────────
//
// Wraps FormApp operations needed by the application layer.
// No GoogleAppsScript types leak through this interface.

interface IFormAdapter {
  /** Returns the published URL for the given form ID. */
  getPublishedUrl(formId: string): string;

  /**
   * Opens or closes a form for responses.
   * When closing, an optional message is shown to respondents.
   */
  setAcceptingResponses(
    formId: string,
    enabled: boolean,
    closedMessage?: string,
  ): void;
}
