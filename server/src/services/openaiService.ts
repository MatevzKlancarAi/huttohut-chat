/**
 * OpenAI service for embeddings and completions
 */
import { OpenAI } from 'openai';
import { config } from '../env.js';
import { wrapInThread, logUserMessage, logSystemMessage } from './literalService.js';

// Define types for OpenAI API
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  threadId?: string;
  threadName?: string;
  temperature?: number;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Generate embeddings for a text input
 * @param text - Text to generate embedding for
 * @returns The embedding vector
 */
const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

/**
 * Generate a completion response using chat completion API
 * @param messages - Array of message objects with role and content
 * @param options - Additional options
 * @returns The generated completion text
 */
const getChatCompletion = async (
  messages: Message[],
  { threadId, threadName = 'Chat Thread', temperature = 0.2 }: CompletionOptions = {},
): Promise<string> => {
  // Wrap the OpenAI call in a Literal AI thread if threadId is provided
  return await wrapInThread(
    async () => {
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
        presence_penalty: 0.0, // Reduced to avoid introducing variation
        frequency_penalty: 0.0, // Reduced to maintain consistent language
      });

      const messageText = response.choices[0].message.content || '';

      // Log the assistant's response
      await logSystemMessage(messageText, 'Assistant');

      return messageText;
    },
    { name: threadName, threadId },
  );
};

export { openai, getEmbedding, getChatCompletion };
