import { useEffect, useState } from "react";
import { Check, Copy, Download, FileCode2, Loader2, AlertCircle } from "lucide-react";
import { StreamlitSourceFile } from "../types";

export function PythonSourceView() {
  const [files, setFiles] = useState<StreamlitSourceFile[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string>("app.py");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBundle() {
      try {
        const res = await fetch("/api/streamlit-bundle");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to load Python source files.");
        }
        if (isMounted) {
          setFiles(data.files || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : "Could not load source files."
          );
          setIsLoading(false);
        }
      }
    }

    loadBundle();
    return () => {
      isMounted = false;
    };
  }, []);

  const activeFile =
    files.find((f) => f.name === selectedFileName) ?? files[0] ?? null;

  const handleCopy = async (file: StreamlitSourceFile) => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopiedFile(file.name);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch {
      setCopiedFile(null);
    }
  };

  const handleDownload = (file: StreamlitSourceFile) => {
    const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file.name;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-xl border border-[#DBEAFE] bg-white p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-4 border-b border-blue-50 pb-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E3A8A]">
              Python &amp; Streamlit Source Code
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
              Complete, beginner-friendly Python implementation built with
              Streamlit, PyPDF, Pydantic, and the official Google GenAI Python
              SDK.
            </p>
          </div>

          {files.length > 0 && (
            <div
              role="tablist"
              aria-label="Python project files"
              className="flex flex-wrap items-center gap-1 rounded-lg bg-[#EFF6FF] p-1"
            >
              {files.map((file) => {
                const isSelected = activeFile?.name === file.name;
                return (
                  <button
                    key={file.name}
                    role="tab"
                    type="button"
                    aria-selected={isSelected}
                    onClick={() => setSelectedFileName(file.name)}
                    className={`cursor-pointer whitespace-nowrap shrink-0 rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-white text-[#1D4ED8] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {file.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-3 py-12 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-[#1D4ED8]" />
            <span>Loading Python source files...</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {!isLoading && !error && activeFile && (
          <div className="mt-6">
            <div className="mb-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileCode2
                  className="h-4 w-4 shrink-0 text-[#1D4ED8]"
                  aria-hidden="true"
                />
                <span className="font-mono font-medium text-slate-900">
                  streamlit_app/{activeFile.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeFile.description}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy(activeFile)}
                  className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg border border-blue-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-[#EFF6FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  {copiedFile === activeFile.name ? (
                    <>
                      <Check
                        className="h-3.5 w-3.5 text-[#1D4ED8]"
                        aria-hidden="true"
                      />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(activeFile)}
                  className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-[#1D4ED8] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Download {activeFile.name}</span>
                </button>
              </div>
            </div>

            <pre className="max-h-[600px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-5 font-mono text-xs leading-relaxed text-slate-100">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        )}
      </section>
    </div>
  );
}
