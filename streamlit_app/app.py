"""
AI Research Paper Summarizer
----------------------------
A beginner-friendly Streamlit web application that extracts text from an
uploaded research paper PDF using PyPDF and summarizes it in simple English
using the Google Gemini API (google-genai SDK).
"""

import io
import os
from typing import List

import streamlit as st
from google import genai
from google.genai import types
from google.genai.errors import APIError
from pydantic import BaseModel, Field
from pypdf import PdfReader
from pypdf.errors import PdfReadError


# ---------------------------------------------------------------------------
# 1. Page Configuration & Academic Styling (White & Light-Blue Theme)
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="AI Research Paper Summarizer",
    page_icon="📄",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Custom CSS for a clean, responsive, white and light-blue academic dashboard
st.markdown(
    """
    <style>
        /* Main application background */
        .stApp {
            background-color: #F8FBFF;
            color: #0F172A;
        }

        /* Header container */
        .hero-box {
            background-color: #FFFFFF;
            border: 1px solid #DBEAFE;
            border-radius: 12px;
            padding: 1.75rem 2rem;
            margin-bottom: 1.5rem;
        }

        .hero-title {
            color: #1E3A8A;
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.4rem;
        }

        .hero-subtitle {
            color: #475569;
            font-size: 1rem;
            line-height: 1.6;
            margin: 0;
        }

        /* Section cards */
        .academic-card {
            background-color: #FFFFFF;
            border: 1px solid #DBEAFE;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }

        .section-heading {
            color: #1D4ED8;
            font-size: 1.15rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            border-bottom: 1px solid #EFF6FF;
            padding-bottom: 0.5rem;
        }

        .summary-label {
            color: #1E40AF;
            font-size: 0.95rem;
            font-weight: 700;
            margin-bottom: 0.35rem;
        }

        .summary-text {
            color: #1E293B;
            font-size: 0.97rem;
            line-height: 1.65;
            margin: 0;
        }

        /* Primary button styling */
        div.stButton > button[kind="primary"] {
            background-color: #1D4ED8;
            border-color: #1D4ED8;
            color: #FFFFFF;
            font-weight: 600;
            border-radius: 8px;
            padding: 0.55rem 1.25rem;
        }

        div.stButton > button[kind="primary"]:hover {
            background-color: #1E40AF;
            border-color: #1E40AF;
        }
    </style>
    """,
    unsafe_allow_html=True,
)


# ---------------------------------------------------------------------------
# 2. Structured Output Schema (Pydantic Model for Gemini JSON Response)
# ---------------------------------------------------------------------------
class PaperSummary(BaseModel):
    """Defines the exact JSON structure returned by the Gemini model."""

    paper_title: str = Field(
        description="The full title of the research paper, or 'Not specified in the paper' if missing."
    )
    authors: str = Field(
        description="Comma-separated list of authors, or 'Not specified in the paper' if missing."
    )
    problem: str = Field(
        description="Simple English explanation of what problem the research addresses."
    )
    method_used: str = Field(
        description="Simple English explanation of the techniques, models, or methods used."
    )
    dataset: str = Field(
        description="Simple English explanation of the data or dataset used, or 'Not specified in the paper'."
    )
    results: str = Field(
        description="Simple English explanation of the main findings and results."
    )
    limitations: str = Field(
        description="Simple English explanation of the weaknesses or limitations, or 'Not specified in the paper'."
    )
    key_takeaways: List[str] = Field(
        description="Exactly 5 numbered-ready key takeaways explained in simple English."
    )


