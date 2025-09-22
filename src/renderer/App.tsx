import React from 'react';
import FileBrowser from './components/FileBrowser';
import './styles/App.css';

const App: React.FC = () => {
  return (
    <div className="app">
      <FileBrowser />
    </div>
  );
};

export default App;