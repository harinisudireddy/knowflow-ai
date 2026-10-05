import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import { firestoreSetDoc, firestoreDeleteDoc, firestoreQuery } from './firestoreClient';
import { embeddingService } from './embeddingService';

export interface SourceRecord {
  id: string;
  bot_id: string;
  workspace_id?: string;
  filename: string;
  storage_path: string;
  file_type: string;
  status: 'Processing' | 'Ready' | 'Failed';
  page_count: number;
  filesize?: string;
  summary?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ChunkRecord {
  id: string;
  bot_id: string;
  source_id: string;
  content: string;
  page_number: number;
  chunk_index: number;
  embedding: number[];
  metadata: {
    filename: string;
    bot_id: string;
    source_id: string;
    page_number: number;
    chunk_index: number;
  };
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ChunkingOptions {
  maxCharacters?: number; // ~400-800 tokens = ~1600-3000 chars
  overlapCharacters?: number; // ~15% overlap
}

/**
 * Clean extracted text: remove control chars, normalize spaces/newlines, clean hyphenation
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // remove ASCII control chars
    .replace(/\u00A0/g, ' ') // replace non-breaking space
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/(\b[a-zA-Z]{2,})-\n([a-zA-Z]{2,}\b)/g, '$1$2') // rejoin hyphenated words split by line break
    .replace(/[ \t]+/g, ' ') // normalize spaces
    .replace(/\n{3,}/g, '\n\n') // collapse multiple blank lines
    .trim();
}

/**
 * Split a page's text into chunks respecting boundary cues and overlap
 */
export function chunkPageText(
  page: ExtractedPage,
  options: ChunkingOptions = {}
): { content: string; pageNumber: number }[] {
  const maxChars = options.maxCharacters || 1800; // ~450 tokens
  const overlap = options.overlapCharacters || 270; // 15% overlap

  const text = page.text.trim();
  if (!text) return [];

  if (text.length <= maxChars) {
    return [{ content: text, pageNumber: page.pageNumber }];
  }

  const chunks: { content: string; pageNumber: number }[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChars;

    if (endIndex >= text.length) {
      const slice = text.slice(startIndex).trim();
      if (slice.length > 0) {
        if (slice.length <= 60 && chunks.length > 0) {
          // Append short trailing snippet to previous chunk to avoid orphaned tiny chunks
          chunks[chunks.length - 1].content += '\n\n' + slice;
        } else {
          chunks.push({ content: slice, pageNumber: page.pageNumber });
        }
      }
      break;
    }

    // Try to find a paragraph break or sentence break near the end
    let splitPos = -1;
    const window = text.slice(startIndex + Math.floor(maxChars * 0.7), endIndex);

    const paragraphMatch = window.lastIndexOf('\n\n');
    if (paragraphMatch !== -1) {
      splitPos = startIndex + Math.floor(maxChars * 0.7) + paragraphMatch + 2;
    } else {
      const sentenceMatch = window.lastIndexOf('. ');
      if (sentenceMatch !== -1) {
        splitPos = startIndex + Math.floor(maxChars * 0.7) + sentenceMatch + 2;
      } else {
        const spaceMatch = window.lastIndexOf(' ');
        if (spaceMatch !== -1) {
          splitPos = startIndex + Math.floor(maxChars * 0.7) + spaceMatch + 1;
        } else {
          splitPos = endIndex;
        }
      }
    }

    const chunkContent = text.slice(startIndex, splitPos).trim();
    if (chunkContent.length > 0) {
      chunks.push({ content: chunkContent, pageNumber: page.pageNumber });
    }

    // Advance with overlap
    startIndex = Math.max(splitPos - overlap, startIndex + 100);
  }

  return chunks;
}

/**
 * Extract pages from PDF using pdf-parse with page boundary preservation
 */
export async function extractPdfPages(filePath: string): Promise<ExtractedPage[]> {
  const buffer = fs.readFileSync(filePath);
  const parser: any = new PDFParse({ data: buffer });
  if (typeof parser.load === 'function') {
    await parser.load();
  }

  const numPages = parser.doc?.numPages || 1;
  const pages: ExtractedPage[] = [];

  for (let i = 1; i <= numPages; i++) {
    try {
      const pageText = typeof parser.getPageText === 'function' ? await parser.getPageText(i) : '';
      const textStr = typeof pageText === 'string' ? pageText : (pageText?.text || '');
      const cleaned = cleanText(textStr);
      if (cleaned.length > 0) {
        pages.push({ pageNumber: i, text: cleaned });
      }
    } catch (e: any) {
      console.warn(`Could not extract page ${i}:`, e.message);
    }
  }

  // Fallback: If getPageText produced nothing, attempt full text
  if (pages.length === 0) {
    const rawResult = typeof parser.getText === 'function' ? await parser.getText() : '';
    const fullText = typeof rawResult === 'string' ? rawResult : (rawResult?.text || '');
    const cleaned = cleanText(fullText || '');
    pages.push({ pageNumber: 1, text: cleaned || 'No extractable text.' });
  }

  if (typeof parser.destroy === 'function') {
    await parser.destroy();
  }
  return pages;
}

/**
 * Extract text from text-based documents (txt, md, csv, html, json)
 */
export function extractTextFilePages(filePath: string): ExtractedPage[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const cleaned = cleanText(raw);

  // Divide into pseudo-pages of ~3000 chars for metadata indexing
  const pageSize = 3000;
  const pages: ExtractedPage[] = [];
  let pageNum = 1;
  for (let i = 0; i < cleaned.length; i += pageSize) {
    pages.push({
      pageNumber: pageNum++,
      text: cleaned.slice(i, i + pageSize),
    });
  }

  if (pages.length === 0) {
    pages.push({ pageNumber: 1, text: cleaned || '' });
  }

  return pages;
}

/**
 * Full End-to-End Document Ingestion Pipeline:
 * Upload -> Extract -> Clean -> Chunk -> Embed -> Store -> Mark Ready
 */
export async function processAndIngestDocument(
  sourceRecord: SourceRecord,
  filePath: string,
  options?: ChunkingOptions
): Promise<{ chunkCount: number; pageCount: number }> {
  try {
    // 1. Mark status as Processing
    sourceRecord.status = 'Processing';
    sourceRecord.updated_at = new Date().toISOString();
    await firestoreSetDoc('sources', sourceRecord.id, sourceRecord);

    // 2. Extract pages preserving boundaries
    const ext = path.extname(sourceRecord.filename).toLowerCase();
    let pages: ExtractedPage[] = [];

    if (ext === '.pdf') {
      pages = await extractPdfPages(filePath);
    } else {
      pages = extractTextFilePages(filePath);
    }

    sourceRecord.page_count = pages.length;

    // 3. Clean & Chunk
    const allChunks: { content: string; pageNumber: number }[] = [];
    for (const page of pages) {
      const pageChunks = chunkPageText(page, options);
      allChunks.push(...pageChunks);
    }

    if (allChunks.length === 0) {
      allChunks.push({
        content: `Document: ${sourceRecord.filename}. No textual content could be parsed.`,
        pageNumber: 1,
      });
    }

    // 4. Generate Embeddings via embeddingService
    const chunkTexts = allChunks.map(c => c.content);
    const embeddings = await embeddingService.embedDocument(chunkTexts);

    // 5. Store Chunks in Firestore scoped to bot_id
    for (let i = 0; i < allChunks.length; i++) {
      const chunkId = `chk-${sourceRecord.id}-${i}`;
      const chunkRecord: ChunkRecord = {
        id: chunkId,
        bot_id: sourceRecord.bot_id,
        source_id: sourceRecord.id,
        content: allChunks[i].content,
        page_number: allChunks[i].pageNumber,
        chunk_index: i,
        embedding: embeddings[i] || [],
        metadata: {
          filename: sourceRecord.filename,
          bot_id: sourceRecord.bot_id,
          source_id: sourceRecord.id,
          page_number: allChunks[i].pageNumber,
          chunk_index: i,
        },
      };

      await firestoreSetDoc('chunks', chunkId, chunkRecord);
    }

    // 6. Update Source record to Ready
    sourceRecord.status = 'Ready';
    sourceRecord.summary = `Processed ${pages.length} page(s) into ${allChunks.length} vector chunks with semantic embeddings.`;
    sourceRecord.updated_at = new Date().toISOString();
    await firestoreSetDoc('sources', sourceRecord.id, sourceRecord);

    return {
      chunkCount: allChunks.length,
      pageCount: pages.length,
    };
  } catch (err: any) {
    console.error(`Document ingestion failed for ${sourceRecord.filename}:`, err);
    sourceRecord.status = 'Failed';
    sourceRecord.error_message = err.message || 'Unknown processing error';
    sourceRecord.updated_at = new Date().toISOString();
    await firestoreSetDoc('sources', sourceRecord.id, sourceRecord);
    throw err;
  }
}

/**
 * Remove all chunks associated with a source document
 */
export async function deleteSourceAndChunks(sourceId: string, botId: string): Promise<void> {
  const chunks = (await firestoreQuery('chunks', 'source_id', sourceId)) as ChunkRecord[];
  for (const chunk of chunks) {
    await firestoreDeleteDoc('chunks', chunk.id);
  }
  await firestoreDeleteDoc('sources', sourceId);
}
