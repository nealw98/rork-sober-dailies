import { BigBookChapterMeta } from '@/types/bigbook-v2';

/**
 * Big Book Chapter Metadata
 * 
 * Lightweight metadata for all chapters in the Big Book (2nd Edition).
 * Used for navigation, chapter lists, and access control.
 */

export const bigBookChapterMetadata: BigBookChapterMeta[] = [
  {
    id: 'preface',
    title: 'Preface',
    pageRange: [11, 12], // Roman numerals xi-xii
    // description: 'Introduction to the Big Book',
    useRomanNumerals: true,
  },
  {
    id: 'foreword-first',
    title: 'Foreword to First Edition',
    pageRange: [13, 14], // Roman numerals xiii-xiv
    // description: 'Original foreword from 1939',
    useRomanNumerals: true,
  },
  {
    id: 'foreword-second',
    title: 'Foreword to Second Edition',
    pageRange: [15, 22], // Roman numerals xv-xxii  
    // description: 'Foreword added in 1955',
    useRomanNumerals: true,
  },
  {
    id: 'doctors-opinion',
    title: "The Doctor's Opinion",
    pageRange: [23, 30], // Roman numerals xxiii-xxx
    // description: 'Medical perspective by Dr. William D. Silkworth',
    useRomanNumerals: true,
  },
  {
    id: 'chapter-1',
    title: "1. Bill's Story",
    chapterNumber: 1,
    pageRange: [1, 16],
    description: "Co-founder Bill W.'s personal story of alcoholism and recovery",
  },
  {
    id: 'chapter-2',
    title: '2. There Is a Solution',
    chapterNumber: 2,
    pageRange: [17, 29],
    description: 'The nature of alcoholism and the AA solution',
  },
  {
    id: 'chapter-3',
    title: '3. More About Alcoholism',
    chapterNumber: 3,
    pageRange: [30, 43],
    description: 'Understanding the alcoholic mind and body',
  },
  {
    id: 'chapter-4',
    title: '4. We Agnostics',
    chapterNumber: 4,
    pageRange: [44, 57],
    description: 'Addressing spiritual skepticism',
  },
  {
    id: 'chapter-5',
    title: '5. How It Works',
    chapterNumber: 5,
    pageRange: [58, 71],
    description: 'The Twelve Steps of Alcoholics Anonymous',
  },
  {
    id: 'chapter-6',
    title: '6. Into Action',
    chapterNumber: 6,
    pageRange: [72, 88],
    description: 'Taking the steps and making amends',
  },
  {
    id: 'chapter-7',
    title: '7. Working with Others',
    chapterNumber: 7,
    pageRange: [89, 103],
    description: 'How to help other alcoholics',
  },
  {
    id: 'chapter-8',
    title: '8. To Wives',
    chapterNumber: 8,
    pageRange: [104, 121],
    description: 'Guidance for spouses of alcoholics',
  },
  {
    id: 'chapter-9',
    title: '9. The Family Afterward',
    chapterNumber: 9,
    pageRange: [122, 135],
    description: 'Rebuilding family relationships in recovery',
  },
  {
    id: 'chapter-10',
    title: '10. To Employers',
    chapterNumber: 10,
    pageRange: [136, 150],
    description: 'Working with alcoholic employees',
  },
  {
    id: 'chapter-11',
    title: '11. A Vision for You',
    chapterNumber: 11,
    pageRange: [151, 164],
    description: 'The promise and future of AA',
  },
  {
    id: 'appendix-1',
    title: 'The AA Tradition',
    pageRange: [565, 568],
    // description: 'History and traditions of AA',
  },
  {
    id: 'appendix-2',
    title: 'Spiritual Experience',
    pageRange: [569, 570],
    // description: 'Different types of spiritual experiences',
  },
  {
    id: 'appendix-3',
    title: 'The Medical View on AA',
    pageRange: [571, 572],
    // description: 'Medical professionals on AA effectiveness',
  },
  {
    id: 'appendix-4',
    title: 'The Lasker Award',
    pageRange: [573, 574],
    // description: "AA's recognition by the medical community",
  },
  {
    id: 'appendix-5',
    title: 'The Religious View on AA',
    pageRange: [575, 577],
    // description: 'Religious leaders on AA compatibility with faith',
  },
  {
    id: 'appendix-6',
    title: 'How to Get in Touch with AA',
    pageRange: [578, 579],
    // description: 'Finding local AA meetings and resources',
  },
];

/**
 * Get chapter metadata by ID
 */
export function getChapterMeta(chapterId: string): BigBookChapterMeta | undefined {
  return bigBookChapterMetadata.find(meta => meta.id === chapterId);
}

/**
 * Get all main chapters (1-11)
 */
export function getMainChapters(): BigBookChapterMeta[] {
  return bigBookChapterMetadata.filter(meta => meta.chapterNumber !== undefined);
}

/**
 * Get all forewords and preface
 */
export function getFrontMatter(): BigBookChapterMeta[] {
  return bigBookChapterMetadata.filter(meta => 
    meta.id.startsWith('foreword') || meta.id === 'preface' || meta.id === 'doctors-opinion'
  );
}

/**
 * Get all appendices
 */
export function getAppendices(): BigBookChapterMeta[] {
  return bigBookChapterMetadata.filter(meta => meta.id.startsWith('appendix'));
}
