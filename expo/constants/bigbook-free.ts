// Big Book Free Version Data
// Organized for chapter navigation with links to AA.org PDF

export interface BigBookFreeSection {
  id: string;
  title: string;
  url: string;
  description?: string;
  pageRange?: string;
}

export interface BigBookFreeCategory {
  id: string;
  title: string;
  description: string;
  sections: BigBookFreeSection[];
}

export const bigBookFreeData: BigBookFreeCategory[] = [
  {
    id: "front-matter",
    title: "Intro",
    description: "Including the Doctor's Opinion",
    sections: [
      {
        id: "preface",
        title: "Preface",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_preface.pdf",
        // description: "Introduction to the Big Book",
        pageRange: "xi-xii"
      },
      {
        id: "foreword-first",
        title: "Foreword to First Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfirstedition.pdf",
        // description: "Original foreword from 1939",
        pageRange: "xiii-xiv"
      },
      {
        id: "foreword-second",
        title: "Foreword to Second Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordsecondedition.pdf",
        // description: "Foreword added in 1955",
        pageRange: "xv-xxi"
      },
      {
        id: "foreword-third",
        title: "Foreword to Third Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordthirdedition.pdf",
        // description: "Foreword added in 1976",
        pageRange: "xxii"
      },
      {
        id: "foreword-fourth",
        title: "Foreword to Fourth Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfourthedition.pdf",
        // description: "Foreword added in 2001",
        pageRange: "xxiii-xxiv"
      },
      {
        id: "doctors-opinion",
        title: "The Doctor's Opinion",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_foreworddoctorsopinion.pdf",
        // description: "Medical perspective by Dr. William D. Silkworth",
        pageRange: "xxv-xxxii"
      }
    ]
  },
  {
    id: "main-chapters",
    title: "Main Chapters",
    description: "The first 164 pages - the basic text of AA",
    sections: [
      {
        id: "chapter-1",
        title: "1. Bill's Story",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt1.pdf",
        // description: "Co-founder Bill W.'s personal story",
        pageRange: "1-16"
      },
      {
        id: "chapter-2",
        title: "2. There Is a Solution",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt2.pdf",
        // description: "The nature of alcoholism and the AA solution",
        pageRange: "17-29"
      },
      {
        id: "chapter-3",
        title: "3. More About Alcoholism",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt3.pdf",
        // description: "Understanding the alcoholic mind and body",
        pageRange: "30-43"
      },
      {
        id: "chapter-4",
        title: "4. We Agnostics",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt4.pdf",
        // description: "Addressing spiritual skepticism",
        pageRange: "44-57"
      },
      {
        id: "chapter-5",
        title: "5. How It Works",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt5.pdf",
        // description: "The Twelve Steps of Alcoholics Anonymous",
        pageRange: "58-71"
      },
      {
        id: "chapter-6",
        title: "6. Into Action",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt6.pdf",
        // description: "Taking the steps and making amends",
        pageRange: "72-88"
      },
      {
        id: "chapter-7",
        title: "7. Working with Others",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt7.pdf",
        // description: "How to help other alcoholics",
        pageRange: "89-103"
      },
      {
        id: "chapter-8",
        title: "8. To Wives",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt8.pdf",
        // description: "Guidance for spouses of alcoholics",
        pageRange: "104-121"
      },
      {
        id: "chapter-9",
        title: "9. The Family Afterward",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt9.pdf",
        // description: "Rebuilding family relationships in recovery",
        pageRange: "122-135"
      },
      {
        id: "chapter-10",
        title: "10. To Employers",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt10.pdf",
        // description: "Working with alcoholic employees",
        pageRange: "136-150"
      },
      {
        id: "chapter-11",
        title: "11. A Vision for You",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt11.pdf",
        // description: "The promise and future of AA",
        pageRange: "151-164"
      }
    ]
  },
  {
    id: "appendices",
    title: "Appendices",
    description: "Additional resources and information",
    sections: [
      {
        id: "appendix-1",
        title: "I. The A.A. Tradition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicei.pdf",
        // description: "The Twelve Traditions of Alcoholics Anonymous",
        pageRange: "561-566"
      },
      {
        id: "appendix-2",
        title: "II. Spiritual Experience",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceii.pdf",
        // description: "Understanding spiritual awakening",
        pageRange: "567-568"
      },
      {
        id: "appendix-3",
        title: "III. The Medical View on A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceiii.pdf",
        // description: "Medical perspectives on the AA program",
        pageRange: "569-570"
      },
      {
        id: "appendix-4",
        title: "IV. The Lasker Award",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceiv.pdf",
        // description: "Recognition from the medical community",
        pageRange: "571"
      },
      {
        id: "appendix-5",
        title: "V. The Religious View on A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicev.pdf",
        // description: "Religious perspectives on AA",
        pageRange: "572"
      },
      {
        id: "appendix-6",
        title: "VI. How to Get in Touch with A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicevi.pdf",
        // description: "Finding AA meetings and resources",
        pageRange: "573"
      },
      {
        id: "appendix-7",
        title: "VII. Twelve Concepts (Short Form)",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicevii_.pdf",
        // description: "The Twelve Concepts for World Service",
        pageRange: "574-575"
      }
    ]
  }
];

