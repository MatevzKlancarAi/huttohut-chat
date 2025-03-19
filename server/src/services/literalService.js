/**
 * LiteralAI service for tracking and logging LLM interactions
 */
const { LiteralClient } = require('@literalai/client');
const config = require('../config');

// Initialize Literal client with configuration
const literalClient = new LiteralClient({
  apiKey: config.literal.apiKey,
  batchSize: config.literal.batchSize
});

/**
 * Wraps a function execution in a Literal AI thread for better logging
 * @param {Function} fn - The async function to execute inside the thread
 * @param {Object} options - Thread options
 * @param {string} options.name - Name of the thread
 * @param {string} options.threadId - Optional thread ID to continue an existing thread
 * @param {Object} options.metadata - Optional metadata for the thread
 * @returns {Promise<any>} - The result of the wrapped function
 */
const wrapInThread = async (fn, { name, threadId, metadata = {} } = {}) => {
  try {
    return await literalClient
      .thread({ name: name || 'Default Thread', id: threadId, metadata })
      .wrap(fn);
  } catch (error) {
    console.error('Error in Literal thread wrapping:', error);
    // Fall back to executing the function directly if thread wrapping fails
    return await fn();
  }
};

/**
 * Logs a user message as a step in the current thread
 * @param {string} content - Message content
 * @param {string} name - Step name, defaults to 'User'
 * @returns {Promise<void>}
 */
const logUserMessage = async (content, name = 'User') => {
  try {
    await literalClient
      .step({
        type: 'user_message',
        name,
        output: { content }
      })
      .send();
  } catch (error) {
    console.error('Error logging user message:', error);
  }
};

/**
 * Logs a system/bot message as a step in the current thread
 * @param {string} content - Message content
 * @param {string} name - Step name, defaults to 'System'
 * @returns {Promise<void>}
 */
const logSystemMessage = async (content, name = 'System') => {
  try {
    await literalClient
      .step({
        type: 'system_message',
        name,
        output: { content }
      })
      .send();
  } catch (error) {
    console.error('Error logging system message:', error);
  }
};

// Setup instrumentation for OpenAI
const setupInstrumentation = () => {
  try {
    literalClient.instrumentation.openai();
    console.log('Literal AI instrumentation for OpenAI set up successfully');
  } catch (error) {
    console.error('Failed to set up Literal AI instrumentation:', error);
  }
};

// Graceful shutdown handling for Literal
const shutdown = async () => {
  try {
    // If the flush method exists, use it
    if (typeof literalClient.flush === 'function') {
      await literalClient.flush();
      console.log('Successfully flushed Literal logs');
    }
  } catch (error) {
    console.error('Error during Literal shutdown:', error);
  }
};

module.exports = {
  literalClient,
  setupInstrumentation,
  wrapInThread,
  logUserMessage,
  logSystemMessage,
  shutdown
}; 