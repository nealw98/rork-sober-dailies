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
  pdfUrl?: string; // PDF URL for Android platform
  markdownTitle?: string; // Title to use when displaying markdown content (for iOS)
  pages?: string;
  description?: string;
}

export const bigBookData: BigBookCategory[] = [
  {
    id: "forewords",
    title: "Forward & Doctor's Opinion",
    description: "Introduction and historical context of the Big Book",
    sections: [
      {
        id: "preface",
        title: "Preface",
        pages: "xi-xii",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_preface.pdf"
      },
      {
        id: "foreword-first",
        title: "Foreword to First Edition",
        pages: "xiii-xiv",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfirstedition.pdf"
      },
      {
        id: "foreword-second",
        title: "Foreword to Second Edition",
        pages: "xv-xvii",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordsecondedition.pdf"
      },
      {
        id: "foreword-third",
        title: "Foreword to Third Edition",
        pages: "xviii-xx",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordthirdedition.pdf"
      },
      {
        id: "foreword-fourth",
        title: "Foreword to Fourth Edition",
        pages: "xxi-xxii",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfourthedition.pdf"
      },
      {
        id: "doctors-opinion",
        title: "The Doctor's Opinion",
        pages: "xxiii-xxx",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_foreworddoctorsopinion.pdf"
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
    description: "Additional resources and perspectives",
    sections: [
      {
        id: "appendix-1",
        title: "I. The A.A. Tradition",
        markdownTitle: "Spiritual Experience", // iOS markdown content is actually Spiritual Experience
        pages: "561-566",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicei.pdf"
      },
      {
        id: "appendix-2",
        title: "II. Spiritual Experience",
        pages: "567-568",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceii.pdf"
      },
      {
        id: "appendix-3",
        title: "III. The Medical View on A.A.",
        pages: "569-570",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceiii.pdf"
      },
      {
        id: "appendix-4",
        title: "IV. The Lasker Award",
        pages: "571",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceiv.pdf"
      },
      {
        id: "appendix-5",
        title: "V. The Religious View on A.A.",
        pages: "572",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicev.pdf"
      },
      {
        id: "appendix-6",
        title: "VI. How to Get in Touch with A.A.",
        pages: "573",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicevi.pdf"
      },
      {
        id: "appendix-7",
        title: "VII. Twelve Concepts (Short Form)",
        pages: "574-575",
        url: "",
        pdfUrl: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicevii_.pdf"
      }
    ]
  }
];
