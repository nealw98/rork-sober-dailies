/**
 * Reading Session Hook
 * 
 * Previously tracked reading time for review prompts.
 * Now a no-op since we track Big Book reader opens instead.
 * Keeping the hook to avoid breaking existing imports.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useReadingSession(_source: 'literature') {
  // No-op: Review prompts now track reader opens, not reading time
}
