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
    const { inputValue, customerName, agentName } = req.body;
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
      
      // Prepare greeting based on customer name
      const greeting = customerName ? `Dear ${customerName},\n\n` : 'Hello,\n\n';
      
      // Prepare signature based on agent name
      const signature = agentName ? `\n\nBest Regards,\n${agentName}` : '\n\nBest Regards,';
      
      // Generate response with OpenAI using context
      const messages = [
        { role: 'system', content: `You are a professional customer support agent responding to customer inquiries via email. 

Your responses should:
1. Be friendly, helpful, and professional
2. Use the context provided to answer the question thoroughly
3. Use proper paragraphs with line breaks between paragraphs
4. Format lists with numbers or bullet points when appropriate
5. Include a line at the end offering additional help like: "If you have any further questions, please don't hesitate to contact us."

Format rules:
- Begin your response with "${greeting}" (already formatted, just use as is)
- End your email with "${signature}" (already formatted, just use as is)
- Use line breaks to separate paragraphs
- Keep paragraphs concise and focused on one topic
- When presenting options or steps, use numbered lists
- Format your response as if it's going to be sent directly as an email

Remember, this will be used in an actual email to the customer, so ensure the formatting is clean and professional.` },
        { role: 'user', content: `Context: ${context}\n\nCustomer Inquiry: ${inputValue}` }
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
        query: inputValue,
        customerName,
        agentName
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