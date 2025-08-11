export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1); // January 1st of the current year
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay) + 1; // +1 because January 1st should be day 1
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function formatDateDisplay(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return date.toLocaleDateString(undefined, options);
}

// Parse a YYYY-MM-DD date string as local time (not UTC)
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day);
}

// Format a date as YYYY-MM-DD in local timezone
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calculate days between two dates in local timezone
export function calculateDaysBetween(startDateString: string, endDate: Date = new Date()): number {
  const startDate = parseLocalDate(startDateString);
  
  // Ensure we're working with local dates at midnight to avoid timezone issues
  const today = new Date();
  const endDateLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDateLocal = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  
  // Calculate the difference in milliseconds
  const diffTime = endDateLocal.getTime() - startDateLocal.getTime();
  
  // Convert to days and ensure we get a whole number
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  console.log('calculateDaysBetween debug:', {
    startDateString,
    startDate: startDate.toISOString(),
    startDateLocal: startDateLocal.toISOString(),
    endDateLocal: endDateLocal.toISOString(),
    diffTime,
    diffDays,
    platform: require('react-native').Platform.OS
  });
  
  return Math.max(0, diffDays);
}

// Format a YYYY-MM-DD date string for display in local timezone
export function formatStoredDateForDisplay(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}