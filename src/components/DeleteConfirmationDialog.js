import React from 'react';

const DeleteConfirmationDialog = ({ open, onClose, onConfirm }) => {
  if (!open) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: '#dc2626' }}>Delete Room Type</h3>
        <p style={{ color: '#4b5563', marginBottom: '20px' }}>
          Are you sure you want to delete this room type? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={onConfirm} style={deleteBtnStyle}>Delete</button>
        </div>
      </div>
    </div>
  );
};

// Styles
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
const deleteBtnStyle = {
  padding: '8px 16px', background: '#dc2626', color: '#fff',
  border: '1px solid #dc2626', borderRadius: '4px', cursor: 'pointer'
};

export default DeleteConfirmationDialog;