import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { embed } from "../backend/ingestUtils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", "backend", ".env") });

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const K_VALUES = [5, 10, 20];
const DEFAULT_K = 10;
const PIPELINE_VERSION =
  process.argv.includes("--version")
    ? process.argv[process.argv.indexOf("--version") + 1]
    : process.env.PIPELINE_VERSION || "baseline";

async function retrieve(embedding, topK) {
  const { rows } = await pool.query(
    `SELECT id, filename, chunk_index, content,
            1 - (embedding <=> $1::vector) AS score
     FROM chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [`[${embedding.join(",")}]`, topK],
  );
  return rows;
}

function computeRecall(retrievedIds, relevantIds) {
  if (relevantIds.length === 0) return null;
  const retrieved = new Set(retrievedIds);
  const hits = relevantIds.filter((id) => retrieved.has(id)).length;
  return hits / relevantIds.length;
}

function computeMRR(retrievedIds, relevantIds) {
  if (relevantIds.length === 0) return null;
  const relevant = new Set(relevantIds);
  for (let i = 0; i < retrievedIds.length; i++) {
    if (relevant.has(retrievedIds[i])) return 1 / (i + 1);
  }
  return 0;
}

async function main() {
  const evalSet = JSON.parse(
    fs.readFileSync(path.join(__dirname, "eval-set.json"), "utf-8"),
  );

  const snapshotPath = path.join(__dirname, "corpus-snapshot.json");
  if (!fs.existsSync(snapshotPath)) {
    console.error("corpus-snapshot.json not found. Run dump-corpus.js first.");
    process.exit(1);
  }
  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));
  const corpusIds = new Set(snapshot.map((c) => c.chunk_id));

  // validate all labeled chunk IDs exist in the corpus
  let invalid = false;
  for (const entry of evalSet) {
    for (const id of entry.relevant_chunks || []) {
      if (!corpusIds.has(id)) {
        console.error(`INVALID: ${entry.id} references "${id}" which is not in the corpus`);
        invalid = true;
      }
    }
  }
  if (invalid) {
    console.error("\nAborting — fix broken labels before running eval.");
    process.exit(1);
  }
  console.log("All labeled chunk IDs validated against corpus.\n");

  const skipped = [];
  const evaluated = [];

  for (const entry of evalSet) {
    const relevantIds = entry.relevant_chunks || [];

    if (relevantIds.length === 0) {
      skipped.push(entry);
      continue;
    }

    console.log(`\nEvaluating: ${entry.id}`);
    console.log(`  Q: ${entry.question}`);

    const embedding = await embed(entry.question);
    const maxK = Math.max(...K_VALUES);
    const allResults = await retrieve(embedding, maxK);
    const allRetrievedIds = allResults.map((r) => r.id);

    const metrics = {};
    for (const k of K_VALUES) {
      const topIds = allRetrievedIds.slice(0, k);
      metrics[`recall@${k}`] = computeRecall(topIds, relevantIds);
      metrics[`mrr@${k}`] = computeMRR(topIds, relevantIds);
    }

    const result = {
      id: entry.id,
      question: entry.question,
      metrics,
      retrieved_ids: Object.fromEntries(
        K_VALUES.map((k) => [`top_${k}`, allRetrievedIds.slice(0, k)]),
      ),
      relevant_chunk_ids: relevantIds,
    };

    evaluated.push(result);

    for (const k of K_VALUES) {
      console.log(
        `  recall@${k}: ${metrics[`recall@${k}`].toFixed(3)}` +
          `  mrr@${k}: ${metrics[`mrr@${k}`].toFixed(3)}`,
      );
    }
  }

  // probe skipped entries (especially negative-abstention) for what retrieval returns
  const probes = {};
  for (const s of skipped) {
    const embedding = await embed(s.question);
    const results = await retrieve(embedding, DEFAULT_K);
    probes[s.id] = results.map((r) => ({ id: r.id, score: parseFloat(r.score).toFixed(4) }));
  }

  if (skipped.length > 0) {
    console.log(`\n--- Skipped (empty relevant_chunks) ---`);
    for (const s of skipped) {
      const reason =
        s.id === "negative-abstention"
          ? "(intentionally empty — abstention test)"
          : "(needs labeling)";
      console.log(`  ${s.id} ${reason}`);
      if (probes[s.id]) {
        const top3 = probes[s.id].slice(0, 3);
        console.log(`    top-3 retrieved: ${top3.map((r) => `${r.id} (${r.score})`).join(", ")}`);
      }
    }
  }

  // aggregate metrics
  console.log(`\n--- Aggregate Metrics ---`);
  if (evaluated.length === 0) {
    console.log(
      "  No entries had labeled relevant_chunk_ids. Label them in eval-set.json first.",
    );
  } else {
    for (const k of K_VALUES) {
      const recalls = evaluated.map((e) => e.metrics[`recall@${k}`]);
      const mrrs = evaluated.map((e) => e.metrics[`mrr@${k}`]);
      const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
      const avgMrr = mrrs.reduce((a, b) => a + b, 0) / mrrs.length;
      console.log(
        `  avg recall@${k}: ${avgRecall.toFixed(3)}  avg mrr@${k}: ${avgMrr.toFixed(3)}`,
      );
    }
  }

  // write timestamped results
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const output = {
    timestamp: new Date().toISOString(),
    pipeline_version: PIPELINE_VERSION,
    k_values: K_VALUES,
    default_k: DEFAULT_K,
    evaluated_count: evaluated.length,
    skipped_count: skipped.length,
    skipped_ids: skipped.map((s) => s.id),
    aggregate: Object.fromEntries(
      K_VALUES.flatMap((k) => {
        if (evaluated.length === 0) return [];
        const recalls = evaluated.map((e) => e.metrics[`recall@${k}`]);
        const mrrs = evaluated.map((e) => e.metrics[`mrr@${k}`]);
        return [
          [`avg_recall@${k}`, recalls.reduce((a, b) => a + b, 0) / recalls.length],
          [`avg_mrr@${k}`, mrrs.reduce((a, b) => a + b, 0) / mrrs.length],
        ];
      }),
    ),
    results: evaluated,
    probes,
  };

  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const outPath = path.join(resultsDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`\nResults written to ${outPath}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
