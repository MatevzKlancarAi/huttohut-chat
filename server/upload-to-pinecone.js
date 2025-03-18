const fs = require('node:fs');
const path = require('node:path');
// Load .env from the server directory
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

// Check if API key exists
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!PINECONE_API_KEY) {
  console.error('Error: PINECONE_API_KEY not found in .env file');
  console.error('Please make sure your .env file contains PINECONE_API_KEY=your_api_key');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY not found in .env file');
  console.error('Please make sure your .env file contains OPENAI_API_KEY=your_api_key');
  process.exit(1);
}

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

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

// Main function to read JSON files and upsert data into Pinecone
async function uploadToPinecone() {
  // Get index name from environment variables
  const indexName = process.env.PINECONE_INDEX_NAME;
  
  if (!indexName) {
    console.error('Error: PINECONE_INDEX_NAME not set in .env file');
    return;
  }
  
  console.log('Initializing Pinecone connection...');
  
  // Get a reference to the index and namespace
  const index = pinecone.index(indexName);
  // You can use a specific namespace or leave it out for default
  const namespace = 'hiking-content';
  
  // Path to the folder containing JSON files
  const dataDir = path.join(__dirname, 'data');
  
  // Check if the directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`Directory does not exist: ${dataDir}`);
    console.log('Please create a "data" directory in the server folder and place your JSON files there.');
    return;
  }
  
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  if (files.length === 0) {
    console.error('No JSON files found in the data directory.');
    return;
  }

  console.log(`Found ${files.length} JSON files. Processing...`);

  // We'll batch upserts to be more efficient
  const batchSize = 20;
  let vectorsToUpsert = [];

  for (const file of files) {
    try {
      const filePath = path.join(dataDir, file);
      const rawData = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(rawData);

      // Use filename as ID if id field doesn't exist
      const docId = jsonData.id || file.replace('.json', '');
      
      // Extract text to embed - modify this based on your JSON structure
      const textToEmbed = jsonData.content || jsonData.text || JSON.stringify(jsonData);

      console.log(`Generating embedding for ${file}...`);
      // Generate embedding with OpenAI
      const embedding = await getEmbedding(textToEmbed);

      // Metadata to store with the vector - customize based on your needs
      const metadata = {
        title: jsonData.title || file,
        fileName: file,
        content: textToEmbed.substring(0, 1000) // Store first 1000 chars of content for context
      };

      // Add to our upsert batch - with explicit vector values
      vectorsToUpsert.push({
        id: docId,
        values: embedding, // Provide vector values directly
        metadata: metadata
      });

      // If we reached the batchSize, upsert to Pinecone
      if (vectorsToUpsert.length >= batchSize) {
        console.log(`Upserting batch of ${vectorsToUpsert.length} vectors to namespace "${namespace}"...`);
        await index.namespace(namespace).upsert(vectorsToUpsert);
        vectorsToUpsert = []; // reset for next batch
      }

    } catch (err) {
      console.error(`Error processing file ${file}:`, err);
    }
  }

  // Upsert any leftover vectors after the loop
  if (vectorsToUpsert.length > 0) {
    console.log(`Upserting final batch of ${vectorsToUpsert.length} vectors to namespace "${namespace}"...`);
    await index.namespace(namespace).upsert(vectorsToUpsert);
  }

  console.log('All files processed and data uploaded to Pinecone!');
}

// Function to test a query
async function testQuery(query) {
  const indexName = process.env.PINECONE_INDEX_NAME;
  
  if (!indexName) {
    console.error('Error: PINECONE_INDEX_NAME not set in .env file');
    return;
  }
  
  const index = pinecone.index(indexName);
  // Use the same namespace as in uploadToPinecone
  const namespace = 'hiking-content';

  console.log(`Testing query: "${query}" in namespace "${namespace}"`);
  
  // Generate embedding for the query
  const queryEmbedding = await getEmbedding(query);
  
  // Query using the embedding
  const queryResponse = await index.namespace(namespace).query({
    vector: queryEmbedding,
    topK: 3,
    includeMetadata: true
  });

  console.log('Query matches:', JSON.stringify(queryResponse, null, 2));
  return queryResponse;
}

// Check for command line arguments to determine what to do
const action = process.argv[2];

if (action === 'upload') {
  console.log('Starting upload to Pinecone...');
  uploadToPinecone().catch((err) => {
    console.error('Error uploading to Pinecone:', err);
  });
} else if (action === 'query') {
  const queryText = process.argv[3] || 'Please provide a query as the third argument';
  testQuery(queryText).catch((err) => {
    console.error('Error querying Pinecone:', err);
  });
} else {
  console.log(`
Usage:
  Upload files: node upload-to-pinecone.js upload
  Test query:   node upload-to-pinecone.js query "your query text"
  
Before running:
1. Create a data/ directory in the server folder and place your JSON files there
2. Make sure your .env file has:
   - PINECONE_API_KEY
   - OPENAI_API_KEY 
   - PINECONE_INDEX_NAME (set to "sterling-cypress")
`);
} 