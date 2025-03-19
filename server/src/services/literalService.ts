/**
 * LiteralAI service for tracking and logging LLM interactions
 */
import { LiteralClient } from '@literalai/client';
import { config } from '../env.js';

// Define types for Literal API
interface ThreadOptions {
  name?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
}

// Initialize Literal client with configuration
const literalClient = new LiteralClient({
  apiKey: config.literal.apiKey,
  // Note: batchSize might not be in the type definitions, but it's used in the actual code
  // @ts-ignore
  batchSize: config.literal.batchSize,
});

/**
 * Wraps a function execution in a Literal AI thread for better logging
 * @param fn - The async function to execute inside the thread
 * @param options - Thread options
 * @returns The result of the wrapped function
 */
const wrapInThread = async <T>(
  fn: () => Promise<T>,
  { name, threadId, metadata = {} }: ThreadOptions = {},
): Promise<T> => {
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
 * @param content - Message content
 * @param name - Step name, defaults to 'User'
 */
const logUserMessage = async (content: string, name = 'User'): Promise<void> => {
  try {
    await literalClient
      .step({
        type: 'user_message',
        name,
        output: { content },
      })
      .send();
  } catch (error) {
    console.error('Error logging user message:', error);
  }
};

/**
 * Logs a system/bot message as a step in the current thread
 * @param content - Message content
 * @param name - Step name, defaults to 'System'
 */
const logSystemMessage = async (content: string, name = 'System'): Promise<void> => {
  try {
    await literalClient
      .step({
        type: 'system_message',
        name,
        output: { content },
      })
      .send();
  } catch (error) {
    console.error('Error logging system message:', error);
  }
};

// Setup instrumentation for OpenAI
const setupInstrumentation = (): void => {
  try {
    literalClient.instrumentation.openai();
    console.log('Literal AI instrumentation for OpenAI set up successfully');
  } catch (error) {
    console.error('Failed to set up Literal AI instrumentation:', error);
  }
};

// Graceful shutdown handling for Literal
const shutdown = async (): Promise<void> => {
  try {
    // flush might not be in the type definitions, but it's used in the actual code
    // @ts-ignore
    if (typeof literalClient.flush === 'function') {
      // @ts-ignore
      await literalClient.flush();
      console.log('Successfully flushed Literal logs');
    }
  } catch (error) {
    console.error('Error during Literal shutdown:', error);
  }
};

export {
  literalClient,
  setupInstrumentation,
  wrapInThread,
  logUserMessage,
  logSystemMessage,
  shutdown,
};
