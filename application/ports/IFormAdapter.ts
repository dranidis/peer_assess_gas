// ── Form Adapter Port ──────────────────────────────────────────────────────────
//
// Wraps FormApp operations needed by the application layer.
// No GoogleAppsScript types leak through this interface.

/** Raw data fetched from a Google Form – produced by the form adapter. */
interface FormResponseData {
  emails: string[];
  responses: Array<Array<string | string[]>>;
}

interface IFormAdapter {
  /**
   * Fetches raw responses from a Google Form, stripping all GAS types.
   * @param formId  The Google Form ID
   * @param domain  true to read respondent email from session metadata;
   *                false when email is supplied as a text response field
   */
  getFormResponses(formId: string, domain: boolean): FormResponseData;

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
