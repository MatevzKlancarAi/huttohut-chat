import type { Context } from 'hono';
import { getEmbedding, getChatCompletion } from '../services/openaiService.js';
import { queryWithEmbedding, extractContentFromResults } from '../services/pineconeService.js';
import { wrapInThread, logUserMessage } from '../services/literalService.js';

interface SearchRequestBody {
  inputValue: string;
  customerName?: string;
  agentName?: string;
}

// Define the Message type to match openaiService.ts
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Handle the vector search request
 */
const handleVectorSearch = async (c: Context) => {
  try {
    const { inputValue, customerName, agentName } = await c.req.json<SearchRequestBody>();
    const headers = c.req.header();
    const sessionId = headers['session-id'] || `session-${Date.now()}`;
    const threadId = headers['thread-id'] || `thread-${Date.now()}`;

    console.log('Searching with input:', inputValue);

    // Wrap the entire search operation in a Literal thread
    const result = await wrapInThread(
      async () => {
        // Log the user query
        await logUserMessage(inputValue);

        // Get embedding for the input
        const embedding = await getEmbedding(inputValue);

        // Query Pinecone with the embedding
        const results = await queryWithEmbedding(embedding);

        // Extract context from search results
        const context = extractContentFromResults(results);

        // Log the search results scores for debugging
        console.log('Search results relevance scores:');
        results.forEach((result, index) => {
          console.log(
            `Result ${index + 1}: Score=${result.score.toFixed(3)} (${(result.score * 100).toFixed(1)}%), ID=${result.id}`,
          );
        });

        // Check if we have sufficient relevant data (lowered threshold from 0.7 to 0.5)
        const relevanceThreshold = 0.45; // 45% relevance threshold
        const hasRelevantData =
          results.length > 0 && results.some((result) => result.score > relevanceThreshold);

        console.log(
          `Has relevant data: ${hasRelevantData} (threshold: ${relevanceThreshold}, best score: ${results.length > 0 ? Math.max(...results.map((r) => r.score)).toFixed(3) : 'N/A'})`,
        );

        // Prepare greeting based on customer name
        const greeting = customerName ? `Dear ${customerName},\n\n` : 'Hello,\n\n';

        // Prepare signature based on agent name
        const signature = agentName ? `\n\nBest Regards,\n${agentName}` : '\n\nBest Regards,';

        // Generate response with OpenAI using context
        const messages: Message[] = [
          {
            role: 'system',
            content: `You are a professional customer support agent responding to customer inquiries via email. 

Your responses should:
1. Be brief, concise, and directly address ONLY the specific question asked
2. Use ONLY the relevant parts of the context provided - ignore context that doesn't directly relate to the question
3. Keep responses to 3-4 sentences maximum unless more detail is explicitly required
4. Only include information that directly answers the customer's specific question
5. Do NOT include generic information about topics not directly asked about

${
  !hasRelevantData
    ? "IMPORTANT: There is insufficient data to properly answer this question. Mark your response with *DRAFT* at the beginning and include a message stating: 'I was not able to answer this question, I had too little data.' Then provide a general response based on common knowledge, but make it clear this is not based on specific company data."
    : ''
}

Format rules:
- Begin your response with "${greeting}" (already formatted, just use as is)
- End your email with "${signature}" (already formatted, just use as is)
- Keep paragraphs very short and focused
- Do NOT add information about topics the customer didn't ask about

Remember, the customer wants a direct answer to their specific question, not general information.`,
          },
          { role: 'user', content: `Context: ${context}\n\nCustomer Inquiry: ${inputValue}` },
        ];

        const messageText = await getChatCompletion(messages, {
          threadId,
          threadName: 'Vector Search Thread',
        });

        // Return the results
        return {
          text: messageText,
          sources: results,
          threadId: threadId,
          hasRelevantData: hasRelevantData,
        };
      },
      {
        name: 'Search Query',
        threadId,
        metadata: {
          sessionId,
          query: inputValue,
          customerName,
          agentName,
        },
      },
    );

    return c.json(result);
  } catch (error) {
    console.error(
      'Error with vector search:',
      error instanceof Error ? error.message : String(error),
    );
    return c.json(
      {
        error: 'Failed to process your request',
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
};

// Export as an object to match the import in index.ts
export const searchController = {
  handleVectorSearch,
};
