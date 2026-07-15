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
const RRF_K = 60;
const RRF_FETCH = 50;
const RETRIEVER = process.env.RETRIEVER || "dense";
const PIPELINE_VERSION =
  process.argv.includes("--version")
    ? process.argv[process.argv.indexOf("--version") + 1]
    : process.env.PIPELINE_VERSION || "baseline";

async function retrieveDense(embedding, topK) {
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

async function retrieveKeyword(query, topK) {
  const { rows: tsqRows } = await pool.query(
    `SELECT replace(plainto_tsquery('english', $1)::text, ' & ', ' | ') AS orq`,
    [query],
  );
  const orQuery = tsqRows[0].orq;
  if (!orQuery || orQuery === "") return [];
  const { rows } = await pool.query(
    `SELECT id, ts_rank(content_tsv, to_tsquery('english', $1)) AS score
     FROM chunks
     WHERE content_tsv @@ to_tsquery('english', $1)
     ORDER BY score DESC
     LIMIT $2`,
    [orQuery, topK],
  );
  return rows;
}

function rrfFuse(denseResults, keywordResults, topK) {
  const scores = new Map();
  const meta = new Map();
  for (let i = 0; i < denseResults.length; i++) {
    const r = denseResults[i];
    scores.set(r.id, 1 / (RRF_K + i + 1));
    meta.set(r.id, r);
  }
  for (let i = 0; i < keywordResults.length; i++) {
    const r = keywordResults[i];
    scores.set(r.id, (scores.get(r.id) || 0) + 1 / (RRF_K + i + 1));
    if (!meta.has(r.id)) meta.set(r.id, r);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topK)
    .map(([id, score]) => ({ id, rrf_score: score, ...meta.get(id) }));
}

async function retrieve(embedding, query, topK) {
  if (RETRIEVER === "dense") {
    return retrieveDense(embedding, topK);
  }
  const [denseResults, keywordResults] = await Promise.all([
    retrieveDense(embedding, RRF_FETCH),
    retrieveKeyword(query, RRF_FETCH),
  ]);
  return rrfFuse(denseResults, keywordResults, topK);
}

// --- flat-chunk metrics (legacy) ---

function flatRecall(retrievedIds, relevantIds) {
  if (relevantIds.length === 0) return null;
  const retrieved = new Set(retrievedIds);
  return relevantIds.filter((id) => retrieved.has(id)).length / relevantIds.length;
}

function flatMRR(retrievedIds, relevantIds) {
  if (relevantIds.length === 0) return null;
  const relevant = new Set(relevantIds);
  for (let i = 0; i < retrievedIds.length; i++) {
    if (relevant.has(retrievedIds[i])) return 1 / (i + 1);
  }
  return 0;
}

// --- unit-based metrics ---

function unitRecall(retrievedIds, units) {
  if (units.length === 0) return null;
  const retrieved = new Set(retrievedIds);
  const hits = units.filter((u) => u.any_of.some((id) => retrieved.has(id))).length;
  return hits / units.length;
}

function unitMRR(retrievedIds, units) {
  if (units.length === 0) return null;
  const allRelevant = new Set(units.flatMap((u) => u.any_of));
  for (let i = 0; i < retrievedIds.length; i++) {
    if (allRelevant.has(retrievedIds[i])) return 1 / (i + 1);
  }
  return 0;
}

// extract a flat list of all chunk IDs from relevant_units
function allChunkIds(units) {
  return units.flatMap((u) => u.any_of);
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
    const ids = entry.relevant_units
      ? allChunkIds(entry.relevant_units)
      : entry.relevant_chunks || [];
    for (const id of ids) {
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
  console.log("All labeled chunk IDs validated against corpus.");
  console.log(`Retriever: ${RETRIEVER} | Pipeline: ${PIPELINE_VERSION}\n`);

  const skipped = [];
  const evaluated = [];

  for (const entry of evalSet) {
    const units = entry.relevant_units || [];
    const flatIds = entry.relevant_units
      ? allChunkIds(units)
      : entry.relevant_chunks || [];

    if (units.length === 0 && flatIds.length === 0) {
      skipped.push(entry);
      continue;
    }

    console.log(`\nEvaluating: ${entry.id}`);
    console.log(`  Q: ${entry.question}`);
    if (units.length > 0) {
      console.log(`  ${units.length} units (${flatIds.length} chunks total)`);
    }

    const embedding = await embed(entry.question);
    const maxK = Math.max(...K_VALUES);
    const allResults = await retrieve(embedding, entry.question, maxK);
    const allRetrievedIds = allResults.map((r) => r.id);

    const metrics = {};
    for (const k of K_VALUES) {
      const topIds = allRetrievedIds.slice(0, k);

      if (units.length > 0) {
        metrics[`unit_recall@${k}`] = unitRecall(topIds, units);
        metrics[`unit_mrr@${k}`] = unitMRR(topIds, units);
      }
      metrics[`flat_recall@${k}`] = flatRecall(topIds, flatIds);
      metrics[`flat_mrr@${k}`] = flatMRR(topIds, flatIds);
    }

    const result = {
      id: entry.id,
      question: entry.question,
      metrics,
      retrieved_ids: Object.fromEntries(
        K_VALUES.map((k) => [`top_${k}`, allRetrievedIds.slice(0, k)]),
      ),
      relevant_units: units.length > 0 ? units : undefined,
      relevant_flat: flatIds,
    };

    evaluated.push(result);

    for (const k of K_VALUES) {
      let line = `  `;
      if (units.length > 0) {
        line += `unit_recall@${k}: ${metrics[`unit_recall@${k}`].toFixed(3)}  `;
      }
      line += `flat_recall@${k}: ${metrics[`flat_recall@${k}`].toFixed(3)}  `;
      if (units.length > 0) {
        line += `unit_mrr@${k}: ${metrics[`unit_mrr@${k}`].toFixed(3)}  `;
      }
      line += `flat_mrr@${k}: ${metrics[`flat_mrr@${k}`].toFixed(3)}`;
      console.log(line);
    }
  }

  // probe skipped entries
  const probes = {};
  for (const s of skipped) {
    const embedding = await embed(s.question);
    const results = await retrieve(embedding, s.question, DEFAULT_K);
    const scoreKey = RETRIEVER === "hybrid" ? "rrf_score" : "score";
    probes[s.id] = results.map((r) => ({ id: r.id, score: parseFloat(r[scoreKey] || r.score || 0).toFixed(4) }));
  }

  if (skipped.length > 0) {
    console.log(`\n--- Skipped (empty ground truth) ---`);
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
    console.log("  No entries had ground truth. Label eval-set.json first.");
  } else {
    const hasUnits = evaluated.some((e) => e.relevant_units);
    for (const k of K_VALUES) {
      let line = `  `;
      if (hasUnits) {
        const unitRecalls = evaluated
          .filter((e) => e.metrics[`unit_recall@${k}`] != null)
          .map((e) => e.metrics[`unit_recall@${k}`]);
        const unitMrrs = evaluated
          .filter((e) => e.metrics[`unit_mrr@${k}`] != null)
          .map((e) => e.metrics[`unit_mrr@${k}`]);
        if (unitRecalls.length > 0) {
          const avgUR = unitRecalls.reduce((a, b) => a + b, 0) / unitRecalls.length;
          const avgUM = unitMrrs.reduce((a, b) => a + b, 0) / unitMrrs.length;
          line += `avg unit_recall@${k}: ${avgUR.toFixed(3)}  avg unit_mrr@${k}: ${avgUM.toFixed(3)}  | `;
        }
      }
      const flatRecalls = evaluated.map((e) => e.metrics[`flat_recall@${k}`]);
      const flatMrrs = evaluated.map((e) => e.metrics[`flat_mrr@${k}`]);
      const avgFR = flatRecalls.reduce((a, b) => a + b, 0) / flatRecalls.length;
      const avgFM = flatMrrs.reduce((a, b) => a + b, 0) / flatMrrs.length;
      line += `avg flat_recall@${k}: ${avgFR.toFixed(3)}  avg flat_mrr@${k}: ${avgFM.toFixed(3)}`;
      console.log(line);
    }
  }

  // write timestamped results
  const resultsDir = path.join(__dirname, "results");
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const hasUnits = evaluated.some((e) => e.relevant_units);
  const aggregate = {};
  for (const k of K_VALUES) {
    if (evaluated.length === 0) continue;
    if (hasUnits) {
      const urs = evaluated.filter((e) => e.metrics[`unit_recall@${k}`] != null).map((e) => e.metrics[`unit_recall@${k}`]);
      const ums = evaluated.filter((e) => e.metrics[`unit_mrr@${k}`] != null).map((e) => e.metrics[`unit_mrr@${k}`]);
      if (urs.length) {
        aggregate[`avg_unit_recall@${k}`] = urs.reduce((a, b) => a + b, 0) / urs.length;
        aggregate[`avg_unit_mrr@${k}`] = ums.reduce((a, b) => a + b, 0) / ums.length;
      }
    }
    const frs = evaluated.map((e) => e.metrics[`flat_recall@${k}`]);
    const fms = evaluated.map((e) => e.metrics[`flat_mrr@${k}`]);
    aggregate[`avg_flat_recall@${k}`] = frs.reduce((a, b) => a + b, 0) / frs.length;
    aggregate[`avg_flat_mrr@${k}`] = fms.reduce((a, b) => a + b, 0) / fms.length;
  }

  const output = {
    timestamp: new Date().toISOString(),
    pipeline_version: PIPELINE_VERSION,
    retriever: RETRIEVER,
    k_values: K_VALUES,
    default_k: DEFAULT_K,
    evaluated_count: evaluated.length,
    skipped_count: skipped.length,
    skipped_ids: skipped.map((s) => s.id),
    aggregate,
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
