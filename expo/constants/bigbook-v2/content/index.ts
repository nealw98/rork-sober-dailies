/**
 * Big Book V2 Content Index
 * 
 * Exports all chapters in structured format.
 */

import { BigBookChapter } from '@/types/bigbook-v2';

import { foreword_first } from './foreword-first';
import { foreword_second } from './foreword-second';
import { preface } from './preface';
import { doctors_opinion } from './doctors-opinion';
import { chapter_1 } from './chapter-1';
import { chapter_2 } from './chapter-2';
import { chapter_3 } from './chapter-3';
import { chapter_4 } from './chapter-4';
import { chapter_5 } from './chapter-5';
import { chapter_6 } from './chapter-6';
import { chapter_7 } from './chapter-7';
import { chapter_8 } from './chapter-8';
import { chapter_9 } from './chapter-9';
import { chapter_10 } from './chapter-10';
import { chapter_11 } from './chapter-11';
import { appendix_1 } from './appendix-1';
import { appendix_2 } from './appendix-2';
import { appendix_3 } from './appendix-3';
import { appendix_4 } from './appendix-4';
import { appendix_5 } from './appendix-5';
import { appendix_6 } from './appendix-6';

export const bigBookContent: Record<string, BigBookChapter> = {
  'foreword-first': foreword_first,
  'foreword-second': foreword_second,
  'preface': preface,
  'doctors-opinion': doctors_opinion,
  'chapter-1': chapter_1,
  'chapter-2': chapter_2,
  'chapter-3': chapter_3,
  'chapter-4': chapter_4,
  'chapter-5': chapter_5,
  'chapter-6': chapter_6,
  'chapter-7': chapter_7,
  'chapter-8': chapter_8,
  'chapter-9': chapter_9,
  'chapter-10': chapter_10,
  'chapter-11': chapter_11,
  'appendix-1': appendix_1,
  'appendix-2': appendix_2,
  'appendix-3': appendix_3,
  'appendix-4': appendix_4,
  'appendix-5': appendix_5,
  'appendix-6': appendix_6,
};

/**
 * Get a specific chapter by ID
 */
export function getChapter(chapterId: string): BigBookChapter | undefined {
  return bigBookContent[chapterId];
}

/**
 * Get all chapters as an array
 */
export function getAllChapters(): BigBookChapter[] {
  return Object.values(bigBookContent);
}
