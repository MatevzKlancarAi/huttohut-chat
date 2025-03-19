/**
 * Controller for search endpoints
 */
const { getEmbedding, getChatCompletion } = require('../services/openaiService');
const { queryWithEmbedding, extractContentFromResults } = require('../services/pineconeService');
const { wrapInThread, logUserMessage } = require('../services/literalService');

/**
 * Handle the vector search request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleVectorSearch = async (req, res) => {
  try {
    const { inputValue } = req.body;
    const sessionId = req.headers['session-id'] || `session-${Date.now()}`;
    const threadId = req.headers['thread-id'] || `thread-${Date.now()}`;
    
    console.log('Searching with input:', inputValue);
    
    // Wrap the entire search operation in a Literal thread
    await wrapInThread(async () => {
      // Log the user query
      await logUserMessage(inputValue);
      
      // Get embedding for the input
      const embedding = await getEmbedding(inputValue);
      
      // Query Pinecone with the embedding
      const results = await queryWithEmbedding(embedding);
      
      // Extract context from search results
      const context = extractContentFromResults(results);
      
      // Generate response with OpenAI using context
      const messages = [
        { role: 'system', content: 'You are a helpful assistant. Use the context provided to answer the question.' },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${inputValue}` }
      ];
      
      const messageText = await getChatCompletion(messages, { 
        threadId, 
        threadName: 'Vector Search Thread' 
      });
      
      // Return the results
      res.json({ 
        text: messageText, 
        sources: results,
        threadId: threadId
      });
    }, { 
      name: 'Search Query', 
      threadId, 
      metadata: { 
        sessionId, 
        query: inputValue 
      } 
    });
    
  } catch (error) {
    console.error('Error with vector search:', error.message);
    res.status(500).json({ error: 'Failed to process your request', details: error.message });
  }
};

module.exports = {
  handleVectorSearch
}; 