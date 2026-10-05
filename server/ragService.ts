import { GoogleGenAI } from '@google/genai';
import {
  firestoreGetDoc,
  firestoreSetDoc,
  firestoreDeleteDoc,
  firestoreQuery,
} from './firestoreClient';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface AssistantRecord {
  id: string;
  name: string;
  description: string;
  status: 'Ready' | 'Draft' | 'Indexing' | 'Paused';
  tenantId: string;
  workspaceId: string;
  fileSearchStoreName: string;
  settings: {
    name: string;
    description: string;
    greeting: string;
    placeholder: string;
    instructions: string;
    themeColor: string;
    avatarUrl?: string;
    suggestedQuestions: string[];
    refusalMessage?: string;
  };
  createdAt: string;
  updatedAt: string;
  lastIndexedAt: string;
  metrics: {
    totalQuestions: number;
    totalConversations: number;
    avgResponseTimeSec: number;
    feedbackScore: number;
    positiveCount: number;
    negativeCount: number;
  };
  documentIds?: string[];
}

export interface DocumentRecord {
  id: string;
  filename: string;
  filesize: string;
  type: string;
  pages: number;
  status: 'Ready' | 'Processing' | 'Failed';
  summary?: string;
  content?: string;
  chunkCount?: number;
  tenantId: string;
  fileSearchStoreName: string;
  fileSearchDocumentName: string;
  fileSearchOperationName?: string;
  uploadedAt: string;
  lastIndexedAt: string;
}

