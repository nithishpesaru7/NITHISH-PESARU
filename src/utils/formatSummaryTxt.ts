import { PaperSummaryResult } from "../types";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatSummaryAsTxt(result: PaperSummaryResult): string {
  const takeaways = result.keyTakeaways
    .slice(0, 5)
    .map((point, index) => `${index + 1}. ${point}`)
    .join("\n");

  return [
    "AI RESEARCH PAPER SUMMARIZER",
    "============================",
    `Source File: ${result.fileName} (${result.pageCount} pages)`,
    "",
    "A. PAPER INFORMATION",
    "--------------------",
    `Research Paper Title: ${result.paperInfo.title}`,
    `Authors:              ${result.paperInfo.authors}`,
    "",
    "B. SIMPLE LANGUAGE SUMMARY",
    "--------------------------",
    "1. Problem",
    result.summary.problem,
    "",
    "2. Method Used",
    result.summary.methodUsed,
    "",
    "3. Dataset",
    result.summary.dataset,
    "",
    "4. Results",
    result.summary.results,
    "",
    "5. Limitations",
    result.summary.limitations,
    "",
    "C. 5 KEY TAKEAWAYS",
    "------------------",
    takeaways,
    "",
  ].join("\n");
}
