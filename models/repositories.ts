// ── Repository Ports ───────────────────────────────────────────────────────────
//
// These interfaces define what the application layer needs from persistence.
// They have no dependency on Google Sheets or any Google API.
// Concrete implementations live in model.ts as Sheet*Repository classes.

interface IStudentRepository {
  getAll(): Student[];
  findByEmail(email: string): Row<Student> | null;
  findByProject(projectkey: string): Student[];
  add(student: Student): void;
  save(student: Row<Student>): void;
  setVerified(student: Row<Student>, enabled: boolean): void;
  setSubmittedPA(student: Row<Student>, pakey: string, enabled: boolean): void;
  getHeading(): string[];
  addPAColumn(pakey: string): number;
  sort(): void;
}

interface IProjectRepository {
  getAll(): Project[];
  getRows(): Row<Project>[];
  add(project: Project): void;
  isValidKey(key: string): boolean;
  getKeys(): string[];
}

interface IPaRepository {
  getAll(): PeerAssessment[];
  findById(id: string): PeerAssessment | null;
  add(pa: PeerAssessment): void;
  setState(pa: PeerAssessment, newState: PaState): void;
}

interface IPaProjectRepository {
  getAll(): Row<PaProject>[];
  find(paId: string, projectkey: string): Row<PaProject> | null;
  findByFormId(formId: string): Row<PaProject> | null;
  getGroupGrade(paId: string, projectkey: string): number | null;
  getProjectkeyFromFormId(formId: string): string | null;
  add(paId: string, projectkey: string): Row<PaProject> | null;
  saveLinks(
    paId: string,
    projectkey: string,
    formId: string,
    publishedUrl: string,
  ): void;
  deleteLinks(): void;
}