export interface AssistantDocumentRecord {
  id: string;
  assistantId: string;
  documentId: string;
  tenantId: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: string;
  assistantId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CitationItem {
  id: string;
  index: number;
  documentId: string;
  documentName: string;
  page: number;
  snippet: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  assistantId: string;
  tenantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: CitationItem[];
  isRefusal?: boolean;
  feedback?: 'positive' | 'negative' | null;
  responseTimeMs?: number;
  createdAt: string;
}

// Ensure assistant has a designated File Search Store in Gemini
export async function ensureAssistantFileSearchStore(assistant: AssistantRecord): Promise<string> {
  const ai = getAiClient();
  if (assistant.fileSearchStoreName) {
    try {
      const existing = await ai.fileSearchStores.get({ name: assistant.fileSearchStoreName });
      if (existing && existing.name) {
        return existing.name;
      }
    } catch {
      // Store might not exist or expired, re-create below
    }
  }

  // Create new store specifically for this assistant & tenant
  const store = await ai.fileSearchStores.create({
    config: {
      displayName: `${assistant.tenantId}-${assistant.id}-${Date.now()}`.slice(0, 40),
    },
  });

  assistant.fileSearchStoreName = store.name!;
  await firestoreSetDoc('assistants', assistant.id, assistant);
  return store.name!;
}

// Upload a document file to an assistant's Gemini File Search store
export async function uploadFileToStore(
  storeName: string,
  filePath: string,
  displayName: string,
  mimeType: string = 'application/pdf'
): Promise<{ operationName?: string; documentName?: string }> {
  const ai = getAiClient();
  const op = await ai.fileSearchStores.uploadToFileSearchStore({
    fileSearchStoreName: storeName,
    file: filePath,
    config: {
      mimeType,
      displayName,
    },
  });

  return {
    operationName: op.name,
    documentName: op.response?.documentName,
  };
}

// Grounded Question Answering using Gemini 3.6 Flash & File Search
export async function askAssistantQuestion(
  assistant: AssistantRecord,
  assignedDocuments: DocumentRecord[],
  question: string,
  conversationHistory: MessageRecord[] = []
): Promise<{
  answer: string;
  citations: CitationItem[];
  isRefusal: boolean;
  responseTimeMs: number;
}> {
  const startTime = Date.now();
  const ai = getAiClient();

  // Guard: If no documents are assigned or ready
  const readyDocs = assignedDocuments.filter(d => d.status === 'Ready');
  if (readyDocs.length === 0) {
    const elapsed = Date.now() - startTime;
    return {
      answer: "I couldn't find any ready documents assigned to this assistant to answer your question.",
      citations: [],
      isRefusal: true,
      responseTimeMs: elapsed,
    };
  }

  // Identify file search stores belonging to assigned documents
  const storeNames = Array.from(
    new Set(
      readyDocs
        .map(d => d.fileSearchStoreName)
        .filter((s): s is string => Boolean(s && s.startsWith('fileSearchStores/')))
    )
  );

  // If no valid stores found
  if (storeNames.length === 0) {
    const elapsed = Date.now() - startTime;
    return {
      answer: "I couldn't find active search indices for the documents assigned to this assistant.",
      citations: [],
      isRefusal: true,
      responseTimeMs: elapsed,
    };
  }

  // Construct strict grounding instructions
  const docNamesList = readyDocs.map(d => `"${d.filename}"`).join(', ');
  const customInstructions = assistant.settings?.instructions || '';
  const refusalMsg =
    assistant.settings?.refusalMessage ||
    "I couldn't find that information in the documents available to this assistant.";

  const systemInstruction = `You are "${assistant.name}", an enterprise AI Knowledge Assistant.
Directives:
1. Grounding & Accuracy: Answer user questions accurately and thoroughly using facts found in the retrieved documents assigned to this assistant (${docNamesList}).
2. Typo & Natural Language Tolerance: Users frequently have spelling mistakes, typos, phonetic variations, or abbreviations (for example: "attenance" for "attendance", "sylabus" for "syllabus", "placemnt" for "placement", "critera" for "criteria", "campanies" for "companies"). You MUST understand user intent across any typo, interpret what they mean, and provide the complete factual answer from the documents.
3. Helpfulness & Tone: Maintain a warm, clear, professional tone. Format responses with scannable bullet points and bold highlights where appropriate. Mention source document names when helpful.
4. Refusal: Only refuse if the question is genuinely outside the scope of the institution/knowledge base. When refusing, state: "${refusalMsg}".
5. Additional guidelines: ${customInstructions}
`;

  // Normalize common user typos for vector search and prompt grounding
  const typoMap: Record<string, string> = {
    attenance: 'attendance',
    attendence: 'attendance',
    attendace: 'attendance',
    sylabus: 'syllabus',
    syllubus: 'syllabus',
    syllab: 'syllabus',
    curiculum: 'curriculum',
    placemnt: 'placement',
    placemnts: 'placements',
    pakage: 'package',
    packge: 'package',
    campany: 'company',
    campanies: 'companies',
    critera: 'criteria',
    criteror: 'criteria',
    condontion: 'condonation',
    detension: 'detention',
    detentn: 'detention',
    semister: 'semester',
    semster: 'semester',
    ekap: 'ecap',
    protal: 'portal',
    hostle: 'hostel',
    feee: 'fee',
    libary: 'library',
    librry: 'library',
  };
  let normalizedQuestion = question;
  for (const [typo, fixed] of Object.entries(typoMap)) {
    const reg = new RegExp(`\\b${typo}\\b`, 'gi');
    normalizedQuestion = normalizedQuestion.replace(reg, fixed);
  }

  // Build conversation context
  const contents: any[] = [];
  // Add recent history (up to last 6 messages)
  const recentHistory = conversationHistory.slice(-6);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }
  // Add current query (normalized)
  contents.push({
    role: 'user',
    parts: [{ text: normalizedQuestion }],
  });

  // Candidate models with fallback in case of regional demand spikes or 503 errors
  const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

  let lastError: any = null;

