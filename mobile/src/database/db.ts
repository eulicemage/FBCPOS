import { SQLITE_INIT_SCHEMA } from './schema';
import { AppConfig } from '../config';

// Interface for SQLite operations
export interface DatabaseConnection {
  execute(query: string, params?: any[]): Promise<{ rows: any[]; insertId?: number; rowsAffected?: number }>;
  transaction(cb: (tx: DatabaseConnection) => Promise<void>): Promise<void>;
}

// In-Memory SQLite fallback provider for Node/unit tests & development environment
class MockSQLiteDatabase implements DatabaseConnection {
  private inMemoryTables: Map<string, any[]> = new Map();

  async init() {
    console.log('[SQLite] Local database initialized successfully');
  }

  async execute(query: string, params?: any[]): Promise<any> {
    // Basic query simulator for development environment
    return { rows: [], insertId: 1, rowsAffected: 1 };
  }

  async transaction(cb: (tx: DatabaseConnection) => Promise<void>): Promise<void> {
    await cb(this);
  }
}

export const db: DatabaseConnection = new MockSQLiteDatabase();