# ---------------------------------------------------------------------------
# 3. Helper Functions: API Key, PDF Extraction, Gemini Summarization, Export
# ---------------------------------------------------------------------------
def get_gemini_api_key() -> str | None:
    """
    Securely read the Gemini API key from Streamlit secrets or environment variables.
    Never hardcode API keys directly in Python source files.
    """
    # Check Streamlit secrets first (.streamlit/secrets.toml)
    try:
        if "GEMINI_API_KEY" in st.secrets:
            return st.secrets["GEMINI_API_KEY"]
    except Exception:
        # st.secrets raises an error when no secrets.toml file exists locally
        pass

    # Fall back to standard environment variable
    return os.environ.get("GEMINI_API_KEY")


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, int]:
    """
    Extract plain text from an uploaded PDF file using PyPDF.

    Returns:
        (extracted_text, page_count)
    Raises:
        ValueError: If the PDF is encrypted, unreadable, or contains no extractable text.
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))

        if reader.is_encrypted:
            raise ValueError(
                "This PDF is password-protected or encrypted. Please upload an unlocked PDF."
            )

        page_count = len(reader.pages)
        if page_count == 0:
            raise ValueError("The uploaded PDF has 0 pages.")

        extracted_pages: List[str] = []
        for page_index, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            cleaned = page_text.strip()
            if cleaned:
                extracted_pages.append(f"--- Page {page_index} ---\n{cleaned}")

        full_text = "\n\n".join(extracted_pages).strip()

        if not full_text:
            raise ValueError(
                "No readable text was found in this PDF. It may be an empty file or a scanned image-only PDF."
            )

        return full_text, page_count

    except PdfReadError as exc:
        raise ValueError(f"Could not read the PDF file. It may be corrupted: {exc}") from exc


def summarize_paper_with_gemini(paper_text: str, api_key: str) -> PaperSummary:
    """
    Send the extracted PDF text to the Google Gemini API and return a
    structured, simple-English summary.
    """
    client = genai.Client(api_key=api_key)

    # Keep prompt within a safe character budget for very long papers
    max_chars = 120_000
    trimmed_text = paper_text[:max_chars]

    system_instruction = (
        "You are an expert academic tutor who explains complex research papers to "
        "students in clear, simple, everyday English. Avoid unnecessary jargon, and "
        "when technical terms appear, explain them briefly. "
        "CRITICAL RULE: Only state facts supported by the provided paper text. "
        "If any requested detail (such as authors, dataset, or limitations) is missing "
        "or not mentioned in the paper, output the exact phrase: "
        "'Not specified in the paper' instead of guessing or inventing details."
    )

    prompt = (
        "Analyze the following research paper text and extract:\n"
        "1. Paper Title and Authors\n"
        "2. Five simple-English sections: Problem, Method Used, Dataset, Results, Limitations\n"
        "3. Five concise Key Takeaways in simple English.\n\n"
        f"RESEARCH PAPER TEXT:\n{trimmed_text}"
    )

    response = client.models.generate_content(
        model="gemini-4-hydrogen",
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=PaperSummary,
        ),
    )

    if not response.text:
        raise RuntimeError("Gemini returned an empty response. Please try again.")

    return PaperSummary.model_validate_json(response.text)


def format_summary_as_txt(summary: PaperSummary, filename: str) -> str:
    """Format the structured summary into a clean plain-text (.txt) report."""
    takeaways_block = "\n".join(
        f"{idx}. {point}" for idx, point in enumerate(summary.key_takeaways, start=1)
    )

    return (
        "AI RESEARCH PAPER SUMMARIZER\n"
        "============================\n"
        f"Source File: {filename}\n\n"
        "A. PAPER INFORMATION\n"
        "--------------------\n"
        f"Title:   {summary.paper_title}\n"
        f"Authors: {summary.authors}\n\n"
        "B. SIMPLE LANGUAGE SUMMARY\n"
        "--------------------------\n"
        f"1. Problem:\n{summary.problem}\n\n"
        f"2. Method Used:\n{summary.method_used}\n\n"
        f"3. Dataset:\n{summary.dataset}\n\n"
        f"4. Results:\n{summary.results}\n\n"
        f"5. Limitations:\n{summary.limitations}\n\n"
        "C. 5 KEY TAKEAWAYS\n"
        "------------------\n"
        f"{takeaways_block}\n"
    )


def clear_workspace() -> None:
    """Reset uploaded file state and generated summary results."""
    st.session_state["summary_result"] = None
    st.session_state["paper_filename"] = None
    st.session_state["page_count"] = None
    st.session_state["uploader_key"] = st.session_state.get("uploader_key", 0) + 1


# ---------------------------------------------------------------------------
# 4. Session State Initialization
# ---------------------------------------------------------------------------
if "summary_result" not in st.session_state:
    st.session_state["summary_result"] = None
if "paper_filename" not in st.session_state:
    st.session_state["paper_filename"] = None
if "page_count" not in st.session_state:
    st.session_state["page_count"] = None
if "uploader_key" not in st.session_state:
    st.session_state["uploader_key"] = 0


# ---------------------------------------------------------------------------
# 5. User Interface Layout
# ---------------------------------------------------------------------------
st.markdown(
    """
    <div class="hero-box">
        <div class="hero-title">AI Research Paper Summarizer</div>
        <p class="hero-subtitle">
            Upload any academic research paper in PDF format to automatically extract its content
            and read a structured, student-friendly explanation in simple English.
        </p>
    </div>
    """,
    unsafe_allow_html=True,
)

# Upload controls inside a clean white container
with st.container():
    uploaded_file = st.file_uploader(
        label="Upload a Research Paper (PDF only)",
        type=["pdf"],
        accept_multiple_files=False,
        key=f"pdf_uploader_{st.session_state['uploader_key']}",
        help="Select a readable PDF research paper from your computer.",
    )

    col_summarize, col_clear, _ = st.columns([1.4, 1, 3])
    with col_summarize:
        summarize_clicked = st.button(
            "Summarize Research Paper",
            type="primary",
            use_container_width=True,
            disabled=uploaded_file is None,
        )
    with col_clear:
        st.button(
            "Clear Paper & Results",
            type="secondary",
            use_container_width=True,
            on_click=clear_workspace,
        )


# ---------------------------------------------------------------------------
# 6. Processing Pipeline (Extract PDF -> Call Gemini -> Save to Session)
# ---------------------------------------------------------------------------
if summarize_clicked and uploaded_file is not None:
    api_key = get_gemini_api_key()
    if not api_key:
        st.error(
            "Gemini API key not found. Set the GEMINI_API_KEY environment variable "
            "or add GEMINI_API_KEY to .streamlit/secrets.toml before running."
        )
    else:
        try:
            with st.spinner("Reading PDF pages and generating your simple-English summary..."):
                pdf_bytes = uploaded_file.getvalue()
                if not pdf_bytes:
                    raise ValueError("The uploaded file is empty (0 bytes).")

                extracted_text, total_pages = extract_text_from_pdf(pdf_bytes)
                summary = summarize_paper_with_gemini(extracted_text, api_key)

                st.session_state["summary_result"] = summary
                st.session_state["paper_filename"] = uploaded_file.name
                st.session_state["page_count"] = total_pages

        except ValueError as pdf_error:
            st.error(f"PDF Processing Error: {pdf_error}")
        except APIError as api_error:
            st.error(f"Gemini API Error: {api_error.message} (Status code: {api_error.code})")
        except Exception as unexpected_error:
            st.error(f"Something went wrong while summarizing the paper: {unexpected_error}")


# ---------------------------------------------------------------------------
# 7. Output Dashboard Display
# ---------------------------------------------------------------------------
summary_result: PaperSummary | None = st.session_state.get("summary_result")

if summary_result is not None:
    filename = st.session_state.get("paper_filename") or "research_paper.pdf"
    page_count = st.session_state.get("page_count") or 0

    st.success(f"Summary generated successfully from '{filename}' ({page_count} pages).")

    # Download TXT button
    txt_report = format_summary_as_txt(summary_result, filename)
    download_name = os.path.splitext(filename)[0] + "_summary.txt"
    st.download_button(
        label="Download Summary (.txt)",
        data=txt_report,
        file_name=download_name,
        mime="text/plain",
    )

    # A. Paper Information
    st.markdown(
        f"""
        <div class="academic-card">
            <div class="section-heading">A. Paper Information</div>
            <p class="summary-label">Research Paper Title</p>
            <p class="summary-text" style="margin-bottom: 1rem;">{summary_result.paper_title}</p>
            <p class="summary-label">Authors</p>
            <p class="summary-text">{summary_result.authors}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # B. Simple Language Summary (5 structured sections)
    st.markdown("### B. Simple Language Summary")

    row1_col1, row1_col2 = st.columns(2)
    with row1_col1:
        st.markdown(
            f"""
            <div class="academic-card">
                <div class="section-heading">1. Problem</div>
                <p class="summary-text">{summary_result.problem}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with row1_col2:
        st.markdown(
            f"""
            <div class="academic-card">
                <div class="section-heading">2. Method Used</div>
                <p class="summary-text">{summary_result.method_used}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    row2_col1, row2_col2 = st.columns(2)
    with row2_col1:
        st.markdown(
            f"""
            <div class="academic-card">
                <div class="section-heading">3. Dataset</div>
                <p class="summary-text">{summary_result.dataset}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with row2_col2:
        st.markdown(
            f"""
            <div class="academic-card">
                <div class="section-heading">4. Results</div>
                <p class="summary-text">{summary_result.results}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

    st.markdown(
        f"""
        <div class="academic-card">
            <div class="section-heading">5. Limitations</div>
            <p class="summary-text">{summary_result.limitations}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # C. 5 Key Takeaways
    takeaways_html = "".join(
        f"<li style='margin-bottom: 0.65rem; line-height: 1.65; color: #1E293B;'>{point}</li>"
        for point in summary_result.key_takeaways[:5]
    )
    st.markdown(
        f"""
        <div class="academic-card">
            <div class="section-heading">C. 5 Key Takeaways</div>
            <ol style="padding-left: 1.25rem; margin: 0;">
                {takeaways_html}
            </ol>
        </div>
        """,
        unsafe_allow_html=True,
    )
