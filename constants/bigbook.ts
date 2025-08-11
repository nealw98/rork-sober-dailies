import { BigBookCategory, TwelveAndTwelveCategory } from "@/types/bigbook";

export const bigBookData: BigBookCategory[] = [
  {
    id: "forewords",
    title: "Forewords & Prefaces",
    description: "Introduction and historical context of the Big Book",
    sections: [
      {
        id: "preface",
        title: "Preface",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_preface.pdf",
        pages: "xi-xii",
        description: "Introduction to the fourth edition"
      },
      {
        id: "foreword-first",
        title: "Foreword to First Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfirstedition.pdf",
        pages: "xiii-xiv",
        description: "Original 1939 foreword"
      },
      {
        id: "foreword-second",
        title: "Foreword to Second Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordsecondedition.pdf",
        pages: "xv-xvi",
        description: "1955 edition updates"
      },
      {
        id: "foreword-third",
        title: "Foreword to Third Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordthirdedition.pdf",
        pages: "xvii-xviii",
        description: "1976 edition updates"
      },
      {
        id: "foreword-fourth",
        title: "Foreword to Fourth Edition",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_forewordfourthedition.pdf",
        pages: "xix-xx",
        description: "2001 edition updates"
      },
      {
        id: "doctors-opinion",
        title: "The Doctor's Opinion",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_foreworddoctorsopinion.pdf",
        pages: "xxiii-xxxii",
        description: "Dr. William Silkworth's medical perspective"
      }
    ]
  },
  {
    id: "chapters",
    title: "Main Chapters",
    description: "The core text describing the AA recovery program",
    sections: [
      {
        id: "chapter-1",
        title: "Bill's Story",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt1.pdf",
        pages: "1-16",
        description: "Co-founder Bill Wilson's personal story"
      },
      {
        id: "chapter-2",
        title: "There Is A Solution",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt2.pdf",
        pages: "17-29",
        description: "The nature of alcoholism and recovery"
      },
      {
        id: "chapter-3",
        title: "More About Alcoholism",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt3.pdf",
        pages: "30-43",
        description: "Understanding the disease of alcoholism"
      },
      {
        id: "chapter-4",
        title: "We Agnostics",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt4.pdf",
        pages: "44-57",
        description: "Spirituality for the skeptical"
      },
      {
        id: "chapter-5",
        title: "How It Works",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt5.pdf",
        pages: "58-71",
        description: "The Twelve Steps of Alcoholics Anonymous"
      },
      {
        id: "chapter-6",
        title: "Into Action",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt6.pdf",
        pages: "72-88",
        description: "Working the Steps in daily life"
      },
      {
        id: "chapter-7",
        title: "Working With Others",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt7.pdf",
        pages: "89-103",
        description: "Helping other alcoholics recover"
      },
      {
        id: "chapter-8",
        title: "To Wives",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt8.pdf",
        pages: "104-121",
        description: "Guidance for spouses of alcoholics"
      },
      {
        id: "chapter-9",
        title: "The Family Afterward",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt9.pdf",
        pages: "122-135",
        description: "Rebuilding family relationships"
      },
      {
        id: "chapter-10",
        title: "To Employers",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt10.pdf",
        pages: "136-150",
        description: "Workplace considerations for alcoholics"
      },
      {
        id: "chapter-11",
        title: "A Vision For You",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_chapt11.pdf",
        pages: "151-164",
        description: "The future of AA and recovery"
      }
    ]
  },
  {
    id: "personal-stories",
    title: "Personal Stories",
    description: "Real recovery experiences from AA members",
    sections: [
      {
        id: "part-1",
        title: "Part I: Pioneers of A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_personalstories_partI.pdf",
        pages: "169-276",
        description: "Stories from early AA members"
      },
      {
        id: "part-2",
        title: "Part II: They Stopped in Time",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_personalstories_partII.pdf",
        pages: "277-431",
        description: "Stories of those who recovered early"
      },
      {
        id: "part-3",
        title: "Part III: They Lost Nearly All",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_personalstories_partIII.pdf",
        pages: "435-559",
        description: "Stories of those who hit bottom hard"
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
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicei.pdf",
        description: "The Twelve Traditions of AA"
      },
      {
        id: "appendix-2",
        title: "II. Spiritual Experience",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceii.pdf",
        description: "Understanding spiritual awakening"
      },
      {
        id: "appendix-3",
        title: "III. The Medical View on A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceiii.pdf",
        description: "Medical profession's perspective"
      },
      {
        id: "appendix-4",
        title: "IV. The Lasker Award",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendiceiv.pdf",
        description: "Recognition from medical community"
      },
      {
        id: "appendix-5",
        title: "V. The Religious View on A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicev.pdf",
        description: "Religious community's perspective"
      },
      {
        id: "appendix-6",
        title: "VI. How to Get in Touch With A.A.",
        url: "https://www.aa.org/sites/default/files/2021-11/en_bigbook_appendicevi.pdf",
        description: "Finding local AA meetings"
      }
    ]
  }
];

