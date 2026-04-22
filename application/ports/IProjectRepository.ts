interface IProjectRepository {
  getAll(): Project[];
  getRows(): Row<Project>[];
  add(project: Project): void;
  isValidKey(key: string): boolean;
  getKeys(): string[];
}
