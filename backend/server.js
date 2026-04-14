import express from "express";
import cors from "cors";
import pg from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { pipeline } from "@huggingface/transformers";
import Groq from "groq-sdk";
import multer from "multer";
import { setupSchema, processFile, ingestDocument } from "./ingestUtils.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "docs");

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

// how many chunks to retrieve per query
const TOP_K = 10;
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";
const CHAT_MODEL = process.env.CHAT_MODEL || "llama-3.3-70b-versatile";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// make sure postgres is up and the schema exists before taking requests
async function initDB() {
  try {
    const client = await pool.connect();
    await setupSchema(client);
    client.release();
    const res = await pool.query("SELECT COUNT(*) FROM chunks");
    console.log(
      `Connected to PostgreSQL - ${res.rows[0].count} chunks indexed`,
    );
  } catch (err) {
    console.error("Could not connect to PostgreSQL:", err.message);
    console.log(
      "   Make sure Postgres is running and DATABASE_URL is set in .env",
    );
    console.log(
      "   Run npm run ingest first to create the schema and load chunks",
    );
    process.exit(1);
  }
}

const SYSTEM_PROMPT = `You are an interview preparation assistant. You help the user prepare for software engineering interviews using THEIR OWN documents, experiences, and notes.

CRITICAL RULES:
- ONLY use information from the retrieved context below. NEVER generate, invent, or paraphrase beyond what the documents say.
- When the user asks for something that exists in the context (an introduction, a STAR story, a response), quote it DIRECTLY from their documents. Do not rephrase or rewrite it.
- When asked for STAR stories, use the exact content from their documents, structured as Situation, Task, Action, Result.
- When asked about technical topics, reference the user's own notes and approaches verbatim.
- If the context doesn't contain relevant info, say "I couldn't find this in your documents" - don't make things up.
- Be concise and practical - this is interview prep, not an essay.
- Always cite which document the info comes from.`;

// lazy-load the embedding model so it only downloads once
let embedder;
async function embedQuery(text) {
  if (!embedder)
    embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// cosine similarity search against pgvector
async function retrieve(embedding, topK = TOP_K) {
  const res = await pool.query(
    `SELECT id, filename, chunk_index, content,
            1 - (embedding <=> $1::vector) AS score
     FROM chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [`[${embedding.join(",")}]`, topK],
  );
  return res.rows;
}

// send context + question to groq for answer generation
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function chat(userMessage) {
  const completion = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });
  return completion.choices[0]?.message?.content || "No response generated.";
}

// file upload config - only allow docs under 50MB
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

const upload = multer({
  dest: DOCS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".md", ".txt", ".html", ".pdf"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// retrieval only - useful for testing without hitting the LLM
app.post("/api/retrieve", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    const embedding = await embedQuery(query);
    const rows = await retrieve(embedding);
    res.json({
      chunks: rows.map((r) => ({
        text: r.content,
        filename: r.filename,
        chunk_index: r.chunk_index,
        score: parseFloat(r.score).toFixed(4),
      })),
    });
  } catch (err) {
    console.error("Retrieve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// main RAG endpoint - embed query, retrieve chunks, ask LLM
app.post("/api/query", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    const embedding = await embedQuery(query);
    const rows = await retrieve(embedding);

    const context = rows
      .map(
        (r) => `[Source: ${r.filename}, Chunk ${r.chunk_index}]\n${r.content}`,
      )
      .join("\n\n---\n\n");

    let answer;
    try {
      const userMessage = `Here are relevant excerpts from my interview prep documents:\n\n${context}\n\n---\n\nMy question: ${query}`;
      answer = await chat(userMessage);
    } catch (chatErr) {
      console.error("Chat error:", chatErr);
      answer = `[Chat model not available - use /api/retrieve to inspect raw chunks]`;
    }

    res.json({
      answer,
      sources: rows.map((r) => ({
        filename: r.filename,
        chunk_index: r.chunk_index,
        score: parseFloat(r.score).toFixed(4),
      })),
    });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
  }
});

// upload a doc, convert it, chunk + embed, store in db
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({
        error: "No valid file uploaded. Supported: .md, .txt, .html, .pdf",
      });

  const tempPath = req.file.path;
  const originalName = req.file.originalname;
  const finalPath = path.join(DOCS_DIR, originalName);

  try {
    fs.renameSync(tempPath, finalPath);
    const content = await processFile(finalPath, originalName);
    const result = await ingestDocument(pool, originalName, content);

    res.json({
      message: `Uploaded and ingested ${originalName}`,
      filename: result.filename,
      chunkCount: result.chunkCount,
    });
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// list all ingested documents with their chunk counts
app.get("/api/documents", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT filename, COUNT(*) as chunk_count
       FROM chunks
       GROUP BY filename
       ORDER BY filename`,
    );
    res.json({
      documents: result.rows.map((r) => ({
        filename: r.filename,
        chunkCount: parseInt(r.chunk_count),
      })),
    });
  } catch (err) {
    console.error("Documents list error:", err);
    res.status(500).json({ error: err.message });
  }
});

// remove a doc from db and disk
app.delete("/api/documents/:filename", async (req, res) => {
  const filename = decodeURIComponent(req.params.filename);

  try {
    const result = await pool.query(`DELETE FROM chunks WHERE filename = $1`, [
      filename,
    ]);

    const filePath = path.join(DOCS_DIR, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.json({
      message: `Deleted ${filename}`,
      deletedChunks: parseInt(result.rowCount),
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stats", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as total_chunks, COUNT(DISTINCT filename) as total_docs FROM chunks`,
    );
    res.json({
      totalChunks: parseInt(result.rows[0].total_chunks),
      totalDocs: parseInt(result.rows[0].total_docs),
    });
  } catch {
    res.json({ totalChunks: 0, totalDocs: 0 });
  }
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`   LLM: ${CHAT_MODEL} | Embeddings: ${EMBEDDING_MODEL}`);
  });
});
