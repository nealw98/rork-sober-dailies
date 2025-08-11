export interface BigBookSection {
  id: string;
  title: string;
  url: string;
  pages?: string;
  description?: string;
}

export interface BigBookCategory {
  id: string;
  title: string;
  description: string;
  sections: BigBookSection[];
}

export interface TwelveAndTwelveCategory {
  id: string;
  title: string;
  description: string;
  sections: BigBookSection[];
}

export interface BigBookmark {
  sectionId: string;
  title: string;
  url: string;
  dateAdded: number;
}