import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { BigBookHighlight, HighlightColor } from '@/types/bigbook-v2';
import { getBigBookStorage } from '@/lib/bigbook-storage';

/**
 * Hook for managing Big Book highlights
 * 
 * Provides CRUD operations for highlights with automatic persistence
 * and real-time updates across components.
 */

// Create a shared context for highlights
interface HighlightsContextValue {
  highlights: BigBookHighlight[];
  isLoading: boolean;
  error: Error | null;
  addHighlight: (
    paragraphId: string,
    chapterId: string,
    sentenceIndex: number,
    color: HighlightColor,
    textSnapshot: string
  ) => Promise<BigBookHighlight>;
  updateHighlight: (id: string, updates: Partial<BigBookHighlight>) => Promise<void>;
  updateHighlightNote: (id: string, note: string) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const HighlightsContext = createContext<HighlightsContextValue | null>(null);

// Provider component
export function BigBookHighlightsProvider({ children }: { children: ReactNode }) {
  const [highlights, setHighlights] = useState<BigBookHighlight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const storage = getBigBookStorage();
  
  const loadHighlights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loaded = await storage.getAllHighlights();
      loaded.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('[HighlightsProvider] Loaded highlights:', loaded.length);
      setHighlights(loaded);
    } catch (err) {
      console.error('[HighlightsProvider] Error loading highlights:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [storage]);
  
  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);
  
  const addHighlight = useCallback(async (
    paragraphId: string,
    chapterId: string,
    sentenceIndex: number,
    color: HighlightColor,
    textSnapshot: string
  ): Promise<BigBookHighlight> => {
    try {
      const now = Date.now();
      const newHighlight: BigBookHighlight = {
        id: `highlight_${now}_${Math.random().toString(36).substr(2, 9)}`,
        paragraphId,
        chapterId,
        sentenceIndex,
        color,
        textSnapshot,
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('[HighlightsProvider] Adding highlight:', newHighlight);
      await storage.saveHighlight(newHighlight);
      
      // Update state immediately
      setHighlights(prev => {
        const updated = [newHighlight, ...prev];
        console.log('[HighlightsProvider] State updated, new count:', updated.length);
        return updated;
      });
      
      return newHighlight;
    } catch (err) {
      console.error('[HighlightsProvider] Error adding highlight:', err);
      throw err;
    }
  }, [storage]);
  
  const updateHighlight = useCallback(async (
    id: string,
    updates: Partial<BigBookHighlight>
  ): Promise<void> => {
    try {
      await storage.updateHighlight(id, updates);
      
      setHighlights(prev => prev.map(h => 
        h.id === id 
          ? { ...h, ...updates, updatedAt: Date.now() }
          : h
      ));
    } catch (err) {
      console.error('[HighlightsProvider] Error updating highlight:', err);
      throw err;
    }
  }, [storage]);
  
  const updateHighlightNote = useCallback(async (
    id: string,
    note: string
  ): Promise<void> => {
    await updateHighlight(id, { note });
  }, [updateHighlight]);
  
  const deleteHighlight = useCallback(async (id: string): Promise<void> => {
    try {
      await storage.deleteHighlight(id);
      
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('[HighlightsProvider] Error deleting highlight:', err);
      throw err;
    }
  }, [storage]);
  
  const refresh = useCallback(async (): Promise<void> => {
    await loadHighlights();
  }, [loadHighlights]);
  
  const value: HighlightsContextValue = {
    highlights,
    isLoading,
    error,
    addHighlight,
    updateHighlight,
    updateHighlightNote,
    deleteHighlight,
    refresh,
  };
  
  return (
    <HighlightsContext.Provider value={value}>
      {children}
    </HighlightsContext.Provider>
  );
}

export interface UseBigBookHighlightsReturn {
  highlights: BigBookHighlight[];
  isLoading: boolean;
  error: Error | null;
  addHighlight: (
    paragraphId: string,
    chapterId: string,
    sentenceIndex: number,
    color: HighlightColor,
    textSnapshot: string
  ) => Promise<BigBookHighlight>;
  updateHighlight: (id: string, updates: Partial<BigBookHighlight>) => Promise<void>;
  updateHighlightNote: (id: string, note: string) => Promise<void>;
  deleteHighlight: (id: string) => Promise<void>;
  getHighlightsByChapter: (chapterId: string) => BigBookHighlight[];
  getHighlightsByParagraph: (paragraphId: string) => BigBookHighlight[];
  getHighlightById: (paragraphId: string, sentenceIndex: number) => Promise<BigBookHighlight[]>;
  clearAllHighlights: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Hook to access the shared highlights context
export function useBigBookHighlights(): UseBigBookHighlightsReturn {
  const context = useContext(HighlightsContext);
  
  if (!context) {
    throw new Error('useBigBookHighlights must be used within BigBookHighlightsProvider');
  }
  
  const storage = getBigBookStorage();
  
  const getHighlightsByChapter = useCallback((chapterId: string): BigBookHighlight[] => {
    return context.highlights.filter(h => h.chapterId === chapterId);
  }, [context.highlights]);
  
  const getHighlightsByParagraph = useCallback((paragraphId: string): BigBookHighlight[] => {
    return context.highlights.filter(h => h.paragraphId === paragraphId);
  }, [context.highlights]);
  
  const getHighlightById = useCallback(async (paragraphId: string, sentenceIndex: number): Promise<BigBookHighlight[]> => {
    return context.highlights.filter(h => h.paragraphId === paragraphId && h.sentenceIndex === sentenceIndex);
  }, [context.highlights]);
  
  const clearAllHighlights = useCallback(async (): Promise<void> => {
    try {
      await storage.clearAllHighlights();
      await context.refresh();
    } catch (err) {
      console.error('[useBigBookHighlights] Error clearing highlights:', err);
      throw err;
    }
  }, [storage, context]);
  
  return {
    highlights: context.highlights,
    isLoading: context.isLoading,
    error: context.error,
    addHighlight: context.addHighlight,
    updateHighlight: context.updateHighlight,
    updateHighlightNote: context.updateHighlightNote,
    deleteHighlight: context.deleteHighlight,
    getHighlightsByChapter,
    getHighlightsByParagraph,
    getHighlightById,
    clearAllHighlights,
    refresh: context.refresh,
  };
}

/**
 * Hook for getting highlights for a specific paragraph
 * Optimized for rendering highlights in paragraph components
 */
export function useParagraphHighlights(paragraphId: string): {
  highlights: BigBookHighlight[];
  isLoading: boolean;
} {
  const context = useContext(HighlightsContext);
  
  if (!context) {
    throw new Error('useParagraphHighlights must be used within BigBookHighlightsProvider');
  }
  
  // Filter highlights for this specific paragraph
  const paragraphHighlights = React.useMemo(() => {
    const filtered = context.highlights.filter(h => h.paragraphId === paragraphId);
    console.log('[useParagraphHighlights]', paragraphId, '- highlights:', filtered.length);
    return filtered;
  }, [context.highlights, paragraphId]);
  
  return {
    highlights: paragraphHighlights,
    isLoading: context.isLoading,
  };
}