// AA Prayers for offline reading
export const aaPrayers = [
  {
    title: "Morning Prayer",
    content: `As I begin this day, I ask my Higher Power:
Direct my thinking and remove from me self-centered fear and selfish motives. Help me walk with clarity, courage, and purpose.

When I don't know what to do, grant me inspiration. Give me an intuitive thought, a gentle nudge, or the patience to wait. Teach me to trust that Your guidance will come.

Help me relax and take it easy. Keep me from forcing outcomes or trying to run the show. Let me remember that I'm not in charge — You are. As I go about my day, show me the next right action. Give me what I need to handle whatever comes my way.

Remove my fear. Direct my attention to what You would have me be. Give me faith in Your plan and the courage to act.

Remove my selfishness and self-centeredness. Direct my thinking toward others. Show me how I can be of service — useful, kind, and willing.

Thy will, not mine, be done. Amen.`,
    source: "Inspired by \"On Awakening,\" Alcoholics Anonymous, p. 86"
  },
  {
    title: "Third Step Prayer",
    content: `God, I offer myself to Thee — to build with me and to do with me as Thou wilt. Relieve me of the bondage of self, that I may better do Thy will. Take away my difficulties, that victory over them may bear witness to those I would help of Thy Power, Thy Love, and Thy Way of life. May I do Thy will always!`,
    source: "Alcoholics Anonymous, Page 63"
  },
  {
    title: "Seventh Step Prayer",
    content: `My Creator, I am now willing that you should have all of me, good and bad. I pray that you now remove from me every single defect of character which stands in the way of my usefulness to you and my fellows. Grant me strength, as I go out from here, to do your bidding. Amen.`,
    source: "Alcoholics Anonymous, Page 76"
  },
  {
    title: "Eleventh Step Prayer",
    content: `Lord, make me a channel of thy peace:

that where there is hatred, I may bring love;

that where there is wrong, I may bring the spirit of forgiveness;

that where there is discord, I may bring harmony;

that where there is error, I may bring truth;

that where there is doubt, I may bring faith;

that where there is despair, I may bring hope;

that where there are shadows, I may bring light;

that where there is sadness, I may bring joy.

Lord, grant that I may seek rather to comfort than to be comforted,

to understand, than to be understood,

to love, than to be loved.

For it is by giving that we receive,

It is by forgiving that we are forgiven.

It is by dying that we awaken to Eternal Life.

Amen.`,
    source: "Twelve Steps and Twelve Traditions, Page 99 (St. Francis Prayer)"
  },
  {
    title: "Serenity Prayer",
    content: `God, grant me the serenity to accept the things I cannot change,
Courage to change the things I can,
And wisdom to know the difference.`,
    source: "Attributed to Reinhold Niebuhr"
  },
  {
    title: "Set Aside Prayer",
    content: `God, please help me set aside everything I think I know about You, everything I think I know about myself, everything I think I know about others, and everything I think I know about my own recovery so I may have an open mind and a new experience with all these things. Please help me see the truth.`,
    source: "Commonly used in AA meetings"
  },
  {
    title: "Evening Prayer",
    content: `As this day closes:

I thank my Higher Power for the gifts, lessons, and people You placed in my path today, and for the strength to stay sober and the moments of grace I noticed.

I look honestly at my day and ask forgiveness for the times I was selfish, afraid, or unkind. Place on my heart any amends I need to make, and give me willingness.

I release tonight every worry, resentment, and fear of tomorrow, and ask You to grant me restful sleep that restores body, mind, and spirit.

Guide my thoughts and actions tomorrow that they may align with Your will, helping me grow in usefulness to others.

With gratitude and trust, I place myself in Your care, one day at a time.

Thy will, not mine, be done. Amen.`,
    source: ""
  }
];

