export interface TermData {
  id: string;
  term: string; // The main term (e.g., "API")
  fullTerm: string; // The English expansion (e.g. "Application Programming Interface")
  category: string; // e.g., "Desenvolvimento"
  definition: string; // The main explanation
  phonetic: string; // Pronunciation text (e.g., "Ei-pi-ai")
  slang?: string; // Slang or expression
  translation: string; // "Essência para o negócio" (EN->PT)
  examples: Array<{
    title: string;
    description: string;
  }>;
  analogies: Array<{
    title: string;
    description: string;
  }>;
  practicalUsage: {
    title: string; // e.g., "No Javascript" or "No Terminal"
    content: string; // The actual code or phrase
  };
  relatedTerms: string[];
}