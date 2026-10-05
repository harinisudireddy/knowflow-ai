# KnowFlow AI — Current Architecture Mapping

## 1. System Overview
KnowFlow AI is an enterprise multi-tenant AI Knowledge Assistant platform allowing organizations to create, configure, train on approved knowledge sources (PDF, text), evaluate in a playground, and embed public chatbots into external web applications.

```
+-----------------------------------------------------------------------------------------+
|                                    KNOWFLOW AI PLATFORM                                 |
+-----------------------------------------------------------------------------------------+
| [Frontend Client]                                                                       |
| React 19 SPA + Vite + Tailwind CSS + Lucide Icons + Motion                              |
| Views: Landing, Dashboard, Assistants, Workspace Editor, Knowledge Base, Global Analytics|
+-----------------------------------------------------------------------------------------+
                                          |
                                HTTP REST / Bearer Auth / x-workspace-id
                                          v
+-----------------------------------------------------------------------------------------+
| [Backend Application Server]                                                            |
| Node.js / Express Server (server.ts)                                                    |
| - Authentication & RBAC Middleware (PBKDF2 Password Hash + Crypto Sessions)            |
| - Tenant Isolation (Tenant & Workspace Scoping on all entities)                         |
| - Document Ingestion Pipeline (Multer -> PDFParse -> Cleaner -> Chunker -> Embedder)    |
| - RAG Query Engine (Embedding Retrieval + Grounded Context + Gemini + Validation)       |
| - Public Embeddable Widget Server (/widget.js)                                          |
+-----------------------------------------------------------------------------------------+
                 |                                                 |
                 v                                                 v
+------------------------------------+          +-----------------------------------------+
| [Firestore Database]               |          | [Google Gemini API]                     |
| Cloud Firestore Enterprise         |          | Models:                                 |
| Collections:                       |          | - gemini-embedding-2-preview (Vectors)  |
| - profiles, workspaces, members    |          | - gemini-2.5-flash (Generation)         |
| - bots, sources, chunks            |          | - gemini-3.5-flash-lite (Failover)      |
| - conversations, messages          |          +-----------------------------------------+
| - citations, feedback, sessions    |
+------------------------------------+
```

---

## 2. Core Subsystems

### 2.1 Frontend Framework & State
- **Framework:** React 19 with Vite bundler.
- **Routing & Navigation:** SPA state engine (`currentPage`: `'landing' | 'overview' | 'assistants' | 'assistant_workspace' | 'create_assistant' | 'knowledge_base' | 'analytics' | 'settings'`).
- **Styling:** Tailwind CSS 4 with enterprise B2B SaaS layout tokens (no unvetted AI slop, no pills, sharp accessible typography).
- **Client Service Layer:** `src/services/apiService.ts` handles API calls with bearer authentication, active workspace header injection, document upload forms, streaming/non-streaming chat requests, feedback logging, and global analytics fetching.

### 2.2 Backend & Runtime Environment
- **Runtime:** Node.js (via `tsx` in development, bundled with `esbuild` for production `start: node dist/server.cjs`).
- **Web Framework:** Express 4 mounted with Vite middleware in dev and static asset serving in production.
- **File Uploads:** `multer` with disk storage in `uploads/` directory, memory buffer parsing, and strict MIME/extension validation (`.pdf`, `.txt`, `.md`, `.json`, `.csv`).

### 2.3 Database & Multi-Tenancy Architecture
- **Engine:** Google Cloud Firestore (provisioned database `ai-studio-remixremixknowfl-78346d4e-3274-4c12-be0a-96fcdec996fd`).
- **Multi-Tenant Hierarchy:**
  ```
  User Profile -> Workspace Member -> Workspace -> Bots (Assistants) -> Sources -> Chunks
                                                                      -> Conversations -> Messages -> Citations
                                                                      -> Feedback
  ```
- **Tenant Isolation Policy:** Every document, assistant, conversation, and vector chunk is strictly partitioned by `workspace_id` and `bot_id`. Vector retrieval never performs unconstrained full-collection queries.

### 2.4 Document Processing Pipeline
1. **Upload Validation:** Validates file size (up to 25MB), file type, and mime type.
2. **Text Extraction:** Uses `pdf-parse` (`PDFParse` class) to extract page-by-page text while preserving `pageNumber` boundaries.
3. **Cleaning:** Strips ASCII control characters, normalizes line endings (`\r\n` -> `\n`), collapses multi-spaces and redundant empty lines.
4. **Chunking:** Chunk size ~1800 characters (~450 tokens) with 15% overlap (~270 characters) and natural sentence/paragraph boundary alignment.
5. **Embedding:** `gemini-embedding-2-preview` embeds each chunk text sequentially with rate-limit backoff.
6. **Vector Storage:** Chunks are written to Firestore `chunks` collection with `bot_id`, `source_id`, `content`, `page_number`, `chunk_index`, and `embedding` vector.

### 2.5 Retrieval-Augmented Generation (RAG) Engine
1. **Query Normalization:** Fixes common phonetic typos (e.g. `attenance` -> `attendance`, `refnd` -> `refund`).
2. **Vector Similarity Search:** Generates query vector with `embedQuery()` and calculates cosine similarity against all chunks matching `bot_id == current_bot_id`.
3. **Threshold Filtering & Top-K:** Discards chunks below `0.28` cosine similarity and takes top 4 chunks.
4. **Prompt Injection Defense:** Chunks are wrapped in strict `<document_data>` XML-style boundaries and marked as untrusted data in the system instruction.
5. **Model Generation:** Uses `gemini-2.5-flash` with failover to `gemini-3.5-flash-lite`.
6. **Grounding & Refusal:** If no chunks pass the threshold, or the model detects insufficient facts, it responds with the exact configured refusal message without hallucination.
7. **Citations:** Emits verified citations containing chunk document name, page number, similarity score, and excerpt snippet.

### 2.6 Analytics & Audit Subsystem
- **Real Backend Aggregation:** Calculates 7-day query trends, session counts, average latency, satisfaction score, and top user questions directly from stored Firestore messages and feedback records.
