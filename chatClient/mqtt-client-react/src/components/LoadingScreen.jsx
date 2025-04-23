import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="center-container">
      <div className="auth-box" style={{ textAlign: 'center' }}>
        <div className="spinner"></div>
        <p>Conectando con <strong>HiveMQ</strong>...</p>
      </div>
    </div>
  );
}
