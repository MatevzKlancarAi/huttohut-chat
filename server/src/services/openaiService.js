/**
 * OpenAI service for embeddings and completions
 */
const { OpenAI } = require('openai');
const config = require('../config');
const { wrapInThread, logUserMessage, logSystemMessage } = require('./literalService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate embeddings for a text input
 * @param {string} text - Text to generate embedding for
 * @returns {Promise<Array<number>>} - The embedding vector
 */
const getEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

/**
 * Generate a completion response using chat completion API
 * @param {Array<Object>} messages - Array of message objects with role and content
 * @param {Object} options - Additional options
 * @param {string} options.threadId - Optional thread ID for Literal AI tracking
 * @param {string} options.threadName - Optional thread name
 * @returns {Promise<string>} - The generated completion text
 */
const getChatCompletion = async (messages, { threadId, threadName = 'Chat Thread', temperature = 0.2 } = {}) => {
  // Wrap the OpenAI call in a Literal AI thread if threadId is provided
  return await wrapInThread(async () => {
    // Log the user message if the last message is from the user
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === 'user') {
      await logUserMessage(lastMessage.content);
    }
    
    const response = await openai.chat.completions.create({
      model: config.openai.completionModel,
      messages,
      temperature: temperature,
      // Lower temperature for more deterministic responses
      presence_penalty: 0.0,  // Reduced to avoid introducing variation
      frequency_penalty: 0.0  // Reduced to maintain consistent language
    });
    
    const messageText = response.choices[0].message.content;
    
    // Log the assistant's response
    await logSystemMessage(messageText, 'Assistant');
    
    return messageText;
  }, { name: threadName, threadId });
};

module.exports = {
  openai,
  getEmbedding,
  getChatCompletion
}; 