import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export interface InventoryItem {
  id?: number;
  date: string;
  item_name: string;
  quantity: number;
  location: string;
  notes?: string;
  category: 'on_beam' | 'off_beam';
  created_at?: string;
  updated_at?: string;
}

export interface InventorySession {
  id?: number;
  date: string;
  session_notes?: string;
  created_at?: string;
  updated_at?: string;
}

class DatabaseManager {
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly DB_NAME = 'inventory.db';
  private readonly DB_VERSION = 1;

  async initializeDatabase(): Promise<void> {
    try {
      console.log('Initializing database...');
      
      if (Platform.OS === 'web') {
        // For web, we'll use a fallback storage mechanism
        console.log('Web platform detected, using AsyncStorage fallback');
        return;
      }

      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      await this.createTables();
      await this.runMigrations();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Create inventory_sessions table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS inventory_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT NOT NULL UNIQUE,
          session_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create inventory_items table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS inventory_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          date TEXT NOT NULL,
          item_name TEXT NOT NULL,
          quantity INTEGER DEFAULT 1,
          location TEXT,
          notes TEXT,
          category TEXT CHECK(category IN ('on_beam', 'off_beam')) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES inventory_sessions (id) ON DELETE CASCADE
        );
      `);

      // Create indexes for better performance
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_inventory_items_date ON inventory_items(date);
        CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category);
        CREATE INDEX IF NOT EXISTS idx_inventory_sessions_date ON inventory_sessions(date);
      `);

