  // src/pages/Availability.js
  import React, { useState } from 'react';
  import { pushAvailability } from '../api/client';

  const DEFAULT_HOTEL_ID = 'TTBR';

  const Availability = () => {
    const [payloadJson, setPayloadJson] = useState(
      `{
    "hotelid": "${DEFAULT_HOTEL_ID}",
    "room": []
  }`
    );
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [rawResponse, setRawResponse] = useState('');

    const handlePush = async () => {
      try {
        setLoading(true);
        setMessage(null);
        const payload = JSON.parse(payloadJson);
        const res = await pushAvailability(payload);
        setMessage('Availability push successful.');
        setRawResponse(JSON.stringify(res, null, 2));
      } catch (err) {
        console.error(err);
        setMessage(
          err.message || 'Failed to push availability (check JSON)'
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <div>
        <h1>Availability & Rates</h1>
        <p style={{ fontSize: 13, color: '#666' }}>
          Paste a valid STA AH <code>/availability</code> payload here
          (same format as docs / Postman).
        </p>

        {message && (
          <p style={{ color: message.includes('Failed') ? 'red' : 'green' }}>
            {message}
          </p>
        )}

        <textarea
          value={payloadJson}
          onChange={(e) => setPayloadJson(e.target.value)}
          style={{
            width: '100%',
            minHeight: 260,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        />

        <div style={{ marginTop: 8 }}>
          <button onClick={handlePush} disabled={loading}>
            {loading ? 'Pushing…' : 'Push availability to STA AH'}
          </button>
        </div>

        <h3 style={{ marginTop: 24 }}>Last Response (raw)</h3>
        <textarea
          value={rawResponse}
          readOnly
          style={{
            width: '100%',
            minHeight: 200,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        />
      </div>
    );
  };

  export default Availability;
