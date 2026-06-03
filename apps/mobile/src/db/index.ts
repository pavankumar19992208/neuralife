import {Database} from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {dbSchema} from './schema';
import {AttendanceDraft} from './models/AttendanceDraft';

// Lazy singleton — created on first access, NOT at import time.
// Eager init crashed the app before React mounted because the native
// SQLite module may not be ready yet when the JS bundle first executes.
let _db: Database | null = null;

export function getDatabase(): Database {
  if (_db) return _db;
  try {
    const adapter = new SQLiteAdapter({
      schema: dbSchema,
      dbName: 'neuralife_teacher',
      jsi: false, // jsi:true requires extra MainApplication.java setup; false works everywhere
      onSetUpError: (error) => {
        console.error('[WatermelonDB] Setup error:', error);
      },
    });
    _db = new Database({adapter, modelClasses: [AttendanceDraft]});
  } catch (e) {
    console.error('[WatermelonDB] Failed to initialise database:', e);
    throw e;
  }
  return _db;
}

// Keep named export for any direct usage
export {Database};
