# AI Research Paper Summarizer (Python + Streamlit)

A beginner-friendly academic dashboard that extracts text from any uploaded research paper PDF using **PyPDF** and explains it in simple English using the **Google Gemini API** (`google-genai` SDK).

## Prerequisites

- Python 3.10 or higher
- A Gemini API key from Google AI Studio

## Step-by-Step Setup & Run Instructions

### 1. Create and Activate a Virtual Environment

**macOS / Linux:**
```bash
cd streamlit_app
python3 -m venv .venv
source .venv/bin/activate
```

**Windows (PowerShell):**
```powershell
cd streamlit_app
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Your Gemini API Key Securely

Choose **one** of the two secure methods below (never hardcode your API key inside `app.py`):

**Option A: Environment Variable**
```bash
# macOS / Linux
export GEMINI_API_KEY="your_actual_gemini_api_key"

# Windows (PowerShell)
$env:GEMINI_API_KEY="your_actual_gemini_api_key"
```

**Option B: Streamlit Secrets File**
Create a file at `streamlit_app/.streamlit/secrets.toml`:
```toml
GEMINI_API_KEY = "your_actual_gemini_api_key"
```

### 4. Run the Streamlit App

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501`, upload a research paper PDF, and click **Summarize Research Paper**.
