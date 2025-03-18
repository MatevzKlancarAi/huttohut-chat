# Pinecone Integration Guide

This guide explains how to use the Pinecone vector database integration to upload your JSON files and perform semantic search.

## Prerequisites

1. A Pinecone account with an API key
2. An OpenAI account with an API key
3. Node.js installed on your system

## Setup

1. Create a Pinecone index in the Pinecone console:
   - Dimension: 1536 (for OpenAI's text-embedding-ada-002)
   - Metric: cosine
   - Give your index a name

2. Configure the `.env` file:
   ```
   PINECONE_API_KEY=your_pinecone_api_key
   OPENAI_API_KEY=your_openai_api_key
   PINECONE_INDEX_NAME=your_index_name
   ```

3. Install dependencies:
   ```
   npm install
   ```

## Preparing JSON Files

Place your JSON files in the `data` directory. Each file should follow this format:

```json
{
  "id": "unique-id",
  "title": "Document Title",
  "content": "Document content that will be converted to vector embeddings."
}
```

If your JSON files have a different structure, you may need to modify the `upload-to-pinecone.js` script to extract the right fields.

## Uploading Files to Pinecone

Run the upload script:

```
node upload-to-pinecone.js upload
```

This will:
1. Read all JSON files from the `data` directory
2. Generate embeddings for each document using OpenAI
3. Upload the embeddings to your Pinecone index with metadata

## Testing Searches

You can test search functionality:

```
node upload-to-pinecone.js query "your search query"
```

## Using the API

The server includes a search endpoint:

```
POST /api/search
Content-Type: application/json

{
  "inputValue": "your search query"
}
```

This endpoint:
1. Converts the query to an embedding
2. Searches Pinecone for similar documents
3. Uses OpenAI to generate a response based on the found documents
4. Returns both the AI response and the source documents

The response format is:

```json
{
  "text": "AI-generated response based on the found documents",
  "sources": [
    {
      "id": "doc-id",
      "score": 0.87,
      "metadata": { ... }
    }
  ]
}
```

## Switching from Astra DB

The current implementation keeps both the Astra DB endpoint (`/api/chat`) and the new Pinecone endpoint (`/api/search`). To fully switch to Pinecone:

1. Update your client code to use the `/api/search` endpoint instead of `/api/chat`
2. If needed, you can remove the Astra DB integration code from `server.js` 