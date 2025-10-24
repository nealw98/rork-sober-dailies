/**
 * usePinchToZoom Hook
 * 
 * Provides pinch-to-zoom gesture support for dynamic font sizing.
 * Persists user's font size preference using AsyncStorage.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UsePinchToZoomOptions {
  storageKey: string;
  baseFontSize: number;
  minSize: number;
  maxSize: number;
}

interface UsePinchToZoomReturn {
  fontSize: number;
  composedGesture: any;
  isLoading: boolean;
}

export function usePinchToZoom({
  storageKey,
  baseFontSize,
  minSize,
  maxSize,
}: UsePinchToZoomOptions): UsePinchToZoomReturn {
  const [fontSize, setFontSize] = useState(baseFontSize);
  const [isLoading, setIsLoading] = useState(true);
  const baselineFontSize = useRef(baseFontSize);
  const startFontSize = useRef(baseFontSize);
  const savedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Smoothing: keep track of recent font sizes
  const recentSizes = useRef<number[]>([]);
  const smoothingWindowSize = 5; // Average over last 5 values for smoother transitions

  console.log(`[usePinchToZoom] Hook initialized for ${storageKey}, baseFontSize: ${baseFontSize}`);

  // Load saved font size preference on mount (async, non-blocking)
  useEffect(() => {
    console.log(`[usePinchToZoom] useEffect - loading font size for ${storageKey}`);
    loadFontSize();
  }, [storageKey]);

  // Update baseline when fontSize changes (after load or save)
  useEffect(() => {
    console.log(`[usePinchToZoom] fontSize changed to ${fontSize}, updating baseline`);
    baselineFontSize.current = fontSize;
    startFontSize.current = fontSize;
  }, [fontSize]);

  const loadFontSize = async () => {
    try {
      console.log(`[usePinchToZoom] Loading font size for ${storageKey}...`);
      const savedSize = await AsyncStorage.getItem(`@sober_dailies:${storageKey}`);
      if (savedSize !== null) {
        const parsedSize = parseFloat(savedSize);
        if (!isNaN(parsedSize)) {
          console.log(`[usePinchToZoom] ✅ Loaded saved font size for ${storageKey}: ${parsedSize}`);
          setFontSize(parsedSize);
        } else {
          console.log(`[usePinchToZoom] ⚠️ Invalid saved size for ${storageKey}: ${savedSize}`);
        }
      } else {
        console.log(`[usePinchToZoom] No saved font size for ${storageKey}, using base: ${baseFontSize}`);
      }
    } catch (error) {
      console.error(`[usePinchToZoom] ❌ Error loading font size for ${storageKey}:`, error);
    } finally {
      setIsLoading(false);
      console.log(`[usePinchToZoom] Loading complete for ${storageKey}`);
    }
  };

  const saveFontSize = useCallback(async (size: number) => {
    try {
      console.log(`[usePinchToZoom] Saving font size for ${storageKey}: ${size}`);
      await AsyncStorage.setItem(`@sober_dailies:${storageKey}`, size.toString());
      console.log(`[usePinchToZoom] ✅ Saved font size for ${storageKey}: ${size}`);
    } catch (error) {
      console.error(`[usePinchToZoom] ❌ Error saving font size for ${storageKey}:`, error);
    }
  }, [storageKey]);

  const debouncedSave = useCallback((size: number) => {
    console.log(`[usePinchToZoom] Debouncing save for ${storageKey}: ${size}`);
    // Clear existing timeout
    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }

    // Save after 500ms of no changes
    savedTimeoutRef.current = setTimeout(() => {
      saveFontSize(size);
    }, 500);
  }, [saveFontSize]);

  const clamp = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);

  const smoothFontSize = useCallback((newSize: number): number => {
    // Add new size to the window
    recentSizes.current.push(newSize);
    
    // Keep only the last N values
    if (recentSizes.current.length > smoothingWindowSize) {
      recentSizes.current.shift();
    }
    
    // Calculate weighted average (more recent = higher weight)
    const weights = recentSizes.current.map((_, i) => i + 1); // [1, 2, 3]
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedSum = recentSizes.current.reduce((sum, size, i) => sum + size * weights[i], 0);
    
    return weightedSum / totalWeight;
  }, [smoothingWindowSize]);

  // Memoize gestures so they're created once and don't change on every render
  const pinchGesture = useMemo(() => Gesture.Pinch()
    .enabled(true)
    .onBegin(() => {
      console.log(`[usePinchToZoom] 🤏 Pinch gesture BEGAN for ${storageKey}`);
      // Store the current font size at the start of the gesture
      startFontSize.current = baselineFontSize.current;
      // Reset smoothing window
      recentSizes.current = [baselineFontSize.current];
    })
    .onStart(() => {
      console.log(`[usePinchToZoom] 🤏 Pinch gesture STARTED for ${storageKey}, start size: ${startFontSize.current}`);
    })
    .onUpdate((event) => {
      try {
        // Use exponential scaling to reduce sensitivity even more
        // Scale factor of 0.2 makes it 80% less sensitive than default
        const scaleFactor = 0.2;
        const adjustedScale = 1 + (event.scale - 1) * scaleFactor;
        
        const rawNewSize = Math.min(Math.max(startFontSize.current * adjustedScale, minSize), maxSize);
        const smoothedSize = smoothFontSize(rawNewSize);
        
        console.log(`[usePinchToZoom] 🤏 Pinch UPDATE - raw: ${rawNewSize.toFixed(1)}, smoothed: ${smoothedSize.toFixed(1)}`);
        setFontSize(smoothedSize);
      } catch (error) {
        console.error(`[usePinchToZoom] ❌ Error in onUpdate:`, error);
      }
    })
    .onEnd((event) => {
      try {
        const scaleFactor = 0.2;
        const adjustedScale = 1 + (event.scale - 1) * scaleFactor;
        const finalSize = Math.min(Math.max(startFontSize.current * adjustedScale, minSize), maxSize);
        console.log(`[usePinchToZoom] 🤏 Pinch ENDED - final size: ${finalSize.toFixed(1)}`);
        setFontSize(finalSize);
        debouncedSave(finalSize);
        // Reset smoothing window
        recentSizes.current = [];
      } catch (error) {
        console.error(`[usePinchToZoom] ❌ Error in onEnd:`, error);
      }
    })
    .onFinalize(() => {
      console.log(`[usePinchToZoom] 🤏 Pinch gesture FINALIZED for ${storageKey}`);
    })
    .runOnJS(true), [storageKey, minSize, maxSize, smoothFontSize, debouncedSave]);

  // Double-tap to reset to base font size
  const doubleTapGesture = useMemo(() => Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      console.log(`[usePinchToZoom] 👆👆 Double tap detected - resetting to base size: ${baseFontSize}`);
      setFontSize(baseFontSize);
      saveFontSize(baseFontSize);
    })
    .runOnJS(true), [baseFontSize, saveFontSize]);

  // Combine gestures - both can work simultaneously
  const composedGesture = useMemo(() => Gesture.Race(doubleTapGesture, pinchGesture), [doubleTapGesture, pinchGesture]);

  console.log(`[usePinchToZoom] Returning hook values - fontSize: ${fontSize}, isLoading: ${isLoading}`);

  return {
    fontSize,
    composedGesture,
    isLoading,
  };
}

