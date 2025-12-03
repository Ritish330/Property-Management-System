import React from 'react';

const StatusChangeDialog = ({ open, status, onClose, onConfirm }) => {
  if (!open) return null;

  const isActivate = status === 'Active';
  const actionText = isActivate ? 'Activate' : 'Deactivate';
  const color = isActivate ? '#16a34a' : '#dc2626'; // Green for active, Orange for deactivate

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Confirm {actionText}</h3>
        <p style={{ color: '#4b5563', marginBottom: '20px' }}>
          Are you sure you want to <strong>{actionText.toLowerCase()}</strong> this room type?
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button 
            onClick={onConfirm} 
            style={{ ...confirmBtnStyle, background: color, borderColor: color }}
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple inline styles for portability
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
};
const modalStyle = {
  background: '#fff', padding: '24px', borderRadius: '8px',
  width: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
};
const cancelBtnStyle = {
  padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db',
  borderRadius: '4px', cursor: 'pointer'
};
const confirmBtnStyle = {
  padding: '8px 16px', color: '#fff', border: '1px solid',
  borderRadius: '4px', cursor: 'pointer'
};

export default StatusChangeDialog;