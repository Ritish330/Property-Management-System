  // src/components/LoaderOverlay.js
  import React from 'react';
  import './LoaderOverlay.css';

  const LoaderOverlay = ({
    open,
    message = 'Loading...',
    fullScreen = false,
  }) => {
    if (!open) return null;

    return (
      <div
        className={
          'loader-overlay ' + (fullScreen ? 'loader-overlay-fullscreen' : '')
        }
      >
        <div className="loader-overlay-box">
          <div className="loader-spinner" />
          {message && <div className="loader-message">{message}</div>}
        </div>
      </div>
    );
  };

  export default LoaderOverlay;
