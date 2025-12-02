
import React from "react";

const MessageDialog = ({ open, title, message, onClose }) => {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          minWidth: 320,
          maxWidth: 480,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
          padding: 20,
        }}
      >
        <h3
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          {title || 'Message'}
        </h3>
        <p
          style={{
            margin: 0,
            marginBottom: 20,
            fontSize: 14,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: 4,
              border: '1px solid #d0d7de',
              background: '#ff8a00',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageDialog;