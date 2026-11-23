export type ActiveTab = "summarizer" | "python-code" | "setup-guide";

export interface PaperInfo {
  title: string;
  authors: string;
}

export interface SimpleLanguageSummary {
  problem: string;
  methodUsed: string;
  dataset: string;
  results: string;
  limitations: string;
}

export interface PaperSummaryResult {
  fileName: string;
  fileSizeBytes: number;
  pageCount: number;
  extractedCharCount: number;
  paperInfo: PaperInfo;
  summary: SimpleLanguageSummary;
  keyTakeaways: string[];
}

export interface StreamlitSourceFile {
  name: string;
  language: string;
  description: string;
  content: string;
}
