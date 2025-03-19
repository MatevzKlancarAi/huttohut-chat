/**
 * Central configuration file for all environment variables and settings
 */
require('dotenv').config();

const config = {
  port: process.env.PORT || 6000,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: 'text-embedding-3-small',
    completionModel: 'gpt-3.5-turbo',
  },
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    indexName: process.env.PINECONE_INDEX_NAME,
    namespace: 'hiking-content',
  },
  literal: {
    apiKey: process.env.LITERAL_API_KEY,
    batchSize: 5,
  }
};

module.exports = config; 