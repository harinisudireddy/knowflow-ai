# KnowFlow AI — API Contract Documentation

## 1. Authentication Endpoints

### `POST /api/auth/signup`
- **Purpose:** Registers a new user account, creates their initial organization workspace, and issues an authenticated session bearer token.
- **Authentication:** Public.
- **Request Body:**
  ```json
  {
    "name": "Sarah Jenkins",
    "email": "sarah@apex.edu",
    "password": "StrongPassword123!",
    "orgName": "Apex University"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "user": { "id": "usr-...", "name": "...", "email": "...", "role": "Admin" },
    "workspace": { "id": "ws-...", "name": "Apex University", "plan": "Enterprise" },
    "token": "sess-..."
  }
  ```
- **Errors:** 400 Bad Request (missing name/email/password, password < 8 chars), 409 Conflict (email already exists).

### `POST /api/auth/login`
- **Purpose:** Validates user credentials using PBKDF2 salt comparison and generates an active session.
- **Authentication:** Public.
- **Request Body:**
  ```json
  { "email": "sarah@apex.edu", "password": "StrongPassword123!" }
  ```
- **Response (200 OK):**
  ```json
  {
    "user": { "id": "...", "name": "...", "email": "...", "role": "Admin" },
    "workspace": { "id": "...", "name": "..." },
    "workspaces": [ ... ],
    "token": "sess-..."
  }
  ```
- **Errors:** 400 Bad Request, 401 Unauthorized (invalid credentials).

### `GET /api/auth/me`
- **Purpose:** Resolves the current session profile, active workspace, and workspace memberships.
- **Authentication:** Bearer token (optional headers: `x-workspace-id`).
- **Response (200 OK):**
  ```json
  {
    "user": { "id": "...", "name": "...", "email": "..." },
    "workspace": { "id": "...", "name": "..." },
    "workspaces": [ ... ],
    "isAuthenticated": true
  }
  ```

---

## 2. Assistant Endpoints

### `GET /api/assistants`
- **Purpose:** Lists all knowledge assistants belonging to the requester's active workspace.
- **Authentication:** Bearer Token.
- **Authorization:** Scoped to `req.workspaceId`.
- **Response (200 OK):** Array of `Assistant` objects.

### `POST /api/assistants`
- **Purpose:** Creates a new assistant scoped to the user's workspace.
- **Authentication:** Bearer Token.
- **Authorization:** Scoped to `req.workspaceId`.
- **Request Body:**
  ```json
  {
    "name": "Admissions Bot",
    "description": "Answers applicant questions",
    "greeting": "Hi! Ask me anything about admissions.",
    "instructions": "Be polite and concise.",
    "documentIds": ["doc-1"]
  }
  ```
- **Response (200 OK):** Created `Assistant` object.

### `PATCH /api/assistants/:id`
- **Purpose:** Updates an assistant's configuration (name, description, theme, instructions, greeting).
- **Authentication:** Bearer Token.
- **Authorization:** Verifies user is a member of the assistant's parent workspace (403 if unauthorized).
- **Response (200 OK):** Updated `Assistant` object.

### `DELETE /api/assistants/:id`
- **Purpose:** Deletes an assistant and cascadingly cleans up all its sources, chunks, and messages.
- **Authentication:** Bearer Token.
- **Authorization:** Verifies user is a member of the assistant's parent workspace (403 if unauthorized).
- **Response (200 OK):** `{ "success": true, "id": "..." }`

---

## 3. Document Ingestion Endpoints

### `POST /api/documents/upload`
- **Purpose:** Accepts multipart file uploads (up to 10 files, max 25MB each), extracts text page-by-page, chunks with overlap, generates Gemini vector embeddings, and writes to Firestore.
- **Authentication:** Bearer Token.
- **Authorization:** Scoped to `req.workspaceId`.
- **Request:** `multipart/form-data` with fields `files` (file binary) and optional `assistantId`.
- **Response (200 OK):** Array of created `DocumentItem` records.
- **Errors:** 400 Bad Request (no files provided), 403 Forbidden (target assistant from different workspace), 500 Processing Failure.

### `POST /api/documents/:id/reindex`
- **Purpose:** Re-extracts, re-chunks, and re-embeds an existing source document from disk.
- **Authentication:** Bearer Token.
- **Authorization:** Verified workspace access (403 if unauthorized).

### `DELETE /api/documents/:id`
- **Purpose:** Removes a source document, deletes all associated vector chunks from Firestore, removes disk file, and cleans up assistant documentId arrays.
- **Authentication:** Bearer Token.
- **Authorization:** Verified workspace access (403 if unauthorized).

---

## 4. Grounded Chat & RAG Endpoints

### `POST /api/assistants/:id/chat`
- **Purpose:** Executes source-grounded vector retrieval, prompt injection defense, Gemini response generation, and emits verified citations.
- **Authentication:** Public or Authenticated (allows external widget callers).
- **Request Body:**
  ```json
  {
    "message": "What is the tuition refund policy?",
    "conversationId": "conv-1729000000",
    "history": [
      { "role": "user", "content": "Hello" },
      { "role": "assistant", "content": "Hi! How can I help you today?" }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "conversationId": "conv-1729000000",
    "message": {
      "id": "msg-a-1729000001",
      "role": "assistant",
      "content": "According to the Student Handbook, tuition refunds must be requested within 30 days...",
      "timestamp": "10:30 AM",
      "responseTimeMs": 840,
      "isRefusal": false,
      "citations": [
        {
          "id": "cit-msg-a-1729000001-1",
          "documentName": "Student Handbook.pdf",
          "page": 1,
          "similarity": 0.82,
          "snippet": "Section 4.2 Refund Policy: Eligible students may submit a formal request..."
        }
      ]
    }
  }
  ```

### `POST /api/assistants/:id/feedback`
- **Purpose:** Logs user feedback (positive or negative) on a specific message and recalculates the assistant's feedback score.
- **Request Body:**
  ```json
  {
    "messageId": "msg-a-1729000001",
    "type": "positive",
    "comment": "Accurate page 1 citation"
  }
  ```
- **Response (200 OK):** `{ "success": true, "metrics": { ... } }`

---

## 5. Analytics & Activity Endpoints

### `GET /api/analytics`
- **Purpose:** Computes workspace-wide real analytics: 7-day query trends, session counts, latency, satisfaction, and top asked questions.
- **Authentication:** Bearer Token.
- **Authorization:** Scoped to `req.workspaceId`.

### `GET /api/assistants/:id/analytics`
- **Purpose:** Computes assistant-specific 7-day query trends, top questions, feedback breakdown, and latency.

### `GET /api/activities`
- **Purpose:** Returns recent audit events (document indexing, assistant creations, satisfaction milestones).
