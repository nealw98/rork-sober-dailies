// Parse the AA Meeting Guide app's meeting-detail screen (OCR'd text) into a
// saved-meeting draft. The screen has a consistent layout, so we anchor on the
// "{Weekday} at {time}" line: the name is above it; the location block is below
// it (up to the "… mi from Current Location" / attributes rows). Built against
// real Meeting Guide detail screenshots. Engine-agnostic: feed it the recognized
// lines (in reading order) from any OCR source.
import type { MeetingDay } from '@/hooks/use-meetings-store';

export type MeetingDraft = {
  name: string;
  day: MeetingDay | null;
  time: number | null; // minutes since midnight
  where: string;
  online: boolean;
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// "Sunday at 12:00 PM" → { day, time }
const SCHEDULE_RE = /^(sun|mon|tues?|wednes?|thurs?|fri|satur)(?:day)?\s+at\s+(\d{1,2}):(\d{2})\s*([ap])\.?m\.?/i;

function weekdayIndex(token: string): MeetingDay | null {
  const t = token.toLowerCase();
  const i = WEEKDAYS.findIndex((d) => d.startsWith(t) || t.startsWith(d.slice(0, 3)));
  return i >= 0 ? (i as MeetingDay) : null;
}

function toMinutes(h: number, m: number, ap: string): number {
  let hour = h % 12;
  if (/p/i.test(ap)) hour += 12;
  return hour * 60 + m;
}

// Lines we never treat as the name or the location.
const JUNK_RE = /^([<‹›‹❮]*\s*back\b|<|\d{1,2}:\d{2}\s*(am|pm)?$|cancel)/i;
// A navigation "Back" affordance (optionally chevron-prefixed). The iOS inter-app
// return chip ("‹ App Store", "‹ Safari", …) sits ABOVE this, so cutting at the
// last Back line drops both the chip and the status bar from the title.
const BACK_RE = /^[<‹›‹❮\s]*back\b/i;
// Common inter-app return-chip labels — stripped from the title as a backstop
// when the "Back" line itself wasn't captured by OCR.
const RETURN_CHIP_RE = /^(?:app store|safari|messages|photos|mail|chrome|maps|home)\s+/i;
const STOP_RE = /(mi from current location|navigation distance|^english$|^open$|^closed$|in-?person meeting|online meeting|open meetings are available|temporarily closed|wheelchair)/i;
// Timezone abbreviation the Meeting Guide share text adds on its own line.
const TZ_RE = /^(?:A[KS]?[DS]?T|[CEMP][DS]?T|H[AS]?[DS]?T|UTC|GMT)$/;

export function parseMeetingGuide(rawLines: string[]): MeetingDraft {
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);

  // Anchor: the schedule line.
  let anchor = -1;
  let day: MeetingDay | null = null;
  let time: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(SCHEDULE_RE);
    if (m) {
      anchor = i;
      day = weekdayIndex(m[1]);
      time = toMinutes(parseInt(m[2], 10), parseInt(m[3], 10), m[4]);
      break;
    }
  }

  // Name: the title lines above the anchor (skip status bar / "Back"). If there's
  // no anchor, fall back to the first meaningful line.
  let nameLines: string[];
  if (anchor >= 0) {
    // Title sits below the nav bar — drop everything up to and including the
    // last "Back" line (removes the status bar + inter-app return chip above it).
    let start = 0;
    for (let i = anchor - 1; i >= 0; i--) {
      if (BACK_RE.test(lines[i])) { start = i + 1; break; }
    }
    nameLines = lines.slice(start, anchor).filter((l) => !JUNK_RE.test(l));
  } else {
    nameLines = lines.filter((l) => !JUNK_RE.test(l)).slice(0, 1);
  }
  const name = nameLines
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(RETURN_CHIP_RE, '') // backstop: leading "App Store"/"Safari"/… return chip
    .replace(/\s*[-–]?\s*(in[-\s]*person|online)(\s+meeting)?$/i, '') // Meeting Guide appends the modality (tolerate line-wrap)
    .trim();

  // Location: the lines after the anchor, up to the first stop line; skip a
  // timezone line (e.g. "MDT") that the Meeting Guide share text adds.
  const where: string[] = [];
  if (anchor >= 0) {
    for (let i = anchor + 1; i < lines.length; i++) {
      if (STOP_RE.test(lines[i])) break;
      if (TZ_RE.test(lines[i])) continue;
      where.push(lines[i]);
    }
  } else {
    // No schedule line — treat the lines after the title as the location.
    const meaningful = lines.filter((l) => !JUNK_RE.test(l));
    for (let i = nameLines.length; i < meaningful.length; i++) {
      if (STOP_RE.test(meaningful[i])) break;
      if (TZ_RE.test(meaningful[i])) continue;
      where.push(meaningful[i]);
    }
  }

  const online = lines.some((l) => /online meeting|online$/i.test(l)) && !lines.some((l) => /in-?person/i.test(l));

  return { name, day, time, where: where.join(', '), online };
}

// Best-effort parse for a flyer / camera photo / non-Meeting-Guide screenshot.
// Looser than parseMeetingGuide: scans the whole image for a weekday, a time, and
// address-like lines. Lower confidence — surface it as a "best guess" to check.
export function parseBestEffort(rawLines: string[]): MeetingDraft {
  const lines = rawLines.map((l) => l.trim()).filter(Boolean).filter((l) => !JUNK_RE.test(l));

  const name = (lines[0] ?? '').replace(/\s+/g, ' ').trim();

  let day: MeetingDay | null = null;
  for (const l of lines) {
    const low = l.toLowerCase();
    if (/\b(daily|every ?day)\b/.test(low)) { day = 'daily'; break; }
    const m = low.match(/\b(sun|mon|tues?|wed(?:nes)?|thurs?|fri|sat(?:ur)?)(?:day|s)?\b/);
    if (m) { const idx = weekdayIndex(m[1]); if (idx != null) { day = idx; break; } }
  }

  let time: number | null = null;
  for (const l of lines) {
    const m = l.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?\b/i);
    if (m) { time = toMinutes(parseInt(m[1], 10), m[2] ? parseInt(m[2], 10) : 0, m[3]); break; }
  }

  // Address-ish lines: have a number, a street/venue keyword, or a ", ST" pattern.
  const ADDR = /(\d|\b(?:st|street|ave|avenue|rd|road|blvd|ln|lane|dr|drive|way|hwy|club|church|hall|center|centre|room|suite|ste)\b|,\s*[A-Z]{2}\b)/i;
  const where = lines
    .slice(1)
    .filter((l) => ADDR.test(l) && !TZ_RE.test(l) && !STOP_RE.test(l) && !/^\d{1,2}(:\d{2})?\s*[ap]\.?m\.?$/i.test(l))
    .slice(0, 4)
    .join(', ');

  const online = lines.some((l) => /\b(online|zoom|virtual|google meet|webex|teams|meeting link)\b/i.test(l));

  return { name, day, time, where, online };
}
