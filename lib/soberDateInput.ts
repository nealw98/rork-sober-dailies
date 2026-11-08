// Typed mm/dd/yyyy sobriety-date entry, shared by the standalone editor
// (SoberDateEditor — Today and Settings) and the onboarding counter step, so
// both accept, reject and describe a date identically.

// Digits only, slashes inserted as you type.
export function formatDateInput(text: string): string {
  const n = text.replace(/\D/g, '');
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4, 8)}`;
}

// A complete, real, not-in-the-future date — or null.
export function parseDateInput(s: string): Date | null {
  if (!s || s.length < 10 || !/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return null;
  const [m, d, y] = s.split('/').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return date <= end ? date : null;
}

// The field's starting text for an existing date.
export function toDateInput(date: Date | null): string {
  return date
    ? `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`
    : '';
}

// "2 years · 3 months · 4 days"
export function ymdLabel(date: Date): string {
  const now = new Date();
  let y = now.getFullYear() - date.getFullYear();
  let m = now.getMonth() - date.getMonth();
  let d = now.getDate() - date.getDate();
  if (d < 0) { m -= 1; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (m < 0) { y -= 1; m += 12; }
  const parts: string[] = [];
  if (y) parts.push(`${y} ${y === 1 ? 'year' : 'years'}`);
  if (m) parts.push(`${m} ${m === 1 ? 'month' : 'months'}`);
  parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
  return parts.join(' · ');
}

// Whole days from the date to today, both at local midnight (so a DST change
// in between can't round it off by one).
export function daysSince(date: Date): number {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - start.getTime()) / 86_400_000);
}
