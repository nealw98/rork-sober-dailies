# V4 · Handoff 4 — "The help you need, 24/7" (try the sponsors + Spot Check)

Read `V4-OVERVIEW.md` first. Requires handoff 1 (the `help` step exists). **This one
changes the server** (`supabase/functions/sponsor-chat` + a migration) — plan carefully,
show Neal the plan, and test on a dev/preview build before release.

Mockup: `docs/onboarding-redesign/P-Help-247.dc.html` (it already shows handoff 5's list changes — build section 1 as written here; handoff 5 updates it) (an interactive prototype — read it
for layout and the exact copy; it calls a stand-in model, not the app's server).

## The idea
Instead of describing the AI sponsor, let people use it. The tour's third screen lists the
three sponsors plus Spot Check, exactly like the app's own sponsor picker. Each opens the
**real** chat page (or the real Spot Check page) in an onboarding mode: the sponsor
introduces themselves, the person gets **3 real messages**, and a closing wraps up and
points to what's left. Back on the list, anything tried is grayed out.

## 1. The list (`HelpStep`, step `help`, progress index 4 — the last tour screen)
- Tour chrome as on the other tour screens (back · progress · Skip).
- Title: **The help you need, 24/7**
- Subtitle (muted): **Talk to a sponsor or work through a spot check. Pick one and try it — then try another.**
- Four cards, built from the existing `SponsorCard` in `app/(main)/chat.tsx` (reuse it —
  same photo, radius, shadow, type), in this order:
  1. Steady Eddie — "Solid wisdom and steady support"
  2. Salty Sam — "Direct and no-nonsense"
  3. Gentle Grace — "Compassionate and encouraging"
  4. **Spot Check** — a terracotta-soft tile with a terracotta check-circle icon instead
     of a photo; "Upset right now? Work it through on the spot."
  - **No hook quotes** on any card — name and subtitle only.
- **Tried** cards: grayed (≈55% opacity + desaturated), a small teal "✓ Tried" pill
  beside the name, and not tappable.
- Under the cards, small centered muted line (the only crisis line in this flow):
  **"An AI sponsor is no substitute for a human sponsor, a meeting, or professional help. In a crisis, call or text 988."**
- Primary button: **Start my free trial** → `paywall`. People who can't get a trial
  (already used one): **Subscribe** → `paywall`. Members: **Continue** → finish to Today.
- Back → `program`.
- "Tried" state lives in `OnboardingFlow` so it survives going back and forward.

## 2. Sponsor chat — onboarding mode
Open the existing chat (`SponsorChat` / `app/sponsor-chat.tsx`) as a full screen inside
the flow, with an `onboarding` prop. Same header, "Today" pill, message styles, suggestion
chips and composer as the real chat. Differences:
- Header: back chevron → the list. Replace the text-size, reset and sponsor-switch controls
  with a teal **Try another** pill (→ the list). No switch dropdown.
- **First message = the sponsor's intro** (exact text below), shown as the sponsor's
  message. It is fixed app text, not generated.
- The person can send **3 messages**. Each gets a real reply from the server in onboarding
  mode (section 4).
- After the 3rd reply: the app appends the sponsor's **closing** (exact text below, fixed,
  adapted to what's left), disables the composer, and shows a small teal card:
  "That's your free try with <first name>." + buttons:
  - **Try another** (only if something untried remains) → the list
  - **Start my free trial** → `paywall` (consent is already done — it's step 2 now). For
    people who can't get a trial (already used one) label it **Subscribe**. For members
    (already have access) show **Continue** → finish to Today instead.
- Leaving early (back / Try another) marks that sponsor as tried if at least one message
  was sent.
- Keep this conversation **in memory only** — don't write it to the user's real chat history.
- A failed reply shows "Couldn't reach <first name> just now. Try again." and does **not**
  use up one of the 3 messages.

## 3. Spot Check — onboarding mode
Open the existing Spot Check (`app/(main)/inventory.tsx`) with an `onboarding` prop:
- Header: back → the list; replace the **Save** pill with a teal **Try another** pill.
- A short terracotta-soft box under the title: **"Upset, angry or anxious right now? Tap how
  you feel, write a line about what's going on, and tap Enter. You'll get a short reflection
  back — a quick Step 10 on the spot."**
- Feelings pills, "What's going on?", Enter and the reflection card work exactly as today.
- After the reflection: card "That's your free spot check." + the same buttons as the chat.
- **Don't save** the entry. One reflection per device.

## 4. Server (`supabase/functions/sponsor-chat`)
- Accept `onboarding: true` on the request.
- **Onboarding-only prompt per sponsor:** the sponsor's canonical persona prompt (as today)
  plus an onboarding block, along the lines of:
  > This is a free 3-message try during onboarding in the Sober Dailies app. You've already
  > sent this introduction: "<intro>". Don't introduce yourself again. Reply in 2–4
  > sentences, in your normal voice. Don't mention message limits, the free trial or
  > subscribing — the app adds the closing message itself. Your usual crisis handling still
  > applies.
  Store each sponsor's intro and closing (section 5) alongside the onboarding block so the
  replies stay consistent with them. Spot Check in onboarding uses its existing reflection
  prompt unchanged.
- **One-time allowance per device** (separate from the 25/day sponsor cap and the Spot Check
  cap): up to **3 user messages per sponsor (9 total) and 1 Spot Check reflection, ever**,
  before the device has an entitlement. Enforce it on the server (new quota buckets that
  don't reset daily — likely a migration next to `reserve_sponsor_chat_message`), and reject
  a 4th message to the same sponsor. Refund on upstream failure, as the existing quota does.
- Members (already entitled) and testers aren't limited by the onboarding allowance, but
  the app still shows the 3-message flow for consistency.

## 5. Exact copy

### Intros (first message, fixed)
**Steady Eddie**
> Hey, I'm Eddie. You can bring me the drinking thoughts, the resentment, the fear, the bad day, or the thing you're ashamed to say out loud—any hour.
>
> I'm not a substitute for a sponsor, a meeting, a doctor, therapist, or emergency help, but I can help you find the next right thing.
>
> Tell me what's going on.

**Salty Sam**
> I'm Salty Sam, sober since October 18, 1983. Bring me the urge to drink, the resentment, the fear, the lie you're nursing, or the crap you're avoiding at any hour.
>
> I'm not a substitute for emergency services, a doctor, a therapist, or a real-life sponsor when you need immediate help.
>
> Quit circling the runway and tell me what's going on.

**Gentle Grace**
> Hi, I'm Gentle Grace, and I'm glad you found your way here. You can bring me the cravings, the fear, the resentment, the shame, the gratitude—whatever is sitting heavy on your heart, at any hour.
>
> I'm an AI sponsor, not a substitute for emergency services, professional mental health care, medical care, or a real local recovery community, but I can help you pause, turn toward your Higher Power, and find the next right thing.
>
> Take a breath, and start wherever you are.

### Closings (after the 3rd reply, fixed, three paragraphs)
Paragraph 1 is fixed; paragraph 2 names only what's still untried (`<others>` = the untried
sponsors' first names, "A and B" or just "A"); paragraph 2 is dropped when nothing is left;
paragraph 3 depends on trial eligibility.

**Steady Eddie**
1. You've seen a little of how I work — steady, honest, and focused on the next right thing.
2. - others + Spot Check left: "You can also try <others> or do a spot-check inventory if you need to get clear on what's eating at you."
   - only others left: "You can also try <others>."
   - only Spot Check left: "You can also do a spot-check inventory if you need to get clear on what's eating at you."
3. - trial available: "If you want to keep talking with me, sign up for the free trial and we'll keep it simple, one day at a time. You're doing the work."
   - no trial: "If you want to keep talking with me, subscribe and we'll keep it simple, one day at a time. You're doing the work."
   - member: "You're doing the work."

**Salty Sam**
1. Well, you've had your three messages, so now you've seen I'm not here to pet your head and feed you recovery fortune cookies.
2. - others + Spot Check: "Try <others> if you want a different angle, or do a spot-check inventory and quit pretending that resentment will solve itself."
   - only others: "Try <others> if you want a different angle."
   - only Spot Check: "Do a spot-check inventory and quit pretending that resentment will solve itself."
3. - trial: "Sign up for the free trial if you want to keep talking, and bring me the truth instead of the polished bullshit."
   - no trial: "Subscribe if you want to keep talking, and bring me the truth instead of the polished bullshit."
   - member: "Come back anytime, and bring me the truth instead of the polished bullshit."

**Gentle Grace**
1. I'm glad we got to share these few moments together, and I hope you've seen a little of how we can bring things back to the program—one day at a time.
2. - others + Spot Check: "You might also try talking with <others>, or do a spot-check inventory and let your Higher Power show you what's yours to release."
   - only others: "You might also try talking with <others>."
   - only Spot Check: "You might also do a spot-check inventory and let your Higher Power show you what's yours to release."
3. - trial: "If you'd like to keep talking with me, sign up for the free trial and we'll keep taking the next right step together. You don't have to carry recovery alone."
   - no trial: "If you'd like to keep talking with me, subscribe and we'll keep taking the next right step together. You don't have to carry recovery alone."
   - member: "You don't have to carry recovery alone."

"Trial available" = the same eligibility check the paywall uses (`showTrial`).

## 6. Tracking (all carry `is_member`, `flow_version`)
`onboarding_step` (`help`) · `onboarding_try_opened` {target: eddie|sam|grace|spotcheck} ·
`onboarding_sponsor_message` {sponsor, n: 1–3} · `onboarding_try_finished` {target} ·
`onboarding_try_another_tapped` {from} · `onboarding_start_trial_tapped` {from}.
Add them to `docs/ANALYTICS_EVENTS.md`.

## 7. Clean up
Delete `TalkPracticeStep` if handoff 2 left it in place for the `help` placeholder.

## Check
- New user: each sponsor → intro, 3 messages, closing names the right leftovers; tried
  cards gray out; Spot Check once; Start my free trial → paywall.
- Trial-used user: buttons and closings say "Subscribe". Member: no paywall wording.
- 4th message rejected by the server; reinstall/reset doesn't grant a second set
  (device-based); a failed reply doesn't count.
- Real chat history and saved Spot Checks are untouched by onboarding.
- Light/dark, large text, iPhone SE, keyboard behavior, Android back, iPhone Duo.
