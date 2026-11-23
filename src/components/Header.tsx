import { ActiveTab } from "../types";

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onQuickUpload: () => void;
}

export function Header({
  activeTab,
  onSelectTab,
  onQuickUpload,
}: HeaderProps) {
  const navItems: { id: ActiveTab; label: string }[] = [
    { id: "summarizer", label: "Summarizer" },
    { id: "python-code", label: "Python Code" },
    { id: "setup-guide", label: "Setup Guide" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#DBEAFE] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={() => onSelectTab("summarizer")}
          className="cursor-pointer whitespace-nowrap shrink-0 text-left text-base font-bold tracking-tight text-[#1E3A8A] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] sm:text-lg"
        >
          AI Research Paper Summarizer
        </button>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 md:flex"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`cursor-pointer whitespace-nowrap shrink-0 border-b-2 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1D4ED8] ${
                  isActive
                    ? "border-[#1D4ED8] text-[#1D4ED8]"
                    : "border-transparent text-slate-600 hover:border-blue-200 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onQuickUpload}
            className="cursor-pointer whitespace-nowrap shrink-0 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1E40AF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] sm:text-sm"
          >
            Upload PDF
          </button>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav
        aria-label="Mobile Navigation"
        className="flex items-center gap-4 overflow-x-auto border-t border-blue-50 px-4 py-2 md:hidden"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`cursor-pointer whitespace-nowrap shrink-0 border-b-2 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "border-[#1D4ED8] text-[#1D4ED8]"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
