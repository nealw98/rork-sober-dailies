/**
 * Utility functions for Big Book page number handling
 */

/**
 * Convert arabic numeral to roman numeral (lowercase)
 * Handles numbers 1-3999
 */
export function arabicToRoman(num: number): string {
  if (num < 1 || num > 3999) return num.toString();
  
  const romanNumerals: [number, string][] = [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i']
  ];
  
  let result = '';
  let remaining = num;
  
  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }
  
  return result;
}

/**
 * Check if a paragraph content is just a page marker
 * (e.g., "**Pages xiii–xiv**" or "--- *Page xvi* ---")
 */
export function isPageMarker(content: string): boolean {
  const trimmed = content.trim();
  
  // Match "**Pages ...**" format
  if (/^\*\*Pages?\s+[xivlcdm\d–—-]+\*\*$/i.test(trimmed)) {
    return true;
  }
  
  // Match "--- *Page ...* ---" format
  if (/^---\s*\*Page\s+[xivlcdm\d]+\*\s*---$/i.test(trimmed)) {
    return true;
  }
  
  return false;
}

/**
 * Format page number for display
 * Front matter uses roman numerals, main content uses arabic
 */
export function formatPageNumber(pageNumber: number, useRomanNumerals: boolean): string {
  if (useRomanNumerals) {
    return arabicToRoman(pageNumber);
  }
  return pageNumber.toString();
}

