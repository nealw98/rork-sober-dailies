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
  url: string;
  pages?: string;
  description?: string;
}

export const bigBookData: BigBookCategory[] = [
  {
    id: "forewords",
    title: "Forward & Doctor's Opinion",
    description: "", // Commented out: "Introduction and historical context of the Big Book"
    sections: [
      {
        id: "foreword-first",
        title: "Foreword to First Edition",
        pages: "xiii-xiv",
        url: ""
      },
      {
        id: "doctors-opinion",
        title: "The Doctor's Opinion",
        pages: "xxiii-xxx",
        url: ""
      }
    ]
  },
  {
    id: "main-chapters",
    title: "Main Chapters",
    description: "", // Commented out: "The core text describing the AA recovery program"
    sections: [
      {
        id: "chapter-1",
        title: "1. Bill's Story",
        pages: "1-16",
        url: ""
      },
      {
        id: "chapter-2",
        title: "2. There Is A Solution",
        pages: "17-29",
        url: ""
      },
      {
        id: "chapter-3",
        title: "3. More About Alcoholism",
        pages: "30-43",
        url: ""
      },
      {
        id: "chapter-4",
        title: "4. We Agnostics",
        pages: "44-57",
        url: ""
      },
      {
        id: "chapter-5",
        title: "5. How It Works",
        pages: "58-71",
        url: ""
      },
      {
        id: "chapter-6",
        title: "6. Into Action",
        pages: "72-88",
        url: ""
      },
      {
        id: "chapter-7",
        title: "7. Working With Others",
        pages: "89-103",
        url: ""
      },
      {
        id: "chapter-8",
        title: "8. To Wives",
        pages: "104-121",
        url: ""
      },
      {
        id: "chapter-9",
        title: "9. The Family Afterward",
        pages: "122-135",
        url: ""
      },
      {
        id: "chapter-10",
        title: "10. To Employers",
        pages: "136-150",
        url: ""
      },
      {
        id: "chapter-11",
        title: "11. A Vision For You",
        pages: "151-164",
        url: ""
      }
    ]
  },
  {
    id: "appendices",
    title: "Appendices",
    description: "", // Commented out: "Additional resources and perspectives"
    sections: [
      {
        id: "appendix-1",
        title: "Spiritual Experience",
        pages: "567-568",
        url: ""
      }
    ]
  }
];
