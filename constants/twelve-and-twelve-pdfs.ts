// Maps each Twelve & Twelve section id (see constants/twelve-and-twelve.ts) to
// its bundled PDF asset. The essays ship in the app (assets/pdf/twelve-and-
// twelve/) so they open offline — no aa.org round-trip. require() returns the
// asset module id; expo-asset resolves it to a local file for the PDF reader.
export const TWELVE_PDFS: Record<string, number> = {
  introduction: require('@/assets/pdf/twelve-and-twelve/en_tt_intro.pdf'),
  foreword: require('@/assets/pdf/twelve-and-twelve/en_tt_foreword.pdf'),
  'step-1': require('@/assets/pdf/twelve-and-twelve/en_step1.pdf'),
  'step-2': require('@/assets/pdf/twelve-and-twelve/en_step2.pdf'),
  'step-3': require('@/assets/pdf/twelve-and-twelve/en_step3.pdf'),
  'step-4': require('@/assets/pdf/twelve-and-twelve/en_step4.pdf'),
  'step-5': require('@/assets/pdf/twelve-and-twelve/en_step5.pdf'),
  'step-6': require('@/assets/pdf/twelve-and-twelve/en_step6.pdf'),
  'step-7': require('@/assets/pdf/twelve-and-twelve/en_step7.pdf'),
  'step-8': require('@/assets/pdf/twelve-and-twelve/en_step8.pdf'),
  'step-9': require('@/assets/pdf/twelve-and-twelve/en_step9.pdf'),
  'step-10': require('@/assets/pdf/twelve-and-twelve/en_step10.pdf'),
  'step-11': require('@/assets/pdf/twelve-and-twelve/en_step11.pdf'),
  'step-12': require('@/assets/pdf/twelve-and-twelve/en_step12.pdf'),
  'tradition-1': require('@/assets/pdf/twelve-and-twelve/en_tradition1.pdf'),
  'tradition-2': require('@/assets/pdf/twelve-and-twelve/en_tradition2.pdf'),
  'tradition-3': require('@/assets/pdf/twelve-and-twelve/en_tradition3.pdf'),
  'tradition-4': require('@/assets/pdf/twelve-and-twelve/en_tradition4.pdf'),
  'tradition-5': require('@/assets/pdf/twelve-and-twelve/en_tradition5.pdf'),
  'tradition-6': require('@/assets/pdf/twelve-and-twelve/en_tradition6.pdf'),
  'tradition-7': require('@/assets/pdf/twelve-and-twelve/en_tradition7.pdf'),
  'tradition-8': require('@/assets/pdf/twelve-and-twelve/en_tradition8.pdf'),
  'tradition-9': require('@/assets/pdf/twelve-and-twelve/en_tradition9.pdf'),
  'tradition-10': require('@/assets/pdf/twelve-and-twelve/en_tradition10.pdf'),
  'tradition-11': require('@/assets/pdf/twelve-and-twelve/en_tradition11.pdf'),
  'tradition-12': require('@/assets/pdf/twelve-and-twelve/en_tradition12.pdf'),
};
