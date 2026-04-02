declare module "node:sqlite" {
  export type StatementResultingChanges = {
    changes: number;
    lastInsertRowid: number | bigint;
  };

  export class StatementSync {
    all(...anonymousParameters: unknown[]): Array<Record<string, unknown>>;
    get(...anonymousParameters: unknown[]): Record<string, unknown> | undefined;
    run(...anonymousParameters: unknown[]): StatementResultingChanges;
  }

  export class DatabaseSync {
    constructor(path: string);
    close(): void;
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
  }
}
