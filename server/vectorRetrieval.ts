import { firestoreQuery, firestoreGetDoc } from './firestoreClient';
import { ChunkRecord, SourceRecord } from './documentProcessor';
import { embeddingService } from './embeddingService';

export interface RetrievedChunk {
  chunk_id: string;
  source_id: string;
  filename: string;
  page_number: number;
  content: string;
  similarity: number;
  rank: number;
}

export interface RetrievalOptions {
  topK?: number;
  similarityThreshold?: number;
}

/**
 * Retrieve relevant knowledge chunks strictly scoped to a specific assistant/bot.
 * Supports both directly ingested chunks and attached workspace document sources.
 */
export async function retrieveRelevantContext(
  botId: string,
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievedChunk[]> {
  if (!botId || typeof botId !== 'string' || !/^[a-zA-Z0-9_\-\.]+$/.test(botId) || botId.includes('..')) {
    return [];
  }
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const topK = options.topK || 4;
  // Gemini embedding baseline similarity between unrelated English texts is ~0.48-0.52.
  // Genuine contextual matches score 0.60-0.75+. A threshold of 0.58 cleanly discriminates.
  const similarityThreshold = options.similarityThreshold || 0.58;

  // 1. Fetch Bot Configuration to check attached document IDs & workspace
  const cleanBotId = botId.replace(/^assistant-/, '');
  const bot = (await firestoreGetDoc('bots', cleanBotId)) || (await firestoreGetDoc('bots', botId));
  const botWorkspaceId = bot?.workspace_id || '';
  const attachedDocIds: string[] = Array.isArray(bot?.documentIds) ? bot.documentIds : [];

  // 2. Fetch all authorized chunks for this assistant
  const chunksMap = new Map<string, ChunkRecord>();

  // A. Chunks directly tagged with bot_id
  const directChunks = [
    ...((await firestoreQuery('chunks', 'bot_id', cleanBotId)) as ChunkRecord[]),
    ...((await firestoreQuery('chunks', 'bot_id', botId)) as ChunkRecord[]),
  ];
  for (const c of directChunks) {
    chunksMap.set(c.id, c);
  }

  // B. Chunks from attached workspace documents (e.g. created via wizard or attached in settings)
  for (const docId of attachedDocIds) {
    // Validate source belongs to same workspace
    const src = (await firestoreGetDoc('sources', docId)) as SourceRecord | null;
    if (src && (!botWorkspaceId || !src.workspace_id || src.workspace_id === botWorkspaceId)) {
      const docChunks = (await firestoreQuery('chunks', 'source_id', docId)) as ChunkRecord[];
      for (const c of docChunks) {
        chunksMap.set(c.id, c);
      }
    }
  }

  const botChunks = Array.from(chunksMap.values());
  if (botChunks.length === 0) {
    return [];
  }

  // 2. Generate Query Vector Embedding
  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await embeddingService.embedQuery(query);
  } catch (err: any) {
    console.warn('Vector embedding generation failed, using lexical retrieval fallback:', err?.message);
  }

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'cannot', 'could', 'couldn', 'did', 'didn', 'do', 'does', 'doesn', 'doing', 'don', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn', 'has', 'hasn', 'have', 'haven',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in',
  'into', 'is', 'isn', 'it', 'its', 'itself', 'just', 'll', 'm', 'ma', 'me', 'might', 'mightn',
  'more', 'most', 'must', 'my', 'myself', 'need', 'no', 'nor', 'not', 'now', 'o', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 're', 's',
  'same', 'shan', 'she', 'should', 'shouldn', 'so', 'some', 'such', 't', 'than', 'that', 'the',
  'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 've', 'very', 'was', 'wasn', 'we', 'were', 'weren', 'what',
  'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'won', 'would', 'wouldn',
  'y', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

  // 3. Compute Cosine Similarity for each chunk
  const scoredChunks: { chunk: ChunkRecord; similarity: number }[] = [];

  if (queryEmbedding && queryEmbedding.length > 0) {
    for (const chunk of botChunks) {
      if (chunk.embedding && chunk.embedding.length > 0) {
        const sim = embeddingService.cosineSimilarity(queryEmbedding, chunk.embedding);
        if (sim >= similarityThreshold) {
          scoredChunks.push({ chunk, similarity: sim });
        }
      }
    }
  } else {
    // Fallback: Lexical token matching ONLY if embedding API failed or was rate-limited
    // Filters out stopwords so common words like 'how', 'the', 'for' don't cause false positives
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 3 && !STOP_WORDS.has(t));

    if (tokens.length > 0) {
      for (const chunk of botChunks) {
        const lower = chunk.content.toLowerCase();
        let matches = 0;
        for (const tok of tokens) {
          // Require whole word or distinct stem match
          const reg = new RegExp(`\\b${tok}`, 'i');
          if (reg.test(lower)) matches++;
        }
        // Require at least 2 distinct keyword matches if query has multiple keywords,
        // or 1 match if the query only had 1 significant keyword.
        const minMatchesRequired = tokens.length === 1 ? 1 : Math.min(2, tokens.length);
        if (matches >= minMatchesRequired) {
          const matchRatio = matches / tokens.length;
          // Scale lexical score: 0.30 to 0.70 based on match ratio
          const lexicalScore = parseFloat((0.30 + matchRatio * 0.40).toFixed(4));
          if (lexicalScore >= similarityThreshold) {
            scoredChunks.push({ chunk, similarity: lexicalScore });
          }
        }
      }
    }
  }

  // 4. Rank descending by similarity
  scoredChunks.sort((a, b) => b.similarity - a.similarity);

  // 5. Select Top K
  const topChunks = scoredChunks.slice(0, topK);

  return topChunks.map((item, index) => ({
    chunk_id: item.chunk.id,
    source_id: item.chunk.source_id,
    filename: item.chunk.metadata?.filename || 'Document',
    page_number: item.chunk.page_number || 1,
    content: item.chunk.content,
    similarity: parseFloat(item.similarity.toFixed(4)),
    rank: index + 1,
  }));
}
