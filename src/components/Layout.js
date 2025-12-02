// src/components/Layout.js
import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import '../App.css';

const Layout = ({ children }) => {
  return (
    <div className="app-root">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