  // Attempt 1: Grounded generation via Gemini File Search tool
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.1,
          tools: [
            {
              fileSearch: {
                fileSearchStoreNames: storeNames,
              },
            },
          ],
        },
      });

      const elapsed = Date.now() - startTime;
      const answerText = response.text || refusalMsg;

      // Extract citations from GroundingMetadata
      const candidate = response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      const citations: CitationItem[] = [];

      if (groundingMetadata && groundingMetadata.groundingChunks) {
        groundingMetadata.groundingChunks.forEach((chunk, idx) => {
          const ctx = chunk.retrievedContext;
          if (ctx) {
            // 1. Try match by filename / title exact or partial
            let matchedDoc = readyDocs.find(
              d =>
                ctx.title &&
                (d.filename.toLowerCase() === ctx.title.toLowerCase() ||
                  ctx.title.toLowerCase().includes(d.filename.toLowerCase()) ||
                  d.filename.toLowerCase().includes(ctx.title.toLowerCase()))
            );

            // 2. Try match by document resource name or ID in URI
            if (!matchedDoc && ctx.uri) {
              matchedDoc = readyDocs.find(
                d =>
                  (d.fileSearchDocumentName && ctx.uri.includes(d.fileSearchDocumentName)) ||
                  ctx.uri.includes(d.id)
              );
            }

            // 3. Try match by text snippet occurrence in document content or title
            if (!matchedDoc && ctx.text) {
              matchedDoc = readyDocs.find(
                d =>
                  (d.content && d.content.includes(ctx.text.slice(0, 50))) ||
                  (ctx.text && ctx.text.toLowerCase().includes(d.filename.replace(/\.pdf$/i, '').toLowerCase()))
              );
            }

            // 4. Check if document is mentioned in the answer text
            if (!matchedDoc) {
              matchedDoc = readyDocs.find(d =>
                answerText.toLowerCase().includes(d.filename.toLowerCase())
              );
            }

            const docName = matchedDoc?.filename || ctx.title || readyDocs[0]?.filename || 'Assigned Document';
            const docId = matchedDoc?.id || readyDocs[0]?.id || 'doc-ref';
            const page = ctx.pageNumber || 1;
            const snippet = ctx.text ? ctx.text.trim().slice(0, 240) : '';

            citations.push({
              id: `cit-${idx + 1}-${Date.now()}`,
              index: idx + 1,
              documentId: docId,
              documentName: docName,
              page,
              snippet: snippet || `Relevant context from ${docName}`,
            });
          }
        });
      }

      // Check if the answer is a refusal / not found
      const lower = answerText.toLowerCase();
      const isRefusal =
        citations.length === 0 &&
        (lower.includes("couldn't find") ||
          lower.includes('not available') ||
          lower.includes('not found') ||
          lower.includes('does not contain') ||
          lower.includes('cannot find') ||
          lower.includes('no information') ||
          lower.includes('unable to find'));

      return {
        answer: answerText,
        citations,
        isRefusal,
        responseTimeMs: elapsed,
      };
    } catch (err: any) {
      console.warn(`Gemini generation with ${modelName} encountered issue:`, err.message || err);
      lastError = err;
      // If error is high demand (503) or rate limit (429), pause briefly and fallback to next model
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Attempt 2: If FileSearch tool failed across models, fallback to document content in prompt
  const docsWithContent = readyDocs.filter(d => d.content || d.summary);
  if (docsWithContent.length > 0) {
    const directDocContext = docsWithContent
      .map(d => `--- DOCUMENT: ${d.filename} ---\n${d.content ? d.content.slice(0, 10000) : d.summary}`)
      .join('\n\n');

    const directInstruction = `${systemInstruction}\n\nDocument Sources Context:\n${directDocContext}`;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: directInstruction,
            temperature: 0.1,
          },
        });

        const elapsed = Date.now() - startTime;
        const answerText = response.text || refusalMsg;

        const fallbackCitations: CitationItem[] = [
          {
            id: `cit-fallback-1`,
            index: 1,
            documentId: docsWithContent[0].id,
            documentName: docsWithContent[0].filename,
            page: 1,
            snippet: docsWithContent[0].summary || `Extracted facts from ${docsWithContent[0].filename}`,
          },
        ];

        return {
          answer: answerText,
          citations: fallbackCitations,
          isRefusal: false,
          responseTimeMs: elapsed,
        };
      } catch (directErr: any) {
        lastError = directErr;
      }
    }
  }

  // If all attempts failed
  const elapsed = Date.now() - startTime;
  console.error('All Gemini RAG attempts failed:', lastError);
  return {
    answer: "The AI service is temporarily experiencing high traffic demand. Please try asking your question again in a moment.",
    citations: [],
    isRefusal: true,
    responseTimeMs: elapsed,
  };
}
