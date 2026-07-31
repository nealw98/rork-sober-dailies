# Design brief — gift program surfaces (thank-you moments + Pass It On)

For: Claude design session. Written 2026-07-20, right after the program went
live (backend deployed, OTA published, runtime 3.0.7).

## What this is

Sober Dailies pivoted its gift system to pure acquisition (full spec:
`docs/invite-rewards-design.md` §0 — read it first; it wins on any conflict).
The short version: members EARN gift credits (annual: 5/yr upfront ·
monthly: 1 at signup + 1 per 3 months · grandfathered v1: 5/yr as "founding
members"). Giving a gift sends a personal text with a private
soberdailies.com/get link; the recipient picks a plan there and gets 3
months free via an Apple offer code, auto-converting to $3.99/mo or
$19.99/yr after. Nothing is purchasable anymore — the old pack-buying UI,
gift wallet, and code ledger are deleted.

Two voice decisions are settled and must survive any redesign:
1. ANNOUNCEMENT vs INVENTORY: the moment that *informs* you of new gifts is
   the post-subscribe thank-you. The Pass It On screen only shows what you
   *hold*. Don't blend them.
2. RECEIPT VOICE: "You've received…", "You have…", never "comes with" /
   "includes" (policy voice). Gifts are given, not described.

## The surfaces, in priority order

### 1. Post-subscribe thank-you  ← the main event, currently the weakest
`components/PaywallScreen.tsx` — `announceGifts()` (top of file) + the call
in `buy()`. Today it's a BARE NATIVE Alert: "Thank you for subscribing —
as a thank-you, we've given you 5 gifts to pass on…" with [See your gifts]
[Later]. It deserves a real designed moment (the app has a bottom-sheet
pattern with grab handle + rose "coin" icon — see GiftInfoSheet styles and
git history's ConfirmSheet in pass-it-on.tsx for the established shape).

Variants: annual (5 gifts) · monthly (1 gift). Timing constraint that made
it an Alert: it fires WHILE the paywall gate is dissolving into the Today
screen (native alerts survive that transition; an in-tree modal will not —
a redesigned sheet needs a handoff, e.g. a pending-announcement flag that
Today reads on first mount). Design freely; flag the mechanism you need.

### 2. Pass It On screen
`app/(main)/pass-it-on.tsx`. Current anatomy top-to-bottom: header (title +
"Give someone their first 90 days" + Learn more pill) → rose hero card
(coin glyph, "You have N gifts to give", context line) → filled rose CTA
"Give a gift" (hidden at zero) → outlined "Invite friends to the app"
(deliberately a PEER button, not a footnote — decided) → bordered earn row
("You receive 5 gifts each membership year" etc.) → annual pitch card (only
when zero credits and not annual: "Go annual and 5 gifts arrive
immediately…") → footnote paragraph.

Hero states to design: loading · has-gifts (1 vs many) · zero-as-monthly
("Your next gift is on its way") · zero-as-annual ("All your gifts are out
in the world") · non-member ("Members receive gifts to give").

### 3. Gift-sent confirmation
Inside `pass-it-on.tsx` `giveGift()` — currently a bare Alert: "Gift sent —
{name} just got 3 months of Sober Dailies from you." A designed moment here
(the giving is the emotional peak of the whole program) is fair game.

### 4. Header gift badge
`components/navigation/PassItOnGift.tsx` — GiftGlyph + rose count badge on
the four tab headers; HIDDEN at zero balance (decided: the icon's
appearance IS the notification). Sits beside SettingsGear, muted tone.

### 5. Learn more sheet
`components/GiftInfoSheet.tsx` — 5 numbered steps, rewritten for the
credits story. Copy is current; layout is the old generic sheet.

### 6. Growth nudge (gift variant)
`components/GrowthNudges.tsx` — periodic bottom sheet; copy switches on
balance > 0 ("You have N gifts to give…" / "…Gifts come with membership"
— NOTE: that second string still needs receipt-voice love).

### 7. Invite Friends cross-link
`app/(main)/invite.tsx` — quiet text link under "Add from
contacts": "Want to give someone 3 free months? Pass It On".

## Mechanics that must not change (design around, not through)

- Balance comes from `hooks/use-gift-credits.ts` (cached-first; server is
  authoritative). Never invent a client-side count.
- Give flow (`lib/creditsService.ts`): token minted BEFORE the composer; a
  cancelled text reuses the pending token — credits never strand. Don't add
  UI that implies a cancelled share spent a gift.
- No purchase UI of any kind returns to these screens.
- Badge hides at zero; Tools tile + Settings row are the permanent doors.
- All changes must stay OTA-safe: pure JS/TS, no new native modules.
- PROJECT_RULES.md applies (no version bumps, etc.).

## Design language anchors

Rose family (`colors.rose / roseDark / roseSoft` in
`constants/designTokens.ts`) is Pass It On's tone. Theme via
`useThemedStyles(makeStyles)` + `useTokens()` — both light and dark mode
must work. Established sheet pattern: scrim → surface sheet, top-left/right
radius 28, grab handle, centered 64px rose-soft "coin" circle with
GiftGlyph, display-bold title, muted body, full-width rose CTA, quiet
secondary button.

## The ask

Read the files above, then create a canvas with editable screens for:
1. Thank-you moment — annual + monthly variants
2. Pass It On — all five hero states
3. Gift-sent confirmation
4. (If appetite remains) Learn-more sheet + growth-nudge gift sheet

Iterate visually with Neal there; implementation lands back in these same
files. The live app is already running the current versions, so anything
shipped is an OTA away.
