/* Simple in-app logger that mirrors console logs, buffers them in memory,
   and allows UI subscribers to receive updates. Intended for temporary
   diagnostics in TestFlight/production. */

import { Platform } from 'react-native';

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestampIso: string;
  level: LogLevel;
  message: string;
}

type Listener = (entry: LogEntry, all: LogEntry[]) => void;

class InAppLogger {
  private buffer: LogEntry[] = [];
  private listeners = new Set<Listener>();
  private maxEntries = 500;
  private initialized = false;
  private original: Partial<Record<LogLevel, (...args: any[]) => void>> = {};

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    (['log', 'info', 'warn', 'error'] as LogLevel[]).forEach((level) => {
      // Save original - safely handle if console[level] doesn't exist
      try {
        if (console[level] && typeof console[level] === 'function') {
          this.original[level] = console[level].bind(console);
        } else if (console.log && typeof console.log === 'function') {
          this.original[level] = console.log.bind(console);
        } else {
          // Fallback to no-op if no console methods available
          this.original[level] = () => {};
        }
      } catch (e) {
        // If binding fails, use no-op
        this.original[level] = () => {};
      }

      // Override
      console[level] = ((...args: any[]) => {
        try {
          const timestampIso = new Date().toISOString();
          const text = args
            .map((a) => {
              try {
                if (typeof a === 'string') return a;
                if (a instanceof Error) return `${a.name}: ${a.message}`;
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            })
            .join(' ');

          const entry: LogEntry = { timestampIso, level, message: text };
          this.buffer.push(entry);
          if (this.buffer.length > this.maxEntries) this.buffer.shift();
          this.listeners.forEach((l) => l(entry, this.buffer));
        } catch {
          // no-op
        } finally {
          // Always forward to original console
          try {
            if (this.original && this.original[level] && typeof this.original[level] === 'function') {
              this.original[level].apply(this.original, args);
            }
          } catch (e) {
            // Silently fail if console forwarding doesn't work
          }
        }
      }) as any;
    });

    this.log('info', `InAppLogger initialized on ${Platform.OS}`);
  }

  getAll(): LogEntry[] {
    return [...this.buffer];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.buffer = [];
    this.listeners.forEach((l) => l({ timestampIso: new Date().toISOString(), level: 'info', message: '[Logs cleared]' }, this.buffer));
  }

  toClipboardText(): string {
    return this.buffer.map((e) => `${e.timestampIso} [${e.level.toUpperCase()}] ${e.message}`).join('\n');
  }

  private log(level: LogLevel, message: string): void {
    const entry: LogEntry = { timestampIso: new Date().toISOString(), level, message };
    this.buffer.push(entry);
    if (this.buffer.length > this.maxEntries) this.buffer.shift();
    this.listeners.forEach((l) => l(entry, this.buffer));
  }

  // Diagnostic logging helper for structured OTA data
  logDiag(event: string, data: Record<string, any>): void {
    try {
      const entry: LogEntry = { 
        timestampIso: new Date().toISOString(), 
        level: 'info', 
        message: `[DIAG] ${event}: ${JSON.stringify(data)}` 
      };
      this.buffer.push(entry);
      if (this.buffer.length > this.maxEntries) this.buffer.shift();
      this.listeners.forEach((l) => l(entry, this.buffer));
    } catch (error) {
      // Fallback if JSON.stringify fails
      this.log('warn', `[DIAG] ${event}: [Failed to serialize data]`);
    }
  }
}

export const Logger = new InAppLogger();


