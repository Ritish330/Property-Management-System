// src/components/TopBar.js
import React from 'react';

const TopBar = () => {
  return (
    <header
      style={{
        padding: '12px 24px',
        borderBottom: '1px solid #e0e0e0',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 18 }}>STAAH SP Admin</div>
      <div style={{ fontSize: 13, color: '#777' }}>
        Sandbox · using Su APIs
      </div>
    </header>
  );
};

export default TopBar;
