import { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface CommandBlockProps {
  id: string;
  label: string;
  command: string;
  copiedId: string | null;
  onCopy: (id: string, text: string) => void;
}

function CommandBlock({
  id,
  label,
  command,
  copiedId,
  onCopy,
}: CommandBlockProps) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        <button
          type="button"
          onClick={() => onCopy(id, command)}
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-[#1D4ED8] hover:text-[#1E40AF]"
        >
          {copiedId === id ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="mt-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-xs leading-relaxed text-slate-100">
        <code>{command}</code>
      </pre>
    </div>
  );
}

export function SetupGuideView() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="rounded-xl border border-[#DBEAFE] bg-white p-6 sm:p-8">
        <div className="border-b border-blue-50 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-[#1E3A8A]">
            Local Python &amp; Streamlit Setup Guide
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Follow these four beginner-friendly steps to run the standalone
            Python, Streamlit, PyPDF, and Google Gemini version locally on your
            computer.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Step 1 */}
          <article className="rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
            <h2 className="text-base font-bold text-[#1E3A8A]">
              Step 1. Create a Virtual Environment
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Navigate into the <code className="font-mono">streamlit_app</code>{" "}
              directory and create an isolated Python environment (Python 3.10+
              recommended).
            </p>
            <CommandBlock
              id="venv-mac"
              label="macOS / Linux"
              command={
                "cd streamlit_app\npython3 -m venv .venv\nsource .venv/bin/activate"
              }
              copiedId={copiedId}
              onCopy={handleCopy}
            />
            <CommandBlock
              id="venv-win"
              label="Windows (PowerShell)"
              command={
                "cd streamlit_app\npython -m venv .venv\n.venv\\Scripts\\Activate.ps1"
              }
              copiedId={copiedId}
              onCopy={handleCopy}
            />
          </article>

          {/* Step 2 */}
          <article className="rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
            <h2 className="text-base font-bold text-[#1E3A8A]">
              Step 2. Install Python Packages
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Install Streamlit, the official{" "}
              <code className="font-mono">google-genai</code> SDK, PyPDF, and
              Pydantic from <code className="font-mono">requirements.txt</code>.
            </p>
            <CommandBlock
              id="install"
              label="Install dependencies"
              command="pip install -r requirements.txt"
              copiedId={copiedId}
              onCopy={handleCopy}
            />
            <div className="mt-4 rounded-lg border border-blue-100 bg-white p-3.5 text-xs leading-relaxed text-slate-600">
              <p className="font-semibold text-slate-800">Included packages:</p>
              <p className="mt-1 font-mono">
                streamlit · google-genai · pypdf · pydantic
              </p>
            </div>
          </article>

          {/* Step 3 */}
          <article className="rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
            <h2 className="text-base font-bold text-[#1E3A8A]">
              Step 3. Configure Your Gemini API Key Securely
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              The Python app reads{" "}
              <code className="font-mono">GEMINI_API_KEY</code> from{" "}
              <code className="font-mono">.streamlit/secrets.toml</code> or your
              environment variables.
            </p>
            <CommandBlock
              id="env-var"
              label="Option A: Environment Variable (macOS / Linux)"
              command='export GEMINI_API_KEY="your_api_key_here"'
              copiedId={copiedId}
              onCopy={handleCopy}
            />
            <CommandBlock
              id="secrets-toml"
              label="Option B: .streamlit/secrets.toml"
              command='GEMINI_API_KEY = "your_api_key_here"'
              copiedId={copiedId}
              onCopy={handleCopy}
            />
          </article>

          {/* Step 4 */}
          <article className="rounded-xl border border-[#DBEAFE] bg-[#F8FBFF] p-5">
            <h2 className="text-base font-bold text-[#1E3A8A]">
              Step 4. Start the Streamlit Application
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Launch Streamlit from your terminal. It opens automatically in
              your browser at <code className="font-mono">localhost:8501</code>.
            </p>
            <CommandBlock
              id="run-app"
              label="Run Streamlit"
              command="streamlit run app.py"
              copiedId={copiedId}
              onCopy={handleCopy}
            />
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-white p-3.5 text-xs leading-relaxed text-slate-600">
              <Terminal
                className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]"
                aria-hidden="true"
              />
              <span>
                After uploading a PDF and clicking{" "}
                <strong>Summarize Research Paper</strong>, you can export the
                output as a <code className="font-mono">.txt</code> file or
                clear the workspace at any time.
              </span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
