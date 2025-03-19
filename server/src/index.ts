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

// Debug endpoint to verify client build path
app.get('/debug', async (c) => {
  try {
    const files = await fs.readdir(clientBuildPath);
    return c.json({
      clientBuildPath,
      files,
      exists: true,
    });
  } catch (error) {
    return c.json({
      clientBuildPath,
      error: 'Directory not found or not accessible',
      exists: false,
    });
  }
});

// Serve individual static file routes with proper MIME types
app.get('/static/js/:file', async (c) => {
  const file = c.req.param('file');
  try {
    const content = await fs.readFile(path.join(clientBuildPath, 'static/js', file));
    return c.body(content, 200, { 'Content-Type': 'application/javascript' });
  } catch (error) {
    return c.notFound();
  }
});

app.get('/static/css/:file', async (c) => {
  const file = c.req.param('file');
  try {
    const content = await fs.readFile(path.join(clientBuildPath, 'static/css', file));
    return c.body(content, 200, { 'Content-Type': 'text/css' });
  } catch (error) {
    return c.notFound();
  }
});

app.get('/static/media/:file', async (c) => {
  const file = c.req.param('file');
  try {
    const content = await fs.readFile(path.join(clientBuildPath, 'static/media', file));
    // Determine content type based on file extension
    const ext = path.extname(file).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    if (ext === '.svg') contentType = 'image/svg+xml';
    return c.body(content, 200, { 'Content-Type': contentType });
  } catch (error) {
    return c.notFound();
  }
});

// Serve other static assets
app.get('/favicon.ico', async (c) => {
  try {
    const content = await fs.readFile(path.join(clientBuildPath, 'favicon.ico'));
    return c.body(content, 200, { 'Content-Type': 'image/x-icon' });
  } catch (error) {
    return c.notFound();
  }
});

app.get('/asset-manifest.json', async (c) => {
  try {
    const content = await fs.readFile(path.join(clientBuildPath, 'asset-manifest.json'));
    return c.body(content, 200, { 'Content-Type': 'application/json' });
  } catch (error) {
    return c.notFound();
  }
});

// Serve index.html for client routing
app.get('*', async (c) => {
  try {
    console.log('Serving index.html from', path.join(clientBuildPath, 'index.html'));
    const content = await fs.readFile(path.join(clientBuildPath, 'index.html'));
    return c.html(content.toString());
  } catch (error) {
    console.error('Error serving index.html:', error);
    return c.text(
      `Not found. Error: ${error instanceof Error ? error.message : String(error)}`,
      404,
    );
  }
});

// Start server
const port = config.port;
console.log(`Server is running on port ${port}. Client build path: ${clientBuildPath}`);

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
