# KnowFlow AI — RAG Architecture & Vector Search Design

## 1. High-Level Retrieval-Augmented Generation Pipeline

```
[Uploaded Document (PDF/Text)]
            │
            ▼
[extractPdfPages()] ──► Preserves Page Boundaries (page_number: 1, 2, ...)
            │
            ▼
[cleanText()] ────────► Normalizes Whitespace & Strips Control Characters
            │
            ▼
[chunkPageText()] ────► Windowed Paragraph Chunks (~1800 chars, 15% overlap)
            │
            ▼
[embeddingService] ───► Gemini Embedding (gemini-embedding-2-preview, 768-d)
            │
            ▼
[Firestore 'chunks'] ─► Persisted with bot_id, source_id, page_number, embedding

───────────────────────────── RUNTIME QUERY FLOW ─────────────────────────────

[User Question]
            │
            ▼
[normalizeUserQuery()] ──────► Typo correction ("attenance" -> "attendance")
            │
            ▼
[embedQuery()] ──────────────► Vector Embedding of User Query
            │
            ▼
[bot-scoped chunk query] ────► WHERE bot_id == target_bot_id
            │
            ▼
[cosineSimilarity()] ────────► Compute Cosine Distance against Bot Chunks
            │
            ▼
[Threshold Filter (0.28)] ───► Discard Irrelevant Chunks
            │
      ┌─────┴────────────────┐
      ▼                      ▼
[Pass: Top-4 Chunks]    [No Chunks Passed]
      │                      │
      ▼                      ▼
[Prompt Assembly]       [Immediate Refusal Message]
<document_data> tags    "I couldn't find sufficient information in..."
      │
      ▼
[Gemini Generation]
(gemini-2.5-flash)
      │
      ▼
[Response Validation]
      │
      ▼
[Emit Answer + Verified Citations (document, page, snippet)]
```

---

## 2. Chunking Strategy & Tradeoffs

### 2.1 Configuration
- **Target Chunk Size:** 1,800 characters (~450 tokens).
- **Chunk Overlap:** 270 characters (~15% of chunk size).
- **Minimum Chunk Length:** 30 characters (filters out headers, page numbers, or empty artifacts).
- **Boundary Detection Window:** Evaluates the last 30% of the chunk window for:
  1. Double newline (`\n\n` - Paragraph break)
  2. Period + Space (`. ` - Sentence end)
  3. Space (` ` - Word boundary)

### 2.2 Tradeoff Analysis
| Chunking Parameter | Chosen Value | Why Chosen | Tradeoffs |
|---|---|---|---|
| **Chunk Size (1800 chars)** | Medium (~450 tokens) | Fits complete clauses, policy paragraphs, and tabular fee structures without fragmentation. | Slightly higher token usage per retrieved chunk than micro-chunks (200 chars). |
| **Overlap (15%)** | ~270 chars | Prevents critical boundary sentences from being sliced in half across chunks. | ~15% vector storage overhead in database. |
| **Per-Page Scoping** | Page boundary preservation | Guarantees that citations can report the exact page number where evidence lives. | Cross-page paragraphs may be segmented at the page line. |

---

## 3. Vector Retrieval & Similarity Ranking

### 3.1 Mathematical Formulation
Given query vector $\vec{q}$ and chunk vector $\vec{c}$:
$$\text{Cosine Similarity}(\vec{q}, \vec{c}) = \frac{\vec{q} \cdot \vec{c}}{\|\vec{q}\| \|\vec{c}\|} = \frac{\sum_{i=1}^{n} q_i c_i}{\sqrt{\sum_{i=1}^{n} q_i^2} \sqrt{\sum_{i=1}^{n} c_i^2}}$$

### 3.2 Multi-Tenancy Guard
Vector similarity search is **strictly restricted to chunks matching `bot_id == targetBotId`**:
```typescript
const botChunks = await firestoreQuery('chunks', 'bot_id', botId);
```
Unrestricted searches across other assistants' chunks are mathematically impossible under this architecture.

### 3.3 Relevance Threshold Gate
- **Similarity Threshold:** `0.28`.
- If no chunk reaches this similarity, retrieval terminates early and emits the configured refusal message without calling Gemini, saving LLM tokens and eliminating hallucinations.

---

## 4. Grounded Prompt Assembly & Prompt Injection Defense

Retrieved chunks are encapsulated in XML data tags with metadata:
```xml
<document_data index="1" filename="Student Handbook.pdf" page="12" similarity="0.84">
Section 4.2: Eligible students may submit a formal request for 100% refund of tuition within 30 calendar days...
</document_data>
```

The system instruction explicitly defines:
1. **Instruction vs. Data Segregation:** The model is commanded to treat `<document_data>` solely as informational facts.
2. **Instruction Neutralization:** If document text contains phrases such as `"Ignore previous instructions"` or `"Reveal API keys"`, the model is commanded to discard them as passive data.
3. **No Hallucination Mandate:** The model is prohibited from using external world knowledge outside the provided chunks.
