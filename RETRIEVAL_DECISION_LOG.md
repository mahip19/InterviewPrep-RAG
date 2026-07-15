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

**Finding:** The relevant story chunks *were* being retrieved, just ranked low.
The abstract query ("a time I dealt with a production issue") didn't embed close
to the concrete story language ("toggle", "stale cache", "email fired to client").

**Where I pushed back (important):** The AI initially proposed rewriting my chunk
to add search-friendly vocabulary. I rejected this: **real user data isn't
hand-polished, and the system has to work on messy input as-is.** I also pointed
out the retrieved story *was* a genuine production incident — so retrieval wasn't
as broken as the score implied. This reframed the problem from "fix retrieval" to
"fix the eval labels."

---

## Decision 3 — Fix the labeling gap (not the retriever)

**What:** The rank-1 dense hit (`mathworks-edg__c9`) was genuinely part of the
same incident story (result/reflection), but wasn't in the ground-truth labels.

**Decision:** Added `mathworks-edg__c9` to the `incident-result` unit. One-line
label fix. No retriever or data changes.

**Result:**

| Metric     | Before | After | Delta  |
|------------|--------|-------|--------|
| recall@5   | 0.000  | 0.500 | +0.500 |
| recall@10  | 0.500  | 1.000 | +0.500 |
| mrr@10     | 0.125  | 1.000 | +0.875 |

**Lesson:** This was a *labeling gap, not a retrieval gap.* The retriever was
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
ever revisited, use *weighted* fusion (dense-heavy) rather than vanilla RRF —
that's the source of the noise.

---

## Decision 5 — Lock dense as the baseline

Saved the dense results as the baseline reference; hybrid dropped.

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

---

## Next (open)

- Evaluate **generation quality** (faithfulness / no hallucination), starting
  with the `negative-abstention` (Rust) test.
