import "dotenv/config";
import express, { Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure PDF.js worker for Node.js environment
const workerPath = path.resolve(
  __dirname,
  "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
);
if (fs.existsSync(workerPath)) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Configure Multer for in-memory PDF uploads (25 MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdfMime || isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files (.pdf) are accepted."));
    }
  },
});

// Initialize server-side Gemini client with required telemetry header
function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it in Settings > Secrets."
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function extractPdfText(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  if (!buffer || buffer.length === 0) {
    throw new Error("The uploaded PDF file is empty (0 bytes).");
  }

  let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      useSystemFonts: true,
    });

    pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;

    if (pageCount === 0) {
      throw new Error("The uploaded PDF contains 0 pages.");
    }

    const pagesText: string[] = [];
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter((value) => value.trim().length > 0);

      const pageString = strings.join(" ").replace(/\s+/g, " ").trim();
      if (pageString) {
        pagesText.push(`--- Page ${pageNumber} ---\n${pageString}`);
      }
    }

    const fullText = pagesText.join("\n\n").trim();
    if (!fullText) {
      throw new Error(
        "No readable text could be extracted from this PDF. It may be an empty file or a scanned image-only PDF."
      );
    }

    return { text: fullText, pageCount };
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message.toLowerCase().includes("password")) {
        throw new Error(
          "This PDF is password-protected or encrypted. Please upload an unlocked PDF."
        );
      }
      if (
        err.message.includes("No readable text") ||
        err.message.includes("0 pages") ||
        err.message.includes("empty")
      ) {
        throw err;
      }
      throw new Error(`Could not extract text from PDF: ${err.message}`);
    }
    throw new Error("Could not extract text from the uploaded PDF.");
  } finally {
    if (pdfDocument) {
      await pdfDocument.cleanup().catch(() => undefined);
    }
  }
}

