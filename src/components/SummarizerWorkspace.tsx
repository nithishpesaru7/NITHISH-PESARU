import React, { useRef, useState } from "react";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { PaperSummaryResult } from "../types";
import { formatFileSize, formatSummaryAsTxt } from "../utils/formatSummaryTxt";

interface SummarizerWorkspaceProps {
  selectedFile: File | null;
  onSelectFile: (file: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function SummarizerWorkspace({
  selectedFile,
  onSelectFile,
  fileInputRef,
}: SummarizerWorkspaceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<PaperSummaryResult | null>(
    null
  );
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);

  const validateAndSetFile = (file: File | null) => {
    setErrorMessage(null);
    if (!file) {
      onSelectFile(null);
      return;
    }

    const isPdfByExt = file.name.toLowerCase().endsWith(".pdf");
    const isPdfByType = file.type === "application/pdf";

    if (!isPdfByExt && !isPdfByType) {
      onSelectFile(null);
      setErrorMessage(
        "Only PDF files (.pdf) are supported. Please select a valid research paper PDF."
      );
      return;
    }

    if (file.size === 0) {
      onSelectFile(null);
      setErrorMessage(
        "The selected PDF file appears to be empty (0 bytes). Please choose another file."
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      onSelectFile(null);
      setErrorMessage(
        "File size exceeds 25 MB. Please upload a PDF under 25 MB."
      );
      return;
    }

    onSelectFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    validateAndSetFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    validateAndSetFile(file);
  };

  const handleSummarize = async () => {
    if (!selectedFile) {
      setErrorMessage("Please upload a research paper PDF before summarizing.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSummaryResult(null);

    try {
      const formData = new FormData();
      formData.append("pdf", selectedFile);

      const response = await fetch("/api/summarize", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          data?.error ||
          "Unable to summarize the uploaded PDF. Please try again.";
        throw new Error(message);
      }

      setSummaryResult(data as PaperSummaryResult);
      setTimeout(() => {
        resultsAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while processing the PDF.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = () => {
    onSelectFile(null);
    setSummaryResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownloadTxt = () => {
    if (!summaryResult) return;
    const textContent = formatSummaryAsTxt(summaryResult);
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const baseName = summaryResult.fileName.replace(/\.pdf$/i, "");
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${baseName}_summary.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const summarySections = summaryResult
    ? [
        {
          number: "1",
          heading: "Problem",
          prompt: "What problem does the research address?",
          content: summaryResult.summary.problem,
        },
        {
          number: "2",
          heading: "Method Used",
          prompt: "What techniques or methods were used?",
          content: summaryResult.summary.methodUsed,
        },
        {
          number: "3",
          heading: "Dataset",
          prompt: "What data was used for the research?",
          content: summaryResult.summary.dataset,
        },
        {
          number: "4",
          heading: "Results",
          prompt: "What are the main findings?",
          content: summaryResult.summary.results,
        },
        {
          number: "5",
          heading: "Limitations",
          prompt: "What are the weaknesses or limitations?",
          content: summaryResult.summary.limitations,
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Intro Section */}
      <section className="mb-8 rounded-xl border border-[#DBEAFE] bg-white p-6 sm:p-8">
        <div className="max-w-3xl">
          <h1
            className="text-2xl font-bold tracking-tight text-[#1E3A8A] sm:text-3xl"
            style={{ textWrap: "balance" }}
          >
            AI Research Paper Summarizer
          </h1>
          <p className="mt-2.5 text-base leading-relaxed text-slate-600">
            Upload any academic research paper in PDF format. The application
            extracts the full paper text and translates dense methodology,
            datasets, results, and limitations into clear, simple English for
            students.
          </p>
        </div>

        {/* PDF Upload Dropzone */}
        <div className="mt-6">
          <input
            ref={fileInputRef}
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="sr-only"
          />

          <div
            role="button"
            tabIndex={0}
            aria-label="Upload research paper PDF"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] sm:p-8 ${
              isDragging
                ? "border-[#1D4ED8] bg-[#EFF6FF]"
                : "border-blue-200 bg-[#F8FBFF] hover:border-[#60A5FA] hover:bg-[#EFF6FF]/60"
            }`}
          >
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </div>

            {selectedFile ? (
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-900">
                  {selectedFile.name}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                  {formatFileSize(selectedFile.size)} · PDF selected · Click to
                  replace file
                </p>
              </div>
            ) : (
              <div className="mt-3">
                <p className="text-sm font-semibold text-slate-900">
                  Drop your research paper PDF here, or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Accepts PDF files only (.pdf) up to 25 MB
                </p>
              </div>
            )}
          </div>

          {/* Primary Action Bar */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSummarize}
              disabled={!selectedFile || isLoading}
              className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:bg-blue-200 disabled:text-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              {isLoading ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  <span>Summarizing Paper...</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  <span>Summarize Research Paper</span>
                </>
              )}
            </button>

            {(selectedFile || summaryResult || errorMessage) && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isLoading}
                className="inline-flex min-h-[42px] cursor-pointer items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Clear Paper & Results</span>
              </button>
            )}
          </div>
        </div>

        {/* Loading Feedback */}
        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="mt-5 flex items-center gap-3 rounded-lg border border-blue-200 bg-[#EFF6FF] px-4 py-3 text-sm text-[#1E3A8A]"
          >
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-[#1D4ED8]"
              aria-hidden="true"
            />
            <span>
              Extracting text from your PDF and generating a simple-English
              academic summary. This usually takes a few seconds.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Unable to process request</p>
              <p className="mt-0.5 text-red-800">{errorMessage}</p>
            </div>
          </div>
        )}
      </section>

      {/* Empty State Helper (when no summary yet and not loading) */}
      {!summaryResult && !isLoading && (
        <section className="rounded-xl border border-[#E2E8F0] bg-white p-6 sm:p-8">
          <h2 className="text-base font-semibold text-slate-900">
            What you will receive after summarizing
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Every uploaded paper is organized into three clear academic sections:
          </p>
          <div className="mt-5 grid gap-6 border-t border-slate-100 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-[#1E3A8A]">
                A. Paper Information
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Identifies the full research paper title and listed authors
                directly from the document.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1E3A8A]">
                B. Simple Language Summary
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Breaks down the Problem, Method Used, Dataset, Results, and
                Limitations in everyday English.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1E3A8A]">
                C. 5 Key Takeaways
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Highlights five numbered core points to help you revise or cite
                the study quickly.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Structured Summary Output */}
      {summaryResult && (
        <div ref={resultsAnchorRef} className="space-y-6">
          {/* Success Notification & Export Toolbar */}
          <div
            role="status"
            className="flex flex-col justify-between gap-4 rounded-xl border border-blue-200 bg-[#EFF6FF] p-4 sm:flex-row sm:items-center sm:px-6"
          >
            <div className="flex items-start gap-3 sm:items-center">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-[#1D4ED8] sm:mt-0"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-[#1E3A8A]">
                  Summary generated successfully
                </p>
                <p className="font-mono text-xs text-slate-600 tabular-nums">
                  {summaryResult.fileName} · {summaryResult.pageCount}{" "}
                  {summaryResult.pageCount === 1 ? "page" : "pages"} ·{" "}
                  {formatFileSize(summaryResult.fileSizeBytes)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 whitespace-nowrap shrink-0 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] sm:text-sm"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Download Summary (.txt)</span>
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 whitespace-nowrap shrink-0 rounded-lg border border-blue-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] sm:text-sm"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* A. Paper Information */}
          <section className="rounded-xl border border-[#DBEAFE] bg-white p-6 sm:p-7">
            <div className="flex items-center gap-2 border-b border-blue-50 pb-3">
              <FileText
                className="h-4 w-4 text-[#1D4ED8]"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-[#1E3A8A]">
                A. Paper Information
              </h2>
            </div>

            <dl className="mt-4 grid gap-5 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold tracking-wide text-slate-500">
                  Research Paper Title
                </dt>
                <dd className="mt-1 text-base font-semibold leading-snug text-slate-900">
                  {summaryResult.paperInfo.title}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold tracking-wide text-slate-500">
                  Authors
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-700">
                  {summaryResult.paperInfo.authors}
                </dd>
              </div>
            </dl>
          </section>

          {/* B. Simple Language Summary */}
          <section aria-labelledby="simple-summary-heading">
            <div className="mb-3 flex items-baseline justify-between">
              <h2
                id="simple-summary-heading"
                className="text-lg font-bold text-[#1E3A8A]"
              >
                B. Simple Language Summary
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {summarySections.map((section, idx) => (
                <article
                  key={section.number}
                  className={`rounded-xl border border-[#DBEAFE] bg-white p-6 ${
                    idx === summarySections.length - 1 ? "md:col-span-2" : ""
                  }`}
                >
                  <div className="border-b border-blue-50 pb-2.5">
                    <h3 className="text-base font-bold text-[#1D4ED8] tabular-nums">
                      {section.number}. {section.heading}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {section.prompt}
                    </p>
                  </div>
                  <p className="mt-3.5 text-[15px] leading-relaxed text-slate-800">
                    {section.content}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* C. 5 Key Takeaways */}
          <section className="rounded-xl border border-[#DBEAFE] bg-white p-6 sm:p-7">
            <h2 className="border-b border-blue-50 pb-3 text-lg font-bold text-[#1E3A8A]">
              C. 5 Key Takeaways
            </h2>

            <ol className="mt-4 divide-y divide-slate-100">
              {summaryResult.keyTakeaways.slice(0, 5).map((point, index) => (
                <li
                  key={index}
                  className="flex items-start gap-4 py-3.5 first:pt-1 last:pb-1"
                >
                  <span className="mt-0.5 font-mono text-sm font-semibold text-[#1D4ED8] tabular-nums">
                    {index + 1}.
                  </span>
                  <p className="text-[15px] leading-relaxed text-slate-800">
                    {point}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
