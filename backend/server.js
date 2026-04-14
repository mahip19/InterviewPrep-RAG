import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import { pipeline } from "@huggingface/transformers";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const { Pool } = pg;

// ── Config ──────────────────────────────────────────────────────────
const TOP_K = 5;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";
const CHAT_MODEL = process.env.CHAT_MODEL || "llama-3.3-70b-versatile";

// ── DB client ────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  try {
    const res = await pool.query("SELECT COUNT(*) FROM chunks");
    console.log(`✅ Connected to PostgreSQL — ${res.rows[0].count} chunks indexed`);
  } catch (err) {
    console.error("❌ Could not connect to PostgreSQL:", err.message);
    console.log("   Make sure Postgres is running and DATABASE_URL is set in .env");
    console.log("   Run npm run ingest first to create the schema and load chunks");
    process.exit(1);
  }
}

// ── System Prompt ───────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an interview preparation assistant. You help the user prepare for software engineering interviews using THEIR OWN documents, experiences, and notes.

Your job:
- Answer questions using the retrieved context from the user's documents
- When asked for STAR stories, structure them clearly (Situation, Task, Action, Result)
- When asked about technical topics, reference the user's own notes and approaches
- When asked about behavioral questions, draw from the user's documented experiences
- If the context doesn't contain relevant info, say so honestly — don't make things up
- Be concise and practical — this is interview prep, not an essay

Always ground your answers in the provided context. Cite which document the info comes from when possible.`;

// ── Embedder (lazy-loaded, shared across requests) ───────────────────
let embedder;
async function embedQuery(text) {
  if (!embedder) embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
  const output = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// ── Similarity search ────────────────────────────────────────────────
async function retrieve(embedding, topK = TOP_K) {
  const res = await pool.query(
    `SELECT id, filename, chunk_index, content,
            1 - (embedding <=> $1::vector) AS score
     FROM chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [`[${embedding.join(",")}]`, topK]
  );
  return res.rows;
}

// ── Chat via Groq ───────────────────────────────────────────────────
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

// ── Retrieve-only endpoint (test retrieval without LLM) ─────────────
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

// ── Query endpoint ──────────────────────────────────────────────────
app.post("/api/query", async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "query is required" });

  try {
    const embedding = await embedQuery(query);
    const rows = await retrieve(embedding);

    const context = rows
      .map((r) => `[Source: ${r.filename}, Chunk ${r.chunk_index}]\n${r.content}`)
      .join("\n\n---\n\n");

    let answer;
    try {
      const userMessage = `Here are relevant excerpts from my interview prep documents:\n\n${context}\n\n---\n\nMy question: ${query}`;
      answer = await chat(userMessage);
    } catch (chatErr) {
      console.error("Chat error:", chatErr);
      answer = `[Chat model not available — use /api/retrieve to inspect raw chunks]`;
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

// ── Stats endpoint ───────────────────────────────────────────────────
app.get("/api/stats", async (req, res) => {
  try {
    const result = await pool.query("SELECT COUNT(*) FROM chunks");
    res.json({ totalChunks: parseInt(result.rows[0].count), collection: "postgres/chunks" });
  } catch {
    res.json({ totalChunks: 0 });
  }
});

// ── Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`   LLM: ${CHAT_MODEL} | Embeddings: ${EMBEDDING_MODEL}`);
  });
});
