# HutToHut Chat Application

A simple chat application that connects to an Astra DB API endpoint.

## Project Structure

- `server/` - Express backend server that proxies API requests to avoid CORS issues
- `client/` - React frontend application with a simple chat interface

## Setup and Run

### Backend Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
npm start
```

### Frontend Client

```bash
# Navigate to client directory
cd client

# Install dependencies
npm install

# Start the React app
npm start
```

The frontend will run on http://localhost:3000 and will communicate with the backend server running on http://localhost:5000.

## How It Works

1. The frontend allows users to type questions in a chat interface
2. When a message is sent, it's forwarded to the backend server
3. The backend server proxies the request to the Astra DB API endpoint
4. The response is returned to the frontend and displayed in the chat

## Tech Stack

- Backend: Node.js with Express
- Frontend: React
- HTTP Requests: Axios 