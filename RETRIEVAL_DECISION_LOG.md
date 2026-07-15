# Retrieval Evaluation — Decision Log

A chronological record of how I evaluated and tuned the retrieval layer of the
Interview Prep RAG assistant. Written both as an engineering record and as prep
material: it captures **what** was decided, **why**, and specifically **where I
used AI to move faster vs. where I overrode it**.

---

## Context

The assistant retrieves chunks from a corpus of my own interview-prep material
(STAR stories, project write-ups, resume content) using a dense retriever
(all-MiniLM-L6-v2 embeddings over PostgreSQL + pgvector). I built an eval harness
with ~9 labeled questions, each mapping to a set of ground-truth "units" (a unit
can be satisfied by any one of several equivalent chunks, since the same story is
told across multiple docs).

Metrics: `unit_recall@{5,10,20}` and `unit_mrr@10`.

---

## Decision 1 — Evaluate hybrid (dense + keyword) retrieval

**What:** Ran dense (locked baseline) against a hybrid variant that fuses dense
similarity with Postgres full-text search using vanilla RRF (k=60).

**Result:** Mixed. Recall barely moved (+0.042 @5, −0.088 @10, +0.050 @20), and
MRR dropped. Hybrid helped only where a rare exact token existed ("pgvector",
"backend"), and hurt ranking elsewhere.

**How AI was used:** AI generated the side-by-side report and a root-cause
analysis.

**Where I pushed back:** The AI's first framing leaned on aggregate deltas. I
noted the averages were being dragged around by one broken question
(`behavioral-production-incident` scoring 0.000), so the comparison wasn't
trustworthy yet. **Decision: don't judge hybrid until that question is fixed.**

---

## Decision 2 — Diagnose the failing behavioral question

**What:** `behavioral-production-incident` scored 0.000 @5. Needed to know why.

**How AI was used:** Rather than let the AI guess at chunk contents (it didn't
have them), I had Claude Code run the actual retrieval and print the top-10
retrieved chunks + scores for that one query. **Rule I enforced: read-only, no
changes to the retriever or scoring — just surface the evidence.**

**Finding:** The relevant story chunks _were_ being retrieved, just ranked low.
The abstract query ("a time I dealt with a production issue") didn't embed close
to the concrete story language ("toggle", "stale cache", "email fired to client").

**Where I pushed back (important):** The AI initially proposed rewriting my chunk
to add search-friendly vocabulary. I rejected this: **real user data isn't
hand-polished, and the system has to work on messy input as-is.** I also pointed
out the retrieved story _was_ a genuine production incident — so retrieval wasn't
as broken as the score implied. This reframed the problem from "fix retrieval" to
"fix the eval labels."

---

## Decision 3 — Fix the labeling gap (not the retriever)

**What:** The rank-1 dense hit (`mathworks-edg__c9`) was genuinely part of the
same incident story (result/reflection), but wasn't in the ground-truth labels.

**Decision:** Added `mathworks-edg__c9` to the `incident-result` unit. One-line
label fix. No retriever or data changes.

**Result:**

| Metric    | Before | After | Delta  |
| --------- | ------ | ----- | ------ |
| recall@5  | 0.000  | 0.500 | +0.500 |
| recall@10 | 0.500  | 1.000 | +0.500 |
| mrr@10    | 0.125  | 1.000 | +0.875 |

**Lesson:** This was a _labeling gap, not a retrieval gap._ The retriever was
already finding the right content; the eval just wasn't crediting it. Worth
remembering — a bad metric can make a working system look broken.

---

## Decision 4 — Re-run hybrid vs dense on the corrected eval

**What:** With the label fixed, re-ran the full comparison so the aggregates
would actually mean something.

**Result:** Same pattern as before. Dense wins MRR@10 (0.917 vs 0.760); recall is
a wash across k. Hybrid demotes correct hits on the behavioral questions and on
`project-distributed-storage` — RRF noise from common terms ("distributed",
"file", "testing") dilutes the strong dense signal in the middle ranks.

**Decision: drop hybrid, keep dense.** It adds complexity and hurts ranking for
no net recall gain on this corpus. Noted for the future: if keyword search is
ever revisited, use _weighted_ fusion (dense-heavy) rather than vanilla RRF —
that's the source of the noise.

---

## Decision 5 — Lock dense as the baseline

Saved the dense results as the baseline reference; hybrid dropped.

---

## Decision 6 — Check generation quality (not just retrieval)

**What:** Retrieval metrics only measure what's _fetched_, not what the LLM
_does_ with it. Ran three questions through the full pipeline (retrieval +
Llama 3.3 generation) and read each answer against its retrieved chunks — no
scoring, just eyeballing faithfulness.

**Findings:**

- `negative-abstention` (Rust) — **clean pass.** Top similarity only 0.27, all
  retrieved chunks unrelated, and the model correctly said it couldn't find this
  in the documents. No fabrication. This was the most important one to get right.
- `behavioral-production-incident` — correct answer, but 7 of 10 retrieved chunks
  were noise; the model did heavy lifting to find the needle.
- `project-rag-architecture` — **incomplete answer.** Missing deployment/pipeline
  detail because those chunks weren't retrieved. Not hallucination — a recall
  miss. The eval had already flagged this question as weak (recall@10 = 0.20).

**Decision:** Faithfulness is fine (abstention works). The real problem is the
rag-architecture recall miss — fix that next.

---

## Decision 7 — Fix rag-architecture retrieval with contextual headers

