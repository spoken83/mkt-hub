import Database from "better-sqlite3";

/**
 * Opens a Hermes SQLite database read-only. Hermes DBs are WAL-mode, so
 * concurrent reads alongside the gateway/dispatcher writers are safe.
 * Callers must close() the handle (or use withDb).
 */
export function openReadOnly(file: string): Database.Database {
  return new Database(file, { readonly: true, fileMustExist: true });
}

export function withDb<T>(file: string, fn: (db: Database.Database) => T): T {
  const db = openReadOnly(file);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}
