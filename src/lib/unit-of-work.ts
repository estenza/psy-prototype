import "server-only";

import type { DatabaseSync } from "node:sqlite";
import {
  isPostgresAuthEnabled,
  runAuthPostgresTransaction,
  type AuthPostgresTransaction,
} from "@/lib/auth-postgres";
import { getDatabase } from "@/lib/db";

export type PostgresUnitOfWork = {
  kind: "postgres";
  transaction: AuthPostgresTransaction;
};

export type SqliteUnitOfWork = {
  database: DatabaseSync;
  kind: "sqlite";
};

export type StorageUnitOfWork = PostgresUnitOfWork | SqliteUnitOfWork;

export async function runStorageUnitOfWork<T>(
  callback: (unitOfWork: StorageUnitOfWork) => T | Promise<T>,
): Promise<T> {
  if (isPostgresAuthEnabled()) {
    return runAuthPostgresTransaction(async (transaction) =>
      await callback({
        kind: "postgres",
        transaction,
      }),
    );
  }

  const database = getDatabase();

  database.exec("BEGIN IMMEDIATE;");

  try {
    const result = await callback({
      database,
      kind: "sqlite",
    });

    database.exec("COMMIT;");
    return result;
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}