      // Create version table for migrations
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY
        );
      `);

      console.log('Database tables created successfully');
    } catch (error) {
      console.error('Failed to create tables:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync<{ version: number }>(
        'SELECT version FROM db_version LIMIT 1'
      );
      
      const currentVersion = result?.version || 0;
      
      if (currentVersion < this.DB_VERSION) {
        console.log(`Running migrations from version ${currentVersion} to ${this.DB_VERSION}`);
        
        // Add migration logic here as needed
        // For now, just update the version
        
        if (currentVersion === 0) {
          await this.db.runAsync('INSERT INTO db_version (version) VALUES (?)', [this.DB_VERSION]);
        } else {
          await this.db.runAsync('UPDATE db_version SET version = ?', [this.DB_VERSION]);
        }
        
        console.log('Migrations completed successfully');
      }
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }
  }

  // Session Management
  async createSession(date: string, sessionNotes?: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.runAsync(
        'INSERT OR REPLACE INTO inventory_sessions (date, session_notes, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [date, sessionNotes || '']
      );
      
      console.log(`Session created/updated for date: ${date}`);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async getSession(date: string): Promise<InventorySession | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const session = await this.db.getFirstAsync<InventorySession>(
        'SELECT * FROM inventory_sessions WHERE date = ?',
        [date]
      );
      
      return session || null;
    } catch (error) {
      console.error('Failed to get session:', error);
      throw error;
    }
  }

  async getAllSessions(): Promise<InventorySession[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const sessions = await this.db.getAllAsync<InventorySession>(
        'SELECT * FROM inventory_sessions ORDER BY date DESC'
      );
      
      return sessions;
    } catch (error) {
      console.error('Failed to get all sessions:', error);
      throw error;
    }
  }

  // Inventory Item Management
  async addInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Ensure session exists
      await this.createSession(item.date);
      
      const result = await this.db.runAsync(
        `INSERT INTO inventory_items 
         (date, item_name, quantity, location, notes, category, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [item.date, item.item_name, item.quantity, item.location || '', item.notes || '', item.category]
      );
      
      console.log(`Inventory item added: ${item.item_name}`);
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Failed to add inventory item:', error);
      throw error;
    }
  }

  async updateInventoryItem(id: number, updates: Partial<InventoryItem>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'created_at')
        .map(key => `${key} = ?`)
        .join(', ');
      
      const values = Object.entries(updates)
        .filter(([key]) => key !== 'id' && key !== 'created_at')
        .map(([, value]) => value);
      
      await this.db.runAsync(
        `UPDATE inventory_items SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
      
      console.log(`Inventory item updated: ${id}`);
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      throw error;
    }
  }

  async deleteInventoryItem(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM inventory_items WHERE id = ?', [id]);
      console.log(`Inventory item deleted: ${id}`);
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      throw error;
    }
  }

  async getInventoryItemsByDate(date: string): Promise<InventoryItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const items = await this.db.getAllAsync<InventoryItem>(
        'SELECT * FROM inventory_items WHERE date = ? ORDER BY created_at DESC',
        [date]
      );
      
      return items;
    } catch (error) {
      console.error('Failed to get inventory items by date:', error);
      throw error;
    }
  }

  async getInventoryItemsByCategory(date: string, category: 'on_beam' | 'off_beam'): Promise<InventoryItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const items = await this.db.getAllAsync<InventoryItem>(
        'SELECT * FROM inventory_items WHERE date = ? AND category = ? ORDER BY created_at DESC',
        [date, category]
      );
      
      return items;
    } catch (error) {
      console.error('Failed to get inventory items by category:', error);
      throw error;
    }
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const items = await this.db.getAllAsync<InventoryItem>(
        'SELECT * FROM inventory_items ORDER BY date DESC, created_at DESC'
      );
      
      return items;
    } catch (error) {
      console.error('Failed to get all inventory items:', error);
      throw error;
    }
  }

  // Query and Analytics
  async getInventoryStats(startDate?: string, endDate?: string): Promise<{
    totalItems: number;
    onBeamCount: number;
    offBeamCount: number;
    sessionsCount: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let whereClause = '';
      const params: string[] = [];
      
      if (startDate && endDate) {
        whereClause = 'WHERE date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        whereClause = 'WHERE date >= ?';
        params.push(startDate);
      } else if (endDate) {
        whereClause = 'WHERE date <= ?';
        params.push(endDate);
      }

      const stats = await this.db.getFirstAsync<{
        totalItems: number;
        onBeamCount: number;
        offBeamCount: number;
      }>(`
        SELECT 
          COUNT(*) as totalItems,
          SUM(CASE WHEN category = 'on_beam' THEN 1 ELSE 0 END) as onBeamCount,
          SUM(CASE WHEN category = 'off_beam' THEN 1 ELSE 0 END) as offBeamCount
        FROM inventory_items 
        ${whereClause}
      `, params);

      const sessionsResult = await this.db.getFirstAsync<{ sessionsCount: number }>(`
        SELECT COUNT(*) as sessionsCount 
        FROM inventory_sessions 
        ${whereClause}
      `, params);

      return {
        totalItems: stats?.totalItems || 0,
        onBeamCount: stats?.onBeamCount || 0,
        offBeamCount: stats?.offBeamCount || 0,
        sessionsCount: sessionsResult?.sessionsCount || 0
      };
    } catch (error) {
      console.error('Failed to get inventory stats:', error);
      throw error;
    }
  }

  // Export functionality
  async exportInventoryData(): Promise<{
    sessions: InventorySession[];
    items: InventoryItem[];
  }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const sessions = await this.getAllSessions();
      const items = await this.getAllInventoryItems();
      
      return { sessions, items };
    } catch (error) {
      console.error('Failed to export inventory data:', error);
      throw error;
    }
  }

  // Clear all data (for testing or reset)
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync('DELETE FROM inventory_items');
      await this.db.execAsync('DELETE FROM inventory_sessions');
      console.log('All inventory data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }

  // Close database connection
  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('Database connection closed');
    }
  }
}

// Singleton instance
const databaseManager = new DatabaseManager();
export default databaseManager;

// Helper function to format date for consistency
export const formatDateForDB = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
};

// Helper function to get today's date in DB format
export const getTodayDateString = (): string => {
  return formatDateForDB(new Date());
};