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
