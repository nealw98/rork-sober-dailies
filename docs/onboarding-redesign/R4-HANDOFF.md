# Handoff — Read & listen screen (R4): two card changes

Change ONLY the two cards in `ReadListenStep` in
`components/onboarding/ToolsSteps.tsx` (`litCard` and the speaker `photoCard`).
Don't change the overline, title, button, back/Skip/progress, tracking, or any other
screen. If `photoCard` / `photoText` styles are shared with other screens (e.g. the
meditation card on R5), give the speaker card its own styles instead of editing the
shared ones. Mockup source: `docs/onboarding-redesign/R4-Read-Listen.dc.html` (read it
for sizes/colors; it won't render on its own). Show Neal a plan first.

## 1. Literature card — deep navy, books shown properly

**Why:** the 12&12 cover is pale blue and disappeared against the pale blue card; a
medium blue was too close to the Big Book's own blue. Deep navy makes both covers pop
and keeps literature in its steel family.

- Background: **linear gradient, top-left → bottom-right, `colors.steel` (#2D5882) →
  `colors.steelDark` (#264463)** instead of `colors.steelSoft`. Soft navy drop shadow
  (≈ y 10, blur 24, #264463 at 25%). Same radius and padding.
- Text: "Literature" in **white**; body "The Big Book and the Twelve and Twelve, always
  in your pocket." in white at ~92%. Same in light and dark mode.
- **Book covers:** both images (`big-book_cover.webp`, `new_12x12_cover.webp`) are 3D
  books with **transparent backgrounds**. Don't treat them as cards:
  - `contentFit="contain"` (no cropping), **no `borderRadius`**.
  - Size about **118 × 156** each (was 112 × 148), same −3° / +3° tilt, same gap.
  - Shadow that follows the book's shape, not a rectangle: on iOS the shadow on the
    image itself works with transparency (≈ y 12, radius 8, black 45%). On Android
    don't use `elevation` on the image (it draws a box) — skip the shadow there or
    use a soft pre-rendered shadow.

## 2. Speaker tapes card — new bright photo, text over the blanket

**Why:** the old photo was dark and brown and the screen felt heavy under the navy card.
The new photo is bright, and the text sits on the blanket so the headphones and phone
stay visible.

- **Image:** `assets/images/speakers_hero_bright.webp` (headphones and phone on a light
  wooden table, soft cream blanket filling the bottom half). Replace `SPEAKERS_HERO`
  (`speakers_hero2.webp`) for this card only.
- Card: one full-bleed photo, ~236pt tall, radius 22, soft light shadow. Crop anchored
  near the **top** (`contentPosition` ≈ top 8%) so the headphones and phone show in the
  upper half and the blanket fills the bottom.
- **Remove the dark gradient.** Use a light cream fade over the bottom only so text
  reads on the blanket: transparent until ~50% → `#FAF6EF` at 55% opacity at 75% →
  80% opacity at the bottom.
- **Text** at bottom-left (18pt in, 16pt up, leave ~78pt on the right for the button):
  "Speaker tapes" (display bold 19, `#232529`), then "Experience, strength and hope — a
  meeting's worth, whenever you need it." (14/20, `#3A3D44`). Dark text in both light
  and dark mode — it's on a light photo.
- **Floating play button** at bottom-right (16pt in, 18pt up): 48pt navy circle
  (`colors.steel`), white play icon ~18pt, soft shadow. Static (not tappable), like
  the rest of the tour.
- **Remove the player bar** (`styles.player`, the speaker name `SAMPLE_SPEAKER` and the
  progress track). It covered the photo.

## Check
- Light + dark mode, iPhone SE, large text, iPhone Duo folded and unfolded (spread
  layout keeps working).
- Both covers fully visible with no box or square shadow around them (check Android
  especially).
- Headphones and phone visible above the text; text readable on the blanket.
