import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ChatComponent.css';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  
  // Initialize session ID when component mounts
  useEffect(() => {
    // Create a unique session ID for this chat session
    setSessionId(`session-${Date.now()}`);
  }, []);

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
      
      // Add thread and session headers to maintain conversation context in Literal
      const headers = {
        'thread-id': threadId || '',
        'session-id': sessionId || `session-${Date.now()}`
      };
      
      const response = await axios.post('/api/search', { 
        inputValue: input,
        customerName,
        agentName
      }, { headers });
      
      console.log('Response received:', response.data);
      
      // Update thread ID if returned from server
      if (response.data.threadId) {
        setThreadId(response.data.threadId);
      }
      
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

  const toggleConfig = () => {
    setShowConfig(!showConfig);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Failed to copy');
      });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Customer Support Chat</h2>
        <button 
          className="config-button" 
          onClick={toggleConfig}
          type="button"
        >
          {showConfig ? 'Hide Settings' : 'Settings'}
        </button>
      </div>

      {showConfig && (
        <div className="chat-config">
          <div className="config-field">
            <label htmlFor="customerName">Customer Name:</label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div className="config-field">
            <label htmlFor="agentName">Agent Name:</label>
            <input
              id="agentName"
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Enter agent name"
            />
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>Start a conversation by typing a message below!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id}>
              <div 
                className={`message ${message.sender} ${message.error ? 'error' : ''} ${message.sender === 'bot' ? 'email-format' : ''}`}
              >
                {message.text}
                {message.sender === 'bot' && !message.error && (
                  <button 
                    className="copy-button" 
                    onClick={() => copyToClipboard(message.text)}
                    title="Copy email text"
                    type="button"
                  >
                    {copySuccess || 'Copy'}
                  </button>
                )}
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