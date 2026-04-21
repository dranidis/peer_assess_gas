// ── GAS Form Adapter ───────────────────────────────────────────────────────────
//
// Implements IFormAdapter using FormApp.

class GasFormAdapter implements IFormAdapter {
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
