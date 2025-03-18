const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('node:path');
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 6000;

// Initialize OpenAI client for chat completions only
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the client build folder
app.use(express.static(path.join(__dirname, '../client/build')));

// Function to generate embeddings using OpenAI
async function getEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

// New endpoint for Pinecone search
app.post('/api/search', async (req, res) => {
  try {
    const { inputValue } = req.body;
    
    console.log('Searching Pinecone with input:', inputValue);
    
    // Get the embedding for the input
    const embedding = await getEmbedding(inputValue);
    
    // Query Pinecone using the embedding
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) {
      return res.status(500).json({ error: 'PINECONE_INDEX_NAME not set in .env file' });
    }
    
    const index = pinecone.index(indexName);
    // Use the same namespace as in the upload script
    const namespace = 'hiking-content';
    
    const queryResponse = await index.namespace(namespace).query({
      vector: embedding,
      topK: 5,
      includeMetadata: true
    });
    
    // Format the response
    const results = queryResponse.matches.map(match => ({
      id: match.id,
      score: match.score,
      metadata: match.metadata
    }));
    
    // Generate response with OpenAI using context from Pinecone
    let context = '';
    if (results.length > 0) {
      // Extract content from metadata if available
      context = results.map(r => r.metadata.content || JSON.stringify(r.metadata)).join('\n\n');
    }
    
    // Call OpenAI with the context and query
    const openaiResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant. Use the context provided to answer the question.' },
        { role: 'user', content: `Context: ${context}\n\nQuestion: ${inputValue}` }
      ]
    });
    
    const messageText = openaiResponse.choices[0].message.content;
    
    // Return the results
    res.json({ 
      text: messageText, 
      sources: results 
    });
    
  } catch (error) {
    console.error('Error with Pinecone search:', error.message);
    res.status(500).json({ error: 'Failed to process your request', details: error.message });
  }
});

// Original API endpoint to proxy requests to Astra DB
app.post('/api/chat', async (req, res) => {
  try {
    const { inputValue } = req.body;
    
    console.log('Sending request to Astra DB with input:', inputValue);
    console.log('Using token:', process.env.ASTRA_DB_API_KEY);
    console.log('Request URL:', "https://api.langflow.astra.datastax.com/lf/bccf6379-26f4-4851-8abc-6049672742cb/api/v1/run/0b28e19e-517c-4c37-aa27-eeea84316554?stream=false");
    
    const response = await axios.post(
      "https://api.langflow.astra.datastax.com/lf/bccf6379-26f4-4851-8abc-6049672742cb/api/v1/run/0b28e19e-517c-4c37-aa27-eeea84316554?stream=false",
      {
        input_value: inputValue,
        output_type: "chat",
        input_type: "chat",
        tweaks: {
          "ChatInput-brblo": {},
          "ParseData-eZSzB": {},
          "Prompt-2kbK6": {},
          "SplitText-r9rwI": {},
          "ChatOutput-uRyV1": {},
          "OpenAIEmbeddings-aUlhA": {},
          "OpenAIEmbeddings-hJWjE": {},
          "File-w6PDP": {},
          "OpenAIModel-HS6cQ": {},
          "AstraDB-dvyLq": {},
          "AstraDB-n3d32": {}
        }
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ASTRA_DB_API_KEY}`
        }
      }
    );
    
    console.log('Response received from Astra DB:', response.status);
    if (response.headers?.['content-type']) {
      console.log('Response content type:', response.headers['content-type']);
    }
    
    // Extract the message from the nested structure
    let messageText = '';
    try {
      // Try to extract from messages array first
      messageText = response.data?.outputs?.[0]?.messages?.[0]?.message;
      
      // If not found, try the alternative path
      if (!messageText) {
        messageText = response.data?.outputs?.[0]?.outputs?.[0]?.results?.message?.text;
      }
      
      // If still not found, return the full response
      if (!messageText) {
        console.log('Unable to find message in response, returning full response');
        messageText = JSON.stringify(response.data);
      }
    } catch (err) {
      console.error('Error extracting message from response:', err);
      messageText = JSON.stringify(response.data);
    }
    
    // Return just the message text for a cleaner response
    res.json({ text: messageText });
  } catch (error) {
    console.error('Error calling Astra DB API:', error.message);
    
    // Log more detailed error information
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response status:', error.response.status);
      console.error('Error response headers:', JSON.stringify(error.response.headers));
      
      if (typeof error.response.data === 'string') {
        console.error('Error response data (first 500 chars):', error.response.data.substring(0, 500));
        if (error.response.data.includes('<!DOCTYPE html>')) {
          console.error('Received HTML response - likely a redirect to login page');
        }
      } else {
        console.error('Error response data:', error.response.data);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Request details:', error.request._header);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.config);
    }
    
    // Log the full error object for detailed error information
    console.error('Full error object:', error);
    
    res.status(500).json({ error: 'Failed to process your request', details: error.message });
  }
});

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 