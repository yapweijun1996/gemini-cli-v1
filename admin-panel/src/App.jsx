import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import './App.css';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true' ? true : false;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prevCollapsed => !prevCollapsed);
  };

  return (
    <div className="app-container">
      <Header toggleDarkMode={toggleDarkMode} isDarkMode={isDarkMode} />
      <div className="content-wrapper">
        <Sidebar isCollapsed={isSidebarCollapsed} />
        <MainContent />
      </div>
    </div>
  );
}

export default App;