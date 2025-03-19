import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { config } from './env.js';
import { setupInstrumentation, shutdown } from './services/literalService.js';
import { searchController } from './controllers/searchController.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to client build directory
const clientBuildPath = path.resolve(__dirname, '../client-build');

// Initialize Hono app
const app = new Hono();

// Set up middleware
app.use('*', logger());
app.use('*', cors());

// API routes
app.post('/api/search', async (c) => {
  return searchController.handleVectorSearch(c);
});

// Add a health check endpoint
app.get('/health', (c) => c.json({ status: 'ok' }));

// Serve static files (CSS, JS, images, etc.)
app.use('/static/*', serveStatic({ root: clientBuildPath }));
app.get('/favicon.ico', serveStatic({ root: clientBuildPath }));
app.get('/asset-manifest.json', serveStatic({ root: clientBuildPath }));

// Serve index.html for all other routes to support client-side routing
app.get('*', async (c) => {
  try {
    const content = await fs.readFile(path.join(clientBuildPath, 'index.html'));
    return c.html(content.toString());
  } catch (error) {
    console.error('Error serving index.html:', error);
    return c.text('Not found', 404);
  }
});

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
