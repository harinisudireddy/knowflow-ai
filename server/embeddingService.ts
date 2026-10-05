import { GoogleGenAI } from '@google/genai';

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

export interface IEmbeddingService {
  embedQuery(query: string): Promise<number[]>;
  embedDocument(texts: string[]): Promise<number[][]>;
  cosineSimilarity(vecA: number[], vecB: number[]): number;
}

export const embeddingService: IEmbeddingService = {
  /**
   * Embed a single user question or retrieval query
   */
  async embedQuery(query: string): Promise<number[]> {
    const ai = getAiClient();
    const cleanQuery = query.trim().slice(0, 4000);
    
    // Retry with backoff in case of temporary rate limit
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: cleanQuery,
        });

        if (result.embeddings && result.embeddings[0]?.values) {
          return result.embeddings[0].values;
        }
        if ((result as any).embedding?.values) {
          return (result as any).embedding.values;
        }
      } catch (err: any) {
        lastError = err;
        await new Promise(r => setTimeout(r, 400 * Math.pow(2, attempt)));
      }
    }
    console.warn('Embedding generation query fallback:', lastError?.message);
    return [];
  },

  /**
   * Embed document chunks in batches
   */
  async embedDocument(texts: string[]): Promise<number[][]> {
    const ai = getAiClient();
    const embeddings: number[][] = [];
    
    // Process sequentially with small delays to respect rate limits
    for (let i = 0; i < texts.length; i++) {
      const clean = texts[i].trim().slice(0, 5000);
      let chunkEmbedding: number[] = [];
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await ai.models.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: clean,
          });
          const vec = res.embeddings?.[0]?.values || (res as any).embedding?.values || [];
          if (vec.length > 0) {
            chunkEmbedding = vec;
            break;
          }
        } catch (err: any) {
          await new Promise(r => setTimeout(r, 300 * Math.pow(2, attempt)));
        }
      }
      embeddings.push(chunkEmbedding);
      // Small pause between items
      if (i < texts.length - 1) {
        await new Promise(r => setTimeout(r, 150));
      }
    }

    return embeddings;
  },

  /**
   * Compute cosine similarity between two float vectors: (A . B) / (||A|| * ||B||)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
    if (vecA.length !== vecB.length) return 0; // Dimension mismatch guard
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA <= 0 || normB <= 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  },
};
