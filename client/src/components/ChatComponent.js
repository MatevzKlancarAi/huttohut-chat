import React, { useState } from 'react';
import axios from 'axios';
import './ChatComponent.css';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = { text: input, sender: 'user', id: Date.now() };
    setMessages([...messages, userMessage]);
    setIsLoading(true);
    
    try {
      // Send message to the API - Use /api/search endpoint instead of /api/chat
      console.log('Sending request to server with input:', input);
      const response = await axios.post('/api/search', { inputValue: input });
      console.log('Response received:', response.data);
      
      // Handle different response formats - Pinecone response includes text and sources
      let responseText = '';
      let sources = [];
      
      if (response.data?.text) {
        responseText = response.data.text;
        sources = response.data.sources || [];
      } else if (typeof response.data === 'string') {
        responseText = response.data;
      } else if (response.data && typeof response.data === 'object') {
        responseText = JSON.stringify(response.data, null, 2);
      } else {
        responseText = 'Received response in unknown format';
      }
      
      // Add bot response to chat
      const botMessage = { 
        text: responseText, 
        sender: 'bot', 
        id: Date.now() + 1,
        sources: sources
      };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Create a detailed error message
      let errorMessage = 'Sorry, there was an error processing your request.';
      if (error.response) {
        errorMessage += ` Server responded with status ${error.response.status}.`;
        if (error.response.data?.details) {
          errorMessage += ` Details: ${error.response.data.details}`;
        }
      } else if (error.request) {
        errorMessage += ' No response received from server.';
      } else {
        errorMessage += ` Error: ${error.message}`;
      }
      
      // Add error message to chat
      const errorMessageObj = { 
        text: errorMessage, 
        sender: 'bot',
        error: true,
        id: Date.now() + 2
      };
      setMessages(prevMessages => [...prevMessages, errorMessageObj]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a conversation by typing a message below!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              <div 
                className={`message ${message.sender} ${message.error ? 'error' : ''}`}
              >
                {message.text}
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="sources-container">
                  <details>
                    <summary>Sources ({message.sources.length})</summary>
                    <ul className="sources-list">
                      {message.sources.map((source) => (
                        <li key={`${source.id}-${source.score}`}>
                          <strong>{source.metadata.title}</strong> 
                          <span className="source-score">
                            (Relevance: {(source.score * 100).toFixed(1)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="message bot loading">
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>
      
      <form className="chat-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatComponent; 