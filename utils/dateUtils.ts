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

export const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return getDateKey(date) === getDateKey(today);
};

export const getDaysAgo = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

export const getWeekDates = (): Date[] => {
  const dates: Date[] = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(getDaysAgo(i));
  }
  return dates;
};

export const getMonthDates = (): Date[] => {
  const dates: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    dates.push(getDaysAgo(i));
  }
  return dates;
};