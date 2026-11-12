# Onboarding v4 — overview (read this first)

This round reshapes the middle of the onboarding tour and refreshes the returning-user
paywall. It's split into six handoffs, built **in order, one Claude Code session each**,
tested between each. They ship together in one release.

| # | Handoff | What it does | Risk |
|---|---|---|---|
| 1 | `V4-1-QUICK-CHANGES.md` | New step order (consent moves up, sponsors move last), Skip on Welcome, button labels, one line removed, progress/back/tracking follow it | Low–medium |
| 2 | `V4-2-TOOLS-SCREEN.md` | New "All the tools you use every day" screen; removes Read & listen and Talk it through | Low |
| 3 | `V4-3-RETURNING-PAYWALL.md` | Both paywalls: free-trial button, tile order and sponsor photo; trial-used variant gets a plain 12-item features list | Low |
| 4 | `V4-4-HELP-SCREEN.md` | New "The help you need, 24/7": real sponsor chats + Spot Check, 3 free messages each, onboarding-only prompts, server allowance | **High — touches the server** |
| 5 | `V4-5-HELP-INVITE.md` | Sponsor screen becomes an invitation: new title/subtitle, "Try →" pill on each card, trial button always visible | Low |
| 6 | `V4-6-WELCOME-TILES.md` | Welcome: tile grid (Reflections · Big Book · Speakers, then a wide AI sponsor tile with a sample chat) replaces the fan | Low |

Design mockups (HTML from the design canvas — read them for layout, sizes, colors and
copy; they won't render on their own): this folder's `.dc.html` files. Each handoff
names the ones it needs.

## The new flow

```
welcome → disclaimer → counter → reflection → tools → program → help → paywall* → Today (one-time tip)
                                                         (* members skip the paywall, as today)
```

| Step id | Screen | Primary button | Status |
|---|---|---|---|
| `welcome` | Welcome (collage) | **Get started** · plus **Skip** top right | Skip is new (H1) |
| `disclaimer` | Before you begin (consent) | Continue | moved up to 2nd (H1) |
| `counter` | Your sobriety count | **Today's Daily Reflection** | label change (H1) |
| `reflection` | Today's Daily Reflection | **See your everyday tools** | label change, one line removed (H1) |
| `tools` | All the tools you use every day | **Your daily program** | NEW (H2; H1 adds a placeholder) |
| `program` | Put it all together (your daily program) | **Try the AI sponsors** | label change (H1) |
| `help` | Talk to a sponsor right now (sponsor trial; H5 retitles it) | **Start my free trial** | NEW (H4; H1 adds a placeholder) |
| `paywall` | Paywall | **Start my free 7 days** | trial + trial-used changes (H3) |

Removed: `read_listen` (Read & listen) and `talk_practice` (Talk it through) — H2 deletes
them once `tools` exists.

**Consent comes first.** Everyone agrees on the disclaimer before seeing anything else,
so the sponsor trial (which sends real messages) always comes after consent.

The tour (back arrow · 5-segment progress · Skip) covers **counter, reflection, tools,
program, help** — still five screens. Progress index: counter 0, reflection 1, tools 2,
program 3, help 4.

- **Skip on Welcome** (new, top right): → disclaimer; after agreeing, straight to the
  paywall (members: straight to Today), skipping the tour.
- **Skip on any tour screen**: → paywall (members: Today). Consent is already done.
- **Back**: follows the list above, except the counter's back goes to Welcome (don't send
  people back to a consent they've already given). Disclaimer → Welcome. Paywall X → as
  today.

## Decisions already made (don't re-open)
- Every primary button names the next screen.
- No people on the Welcome screen; no sobriety dates except Salty Sam (he's the old-timer).
- Sponsor try: **3 messages per sponsor**, one Spot Check, all free, once per device.
- The 988 line lives on the sponsor **list** page only — not in each sponsor's intro.
  Sponsors' crisis handling in their prompts still applies to every reply.
- Sam calls himself a "chatbot." That's intentional.
- Trial-used paywall: features, not benefits. Store-required lines stay word for word — including the Day 7 "…is required to maintain access to the app" line on the trial paywall (Google Play).
- Consent (the disclaimer) comes right after Welcome, before any tour screen.

## Tracking
Bump `FLOW_VERSION` to `"v4_help"`. Step ids and `STEP_INDEX` follow the table above.
New events are listed in H4. Update `docs/ANALYTICS_EVENTS.md` in each handoff that adds any.

## How to run each handoff
New Claude Code session per handoff:
> Read docs/onboarding-redesign/V4-OVERVIEW.md, then docs/onboarding-redesign/<handoff file>. Implement only that handoff. Show me your plan first.

After each: reset onboarding from the Debug Console and run the whole flow (new user and
member), iPhone + Android, light + dark, large text, iPhone Duo folded/unfolded.