**Diagnosis first (read-only):** printed the top-10 for this question. Only
`rag-project__c0` (the overview) made the top 10 at sim 0.63. The technical
chunks — c1 (stack), c2 (pipeline), c3 (retrieval eng) — sat at ranks 12/15/off.
Root cause: the query says "architecture," the chunks say "Express, pgvector,
pipeline." Vocabulary mismatch → low embedding similarity.

**Cheap fix tried first:** `rag-project__c1` was the single richest stack chunk
but wasn't in the ground truth — a genuine labeling gap, so I labeled it. But it
sat at rank 12, so recall barely moved. Correct to fix, insufficient alone.

**Data fix:** prepended a context header naming the project + topic to each
rag-project chunk before embedding, then re-ingested.

**Result:**

| k         | No headers | With headers |
| --------- | ---------- | ------------ |
| recall@5  | 0.167      | 0.500        |
| recall@10 | 0.167      | 0.667        |
| recall@20 | 0.500      | 0.667        |

Chunks clustered at ranks 1/3/4/6. Generation went from retrieving 1 chunk to 7;
the answer now includes the full stack and all 6 pipeline stages.

**Where I stopped (judgment call):** two still-missing units (`resume-ml__c2`,
`ml-ai-projects__c2`) are a one-line resume bullet and a duplicate mention —
redundant coverage, not missing information. Chasing them would game the metric,
not improve the system. Stopped.

---

## Decision 8 — Generalize the header to auto-generated (for user uploads)

**Problem with Decision 7:** the header was hand-written because I knew the doc
was my RAG project. That doesn't work when a _user_ uploads arbitrary docs — you
can't hardcode a topic you don't know in advance.

**Options considered:**

- filename only (free, weak on junk filenames)
- **LLM doc-summary header** (one call per doc → topic line, prepended to every
  chunk) — chosen
- per-chunk LLM context (highest quality, one call _per chunk_ — expensive)

**Cost concern I raised:** summarizing a large doc burns tokens just for a header.
**Fix:** cap the summary input to the first ~1500 chars (docs front-load their
topic), cache the summary per doc, and fall back to filename + first heading if
the call fails.

**Result — auto-header matched the hand-crafted version and slightly beat it on
similarity:**

| Chunk           | Hand-crafted sim | LLM doc header sim |
| --------------- | ---------------- | ------------------ |
| c0 (overview)   | 0.6565           | 0.6579             |
| c1 (arch+stack) | 0.4646           | 0.5106             |
| c2 (pipeline)   | 0.4340           | 0.4566             |
| c3 (retrieval)  | 0.4796           | 0.5419             |

Recall identical (@5 0.500, @10 0.667, @20 0.667). Generalizes to all 11 docs in
one ingestion pass, no manual curation. The LLM summary
("Interview Prep RAG Assistant Technical Overview Guide") was denser topic-signal
than my hand-written header, which is why similarity went _up_.

**Validation against prior art:** this technique turned out to be Anthropic's
published **Contextual Retrieval** (Sept 2024) — prepend chunk context before
embedding. I arrived at it by diagnosing my own failure. Differences worth noting:
their version is _per-chunk_ context (passes the whole doc per chunk, uses prompt
caching to control cost) and reports ~49% fewer retrieval failures (67% with
reranking) — but they explicitly caution to measure on your own domain rather
than trust their numbers, which my eval does.

---

## How I kept AI from having all the control

A running theme worth being able to speak to:

1. **I didn't let it judge on aggregates alone.** I decomposed the averages and
   found they were driven by 2–3 questions out of 8 — too thin a signal to ship
   on. Small eval sets make small deltas meaningless.
2. **I refused a fix that wouldn't generalize.** Rewriting one chunk to game the
   query would not survive contact with real, messy user data.
3. **I kept the AI read-only when gathering evidence.** Diagnosis steps surfaced
   data; they never silently edited the retriever, baseline, or scoring.
4. **I corrected a wrong premise.** The AI treated a 0.000 score as a retrieval
   failure; I identified it as a labeling gap, which was the actual root cause.
5. **The final call was mine.** AI produced analysis and options; the
   keep-dense/drop-hybrid decision came from reading the tradeoffs myself.
6. **I stopped at "good enough" instead of maximizing the metric.** Declined to
   header every doc just to lift recall on redundant chunks — the goal was a
   better system, not a prettier number.

---

## Design notes — how this generalizes to user uploads

- **Contextual headers, auto-generated.** One LLM call per uploaded doc produces
  a topic summary from the first ~1500 chars; it's prepended to every chunk of
  that doc before embedding. Cached per doc; falls back to filename + first
  heading on failure.
- **Why bound the input:** you don't need the whole document to label its topic,
  just enough to identify it — so cost stays flat regardless of doc size.
- **Known ceiling:** a doc-level header is coarser than per-chunk context. If a
  single doc covers many distinct topics, per-chunk contextual retrieval (with
  prompt caching) would do better — at higher ingest cost.

---

## Next (open)

- **Reranking** — the biggest unused lever. Retrieval returns many chunks of
  mixed relevance (see the incident question: 7/10 noise); a reranker scores and
  filters to keep only the most relevant, improving answers and cutting cost.
  Directly targets the noise observed in Decision 6.
- Revisit **contextual BM25** only if reranking isn't enough — keyword search on
  the _contextualized_ text behaves differently than the vanilla RRF that was
  dropped in Decision 4.
