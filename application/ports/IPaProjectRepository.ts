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
