// Per-persona accent tones for the redesigned AI Sponsor, mirroring the
// prototype (frames/hifi-sponsor-v2). Each persona has a soft `tile` background
// and a darker `ink` accent. Only the three redesign sponsors are themed; any
// other (hidden) persona falls back to teal. See [[constants/sponsors]].
export type SponsorTone = { tile: string; ink: string };

const TONES: Record<string, SponsorTone> = {
  supportive: { tile: '#E7F1F1', ink: '#2E6F6F' }, // Steady Eddie — teal
  salty: { tile: '#FCF0DE', ink: '#7A4A1F' },      // Salty Sam — amber
  grace: { tile: '#F3EEFA', ink: '#7A5FB5' },      // Gentle Grace — lavender
};

// The three sponsors shown in the redesigned picker + switcher, in order.
export const SELECTION_SPONSOR_IDS = ['supportive', 'salty', 'grace'];

export function sponsorTone(id: string): SponsorTone {
  return TONES[id] ?? TONES.supportive;
}
