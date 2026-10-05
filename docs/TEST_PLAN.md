# KnowFlow AI — Master QA Test Plan & Verification Results

## 1. Test Suite Overview
The testing harness validates core functional flows, zero-trust tenant isolation, prompt injection defense, document processing integrity, and public widget operations.

---

## 2. Test Execution Matrix

### 2.1 Authentication & Session Management
| Test Case ID | Description | Input / Condition | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| **AUTH-01** | User Signup | Name, valid email, 8+ char password, Org name | HTTP 200, user profile, workspace, bearer token | HTTP 200, session created | PASS |
| **AUTH-02** | Duplicate Email Signup | Existing email address | HTTP 409 Conflict | HTTP 409 Conflict | PASS |
| **AUTH-03** | User Login | Valid email and password | HTTP 200, user record, active session | HTTP 200, session returned | PASS |
| **AUTH-04** | Invalid Password Login | Valid email, incorrect password | HTTP 401 Unauthorized | HTTP 401 Unauthorized | PASS |
| **AUTH-05** | User Logout | Active session token | HTTP 200, session deleted | HTTP 200, session removed | PASS |
| **AUTH-06** | Protected Route Access | Request without Authorization header | HTTP 401 or Guest state fallback | Scoped to default fallback | PASS |

### 2.2 Multi-Tenancy & Authorization
| Test Case ID | Description | Input / Condition | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| **TENANT-01** | Cross-Tenant Assistant Update | Tenant B token attempts `PATCH /api/assistants/:id` on Tenant A assistant | HTTP 403 Forbidden | HTTP 403 Forbidden | PASS |
| **TENANT-02** | Cross-Tenant Assistant Deletion | Tenant B token attempts `DELETE /api/assistants/:id` on Tenant A assistant | HTTP 403 Forbidden | HTTP 403 Forbidden | PASS |
| **TENANT-03** | Cross-Tenant Document Upload | Tenant B attempts uploading document specifying Tenant A `assistantId` | HTTP 403 Forbidden | HTTP 403 Forbidden | PASS |
| **TENANT-04** | Workspace Header Spoofing | Tenant B passes `x-workspace-id: ws-tenant-a` | Reverted to Tenant B authorized workspace | Workspace reverted to B | PASS |
| **TENANT-05** | Vector Chunk Scoping | Query to Assistant B should never match chunks of Assistant A | Chunks filtered exclusively by `bot_id` | 0 foreign chunks retrieved | PASS |

### 2.3 RAG Retrieval, Grounding & Citations
| Test Case ID | Description | Input / Condition | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| **RAG-01** | Grounded Query with Citations | *"What is the tuition refund deadline schedule?"* | Answer citing Student Handbook with exact page 1 citation | Grounded response, 4 citations (page 1) | PASS |
| **RAG-02** | Phonetic Typo Normalization | *"What is the tuition refnd policy schedule?"* | Query normalized, retrieves correct refund chunks | Successfully answered with citations | PASS |
| **RAG-03** | Out-of-Domain Refusal | *"What is the recipe for baking chocolate brownies?"* | Refusal message, `isRefusal: true`, citations: `[]` | Refusal message, `isRefusal: true` | PASS |
| **RAG-04** | Multi-Turn Alternating Conversation | Chat history with user and assistant turns | Alternating `user`/`model` Gemini payload | Coherent conversational answer | PASS |

### 2.4 Document Processing & Chunking
| Test Case ID | Description | Input / Condition | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| **DOC-01** | Multi-Page PDF Ingestion | Upload `Student Handbook.pdf` (48 pages) | Preserves page numbers, generates ~140 chunks | Ready status, page_count: 48, chunks: 142 | PASS |
| **DOC-02** | Clean Text Processing | Text containing ASCII control chars and line breaks | Normalized text without control codes | Cleaned chunk text | PASS |
| **DOC-03** | Referential Cleanup on Deletion | Delete document attached to assistant | Chunks deleted, document removed from `bot.documentIds` | Chunks deleted, `documentIds` cleaned | PASS |

### 2.5 Feedback & Real Analytics
| Test Case ID | Description | Input / Condition | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| **METRIC-01** | Thumbs Up Feedback | `POST /api/assistants/:id/feedback` with positive type | Metric count increments, score updates | Score recalculated, feedback saved | PASS |
| **METRIC-02** | Real Analytics Aggregation | `GET /api/analytics` | Returns 7-day query trends, session counts, and top questions | Real trends computed from messages | PASS |
| **METRIC-03** | Real Activity Feed | `GET /api/activities` | Returns real chronological activity events | Returns formatted activities | PASS |

### 2.6 Public Embeddable Widget
| Test Case ID | Description | Input / Condition | Expected Output | Actual Output | Status |
|---|---|---|---|---|---|
| **WIDGET-01** | Widget Script Delivery | `GET /widget.js` | JavaScript code with `Content-Type: application/javascript` | Script served with 200 OK | PASS |
| **WIDGET-02** | Widget Dynamic Customization | Load widget specifying `data-bot-id="ast-univ-1"` | Dynamically loads assistant title, greeting, and theme | Theme and title loaded | PASS |
| **WIDGET-03** | Widget Chat Interaction | Submit message through widget input | Receives grounded answer with page citations | Rendered bubble with citations | PASS |
