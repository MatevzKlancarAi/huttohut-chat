/**
 * API routes for the application
 */
const express = require('express');
const router = express.Router();
const { handleVectorSearch } = require('../controllers/searchController');

// Search endpoint using vector search with Pinecone
router.post('/search', handleVectorSearch);

module.exports = router; 