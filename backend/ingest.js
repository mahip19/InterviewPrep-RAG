import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { pipeline } from "@huggingface/transformers";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

// ── Config ──────────────────────────────────────────────────────────
const DOCS_DIR = path.join(__dirname, "docs");
const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2";

// ── DB client ────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Embedder (lazy-loaded) ───────────────────────────────────────────
let embedder;
async function getEmbedder() {
  if (!embedder) {
    console.log(`📦 Loading ${EMBEDDING_MODEL} (downloads ~90MB on first run, cached after)...`);
    embedder = await pipeline("feature-extraction", EMBEDDING_MODEL);
    console.log("✅ Model ready\n");
  }
  return embedder;
}

// ── Chunking ────────────────────────────────────────────────────────
function chunkText(text, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
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

// ── Strip HTML ───────────────────────────────────────────────────────
function stripHtml(html) {
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

// ── Read files ──────────────────────────────────────────────────────
function readDocs() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log(`📁 Created docs/ — drop your .txt, .md, or .html files there and run again.`);
    process.exit(0);
  }
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => [".txt", ".md", ".html"].some((ext) => f.endsWith(ext)));

  if (files.length === 0) {
    console.log(`📁 No supported files found in docs/`);
    process.exit(0);
  }
  console.log(`📄 Found ${files.length} document(s):`);
  files.forEach((f) => console.log(`   - ${f}`));

  return files.map((filename) => {
    let content = fs.readFileSync(path.join(DOCS_DIR, filename), "utf-8");
    if (filename.endsWith(".html")) content = stripHtml(content);
    return { filename, content };
  });
}

// ── Embed via Transformers.js ────────────────────────────────────────
async function embed(text) {
  const fn = await getEmbedder();
  const output = await fn(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// ── Setup DB schema ──────────────────────────────────────────────────
async function setupSchema(client) {
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

  console.log("✅ Schema ready (pgvector + HNSW index)");
}

// ── Main ────────────────────────────────────────────────────────────
async function ingest() {
  console.log("\n🚀 Starting ingestion...\n");

  const client = await pool.connect();

  try {
    await setupSchema(client);

    await client.query(`DELETE FROM chunks`);
    console.log("🗑️  Cleared existing chunks\n");

    const docs = readDocs();
    let total = 0;

    for (const doc of docs) {
      const chunks = chunkText(doc.content);
      console.log(`\n   ✂️  ${doc.filename} → ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        process.stdout.write(`      [${i + 1}/${chunks.length}] embedding...`);
        const embedding = await embed(chunks[i]);

        await client.query(
          `INSERT INTO chunks (id, filename, chunk_index, total_chunks, content, embedding)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET content = $5, embedding = $6`,
          [
            `${doc.filename}__chunk_${i}`,
            doc.filename,
            i,
            chunks.length,
            chunks[i],
            `[${embedding.join(",")}]`,
          ]
        );
        console.log(" ✅");
        total++;
      }
    }

    console.log(`\n✅ Done! ${total} chunks stored in PostgreSQL\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err.message);
  process.exit(1);
});
