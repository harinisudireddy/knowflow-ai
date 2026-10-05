# KnowFlow AI — Database Schema Audit & Modeling

## 1. Schema Overview
KnowFlow AI leverages Google Cloud Firestore as its primary persistent store. The schema models relational entities with explicit multi-tenant ownership, foreign key references, and vector embedding payloads.

---

## 2. Collection Schemas & Relationship Mapping

### 2.1 `profiles`
- **Primary Key:** `id` (string, UUID or user ID)
- **Fields:**
  - `name`: string (User's display name)
  - `email`: string (Unique email address, lowercase normalized)
  - `password_hash`: string (PBKDF2 SHA-512 64-byte hex string)
  - `password_salt`: string (Cryptographically random 32-byte hex salt)
  - `role`: string (`'Admin' | 'Member' | 'Viewer'`)
  - `created_at`: string (ISO-8601 timestamp)
- **Relationships:** Referenced by `workspace_members.userId` and `sessions.userId`.

### 2.2 `workspaces`
- **Primary Key:** `id` (string, e.g. `ws-apex`, `ws-1729000000000`)
- **Fields:**
  - `name`: string (Workspace display name)
  - `slug`: string (URL friendly identifier)
  - `owner_id`: string (Foreign key -> `profiles.id`)
  - `plan`: string (`'Starter' | 'Professional' | 'Enterprise'`)
  - `member_count`: number (Active members count)
  - `created_at`: string (ISO-8601 timestamp)
- **Relationships:** Parent entity of `bots`, `sources`, `workspace_members`.

### 2.3 `workspace_members`
- **Primary Key:** `id` (string, `wm-${userId}-${workspaceId}`)
- **Fields:**
  - `workspace_id`: string (Foreign key -> `workspaces.id`)
  - `user_id`: string (Foreign key -> `profiles.id`)
  - `role`: string (`'Admin' | 'Member'`)
  - `created_at`: string (ISO-8601 timestamp)
- **Indexes:** Composite query on `(user_id, workspace_id)` for sub-millisecond authorization checks.

### 2.4 `bots` (Assistants)
- **Primary Key:** `id` (string, e.g. `ast-univ-1`)
- **Fields:**
  - `workspace_id`: string (Foreign key -> `workspaces.id`, tenant scope)
  - `name`: string (Assistant name)
  - `description`: string (Short summary of domain)
  - `instructions`: string (System behavior prompt)
  - `greeting`: string (Initial visitor message)
  - `placeholder`: string (Chat input placeholder)
  - `theme`: string (Hex color code)
  - `avatar`: string (Initials or avatar URL)
  - `status`: string (`'Ready' | 'Draft' | 'Indexing' | 'Paused'`)
  - `documentIds`: string[] (Array of attached `sources.id`)
  - `suggested_questions`: string[] (Array of sample starter prompts)
  - `refusal_message`: string (Configured out-of-scope response)
  - `metrics`: object
    - `totalQuestions`: number
    - `totalConversations`: number
    - `avgResponseTimeSec`: number
    - `feedbackScore`: number
    - `positiveCount`: number
    - `negativeCount`: number
  - `created_at`: string (ISO-8601)
  - `updated_at`: string (ISO-8601)
- **Relationships:** Parent of `sources`, `chunks`, `conversations`, `messages`, `feedback`.

### 2.5 `sources` (Knowledge Documents)
- **Primary Key:** `id` (string, `doc-${timestamp}`)
- **Fields:**
  - `bot_id`: string (Foreign key -> `bots.id`)
  - `workspace_id`: string (Foreign key -> `workspaces.id`)
  - `filename`: string (Original file name, e.g. `Student Handbook.pdf`)
  - `storage_path`: string (Local disk file path in `uploads/`)
  - `file_type`: string (`'PDF' | 'TXT' | 'MD' | 'JSON' | 'CSV'`)
  - `filesize`: string (Formatted file size)
  - `page_count`: number (Number of extracted pages)
  - `status`: string (`'Processing' | 'Ready' | 'Failed'`)
  - `summary`: string (Ingestion summary)
  - `created_at`: string (ISO-8601)
  - `updated_at`: string (ISO-8601)

### 2.6 `chunks` (Vector Chunks)
- **Primary Key:** `id` (string, `chk-${sourceId}-${chunkIndex}`)
- **Fields:**
  - `bot_id`: string (Foreign key -> `bots.id`, critical for vector scoping)
  - `source_id`: string (Foreign key -> `sources.id`)
  - `content`: string (Text chunk body, ~1800 chars)
  - `page_number`: number (Preserved source PDF page number)
  - `chunk_index`: number (Zero-indexed sequence in document)
  - `embedding`: number[] (768-dimension Gemini vector embedding)
  - `metadata`: object (denormalized filename, bot_id, source_id, page_number)
- **Partitioning Invariant:** Vector similarity search filters exclusively by `bot_id == target_bot_id`.

### 2.7 `conversations` & `messages`
- **`conversations`:**
  - `id`: string (`conv-${timestamp}`)
  - `bot_id`: string (Foreign key -> `bots.id`)
  - `session_id`: string (Optional client identifier)
  - `created_at`: string
- **`messages`:**
  - `id`: string (`msg-u-${timestamp}` or `msg-a-${timestamp}`)
  - `conversation_id`: string (Foreign key -> `conversations.id`)
  - `bot_id`: string (Foreign key -> `bots.id`)
  - `role`: string (`'user' | 'assistant' | 'system'`)
  - `content`: string (Message body)
  - `latency_ms`: number (Response latency in milliseconds)
  - `is_refusal`: boolean (Flag indicating out-of-domain refusal)
  - `citations`: array of citation objects
  - `created_at`: string

### 2.8 `feedback`
- **Primary Key:** `id` (string, `fb-${timestamp}`)
- **Fields:**
  - `bot_id`: string (Foreign key -> `bots.id`)
  - `message_id`: string (Foreign key -> `messages.id`)
  - `type`: string (`'positive' | 'negative'`)
  - `comment`: string (Optional user comment)
  - `created_at`: string

---

## 3. Database Problems Identified & Fixed

| Problem Identified | Cause | Fixed Implementation |
|---|---|---|
| **Dangling Document References** | Deleting a document removed the `sources` document but left `source.id` in `bot.documentIds`. | Added automated cleanup in `DELETE /api/documents/:id` querying all bots in the workspace and filtering out the deleted ID. |
| **Orphaned Vector Chunks** | Deleting a source without removing chunks caused vector searches to retrieve chunks from deleted documents. | `deleteSourceAndChunks` performs transactional deletion of all chunks matching `source_id` before deleting the source record. |
| **Missing Foreign Key Scoping** | Chunks previously lacked explicit `bot_id` on every chunk record, risking cross-assistant vector leakage. | Added immutable `bot_id` to every `ChunkRecord` and enforced `where('bot_id', '==', botId)` on all vector queries. |
| **Unindexed Workspace Authorization** | Membership checks relied on linear scanning of members. | Formatted composite ID `wm-${userId}-${workspaceId}` for direct single-document $O(1)$ lookup in `verifyWorkspaceAccess`. |
