# HutToHut Chat Application

A sophisticated customer support chat application with intelligent vector search capabilities that delivers precise responses based on your knowledge base.

## Overview

HutToHut Chat combines a modern React frontend with a powerful Node.js backend that leverages vector search technology to retrieve context-relevant information for customer inquiries. The application is designed to help customer support agents provide accurate, consistent responses to customer queries by automatically searching and retrieving information from your knowledge base.

## Key Features

- **Intelligent Search**: Semantic vector search with relevance scoring
- **Professional Response Formatting**: Automatic email-style formatting with customizable greetings and signatures
- **Conversation Persistence**: Thread and session management to maintain context across interactions
- **Relevance Filtering**: Smart threshold-based filtering to ensure high-quality responses
- **Source Attribution**: Transparent sourcing with relevance scores for retrieved information
- **Draft Response Identification**: Clear marking of responses with insufficient data

## System Architecture

### Server (Core Component)

The server is the primary engine of the application, handling search, context retrieval, and response generation:

#### Vector Search Integration

- **Pinecone Integration**: High-performance vector database for semantic search
  - 1536-dimensional embeddings (OpenAI text-embedding-ada-002)
  - Cosine similarity metric for accurate matching
  - Relevance threshold (currently 0.45) to ensure quality results
  - Complete document metadata storage and retrieval

#### API Endpoints

- **/api/search**: Main endpoint for processing customer inquiries
  - Accepts query text and optional customer/agent information
  - Converts queries to vector embeddings
  - Retrieves relevant documents from vector database
  - Returns AI-generated responses with source attribution
  - Supports thread and session tracking via custom headers

#### Advanced Response Processing

- **Context Extraction**: Intelligent extraction of relevant content from search results
- **AI Response Generation**: OpenAI integration for natural language response creation
- **Customizable Formatting**: Dynamic email-style formatting with personalized greetings and signatures
- **Quality Control**: Clearly marked draft responses when relevant data is insufficient

#### Thread Management

- Persistent conversation context across multiple interactions
- Session tracking for analytics and context maintenance
- Custom headers for client-server context synchronization

### Frontend Client

- React-based responsive UI with real-time feedback
- Chat message history with support for loading states
- Source attribution display with expandable details
- Configurable customer and agent information
- Copy-to-clipboard functionality for easy response handling

## Setup and Installation

### Prerequisites

- Node.js (v16 or higher)
- npm/pnpm for package management
- Pinecone account with API key
- OpenAI account with API key

### Environment Configuration

Create a `.env` file in the server directory with the following:
PINECONE_API_KEY=your_pinecone_api_key
OPENAI_API_KEY=your_openai_api_key
PINECONE_INDEX_NAME=your_index_name

### Installation and Startup

```bash
# Install all dependencies and build the application
npm run build

# Run the application in development mode
npm run dev

# Start just the client
npm run dev:client

# Start just the server
npm run dev:server

# Start the production build
npm start
```

## Vector Database Setup

1. Create a Pinecone index with:

   - Dimension: 1536 (for OpenAI's embeddings)
   - Metric: cosine
   - Pod type: Based on your data volume and performance needs

2. Prepare your knowledge base:
   - Format documents as JSON files with id, title, and content fields
   - Place files in the data directory
   - Run `node upload-to-pinecone.js upload` to index your documents

## Technical Stack

- **Backend**: Node.js with Express and Hono
- **Frontend**: React with hooks for state management
- **Vector Database**: Pinecone
- **AI Integration**: OpenAI for embeddings and chat completions
- **HTTP Requests**: Axios for client-server communication
- **Styling**: Custom CSS for responsive design

## Development

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Run linting and fix issues
npm run fix
```

## License

MIT

## Repository

[GitHub Repository](https://github.com/MatevzKlancarAi/huttohut-chat.git)
