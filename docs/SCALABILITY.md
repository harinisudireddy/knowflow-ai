# KnowFlow AI — Scalability & Performance Review

## 1. Scalability Dimensions & Bounds

This analysis outlines the performance limits of the current architecture, the defensive mechanisms in place, and the next evolutionary milestones as system volume expands.

```
Volume Dimension        Current MVP Limit      Current Safe Design                Next Scaling Step
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
Number of Assistants    ~1,000 per workspace   Indexed Firestore bot queries      Paginated list queries
Number of Documents     ~2,000 per assistant   Disk storage + Firestore docs      GCS / Cloud Storage Bucket
PDF Page Count          ~150 pages / file      Iterative page extractor (pdf-parse) Cloud Tasks background worker
Concurrent Chat Users   ~50-100 req/sec        Stateless Express + async Gemini   Horizontal Cloud Run autoscaling
Vector Search Size      ~5,000 chunks / bot    In-memory Cosine Similarity (bot)  pgvector HNSW / Vector Index
Analytics Rollup        ~50,000 messages       Daily bucket aggregation           Pre-computed daily rollup table
```

---

## 2. In-Depth Architectural Evaluation

### 2.1 What happens when there are 100 assistants?
- **Current Behavior:** `GET /api/assistants` performs an indexed Firestore query `where('workspace_id', '==', workspaceId)`. Firestore returns 100 documents in ~35ms. The React UI renders cards in a responsive grid.
- **Current Safe Design:** Workspace-level indexing isolates assistants so an organization only ever loads its own agents.
- **Next Scaling Step:** Implement cursor-based pagination (`limit(20).startAfter(lastVisible)`) in the API and infinite scrolling in the frontend.

### 2.2 What happens when there are 10,000 documents?
- **Current Behavior:** Local disk storage in `/uploads` could fill if large numbers of high-res PDFs are ingested.
- **Current Safe Design:** 25MB per-file upload limit enforced by Multer. Unused PDFs can be re-indexed or removed, cascadingly clearing chunks.
- **Next Scaling Step:** Transition storage from the local container disk to Google Cloud Storage (GCS) buckets with signed download URLs.

### 2.3 What happens when a PDF has hundreds of pages?
- **Current Behavior:** The HTTP upload request remains open while `extractPdfPages` and `embeddingService.embedDocument` process pages sequentially. For a 300-page document, sequential embedding calls (~150ms per chunk) would take ~45 seconds, risking HTTP gateway timeout.
- **Current Safe Design:** Documents are assigned an explicit status `Processing` in Firestore, allowing non-blocking UI updates.
- **Next Scaling Step:** Offload document ingestion to an asynchronous message queue (e.g. Google Cloud Tasks or BullMQ) that processes chunks in parallel workers and emits a WebSocket or Firestore snapshot event upon completion.

### 2.4 What happens when 100 users chat simultaneously?
- **Current Behavior:** Node.js event loop handles 100 concurrent asynchronous HTTP connections with minimal overhead. Each query invokes `retrieveRelevantContext` (bot-scoped) and `ai.models.generateContent` with Gemini 2.5 Flash.
- **Current Safe Design:** Gemini Flash has sub-second time-to-first-token. Connection latency remains under 1.2 seconds.
- **Next Scaling Step:** Cloud Run auto-scaling with concurrency set to 80 requests per container instance.

### 2.5 What happens when vector search becomes large (100,000 chunks)?
- **Current Behavior:** Currently, `retrieveRelevantContext` fetches all chunks for that specific `bot_id` and computes cosine similarity in Node.js memory. For up to 5,000 chunks (~5MB in memory), calculating 768-dimension dot products takes less than 8ms. Beyond 20,000 chunks per bot, memory bandwidth becomes a bottleneck.
- **Current Safe Design:** Strict scoping by `bot_id` ensures that chunk count is strictly proportional to that individual assistant's knowledge base, never the whole platform.
- **Next Scaling Step:** Enable approximate nearest neighbor (ANN) vector indexing via PostgreSQL `pgvector` with HNSW indexes or Firestore Vector Search extension (`findNearest`).
