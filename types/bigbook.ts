export interface BigBookSection {
  id: string;
  title: string;
  url: string;
  pdfUrl?: string; // PDF URL for Android platform
  markdownTitle?: string; // Title to use when displaying markdown content (for iOS)
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
