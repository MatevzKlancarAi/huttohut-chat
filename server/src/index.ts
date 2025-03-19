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

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure client build path
const getClientBuildPath = async () => {
  // Possible client build paths (in order of preference)
  const paths = [
    path.resolve(__dirname, '../client-build'), // Render production
    path.resolve(__dirname, '../../client/build'), // Local development
  ];

  // Find first accessible path
  for (const p of paths) {
    try {
      await fs.access(p);
      return p;
    } catch (e) {
      // Path not accessible, try next one
    }
  }

  // If no paths are found, log error and default to first path
  console.error('Warning: No client build directory found');
  return paths[0];
};

// Start server with static file serving
const startServer = async () => {
  try {
    const clientBuildPath = await getClientBuildPath();

    // Serve static files from the React app
    app.use('/', serveStatic({ root: clientBuildPath }));

    // Serve index.html for any other routes (for React router)
    app.get('*', async (c) => {
      try {
        const indexPath = path.join(clientBuildPath, 'index.html');
        const indexHtml = await fs.readFile(indexPath, 'utf-8');
        return c.html(indexHtml);
      } catch (error) {
        console.error('Error serving index.html:', error);
        return c.text('Not found', 404);
      }
    });

    // Start the server
    const port = config.port;
    console.log(`Server is running on port ${port}`);

    serve({
      fetch: app.fetch,
      port,
    });

    // Set up Literal instrumentation if it exists
    if (config.literal.apiKey) {
      setupInstrumentation();
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

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

// Start the server
startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
