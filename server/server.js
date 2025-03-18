const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 6000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the client build folder
app.use(express.static(path.join(__dirname, '../client/build')));

// API endpoint to proxy requests to Astra DB
app.post('/api/chat', async (req, res) => {
  try {
    const { inputValue } = req.body;
    
    console.log('Sending request to Astra DB with input:', inputValue);
    console.log('Using token:', 'AstraCS:lmdXCGtQMDJXfgmqDxrZyvoP:ee58d95d84a67d505bba61ed4897af203e7301fe55a7dd822a30865156372d4e');
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
          "Authorization": "Bearer AstraCS:yhiEjxzOvcWyzaNfBjvONsxL:edb023607c3ab77875df69836901407150e5fc954851209705ce9ae3670f7830"
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