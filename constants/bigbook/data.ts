import { BigBookTextContent } from './index';

export interface BigBookCategory {
  id: string;
  title: string;
  description: string;
  sections: BigBookSection[];
}

export interface BigBookSection {
  id: string;
  title: string;
  url?: string;
  pages?: string;
  description?: string;
}

export const bigBookData: BigBookCategory[] = [
  {
    id: "forewords",
    title: "Forewords & Prefaces",
    description: "Introduction and historical context of the Big Book",
    sections: [
      {
        id: "foreword-first",
        title: "Foreword to First Edition",
        pages: "xiii-xiv",
        description: "Original 1939 foreword"
      },
      {
        id: "doctors-opinion",
        title: "The Doctor's Opinion",
        pages: "xxiii-xxx",
        description: "Dr. William Silkworth's medical perspective"
      }
    ]
  },
  {
    id: "main-chapters",
    title: "Main Chapters",
    description: "The core text describing the AA recovery program",
    sections: [
      {
        id: "chapter-1",
        title: "Bill's Story",
        pages: "1-16",
        description: "Co-founder Bill Wilson's personal story"
      },
      {
        id: "chapter-2",
        title: "There Is A Solution",
        pages: "17-29",
        description: "The nature of alcoholism and recovery"
      },
      {
        id: "chapter-3",
        title: "More About Alcoholism",
        pages: "30-43",
        description: "Understanding the disease of alcoholism"
      },
      {
        id: "chapter-4",
        title: "We Agnostics",
        pages: "44-57",
        description: "Spirituality for the skeptical"
      },
      {
        id: "chapter-5",
        title: "How It Works",
        pages: "58-71",
        description: "The Twelve Steps of Alcoholics Anonymous"
      },
      {
        id: "chapter-6",
        title: "Into Action",
        pages: "72-88",
        description: "Working the Steps in daily life"
      },
      {
        id: "chapter-7",
        title: "Working With Others",
        pages: "89-103",
        description: "Helping other alcoholics recover"
      },
      {
        id: "chapter-8",
        title: "To Wives",
        pages: "104-121",
        description: "Guidance for spouses of alcoholics"
      },
      {
        id: "chapter-9",
        title: "The Family Afterward",
        pages: "122-135",
        description: "Rebuilding family relationships"
      },
      {
        id: "chapter-10",
        title: "To Employers",
        pages: "136-150",
        description: "Workplace considerations for alcoholics"
      },
      {
        id: "chapter-11",
        title: "A Vision For You",
        pages: "151-164",
        description: "The future of AA and recovery"
      }
    ]
  },
  {
    id: "appendices",
    title: "Appendices",
    description: "Additional resources and perspectives",
    sections: [
      {
        id: "appendix-1",
        title: "Spiritual Experience",
        pages: "567-568",
        description: "Understanding spiritual awakening in the 1st edition"
      }
    ]
  }
];
