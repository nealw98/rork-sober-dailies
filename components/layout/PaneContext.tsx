// Pane plumbing for the wide layouts (3.5): on expanded widths the Today tab
// hosts tool screens in its detail pane instead of pushing them full-screen.
// The screens themselves stay routes — when one renders inside a pane, the
// host wraps it in <PaneProvider> and the screen's back/save paths close the
// pane instead of popping the navigator. `expand` (optional) reopens the same
// content as the full-screen route — surfaced by <PaneExpandButton/>.
import React from 'react';

export type PaneControls = {
  // Dismiss the pane content (what router.back() means full-screen).
  close: () => void;
  // Open this content full-screen (the pushed route / modal), if offered.
  expand?: () => void;
  // The Today daily that opened this content — the pane's stand-in for the
  // pushed route's `dailyId` param.
  dailyId?: string;
};

const PaneContext = React.createContext<PaneControls | null>(null);

export const PaneProvider = PaneContext.Provider;

// Null outside a pane — screens use it as `const pane = usePane();` and fall
// back to router.back() when it's null (i.e. when they run full-screen).
export function usePane(): PaneControls | null {
  return React.useContext(PaneContext);
}
