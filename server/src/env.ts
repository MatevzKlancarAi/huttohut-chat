import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('6000'),
  PINECONE_API_KEY: z.string(),
  PINECONE_INDEX_NAME: z.string(),
  OPENAI_API_KEY: z.string(),
  LITERAL_API_KEY: z.string().optional(),
});

// Validate environment variables
export const env = envSchema.parse(process.env);

// Config object
export const config = {
  port: Number.parseInt(env.PORT, 10),
  openai: {
    apiKey: env.OPENAI_API_KEY,
    embeddingModel: 'text-embedding-3-small',
    completionModel: 'gpt-3.5-turbo',
  },
  pinecone: {
    apiKey: env.PINECONE_API_KEY,
    indexName: env.PINECONE_INDEX_NAME,
    namespace: 'hiking-content',
  },
  literal: {
    apiKey: env.LITERAL_API_KEY,
    batchSize: 5,
  },
};
