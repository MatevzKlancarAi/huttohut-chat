import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './env.js';
import { setupInstrumentation, shutdown } from './services/literalService.js';
import { searchController } from './controllers/searchController.js';

// Initialize Hono app
const app = new Hono();

// Set up middleware
app.use('*', logger());
app.use('*', cors());

// Set up routes
app.post('/api/search', async (c) => {
  return searchController.handleVectorSearch(c);
});

// Add a health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

// Start server
const port = config.port;
console.log(`Server is running on port ${port}`);

// Set up Literal instrumentation if it exists
try {
  if (config.literal.apiKey) {
    setupInstrumentation();
  }
} catch (error) {
  console.error('Failed to set up Literal instrumentation:', error);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  try {
    shutdown();
  } catch (error) {
    console.error('Error during shutdown:', error);
  }
  process.exit(0);
});

serve({
  fetch: app.fetch,
  port,
});
