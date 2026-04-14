import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import { pipeline } from "@huggingface/transformers";

const execFileAsync = promisify(execFile);

// ── Config ──────────────────────────────────────────────────────────
const CHUNK_SIZE = 1250;
const CHUNK_OVERLAP = 200;
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

// ── Embedder (lazy-loaded, shared) ──────────────────────────────────
let embedder;
export async function getEmbedder() {
  if (!embedder) {
    console.log(`Loading ${EMBEDDING_MODEL}...`);
    embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
    console.log("Model ready");
  }
  return embedder;
}

export async function embed(text) {
  const fn = await getEmbedder();
  const output = await fn(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// ── Chunking ────────────────────────────────────────────────────────
export function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + size;
    if (end < text.length) {
      const slice = text.slice(start, end + 100);
      const lastPeriod = slice.lastIndexOf(". ");
      const lastNewline = slice.lastIndexOf("\n");
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > size * 0.5) end = start + breakPoint + 1;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push(chunk);
    start = end - overlap;
  }
  return chunks;
}

// ── Strip HTML ──────────────────────────────────────────────────────
export function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── PDF to text ─────────────────────────────────────────────────────
export async function convertPdfToText(filePath) {
  try {
    const { stdout } = await execFileAsync("pdftotext", [filePath, "-"]);
    return stdout;
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(
        "pdftotext not found. Install poppler: brew install poppler",
      );
    }
    throw err;
  }
}

// ── Read + convert a file to plain text ─────────────────────────────
export async function processFile(filePath, filename) {
  const ext = filename.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    return await convertPdfToText(filePath);
  }
  let content = fs.readFileSync(filePath, "utf-8");
  if (ext === "html") content = stripHtml(content);
  return content;
}

// ── Setup DB schema ─────────────────────────────────────────────────
export async function setupSchema(client) {
  await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS chunks (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      content     TEXT NOT NULL,
      embedding   vector(384)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks
    USING hnsw (embedding vector_cosine_ops)
  `);
}

// ── Ingest a single document into DB ────────────────────────────────
export async function ingestDocument(pool, filename, content) {
  const chunks = chunkText(content);
  if (chunks.length === 0) return { filename, chunkCount: 0 };

  // Delete existing chunks for this file (allows re-upload)
  await pool.query(`DELETE FROM chunks WHERE filename = $1`, [filename]);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embed(chunks[i]);
    await pool.query(
      `INSERT INTO chunks (id, filename, chunk_index, total_chunks, content, embedding)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET content = $5, embedding = $6`,
      [
        `${filename}__chunk_${i}`,
        filename,
        i,
        chunks.length,
        chunks[i],
        `[${embedding.join(",")}]`,
      ],
    );
  }

  return { filename, chunkCount: chunks.length };
}
