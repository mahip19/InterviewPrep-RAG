import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "backend", ".env") });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const { rows } = await pool.query(
    `SELECT id, filename, chunk_index, content FROM chunks ORDER BY filename, chunk_index`,
  );

  const snapshot = rows.map((r) => ({
    chunk_id: r.id,
    source_document: r.filename,
    chunk_index: r.chunk_index,
    char_length: r.content.length,
    preview: r.content.slice(0, 200),
  }));

  const outPath = path.join(__dirname, "corpus-snapshot.json");
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${snapshot.length} chunks to ${outPath}\n`);

  // --- summary ---
  console.log(`Total chunks: ${snapshot.length}`);
  console.log(`\nChunks by source document:`);
  const byDoc = {};
  for (const c of snapshot) {
    byDoc[c.source_document] = (byDoc[c.source_document] || 0) + 1;
  }
  for (const [doc, count] of Object.entries(byDoc).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count.toString().padStart(4)}  ${doc}`);
  }

  // --- near-duplicate detection (>95% similar by character overlap) ---
  console.log(`\nChecking for near-duplicate chunks (>95% text similarity)...`);
  const texts = rows.map((r) => r.content);
  let dupeCount = 0;

  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i];
      const b = texts[j];
      if (Math.abs(a.length - b.length) > Math.max(a.length, b.length) * 0.05) {
        continue;
      }
      const similarity = computeSimilarity(a, b);
      if (similarity > 0.95) {
        dupeCount++;
        console.log(
          `  NEAR-DUPE (${(similarity * 100).toFixed(1)}%): ` +
            `${rows[i].id}  <->  ${rows[j].id}`,
        );
      }
    }
  }

  if (dupeCount === 0) {
    console.log("  None found.");
  } else {
    console.log(`  ${dupeCount} near-duplicate pair(s) detected.`);
  }

  await pool.end();
}

function computeSimilarity(a, b) {
  const bigrams = (s) => {
    const set = new Map();
    for (let i = 0; i < s.length - 1; i++) {
      const bg = s.slice(i, i + 2);
      set.set(bg, (set.get(bg) || 0) + 1);
    }
    return set;
  };
  const aGrams = bigrams(a);
  const bGrams = bigrams(b);
  let intersection = 0;
  for (const [bg, count] of aGrams) {
    intersection += Math.min(count, bGrams.get(bg) || 0);
  }
  const union = a.length - 1 + (b.length - 1);
  if (union === 0) return 1;
  return (2 * intersection) / union;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
