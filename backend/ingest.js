import fs from "fs";
import path from "path";
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { setupSchema, processFile, ingestDocument, slugify } from "./ingestUtils.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

const DOCS_DIR = path.join(__dirname, "docs");
const SLUGS_PATH = path.join(__dirname, "..", "eval", "doc-slugs.json");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// scan docs/ for supported file types
function readDocFilenames() {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log("Created docs/ - drop your files there and run again.");
    process.exit(0);
  }
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => [".txt", ".md", ".html", ".pdf"].some((ext) => f.endsWith(ext)));

  if (files.length === 0) {
    console.log(`No supported files found in docs/`);
    process.exit(0);
  }
  console.log(`Found ${files.length} document(s):`);
  files.forEach((f) => console.log(`   - ${f}`));
  return files;
}

// wipe all chunks, re-read every doc, chunk + embed + store
async function ingest() {
  console.log("\nStarting ingestion...\n");

  const client = await pool.connect();
  try {
    await setupSchema(client);
    await client.query(`DELETE FROM chunks`);
    console.log("Cleared existing chunks\n");
  } finally {
    client.release();
  }

  const files = readDocFilenames();
  let total = 0;

  const slugMap = fs.existsSync(SLUGS_PATH)
    ? JSON.parse(fs.readFileSync(SLUGS_PATH, "utf-8"))
    : {};

  for (const filename of files) {
    const slug = slugMap[filename] || slugify(filename);
    const filePath = path.join(DOCS_DIR, filename);
    const content = await processFile(filePath, filename);
    console.log(`\n   Processing ${filename} [${slug}]...`);
    const result = await ingestDocument(pool, filename, content, slug);
    console.log(`   ${filename} -> ${result.chunkCount} chunks (${slug}__c0..c${result.chunkCount - 1})`);
    total += result.chunkCount;
  }

  console.log(`\nDone! ${total} chunks stored in PostgreSQL\n`);
  await pool.end();
}

ingest().catch((err) => {
  console.error("Ingestion failed:", err.message);
  process.exit(1);
});
