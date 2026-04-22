// ── Composition Root ───────────────────────────────────────────────────────────
//
// Wires together all ports and adapters into the application services.
// This is the only place that knows about concrete implementations.

/** Shared PaScoreService instance wired with the GAS logger adapter. */
const paScoreService = new PaScoreService(gasLogger);

const studentRepo: IStudentRepository = new SheetStudentRepository();
const projectRepo: IProjectRepository = new SheetProjectRepository();
const paRepo: IPaRepository = new SheetPaRepository();
const paProjectRepo: IPaProjectRepository = new SheetPaProjectRepository();

const formAdapter: IFormAdapter = new GasFormAdapter();
const emailAdapter: IEmailAdapter = new GasEmailAdapter();
const emailService = new EmailService(emailAdapter);

const paService = new PaService(
  studentRepo,
  projectRepo,
  paRepo,
  paProjectRepo,
  emailService,
  formAdapter,
  sheetLogger,
);
