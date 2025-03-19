/**
 * Pinecone service for vector search and retrieval
 */
const { Pinecone } = require('@pinecone-database/pinecone');
const config = require('../config');

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

/**
 * Get the Pinecone index based on configuration
 * @returns {Object} - The Pinecone index object
 * @throws {Error} - If index name is not configured
 */
const getIndex = () => {
  const indexName = config.pinecone.indexName;
  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME not set in configuration');
  }
  return pinecone.index(indexName);
};

/**
 * Query Pinecone index with an embedding vector
 * @param {Array<number>} embedding - The embedding vector to query with
 * @param {Object} options - Query options
 * @param {number} options.topK - Number of results to return
 * @param {string} options.namespace - Namespace to query
 * @returns {Promise<Array<Object>>} - The query results with metadata
 */
const queryWithEmbedding = async (embedding, { topK = 5, namespace = config.pinecone.namespace } = {}) => {
  const index = getIndex();
  
  const queryResponse = await index.namespace(namespace).query({
    vector: embedding,
    topK: topK,
    includeMetadata: true
  });
  
  // Format the response
  return queryResponse.matches.map(match => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata
  }));
};

/**
 * Extract content from Pinecone search results
 * @param {Array<Object>} results - The search results from queryWithEmbedding
 * @returns {string} - The extracted context text
 */
const extractContentFromResults = (results) => {
  if (results.length === 0) return '';
  
  return results
    .map(r => r.metadata.content || JSON.stringify(r.metadata))
    .join('\n\n');
};

module.exports = {
  pinecone,
  getIndex,
  queryWithEmbedding,
  extractContentFromResults
}; 