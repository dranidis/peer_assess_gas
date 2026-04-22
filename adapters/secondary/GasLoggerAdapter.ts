// ── GAS Logger Adapter ─────────────────────────────────────────────────────────
//
// Implements ILogger using the GAS Logger service.

/** Adapter that routes ILogger calls to the GAS Logger service. */
const gasLogger: ILogger = {
  log(message: string): void {
    Logger.log(message);
  },
};
