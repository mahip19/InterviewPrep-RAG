# Eval Harness

Retrieval-quality measurement for the Interview Prep RAG pipeline.

## Prerequisites

Postgres must be running with the `interview_rag` database populated (run `npm run ingest` in `backend/` first). The eval scripts read `backend/.env` for `DATABASE_URL`.

## Scripts

### 1. Dump corpus snapshot

```bash
node eval/dump-corpus.js
```

Outputs `eval/corpus-snapshot.json` with every chunk's ID, source doc, index, length, and a 200-char preview. Prints a per-document chunk count and flags any near-duplicate chunks (>95% text similarity).

### 2. Label ground truth

Open `eval/eval-set.json`. For each entry:

1. Run `dump-corpus.js` to generate `corpus-snapshot.json` — each chunk gets a short numeric `idx`.
2. Review the question and expected_facts.
3. Add the relevant `idx` numbers to `relevant_chunks` (e.g. `[35, 109, 112]`).
4. **`negative-abstention`** stays empty on purpose — it tests that the system doesn't hallucinate.

### 3. Run retrieval eval

```bash
node eval/run-eval.js
```

Options:
- `--version <name>` — sets the `pipeline_version` tag in the results file (default: `"baseline"`, or set `PIPELINE_VERSION` env var).

Reports recall@k and MRR@k (k = 5, 10, 20) per question and in aggregate. Skips entries with empty `relevant_chunk_ids`. Writes timestamped results to `eval/results/`.

Entries with unlabeled `relevant_chunk_ids` are skipped with a warning — label them before running.
