import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseManager, { 
  InventoryItem, 
  InventorySession, 
  formatDateForDB, 
  getTodayDateString 
} from '@/lib/database';

interface InventoryHookState {
  items: InventoryItem[];
  sessions: InventorySession[];
  currentSession: InventorySession | null;
  isLoading: boolean;
  error: string | null;
  stats: {
    totalItems: number;
    onBeamCount: number;
    offBeamCount: number;
    sessionsCount: number;
  };
}

// Web fallback storage keys
const WEB_STORAGE_KEYS = {
  ITEMS: 'inventory_items',
  SESSIONS: 'inventory_sessions',
} as const;

export const useInventoryDatabase = () => {
  const [state, setState] = useState<InventoryHookState>({
    items: [],
    sessions: [],
    currentSession: null,
    isLoading: true,
    error: null,
    stats: {
      totalItems: 0,
      onBeamCount: 0,
      offBeamCount: 0,
      sessionsCount: 0,
    },
  });

  // Web storage fallback functions
  const loadWebData = useCallback(async () => {
    try {
      const [itemsData, sessionsData] = await Promise.all([
        AsyncStorage.getItem(WEB_STORAGE_KEYS.ITEMS),
        AsyncStorage.getItem(WEB_STORAGE_KEYS.SESSIONS),
      ]);

      const items: InventoryItem[] = itemsData ? JSON.parse(itemsData) : [];
      const sessions: InventorySession[] = sessionsData ? JSON.parse(sessionsData) : [];
      
      const todayDate = getTodayDateString();
      const currentSession = sessions.find(s => s.date === todayDate) || null;
      
      const stats = calculateStats(items);
      
      setState(prev => ({
        ...prev,
        items,
        sessions,
        currentSession,
        stats,
      }));
    } catch (error) {
      console.error('Failed to load web data:', error);
      throw error;
    }
  }, []);

  // Native database functions
  const loadData = useCallback(async () => {
    try {
      const [items, sessions, stats] = await Promise.all([
        databaseManager.getAllInventoryItems(),
        databaseManager.getAllSessions(),
        databaseManager.getInventoryStats(),
      ]);

      const todayDate = getTodayDateString();
      const currentSession = await databaseManager.getSession(todayDate);

      setState(prev => ({
        ...prev,
        items,
        sessions,
        currentSession,
        stats,
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }, []);

  // Initialize database
  const initializeDB = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      if (Platform.OS === 'web') {
        console.log('Using web storage fallback for inventory');
        await loadWebData();
      } else {
        await databaseManager.initializeDatabase();
        await loadData();
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Failed to initialize inventory database:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize database' 
      }));
    }
  }, [loadWebData, loadData]);



  const saveWebData = async (items: InventoryItem[], sessions: InventorySession[]) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(WEB_STORAGE_KEYS.ITEMS, JSON.stringify(items)),
        AsyncStorage.setItem(WEB_STORAGE_KEYS.SESSIONS, JSON.stringify(sessions)),
      ]);
    } catch (error) {
      console.error('Failed to save web data:', error);
      throw error;
    }
  };



  // Helper function to calculate stats for web
  const calculateStats = (items: InventoryItem[]) => {
    const totalItems = items.length;
    const onBeamCount = items.filter(item => item.category === 'on_beam').length;
    const offBeamCount = items.filter(item => item.category === 'off_beam').length;
    const uniqueDates = new Set(items.map(item => item.date));
    const sessionsCount = uniqueDates.size;

    return { totalItems, onBeamCount, offBeamCount, sessionsCount };
  };

  // Add inventory item
  const addItem = useCallback(async (
    itemName: string,
    category: 'on_beam' | 'off_beam',
    quantity: number = 1,
    location: string = '',
    notes: string = '',
    date?: string
  ) => {
    try {
      const itemDate = date || getTodayDateString();
      const newItem: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'> = {
        date: itemDate,
        item_name: itemName,
        quantity,
        location,
        notes,
        category,
      };

      if (Platform.OS === 'web') {
        // Web fallback
        const id = Date.now(); // Simple ID generation for web
        const itemWithId: InventoryItem = {
          ...newItem,
          id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedItems = [...state.items, itemWithId];
        
        // Ensure session exists
        let updatedSessions = [...state.sessions];
        if (!updatedSessions.find(s => s.date === itemDate)) {
          const newSession: InventorySession = {
            id: Date.now() + 1,
            date: itemDate,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updatedSessions = [...updatedSessions, newSession];
        }

        await saveWebData(updatedItems, updatedSessions);
        
        setState(prev => ({
          ...prev,
          items: updatedItems,
          sessions: updatedSessions,
          stats: calculateStats(updatedItems),
        }));
      } else {
        // Native database
        await databaseManager.addInventoryItem(newItem);
        await loadData();
      }

      console.log(`Added inventory item: ${itemName}`);
    } catch (error) {
      console.error('Failed to add inventory item:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to add item' 
      }));
      throw error;
    }
  }, [state.items, state.sessions, loadData]);

  // Update inventory item
  const updateItem = useCallback(async (id: number, updates: Partial<InventoryItem>) => {
    try {
      if (Platform.OS === 'web') {
        // Web fallback
        const updatedItems = state.items.map(item => 
          item.id === id 
            ? { ...item, ...updates, updated_at: new Date().toISOString() }
            : item
        );

        await saveWebData(updatedItems, state.sessions);
        
        setState(prev => ({
          ...prev,
          items: updatedItems,
          stats: calculateStats(updatedItems),
        }));
      } else {
        // Native database
        await databaseManager.updateInventoryItem(id, updates);
        await loadData();
      }

      console.log(`Updated inventory item: ${id}`);
    } catch (error) {
      console.error('Failed to update inventory item:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to update item' 
      }));
      throw error;
    }
  }, [state.items, state.sessions, loadData]);

  // Delete inventory item
  const deleteItem = useCallback(async (id: number) => {
    try {
      if (Platform.OS === 'web') {
        // Web fallback
        const updatedItems = state.items.filter(item => item.id !== id);
        
        await saveWebData(updatedItems, state.sessions);
        
        setState(prev => ({
          ...prev,
          items: updatedItems,
          stats: calculateStats(updatedItems),
        }));
      } else {
        // Native database
        await databaseManager.deleteInventoryItem(id);
        await loadData();
      }

      console.log(`Deleted inventory item: ${id}`);
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to delete item' 
      }));
      throw error;
    }
  }, [state.items, state.sessions, loadData]);

  // Get items by date
  const getItemsByDate = useCallback((date: string): InventoryItem[] => {
    return state.items.filter(item => item.date === date);
  }, [state.items]);

  // Get items by category
  const getItemsByCategory = useCallback((date: string, category: 'on_beam' | 'off_beam'): InventoryItem[] => {
    return state.items.filter(item => item.date === date && item.category === category);
  }, [state.items]);

  // Create or update session
  const createSession = useCallback(async (date: string, sessionNotes?: string) => {
    try {
      if (Platform.OS === 'web') {
        // Web fallback
        let updatedSessions = [...state.sessions];
        const existingSessionIndex = updatedSessions.findIndex(s => s.date === date);
        
        if (existingSessionIndex >= 0) {
          updatedSessions[existingSessionIndex] = {
            ...updatedSessions[existingSessionIndex],
            session_notes: sessionNotes,
            updated_at: new Date().toISOString(),
          };
        } else {
          const newSession: InventorySession = {
            id: Date.now(),
            date,
            session_notes: sessionNotes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          updatedSessions = [...updatedSessions, newSession];
        }

        await saveWebData(state.items, updatedSessions);
        
        setState(prev => ({
          ...prev,
          sessions: updatedSessions,
          currentSession: date === getTodayDateString() 
            ? updatedSessions.find(s => s.date === date) || null 
            : prev.currentSession,
        }));
      } else {
        // Native database
        await databaseManager.createSession(date, sessionNotes);
        await loadData();
      }

      console.log(`Session created/updated for date: ${date}`);
    } catch (error) {
      console.error('Failed to create session:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      }));
      throw error;
    }
  }, [state.items, state.sessions, loadData]);

  // Export data
  const exportData = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        return {
          sessions: state.sessions,
          items: state.items,
        };
      } else {
        return await databaseManager.exportInventoryData();
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }, [state.sessions, state.items]);

  // Clear all data
  const clearAllData = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        await Promise.all([
          AsyncStorage.removeItem(WEB_STORAGE_KEYS.ITEMS),
          AsyncStorage.removeItem(WEB_STORAGE_KEYS.SESSIONS),
        ]);
        
        setState(prev => ({
          ...prev,
          items: [],
          sessions: [],
          currentSession: null,
          stats: { totalItems: 0, onBeamCount: 0, offBeamCount: 0, sessionsCount: 0 },
        }));
      } else {
        await databaseManager.clearAllData();
        await loadData();
      }

      console.log('All inventory data cleared');
    } catch (error) {
      console.error('Failed to clear data:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to clear data' 
      }));
      throw error;
    }
  }, [loadData]);

  // Initialize on mount
  useEffect(() => {
    initializeDB();
  }, [initializeDB]);

  return {
    // State
    items: state.items,
    sessions: state.sessions,
    currentSession: state.currentSession,
    isLoading: state.isLoading,
    error: state.error,
    stats: state.stats,

    // Actions
    addItem,
    updateItem,
    deleteItem,
    createSession,
    getItemsByDate,
    getItemsByCategory,
    exportData,
    clearAllData,
    refreshData: Platform.OS === 'web' ? loadWebData : loadData,

    // Utilities
    formatDateForDB,
    getTodayDateString,
  };
};