export const twelveAndTwelveData: TwelveAndTwelveCategory[] = [
  {
    id: "intro",
    title: "Introduction",
    description: "Foundational materials and context",
    sections: [
      {
        id: "copyright",
        title: "Copyright Information",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tt_copyright.pdf",
        description: "Copyright and publication information"
      },
      {
        id: "contents",
        title: "Contents",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tt_contents.pdf",
        description: "Table of contents"
      },
      {
        id: "introduction",
        title: "Introduction",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tt_intro.pdf",
        description: "Introduction to the Twelve and Twelve"
      },
      {
        id: "foreword",
        title: "Foreword",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tt_foreword.pdf",
        description: "Foreword to the Twelve and Twelve"
      }
    ]
  },
  {
    id: "twelve-steps",
    title: "Twelve Steps",
    description: "Detailed exploration of the Twelve Steps",
    sections: [
      {
        id: "step-1",
        title: "Step 1",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step1.pdf",
        description: "We admitted we were powerless over alcohol—that our lives had become unmanageable."
      },
      {
        id: "step-2",
        title: "Step 2",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step2.pdf",
        description: "Came to believe that a Power greater than ourselves could restore us to sanity."
      },
      {
        id: "step-3",
        title: "Step 3",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step3.pdf",
        description: "Made a decision to turn our will and our lives over to the care of God as we understood Him."
      },
      {
        id: "step-4",
        title: "Step 4",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step4.pdf",
        description: "Made a searching and fearless moral inventory of ourselves."
      },
      {
        id: "step-5",
        title: "Step 5",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step5.pdf",
        description: "Admitted to God, to ourselves, and to another human being the exact nature of our wrongs."
      },
      {
        id: "step-6",
        title: "Step 6",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step6.pdf",
        description: "Were entirely ready to have God remove all these defects of character."
      },
      {
        id: "step-7",
        title: "Step 7",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step7.pdf",
        description: "Humbly asked Him to remove our shortcomings."
      },
      {
        id: "step-8",
        title: "Step 8",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step8.pdf",
        description: "Made a list of all persons we had harmed, and became willing to make amends to them all."
      },
      {
        id: "step-9",
        title: "Step 9",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step9.pdf",
        description: "Made direct amends to such people wherever possible, except when to do so would injure them or others."
      },
      {
        id: "step-10",
        title: "Step 10",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step10.pdf",
        description: "Continued to take personal inventory and when we were wrong promptly admitted it."
      },
      {
        id: "step-11",
        title: "Step 11",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step11.pdf",
        description: "Sought through prayer and meditation to improve our conscious contact with God as we understood Him, praying only for knowledge of His will for us and the power to carry that out."
      },
      {
        id: "step-12",
        title: "Step 12",
        url: "https://www.aa.org/sites/default/files/2021-11/en_step12.pdf",
        description: "Having had a spiritual awakening as the result of these Steps, we tried to carry this message to alcoholics, and to practice these principles in all our affairs."
      }
    ]
  },
  {
    id: "twelve-traditions",
    title: "Twelve Traditions",
    description: "The principles that guide AA groups",
    sections: [
      {
        id: "tradition-1",
        title: "Tradition 1",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition1.pdf",
        description: "Our common welfare should come first; personal recovery depends upon A.A. unity."
      },
      {
        id: "tradition-2",
        title: "Tradition 2",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition2.pdf",
        description: "For our group purpose there is but one ultimate authority—a loving God as He may express Himself in our group conscience. Our leaders are but trusted servants; they do not govern."
      },
      {
        id: "tradition-3",
        title: "Tradition 3",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition3.pdf",
        description: "The only requirement for A.A. membership is a desire to stop drinking."
      },
      {
        id: "tradition-4",
        title: "Tradition 4",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition4.pdf",
        description: "Each group should be autonomous except in matters affecting other groups or A.A. as a whole."
      },
      {
        id: "tradition-5",
        title: "Tradition 5",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition5.pdf",
        description: "Each group has but one primary purpose—to carry its message to the alcoholic who still suffers."
      },
      {
        id: "tradition-6",
        title: "Tradition 6",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition6.pdf",
        description: "An A.A. group ought never endorse, finance, or lend the A.A. name to any related facility or outside enterprise, lest problems of money, property, and prestige divert us from our primary purpose."
      },
      {
        id: "tradition-7",
        title: "Tradition 7",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition7.pdf",
        description: "Every A.A. group ought to be fully self-supporting, declining outside contributions."
      },
      {
        id: "tradition-8",
        title: "Tradition 8",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition8.pdf",
        description: "Alcoholics Anonymous should remain forever nonprofessional, but our service centers may employ special workers."
      },
      {
        id: "tradition-9",
        title: "Tradition 9",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition9.pdf",
        description: "A.A., as such, ought never be organized; but we may create service boards or committees directly responsible to those they serve."
      },
      {
        id: "tradition-10",
        title: "Tradition 10",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition10.pdf",
        description: "Alcoholics Anonymous has no opinion on outside issues; hence the A.A. name ought never be drawn into public controversy."
      },
      {
        id: "tradition-11",
        title: "Tradition 11",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition11.pdf",
        description: "Our public relations policy is based on attraction rather than promotion; we need always maintain personal anonymity at the level of press, radio, and films."
      },
      {
        id: "tradition-12",
        title: "Tradition 12",
        url: "https://www.aa.org/sites/default/files/2021-11/en_tradition12.pdf",
        description: "Anonymity is the spiritual foundation of all our Traditions, ever reminding us to place principles before personalities."
      }
    ]
  }
];
