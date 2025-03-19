/**
 * Main server file
 */
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const config = require('./config');
const apiRoutes = require('./routes/api');
const { setupInstrumentation, shutdown } = require('./services/literalService');

// Initialize express app
const app = express();

// Set up middleware
app.use(cors());
app.use(express.json());

// Serve static files from the client build folder
app.use(express.static(path.join(__dirname, '../../client/build')));

// Initialize LiteralAI instrumentation
setupInstrumentation();

// API routes
app.use('/api', apiRoutes);

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/build', 'index.html'));
});

// Start the server
const server = app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Attempt to flush Literal logs
  await shutdown();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Attempt to flush Literal logs
  await shutdown();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 