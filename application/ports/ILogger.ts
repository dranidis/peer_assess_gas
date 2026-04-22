// ── Logger Port ────────────────────────────────────────────────────────────────
//
// Isolates the domain from any concrete logging implementation.

/** Logger port – isolates the domain from any concrete logging implementation. */
interface ILogger {
  log(message: string): void;
}
