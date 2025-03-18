import React from 'react';
import './App.css';
import ChatComponent from './components/ChatComponent';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>HutToHut</h1>
      </header>
      <main>
        <ChatComponent />
      </main>
    </div>
  );
}

export default App; 