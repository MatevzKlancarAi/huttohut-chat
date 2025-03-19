import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../env.js';

// Define explicit types
export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

/**
 * Get the Pinecone index based on configuration
 * @returns The Pinecone index object
 * @throws Error if index name is not configured
 */
const getIndex = () => {
  const indexName = config.pinecone.indexName;

  if (!indexName) {
    throw new Error('Pinecone index name not configured');
  }

  return pinecone.index(indexName);
};

/**
 * Query Pinecone with an embedding vector
 * @param embedding The embedding vector to query with
 * @param topK Number of results to return
 * @returns Array of search results
 */
const queryWithEmbedding = async (embedding: number[], topK = 3): Promise<SearchResult[]> => {
  const index = getIndex();
  const namespace = config.pinecone.namespace;

  const queryResponse = await index.namespace(namespace).query({
    vector: embedding,
    topK: topK,
    includeMetadata: true,
  });

  // Format the response with proper type handling
  return queryResponse.matches.map((match) => ({
    id: match.id,
    // Ensure score is always a number (default to 0 if undefined)
    score: typeof match.score === 'number' ? match.score : 0,
    // Ensure metadata is always an object
    metadata: match.metadata ? match.metadata : {},
  }));
};

/**
 * Extract content from search results
 * @param results The search results to extract content from
 * @returns Array of content strings
 */
const extractContentFromResults = (results: SearchResult[]): string[] => {
  // Filter out results with low relevance (less than 0.3)
  const filteredResults = results
    .filter((result) => result.score >= 0.3)
    .filter((result) => result.metadata && 'content' in result.metadata);

  // Sort by relevance score (highest first)
  filteredResults.sort((a, b) => b.score - a.score);

  // Take only the top 2 most relevant content pieces
  const topResults = filteredResults.slice(0, 2);

  return topResults.map((result) => result.metadata.content as string);
};

export { pinecone, getIndex, queryWithEmbedding, extractContentFromResults };
