# KnowFlow AI — Multi-Tenant Security & Isolation Guide

## 1. Multi-Tenant Threat Model

In an enterprise B2B SaaS platform serving educational institutions, SaaS corporations, and enterprises, multi-tenancy is the single most critical security boundary.

```
[Attacker Tenant B] ─── (Attempts to modify Assistant A) ───► [BLOCKED: 403 Forbidden]
[Attacker Tenant B] ─── (Attempts to upload file to Bot A) ──► [BLOCKED: 403 Forbidden]
[Attacker Tenant B] ─── (Queries Bot B) ─────────────────────► [ONLY Bot B Chunks Searched]
```

---

## 2. Threat Analysis & Vulnerabilities Remediated

### Threat 1: Cross-Tenant Assistant Tampering (IDOR)
- **Vulnerable Implementation:** An endpoint `PATCH /api/assistants/:id` that directly updates the document in the database using the route parameter `:id` without verifying whether the authenticated user owns or belongs to the workspace where the assistant was created.
- **Fix:** Added server-side verification:
  ```typescript
  if (req.user) {
    const hasAccess = await authService.verifyWorkspaceAccess(req.user.id, existing.workspace_id);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied: You do not have permission to modify this assistant.' });
      return;
    }
  }
  ```
- **Why the Chosen Solution is Appropriate:** It enforces the security boundary directly at the API controller level before any write operation is committed to Firestore.
- **Verification Test:** Executed `attackPatch` test from Tenant B against Tenant A assistant; verified HTTP 403 Forbidden.

---

### Threat 2: Cross-Tenant Document Poisoning
- **Vulnerable Implementation:** `POST /api/documents/upload` accepts `assistantId` in the multipart request body and associates uploaded chunks with that assistant without validating that the user is authorized to manage that assistant.
- **Fix:** Look up the target assistant in Firestore and execute `authService.verifyWorkspaceAccess(req.user.id, targetBot.workspace_id)`.
- **Why the Chosen Solution is Appropriate:** Completely blocks an attacker from injecting poisoned vector chunks into another organization's assistant.
- **Verification Test:** Tenant B attempted to upload a document to Tenant A's assistant; verified HTTP 403 Forbidden.

---

### Threat 3: Workspace Header Spoofing
- **Vulnerable Implementation:** An application that extracts `x-workspace-id` directly from the request headers and scopes database queries to that workspace without checking user membership.
- **Fix:** In `extractAuth` middleware:
  ```typescript
  if (requestedWsId) {
    const hasAccess = await authService.verifyWorkspaceAccess(user.id, requestedWsId);
    if (hasAccess) {
      wsIdToUse = requestedWsId;
    }
  }
  ```
- **Why the Chosen Solution is Appropriate:** Prevents arbitrary workspace switching; if an unauthorized workspace ID is supplied, the system rejects it and falls back to the user's legitimate workspace.
- **Verification Test:** Spoofing test passed with workspace ID automatically reverted to Tenant B's workspace.

---

### Threat 4: Cross-Assistant Vector Leakage
- **Vulnerable Implementation:** Performing a vector similarity query across all chunks in the database and filtering results after ranking.
- **Fix:** Chunks are pre-filtered at the database query level:
  ```typescript
  const botChunks = (await firestoreQuery('chunks', 'bot_id', botId)) as ChunkRecord[];
  ```
- **Why the Chosen Solution is Appropriate:** Vector distance calculations are mathematically restricted to chunks belonging to the targeted assistant.
- **Verification Test:** Queried Assistant B with terms unique to Assistant A; verified 0 chunks retrieved and immediate guardrail refusal.
