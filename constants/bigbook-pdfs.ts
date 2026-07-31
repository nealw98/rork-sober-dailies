// Bundled Big Book PDFs (offline). The public-domain text (front matter,
// Chapters 1–11, Appendices) lives in the in-app text reader; the parts we hold
// only as PDF — the 3rd/4th-edition forewords and the copyrighted Personal
// Stories — ship as these files. Keyed by the TOC entry id (see bigbook-toc.ts).
// Part I stories are individual files; Parts II & III are whole-part PDFs for
// now (page-mapped from their first printed page) until split into titled files.
export const BIGBOOK_PDFS: Record<string, number> = {
  // Front matter (later editions)
  'preface': require('@/assets/pdf/big-book/en_bigbook_preface.pdf'),
  'foreword-third': require('@/assets/pdf/big-book/en_bigbook_forewordthirdedition.pdf'),
  'foreword-fourth': require('@/assets/pdf/big-book/en_bigbook_forewordfourthedition.pdf'),

  // Personal Stories — Part I · Pioneers of A.A. (individual stories)
  'doctor-bobs-nightmare': require('@/assets/pdf/big-book/doctor_bobs_nightmare.pdf'),
  'aa-number-three': require('@/assets/pdf/big-book/aa_number_three.pdf'),
  'gratitude-in-action': require('@/assets/pdf/big-book/gratitude_in_action.pdf'),
  'women-suffer-too': require('@/assets/pdf/big-book/women_suffer_too.pdf'),
  'our-southern-friend': require('@/assets/pdf/big-book/our_southern_friend.pdf'),
  'the-vicious-cycle': require('@/assets/pdf/big-book/the_vicious_cycle.pdf'),
  'jims-story': require('@/assets/pdf/big-book/jims_story.pdf'),
  'man-who-mastered-fear': require('@/assets/pdf/big-book/the_man_who_mastered_fear.pdf'),
  'he-sold-himself-short': require('@/assets/pdf/big-book/he_sold_himself_short.pdf'),
  'keys-of-the-kingdom': require('@/assets/pdf/big-book/the_keys_of_the_kingdom.pdf'),

  // Personal Stories — Part II · They Stopped in Time
  'the-missing-link': require('@/assets/pdf/big-book/the_missing_link.pdf'),
  'fear-of-fear': require('@/assets/pdf/big-book/fear_of_fear.pdf'),
  'the-housewife-who-drank-at-home': require('@/assets/pdf/big-book/the_housewife_who_drank_at_home.pdf'),
  'physician-heal-thyself': require('@/assets/pdf/big-book/physician_heal_thyself.pdf'),
  'my-chance-to-live': require('@/assets/pdf/big-book/my_chance_to_live.pdf'),
  'student-of-life': require('@/assets/pdf/big-book/student_of_life.pdf'),
  'crossing-the-river-of-denial': require('@/assets/pdf/big-book/crossing_the_river_of_denial.pdf'),
  'because-im-an-alcoholic': require('@/assets/pdf/big-book/because_im_an_alcoholic.pdf'),
  'it-might-have-been-worse': require('@/assets/pdf/big-book/it_might_have_been_worse.pdf'),
  'tightrope': require('@/assets/pdf/big-book/tightrope.pdf'),
  'flooded-with-feeling': require('@/assets/pdf/big-book/flooded_with_feeling.pdf'),
  'winner-takes-all': require('@/assets/pdf/big-book/winner_takes_all.pdf'),
  'me-an-alcoholic': require('@/assets/pdf/big-book/me_an_alcoholic.pdf'),
  'the-perpetual-quest': require('@/assets/pdf/big-book/the_perpetual_quest.pdf'),
  'a-drunk-like-you': require('@/assets/pdf/big-book/a_drunk_like_you.pdf'),
  'acceptance-was-the-answer': require('@/assets/pdf/big-book/acceptance_was_the_answer.pdf'),
  'window-of-opportunity': require('@/assets/pdf/big-book/window_of_opportunity.pdf'),

  // Personal Stories — Part III · They Lost Nearly All
  'my-bottle-my-resentments-and-me': require('@/assets/pdf/big-book/my_bottle_my_resentments_and_me.pdf'),
  'he-lived-only-to-drink': require('@/assets/pdf/big-book/he_lived_only_to_drink.pdf'),
  'safe-haven': require('@/assets/pdf/big-book/safe_haven.pdf'),
  'listening-to-the-wind': require('@/assets/pdf/big-book/listening_to_the_wind.pdf'),
  'twice-gifted': require('@/assets/pdf/big-book/twice_gifted.pdf'),
  'building-a-new-life': require('@/assets/pdf/big-book/building_a_new_life.pdf'),
  'on-the-move': require('@/assets/pdf/big-book/on_the_move.pdf'),
  'a-vision-of-recovery': require('@/assets/pdf/big-book/a_vision_of_recovery.pdf'),
  'gutter-bravado': require('@/assets/pdf/big-book/gutter_bravado.pdf'),
  'empty-on-the-inside': require('@/assets/pdf/big-book/empty_on_the_inside.pdf'),
  'grounded': require('@/assets/pdf/big-book/grounded.pdf'),
  'another-chance': require('@/assets/pdf/big-book/another_chance.pdf'),
  'a-late-start': require('@/assets/pdf/big-book/a_late_start.pdf'),
  'freedom-from-bondage': require('@/assets/pdf/big-book/freedom_from_bondage.pdf'),
  'aa-taught-him-to-handle-sobriety': require('@/assets/pdf/big-book/aa_taught_him_to_handle_sobriety.pdf'),

  // Appendix VII — Twelve Concepts (Short Form)
  'appendix-7': require('@/assets/pdf/big-book/en_bigbook_appendicevii_.pdf'),
};