async function generateSummaryWithRetry(
  ai: GoogleGenAI,
  paperText: string
): Promise<{
  paperInfo: { title: string; authors: string };
  summary: {
    problem: string;
    methodUsed: string;
    dataset: string;
    results: string;
    limitations: string;
  };
  keyTakeaways: string[];
}> {
  const maxChars = 120000;
  const trimmedText = paperText.slice(0, maxChars);

  const systemInstruction = [
    "You are an academic research tutor helping university students understand complex research papers in clear, simple English.",
    "Explain concepts plainly without unnecessary jargon, and briefly clarify any essential technical terms.",
    "STRICT FACTUALITY RULE: Only state facts explicitly supported by the provided paper text.",
    'If any information (such as paper title, authors, dataset, method, results, or limitations) is missing or cannot be determined from the text, return the exact string "Not specified in the paper" instead of guessing or fabricating information.',
    "Provide exactly 5 clear, simple-English key takeaways.",
  ].join(" ");

  const prompt = `Analyze the following research paper text and produce the structured summary.\n\nRESEARCH PAPER TEXT:\n${trimmedText}`;

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              paperInfo: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description:
                      "Full title of the research paper, or 'Not specified in the paper' if absent.",
                  },
                  authors: {
                    type: Type.STRING,
                    description:
                      "Authors of the paper separated by commas, or 'Not specified in the paper' if absent.",
                  },
                },
                required: ["title", "authors"],
              },
              summary: {
                type: Type.OBJECT,
                properties: {
                  problem: {
                    type: Type.STRING,
                    description:
                      "What problem the research addresses, explained in simple English.",
                  },
                  methodUsed: {
                    type: Type.STRING,
                    description:
                      "What techniques, algorithms, or methods were used, explained in simple English.",
                  },
                  dataset: {
                    type: Type.STRING,
                    description:
                      "What data or dataset was used for the research, or 'Not specified in the paper'.",
                  },
                  results: {
                    type: Type.STRING,
                    description:
                      "What the main findings and results are, explained in simple English.",
                  },
                  limitations: {
                    type: Type.STRING,
                    description:
                      "What the weaknesses or limitations are, or 'Not specified in the paper'.",
                  },
                },
                required: [
                  "problem",
                  "methodUsed",
                  "dataset",
                  "results",
                  "limitations",
                ],
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  "Five important points from the paper explained in simple English.",
              },
            },
            required: ["paperInfo", "summary", "keyTakeaways"],
          },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error("Gemini returned an empty response.");
      }

      const parsed = JSON.parse(rawText);
      const takeaways = Array.isArray(parsed.keyTakeaways)
        ? parsed.keyTakeaways.slice(0, 5).map((item: unknown) => String(item))
        : [];

      return {
        paperInfo: {
          title: parsed.paperInfo?.title || "Not specified in the paper",
          authors: parsed.paperInfo?.authors || "Not specified in the paper",
        },
        summary: {
          problem: parsed.summary?.problem || "Not specified in the paper",
          methodUsed: parsed.summary?.methodUsed || "Not specified in the paper",
          dataset: parsed.summary?.dataset || "Not specified in the paper",
          results: parsed.summary?.results || "Not specified in the paper",
          limitations: parsed.summary?.limitations || "Not specified in the paper",
        },
        keyTakeaways: takeaways,
      };
    } catch (error: unknown) {
      lastError = error;
      const errObj = error as { status?: number; message?: string };
      const status = errObj?.status;
      const isTransient =
        status === 429 || (typeof status === "number" && status >= 500);

      if (isTransient && attempt < maxAttempts) {
        const delayMs = 600 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

// POST /api/summarize — Extract PDF text and summarize with Gemini
app.post("/api/summarize", (req: Request, res: Response) => {
  upload.single("pdf")(req, res, async (uploadErr: unknown) => {
    if (uploadErr) {
      const msg =
        uploadErr instanceof Error
          ? uploadErr.message
          : "Invalid file upload.";
      return res.status(400).json({ error: msg });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Please upload a PDF file before summarizing." });
    }

    try {
      const { text, pageCount } = await extractPdfText(req.file.buffer);
      const ai = createGeminiClient();
      const result = await generateSummaryWithRetry(ai, text);

      return res.json({
        fileName: req.file.originalname,
        fileSizeBytes: req.file.size,
        pageCount,
        extractedCharCount: text.length,
        ...result,
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const statusCode = errorObj?.status;
      const message =
        errorObj?.message || "An unexpected error occurred during summarization.";

      if (
        message.includes("GEMINI_API_KEY") ||
        statusCode === 400 ||
        statusCode === 403
      ) {
        return res.status(statusCode || 400).json({
          error:
            "Gemini API authorization error. Please verify your GEMINI_API_KEY in Settings > Secrets.",
          details: message,
        });
      }

      if (statusCode === 429) {
        return res.status(429).json({
          error:
            "Gemini API rate limit reached (429). Please wait a moment and try again, or check your quota in Settings > Secrets.",
          details: message,
        });
      }

      if (
        message.includes("PDF") ||
        message.includes("readable text") ||
        message.includes("0 pages") ||
        message.includes("empty")
      ) {
        return res.status(400).json({ error: message });
      }

      return res.status(500).json({
        error: "Failed to summarize the research paper with Gemini AI.",
        details: message,
      });
    }
  });
});

// GET /api/streamlit-bundle — Serve the beginner-friendly Python/Streamlit source files
app.get("/api/streamlit-bundle", (_req: Request, res: Response) => {
  try {
    const streamlitDir = path.resolve(__dirname, "streamlit_app");
    const appPy = fs.readFileSync(path.join(streamlitDir, "app.py"), "utf-8");
    const requirementsTxt = fs.readFileSync(
      path.join(streamlitDir, "requirements.txt"),
      "utf-8"
    );
    const readmeMd = fs.readFileSync(
      path.join(streamlitDir, "README.md"),
      "utf-8"
    );

    res.json({
      files: [
        {
          name: "app.py",
          language: "python",
          description:
            "Complete Streamlit frontend, PyPDF text extraction, and Google Gemini SDK summarization.",
          content: appPy,
        },
        {
          name: "requirements.txt",
          language: "text",
          description:
            "Python package dependencies (Streamlit, Google GenAI SDK, PyPDF, Pydantic).",
          content: requirementsTxt,
        },
        {
          name: "README.md",
          language: "markdown",
          description:
            "Step-by-step installation, API key configuration, and local execution guide.",
          content: readmeMd,
        },
      ],
    });
  } catch (err) {
    res.status(500).json({
      error: "Unable to load the Streamlit source files.",
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
