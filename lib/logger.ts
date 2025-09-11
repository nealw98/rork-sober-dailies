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
      // Save original
      this.original[level] = console[level]?.bind(console) ?? console.log.bind(console);

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
            this.original[level]?.(...args);
          } catch {}
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
}

export const Logger = new InAppLogger();


