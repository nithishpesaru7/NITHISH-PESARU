import { useRef, useState } from "react";
import { Header } from "./components/Header";
import { PythonSourceView } from "./components/PythonSourceView";
import { SetupGuideView } from "./components/SetupGuideView";
import { SummarizerWorkspace } from "./components/SummarizerWorkspace";
import { ActiveTab } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("summarizer");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleQuickUpload = () => {
    setActiveTab("summarizer");
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FBFF] text-slate-900">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onQuickUpload={handleQuickUpload}
      />

      <main className="flex-1">
        {activeTab === "summarizer" && (
          <SummarizerWorkspace
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
            fileInputRef={fileInputRef}
          />
        )}
        {activeTab === "python-code" && <PythonSourceView />}
        {activeTab === "setup-guide" && <SetupGuideView />}
      </main>

      <footer className="border-t border-[#DBEAFE] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:px-6">
          <span>AI Research Paper Summarizer · Academic Reading Assistant</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("summarizer")}
              className="cursor-pointer hover:text-[#1D4ED8]"
            >
              Summarizer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("python-code")}
              className="cursor-pointer hover:text-[#1D4ED8]"
            >
              Python &amp; Streamlit Code
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("setup-guide")}
              className="cursor-pointer hover:text-[#1D4ED8]"
            >
              Setup Guide
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
