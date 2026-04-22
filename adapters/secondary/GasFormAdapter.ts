// ── GAS Form Adapter ───────────────────────────────────────────────────────────
//
// Implements IFormAdapter using FormApp.

class GasFormAdapter implements IFormAdapter {
  /**
   * Fetches raw responses from a Google Form and converts ItemResponse objects
   * to plain data (strings / string arrays).
   *
   * This is the infrastructure boundary: all FormApp API calls for response
   * retrieval are isolated here so that PaScoreService remains free of Google API calls.
   *
   * @param formId  The Google Form ID
   * @param domain  true to read respondent email from session; false when email is a text field
   */
  getFormResponses(formId: string, domain: boolean): FormResponseData {
    const form = FormApp.openById(formId);
    const formResponses = form.getResponses();
    const responses: Array<Array<string | string[]>> = [];
    const emails: string[] = [];

    for (let i = 0; i < formResponses.length; i++) {
      const formResponse = formResponses[i];
      emails[i] = domain ? formResponse.getRespondentEmail() : "";
      Logger.log("getFormResponses respondent email: " + emails[i]);

      const itemResponses = formResponse.getItemResponses();
      responses[i] = [];
      for (let j = 0; j < itemResponses.length; j++) {
        responses[i][j] = itemResponses[j].getResponse() as string | string[];
      }
      Logger.log("getFormResponses responses: " + responses[i]);
    }

    return { emails, responses };
  }

  getPublishedUrl(formId: string): string {
    return FormApp.openById(formId).getPublishedUrl();
  }

  setAcceptingResponses(
    formId: string,
    enabled: boolean,
    closedMessage?: string,
  ): void {
    const form = FormApp.openById(formId);
    form.setAcceptingResponses(enabled);
    if (!enabled && closedMessage) {
      form.setCustomClosedFormMessage(closedMessage);
    }
  }
}
